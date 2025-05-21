/*
 * Copyright 2014-2019 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/*
 * This script merges an attribute value with the target. Returns an object
 * containing the new value for the attribute and (optionally) an updated
 * attributesInfo object.
 *
 * The following variables are supplied:
 *   targetObject, sourceObject, existingTargetObject, attributeName, attributeValue, attributesInfo
 */

var _ = require('lib/lodash');
var rolesUtil = require("roles/util");

function mergeValues(target, name, value) {
    if (target[name] && Array.isArray(target[name])) {
        var targetValue = target[name];
        for (var x = 0; x < value.length; x++) {
            var index = rolesUtil.genericIndexOf(targetValue, value[x]);
            if (index === -1) {
                target[name].push(value[x]);
            }
        }
    } else if (target[name] && _.isObject(target[name])) {
        var obj = target[name];
        for (var key in value) {
            obj[key] = value[key];
        }
    } else {
        target[name] = value;
    }
}

if (existingTargetObject && existingTargetObject[attributeName]) {
    mergeValues(targetObject, attributeName, existingTargetObject[attributeName]);
}

mergeValues(targetObject, attributeName, attributeValue);

//Return the result object
var result = {
    "value" : targetObject[attributeName]
};

result;
