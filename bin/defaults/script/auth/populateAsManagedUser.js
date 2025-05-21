/*
 * Copyright 2014-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/*global security, properties, openidm */


/**
 * This security context population script is called when the auth module authenticates a
 * user from a security context which is related to managed/user, and we wish to aggregate
 * the current security context with the one for the linked managed/user record (if found).
 *
 * global properties - auth module-specific properties from authentication.json for the
 *                     passthrough user auth module
 *
 *      {
 *          "authnPopulateContextScript" : "auth/populateAsManagedUser.js",
 *          "queryOnResource" : "system/AD/account",
 *          "propertyMapping" : {
 *              "groupMembership" : "memberOf"
 *              "authenticationId" : "sAMAccountName"
 *          },
 *          "defaultUserRoles" : [
 *              "internal/role/openidm-authorized"
 *          ]
 *      }
 *
 * global security - map of security context details as have been determined thus far
 *
 *      {
 *          "authorization": {
 *              "id": "jsmith",
 *              "component": "passthrough",
 *              "roles": [ "internal/role/openidm-authorized" ]
 *          },
 *          "authenticationId": "jsmith",
 *      }
 */

(function () {
    logger.debug("Augment context for: {}", security.authenticationId);

    var _ = require("lib/lodash"),
        userDetail,
        resource = properties.queryOnResource,
        propertyMapping = properties.propertyMapping,
        userIdPropertyName = propertyMapping.authenticationId,
        managedUserId,
        managedUser;


    managedUser = openidm.query("managed/user", { '_queryFilter' : '/userName eq "' + security.authenticationId  + '"' }, ["*","authzRoles/*"]);

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
    securityContextClone.component = "managed/user";
    securityContextClone.queryId = "credential-query";
    securityContextClone.authenticationIdProperty = "username";
    securityContextClone.roles = managedUser.result[0].authzRoles
            ? _.uniq(
                    security.authorization.roles.concat(
                            _.map(managedUser.result[0].authzRoles, function (role) {
                                // appending empty string gets the value from java into a format more familiar to JS
                                return org.forgerock.json.resource.ResourcePath.valueOf(role._ref) + "";
                            })
                    )
            )
            : security.authorization.roles;
    securityContextClone.authenticationId = managedUser.result[0].userName;

    security.authorization = securityContextClone;

    return require('auth/customAuthz').setProtectedAttributes(security);

}());
