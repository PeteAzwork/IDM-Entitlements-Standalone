"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["lodash", "./URIUtils"], function (_, URIUtils) {
    /**
     * Provides generic methods for interacting with oAuth endpoints
     * @exports org/forgerock/commons/ui/common/util/OAuth
     */
    var obj = {};

    /**
        Provides the redirect_url value relative to the browser's current location
        @param {string} returnFileName - a file relative to the current application
        that will be used to accept the incoming oauth response; defaults to "oauthReturn.html"
     */
    obj.getRedirectURI = function (returnFileName) {
        return URIUtils.getCurrentOrigin() + URIUtils.getCurrentPathName().replace(/(\/index\.html)|(\/$)/, "/" + (returnFileName || "oauthReturn.html"));
    };

    /**
      Generates a URL to take the user to an oAuth IDP in order to obtain an authorization code,
      to be subsequently presented to the token endpoint (likely, by a server process).
      @param {string} authorization_endpoint - the base URL to the IDP endpoint used for obtaining access codes
      @param {string} client_id - client (RP) identifier registered with the IDP
      @param {string} scopes - space-separated list of scopes requested by this client to obtain for this user
      @param {string} state - whatever details are useful to get back from the IDP upon return, so
                                    the local processing logic can resume
    */
    obj.getRequestURL = function (authorization_endpoint, client_id, scopes, state) {
        return authorization_endpoint + '?response_type=code&scope=' + encodeURIComponent(scopes) + '&redirect_uri=' + this.getRedirectURI() + '&state=' + encodeURIComponent(state) + '&nonce=' + this.generateNonce(client_id) + '&client_id=' + client_id;
    };

    /*
     * This generates a non cryptographically secure pseudo random number and should only be used for compatibility
     * with older browsers (<= IE 10) that don't support the crypto API.
     */
    obj.generateNonCryptoNonce = function () {
        return Math.random().toString(36).substr(2, 12);
    };

    obj.generateNonce = function () {
        var cryptoObj = window.crypto || window.msCrypto,
            nonce;
        nonce = cryptoObj ? String.fromCharCode.apply(null, cryptoObj.getRandomValues(new Uint8Array(16))) : this.generateNonCryptoNonce();
        sessionStorage.setItem("OAuthNonce", btoa(nonce).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"));
        return nonce;
    };

    obj.getCurrentNonce = function () {
        var nonce = sessionStorage.getItem("OAuthNonce");
        sessionStorage.removeItem("OAuthNonce");
        return nonce;
    };

    return obj;
});
