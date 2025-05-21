/*
 * Copyright 2015-2018 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
/*global security, properties, openidm */


/**
 * This context population script is called when the managed user auth module was used
 * to successfully authenticate a user
 *
 * global properties - auth module-specific properties from authentication.json for the
 *                     managed user auth module
 *
 *      {
 *          "propertyMapping": {
 *              "userRoles": "roles",
 *              "userCredential": "password",
 *              "userId": "_id"
 *          },
 *          "authnPopulateContextScript": "auth/managedPopulateContext.js",
 *          "defaultUserRoles": [  ]
 *      }
 *
 * global security - map of security context details as have been determined thus far
 *
 *      {
 *          "authorization": {
 *              "id": "jsmith",
 *              "component": "managed/user",
 *              "roles": [ "internal/role/openidm-authorized" ]
 *          },
 *          "authenticationId": "jsmith",
 *      }
 */

(function () {

    var _ = require("lib/lodash"),
        user;

    if (!_.has(properties.propertyMapping, 'userRoles')) {
        throw {
            "code" : 500,
            "message" : "Authentication not properly configured; missing userRoles propertyMapping entry"
        };
    }
    user = openidm.read(security.authorization.component + "/" + security.authorization.id, { }, [ "*", properties.propertyMapping.userRoles ]);

    if (!user || !_.has(user, properties.propertyMapping.userRoles)) {
        throw {
            "code" : 401,
            "message" : "Unable to find property " + properties.propertyMapping.userRoles + " for user"
        };
    }

    // copy and update necessary fields within security authorization map
    var securityContextClone = {};
    Object.keys(security.authorization).forEach(function (k) {
        securityContextClone[k] = security.authorization[k];
    });

    securityContextClone.roles = _.chain(user[properties.propertyMapping.userRoles])
                    .filter(function (r) {
                        return org.forgerock.json.resource.ResourcePath.valueOf(r._ref).startsWith("internal/role");
                    })
                    .map(function (r) {
                        // appending empty string gets the value from java into a format more familiar to JS
                        return org.forgerock.json.resource.ResourcePath.valueOf(r._ref) + "";
                    })
                    .value();
    security.authorization = securityContextClone;
    return security;
}());
