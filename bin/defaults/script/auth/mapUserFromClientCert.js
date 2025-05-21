/*
 * Copyright 2018-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/**
 * This security context population script is called when the client cert auth module authenticates a
 * user from a client certificate and we wish to aggregate the current security context with the one for
 * the linked managed/user record (if found).
 *
 *      global properties - auth module-specific properties from authentication.json for the
 *                     a potential CLIENT_CERT auth module
 *      {
 *          "name" : "CLIENT_CERT",
 *          "properties" : {
 *              "augmentSecurityContext" : {
 *                  "type" : "text/javascript",
 *                  "globals" : { },
 *                  "file" : "auth/mapUserFromClientCert.js"
 *              },
 *              "queryOnResource" : "managed/user",
 *              "defaultUserRoles" : [
 *                  "internal/role/openidm-cert",
 *                  "internal/role/openidm-authorized"
 *              ],
 *              "allowedAuthenticationIdPatterns" : [
 *                  ".*CN=localhost, O=ForgeRock.*"
 *              ]
 *          },
 *          "enabled" : true`
 *      },
 *
 *      global security - map of security context details as have been determined thus far
 *
 *      {
 *          "authorization": {
 *              "id": "bill",
 *              "component": "managed/user",
 *              "roles": [ "internal/role/openidm-cert", internal/role/openidm-authorized ]
 *          },
 *          "authenticationId": "EMAILADDRESS=bill@example.com, CN=localhost, O=ForgeRock, L=Default City, C=XX"
 *      }
 */

(function () {
    logger.debug("Augment context for: {}", security.authenticationId);

    /**
     * Given a list of key value pairs defined as A=B String,
     * this method will split 'A=B' String into key/value entries and
     * add them to the map that is passed in.
     *
     * @param id the authorization id String
     */
    function getIdAsMap(id) {
        var authorizationIdOuAsMap = {};
        var pairsOfStrings = id.split(',');

        pairsOfStrings.forEach(function(x) {
            var pair = x.split('=');
            pair[1] && (authorizationIdOuAsMap[pair[0]] = pair[1]);
        });

        return authorizationIdOuAsMap;
    }

    var _ = require("lib/lodash");
    var authorizationIdOuAsMap = getIdAsMap(security.authorization.id);
    var managedUser = openidm.query(security.authorization.component, { '_queryFilter' : '/mail eq "' + authorizationIdOuAsMap.EMAILADDRESS  + '"' }, ["*", "authzRoles/*"]);

    if (managedUser.result.length === 0) {
        throw {
            "code" : 401,
            "message" : "Access denied, managed/user entry is not found"
        };
    }

    if (managedUser.result[0].accountStatus !== "active") {
        throw {
            "code" : 401,
            "message" : "Access denied, user inactive"
        };
    }

    // copy and update necessary fields within security authorization map
    var securityContextClone = {};
    Object.keys(security.authorization).forEach(function (k) {
        securityContextClone[k] = security.authorization[k];
    });

    securityContextClone.id = managedUser.result[0]._id;
    securityContextClone.roles = managedUser.result[0].authzRoles ?
            _.uniq(
                security.authorization.roles.concat(
                    _.map(managedUser.result[0].authzRoles, function (r) {
                        // appending empty string gets the value from java into a format more familiar to JS
                        return org.forgerock.json.resource.ResourcePath.valueOf(r._ref) + "";
                    })
                )
            ) :
            security.authorization.roles;
    security.privileges = _.flatten(
        _.map(
            _.filter(managedUser.result[0].authzRoles, function(role) {
                return !role.temporalConstraints
                    || org.forgerock.openidm.auth.TemporalConstraintsUtil
                        .withinTemporalConstraint(org.forgerock.json.JsonValue.json(role.temporalConstraints));
            }),
            "privileges"));

    security.authorization = securityContextClone;

    return security;

}());
