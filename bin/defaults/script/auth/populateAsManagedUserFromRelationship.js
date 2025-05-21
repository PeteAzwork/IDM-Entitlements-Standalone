/*
 * Copyright 2016-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/*global security, properties, openidm */

/**
 * This security context population script is called when the auth module authenticates a
 * user from a security context which is related to managed/idpData, and we wish to aggregate
 * the current security context with the one for the linked managed/user record (if found).
 *
 * global properties - auth module-specific properties from authentication.json for the
 *                     a potential OAUTH or OPENID_CONNECT auth module
 *      {
 *          "name" : "",
 *          "properties" : {
 *              "augmentSecurityContext": {
 *                  "type" : "text/javascript",
 *                  "file" : "auth/populateAsManagedUserFromRelationship.js"
 *              },
 *              "queryOnResource" : "managed/google",
 *              "propertyMapping" : {
 *                  "userRoles" : "authzRoles",
 *                  "authenticationId" : "_id"
 *              }
 *          },
 *          "defaultUserRoles" : [
 *              "internal/role/openidm-authorized"
 *          ],
 *          "resolvers" : [
 *          ...
 *          ],
 *          "authTokenHeader" : "authToken",
 *          "authResolverHeader" : "provider"
 *          ...
 *      }
 *
 * global security - map of security context details as have been determined thus far
 *
 *      {
 *          "authorization": {
 *              "id": "jsmith",
 *              "component": "managed/google",
 *              "roles": [ "internal/role/openidm-authorized" ]
 *          },
 *          "authenticationId": "1234567",
 *      }
 */

(function () {
    logger.debug("Augment context for: {}", security.authenticationId);
    var _ = require("lib/lodash"),
        provider = security.authorization.provider,
        results = openidm.query("managed/" + provider,
            {'_queryFilter': requestContextMap.authenticationId + ' eq "' + security.authenticationId + '"'},
            ["*","user"]);

    if (results.resultCount !== 1) {
        throw {
            "code" : 401,
            "message" : "Access denied"
        };
    }

    baseObject = results.result[0];

    if (!baseObject || !baseObject.user) {
        throw {
            "code" : 401,
            "message" : "Access denied"
        };
    }

    var managedUser = openidm.read(baseObject.user._ref, null, ["*", "authzRoles/*"]);

    if (managedUser.accountStatus !== "active") {
        throw {
            "code" : 401,
            "message" : "Access denied"
        };
    }

    // copy and update necessary fields within security authorization map
    var securityContextClone = {};
    Object.keys(security.authorization).forEach(function (k) {
        securityContextClone[k] = security.authorization[k];
    });

    securityContextClone.id = managedUser._id;
    securityContextClone.component =  "managed/user";
    securityContextClone.queryId = "credential-query";
    securityContextClone.authenticationIdProperty = "username";
    securityContextClone.provider = provider;
    securityContextClone.roles = managedUser.authzRoles
            ? _.uniq(
                security.authorization.roles.concat(
                    _.map(managedUser.authzRoles, function (role) {
                        // appending empty string gets the value from java into a format more familiar to JS
                        return org.forgerock.json.resource.ResourcePath.valueOf(role._ref) + "";
                    })
                )
            )
            : security.authorization.roles;
    securityContextClone.authenticationId = managedUser.userName;

    security.authorization = securityContextClone;

    return security;

}());
