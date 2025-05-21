/*
 * Copyright 2016-2018 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

(function () {
    var _ = require("lib/lodash");

    exports.setProtectedAttributes = function (security) {
        var modifiedMap = {};
        Object.keys(security.authorization).forEach(function (k) {
            modifiedMap[k] = security.authorization[k];
        });

        // find all of the attributes in the managed object schema associated
        // with the current component which have been declared as isProtected: true
        modifiedMap.protectedAttributeList =
            _.chain(
                openidm.read("schema/" + modifiedMap.component).properties
            )
            .pairs()
            .map(function (property) {
                var propertyName = property[0],
                    propertySchema = property[1];
                if (propertySchema.isProtected) {
                    return propertyName;
                } else {
                    return undefined;
                }
            })
            .filter()
            .value();

        security.authorization = modifiedMap;
        return security;
    };

}());
