/*
 * The contents of this file are subject to the terms of the Common Development and
 * Distribution License (the License). You may not use this file except in compliance with the
 * License.
 *
 * You can obtain a copy of the License at legal-notices/CDDLv1_0.txt. See the License for the
 * specific language governing permission and limitations under the License.
 *
 * When distributing Covered Software, include this CDDL Header Notice in each file and include
 * the License file at legal-notices/CDDLv1_0.txt. If applicable, add the following below the CDDL
 * Header, with the fields enclosed by brackets [] replaced by your own identifying
 * information: "Portions copyright [year] [name of copyright owner]".
 *
 * Copyright 2014-2023 ForgeRock AS.
 */

package org.forgerock.openicf.connectors.scriptedrest

import org.identityconnectors.common.StringUtil

import static org.forgerock.openicf.misc.saascommon.client.SaaSCommonConstants.CLIENT_ID;
import static org.forgerock.openicf.misc.saascommon.client.SaaSCommonConstants.CLIENT_SECRET;
import static org.forgerock.openicf.misc.saascommon.client.SaaSCommonConstants.GRANT_TYPE;
import static org.forgerock.openicf.misc.saascommon.client.SaaSCommonConstants.OAUTH_REQUEST;
import static org.forgerock.openicf.misc.saascommon.client.SaaSCommonConstants.SCOPE

import groovy.json.JsonSlurper
import groovy.transform.Synchronized
import groovyx.net.http.RESTClient
import groovyx.net.http.StringHashMap
import org.apache.http.HttpHeaders
import org.apache.http.HttpHost
import org.apache.http.HttpRequest
import org.apache.http.HttpRequestInterceptor
import org.apache.http.HttpResponse
import org.apache.http.HttpResponseInterceptor
import org.apache.http.HttpStatus
import org.apache.http.NameValuePair
import org.apache.http.auth.AuthScope
import org.apache.http.auth.UsernamePasswordCredentials
import org.apache.http.client.ClientProtocolException
import org.apache.http.client.CredentialsProvider
import org.apache.http.client.HttpClient
import org.apache.http.client.config.RequestConfig
import org.apache.http.client.entity.UrlEncodedFormEntity
import org.apache.http.client.methods.CloseableHttpResponse
import org.apache.http.client.methods.HttpPost
import org.apache.http.client.protocol.HttpClientContext
import org.apache.http.conn.routing.HttpRoute
import org.apache.http.impl.auth.BasicScheme
import org.apache.http.impl.client.BasicAuthCache
import org.apache.http.impl.client.BasicCookieStore
import org.apache.http.impl.client.BasicCredentialsProvider
import org.apache.http.impl.client.CloseableHttpClient
import org.apache.http.impl.client.HttpClientBuilder
import org.apache.http.impl.conn.PoolingHttpClientConnectionManager
import org.forgerock.openicf.connectors.scriptedrest.ScriptedRESTConfiguration.AuthMethod
import org.apache.http.message.BasicHeader
import org.apache.http.message.BasicNameValuePair
import org.apache.http.protocol.HttpContext
import org.apache.http.util.EntityUtils
import org.identityconnectors.common.logging.Log
import org.identityconnectors.common.security.GuardedString
import org.identityconnectors.common.security.SecurityUtil
import org.identityconnectors.framework.common.exceptions.ConnectionFailedException
import org.identityconnectors.framework.common.exceptions.ConnectorException
import org.identityconnectors.framework.common.exceptions.InvalidCredentialException



/**
 * A customizer script defines the custom closures to interact with the default implementation and customize it.
 * The 'customize' closure is provided with a {@link HttpClientBuilder}, which empowers you to configure settings such
 * as connection pooling, headers, timeouts, and more.
 */
customize {
    init { HttpClientBuilder builder ->

        //SETUP: org.apache.http
        def c = delegate as ScriptedRESTConfiguration

        def httpHost = new HttpHost(c.serviceAddress?.host, c.serviceAddress?.port, c.serviceAddress?.scheme);

        PoolingHttpClientConnectionManager cm = new PoolingHttpClientConnectionManager();
        // Increase max total connection to 200
        cm.setMaxTotal(200);
        // Increase default max connection per route to 20
        cm.setDefaultMaxPerRoute(20);
        // Increase max connections for httpHost to 50
        cm.setMaxPerRoute(new HttpRoute(httpHost), 50);

        builder.setConnectionManager(cm)


        // configure timeout on the entire client
        RequestConfig requestConfig = RequestConfig.custom().build()

        /*
        * // Example timeout configuration
        * RequestConfig requestConfig = RequestConfig.custom()
        *   .setConnectionRequestTimeout(50).setConnectTimeout(50).setSocketTimeout(50).build()
        */

        builder.setDefaultRequestConfig(requestConfig)

        if (c.proxyAddress != null) {
            builder.setProxy(new HttpHost(c.proxyAddress?.host, c.proxyAddress?.port, c.proxyAddress?.scheme));
            // Configure proxy username and password if specified
            if (c.proxyUsername != null && c.proxyPassword != null) {
                UsernamePasswordCredentials credentials =
                    new UsernamePasswordCredentials(c.proxyUsername, SecurityUtil.decrypt(c.proxyPassword))
                CredentialsProvider credentialProvider = new BasicCredentialsProvider()
                credentialProvider.setCredentials(new AuthScope(c.proxyAddress.host, c.proxyAddress.port), credentials)
                builder.setDefaultCredentialsProvider(credentialProvider)
            }
        }

        switch (AuthMethod.valueOf(c.defaultAuthMethod)) {
            case AuthMethod.BASIC_PREEMPTIVE:

                // Create AuthCache instance
                def authCache = new BasicAuthCache();
                // Generate BASIC scheme object and add it to the local auth cache
                authCache.put(httpHost, new BasicScheme());
                c.propertyBag.put(HttpClientContext.AUTH_CACHE, authCache)

            case AuthMethod.BASIC:
                // It's part of the http client spec to request the resource anonymously
                // first and respond to the 401 with the Authorization header.
                final CredentialsProvider credentialsProvider = new BasicCredentialsProvider();

                c.password.access(
                    {
                        credentialsProvider.setCredentials(new AuthScope(httpHost.getHostName(), httpHost.getPort()),
                            new UsernamePasswordCredentials(c.username, new String(it)));
                    } as GuardedString.Accessor
                );

                builder.setDefaultCredentialsProvider(credentialsProvider);
                break;
            case AuthMethod.OAUTH:
                // define a request interceptor to set the Authorization header if absent or expired
                HttpRequestInterceptor requestInterceptor = { HttpRequest request, HttpContext context ->
                    if (null == context.getAttribute(OAUTH_REQUEST)) {
                        def exp = c.propertyBag.tokenExpiration as Long
                        if (c.propertyBag.accessToken == null || exp < System.currentTimeMillis() / 1000) {
                            new NewAccessToken(c).clientCredentials()
                        }
                        request.addHeader(new BasicHeader(HttpHeaders.AUTHORIZATION, "Bearer " + c.propertyBag.accessToken))
                    }
                }

                // define a response interceptor to catch a 401 response code and delete access token from cache
                HttpResponseInterceptor responseInterceptor = { HttpResponse response, HttpContext context ->
                    if (HttpStatus.SC_UNAUTHORIZED == response.statusLine.statusCode) {
                        if (c.propertyBag.accessToken != null) {
                            c.propertyBag.remove("accessToken")
                            Log.getLog(ScriptedRESTConnector.class).info("Code 401 - accessToken removed")
                        }
                    }
                }

                builder.addInterceptorLast(requestInterceptor)
                builder.addInterceptorLast(responseInterceptor)
                break
            case AuthMethod.NONE:
                break;
            default:
                throw new IllegalArgumentException();
        }

        c.propertyBag.put(HttpClientContext.COOKIE_STORE, new BasicCookieStore());

    }

    /**
     * This Closure is in place to release any resource when disposing the connector instance.
     */
    release {
        propertyBag.clear()
    }

    /**
     * This Closure can customize the httpClient and the returning object is injected into the Script Binding.
     */
    decorate { HttpClient httpClient ->

        //SETUP: groovyx.net.http
        def c = delegate as ScriptedRESTConfiguration
        def authCache = c.propertyBag.get(HttpClientContext.AUTH_CACHE)
        def cookieStore = c.propertyBag.get(HttpClientContext.COOKIE_STORE)

        RESTClient restClient = new InnerRESTClient(c.serviceAddress, c.defaultContentType, authCache, cookieStore)

        Map<Object, Object> defaultRequestHeaders = new StringHashMap<Object>()
        if (null != c.defaultRequestHeaders) {
            c.defaultRequestHeaders.each {
                if (it != null) {
                    def kv = it.split('=')
                    assert kv.size() == 2
                    defaultRequestHeaders.put(kv[0], kv[1])
                }
            }
        }

        restClient.setClient(httpClient)
        restClient.setHeaders(defaultRequestHeaders)

        // Return with the decorated instance
        return restClient
    }

}

class NewAccessToken {

    Log logger = Log.getLog(NewAccessToken.class)
    ScriptedRESTConfiguration c = null
    final CloseableHttpClient client = null
    final HttpPost post = null

    NewAccessToken(ScriptedRESTConfiguration conf) {
        this.c = conf
        this.client = c.getHttpClient()
        this.post = new HttpPost(c.getOAuthTokenEndpoint())
        post.setHeader(HttpHeaders.CONTENT_TYPE, "application/x-www-form-urlencoded")
        post.setHeader(HttpHeaders.ACCEPT, "application/json")
    }

    @Synchronized
    void clientCredentials() {
        boolean expired = (c.propertyBag.tokenExpiration as Long) < System.currentTimeMillis() / 1000
        if (c.propertyBag.accessToken == null || expired ) {
            if (c.propertyBag.tokenExpiration != null && expired) {
                logger.info("Token expired!")
            }
            logger.info("Getting new access token...")

            final List<NameValuePair> pairs = new ArrayList<>()
            pairs.add(new BasicNameValuePair(GRANT_TYPE, c.getOAuthGrantType()))
            pairs.add(new BasicNameValuePair(CLIENT_ID, c.getOAuthClientId()))
            pairs.add(new BasicNameValuePair(CLIENT_SECRET, SecurityUtil.decrypt(c.getOAuthClientSecret())))
            if (c.getOAuthScope() != null && StringUtil.isNotBlank(c.getOAuthScope())) {
                pairs.add(new BasicNameValuePair(SCOPE, c.getOAuthScope()));
            }
            post.setEntity(new UrlEncodedFormEntity(pairs))

            CloseableHttpResponse response = null
            try {
                HttpClientContext ctx = HttpClientContext.create()
                ctx.setAttribute(OAUTH_REQUEST, true)
                response = client.execute(post, ctx)
                int statusCode = response.getStatusLine().getStatusCode()
                if (HttpStatus.SC_OK == statusCode) {
                    def jsonSlurper = new JsonSlurper()
                    def oauthResponse = jsonSlurper.parseText(EntityUtils.toString(response.getEntity()))
                    c.propertyBag.accessToken = oauthResponse.access_token
                    c.propertyBag.tokenExpiration = System.currentTimeMillis() / 1000 + oauthResponse.expires_in as Long
                } else {
                    throw new InvalidCredentialException("Retrieve Access Token failed with code: " + statusCode)
                }
            } catch (ClientProtocolException ex) {
                logger.info("Trace: {0}", ex.getMessage())
                throw new ConnectorException(ex)
            } catch (IOException ex) {
                logger.info("Trace: {0}", ex.getMessage())
                throw new ConnectionFailedException(ex)
            } finally {
                try {
                    if (response != null) {
                        response.close()
                    }
                } catch (IOException e) {
                    logger.info("Can't close HttpResponse")
                }
            }
        }
    }
}

/**
 * A groovyx.net.http.RESTClient extension class to help with REST-like requests.
 */
class InnerRESTClient extends RESTClient {

    def authCache = null
    def cookieStore = null

    InnerRESTClient(Object defaultURI, Object defaultContentType, authCache, cookieStore) throws URISyntaxException {
        super(defaultURI, defaultContentType)
        this.authCache = authCache
        this.cookieStore = cookieStore
    }

    @Override
    protected Object doRequest(
        final RequestConfigDelegate delegate) throws ClientProtocolException, IOException {

        // Add AuthCache to the execution context
        if (null != authCache) {
            //do Preemptive Auth
            delegate.getContext().setAttribute(HttpClientContext.AUTH_CACHE, authCache)
        }
        // Add AuthCache to the execution context
        if (null != cookieStore) {
            //do Preemptive Auth
            delegate.getContext().setAttribute(HttpClientContext.COOKIE_STORE, cookieStore)
        }
        return super.doRequest(delegate)
    }
}
