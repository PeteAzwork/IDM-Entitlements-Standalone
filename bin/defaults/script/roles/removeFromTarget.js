/*
 * Copyright 2014-2017 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/*
 * This script removes an attribute value from the existing target attribute and returns the new target attribute value
 *
 * The following variables are supplied:
 *   targetObject, sourceObject, existingTargetObject, attributeName, attributeValue
 */

var result = {
        "value" : null
    };

function removeValues(target, name, value) {
    if (target[name] != null) {
        var targetValue = target[name];
        if (targetValue instanceof Array) {
            for (var x = 0; x < value.length; x++) {
                var index = require("roles/util").genericIndexOf(targetValue, value[x]);
                if (index > -1) {
                    targetValue.splice(index, 1);
                }
            }
        } else if (targetValue instanceof Object) {
            if (targetValue.hasOwnProperty(name)) {
                delete targetValue[name];
            }
        } else {
            target[name] = null;
        }
    }
}

if (existingTargetObject !== null && existingTargetObject !== undefined) {
    removeValues(existingTargetObject, attributeName, attributeValue);
    result.value = existingTargetObject[attributeName];
}

result;
