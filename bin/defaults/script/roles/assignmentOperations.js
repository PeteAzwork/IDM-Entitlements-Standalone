/*
 * Copyright 2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/* global exports, attributesInfo */

/**
 * Assignment operations module.
 *
 */
(function () {
    var _ = require('lib/lodash'),
        rolesUtil = require("roles/util");

    /**
     * Merge an attribute value with the target. Returns an object containing the new value for the attribute.
     *
     * @param {Object} target the target object
     * @param {string} name the attribute name
     * @param {(Object[] | Object | string | integer | boolean} value the attribute value
     */
    exports.mergeValues = function (target, name, value, attributesInfo) {
        if (target.hasOwnProperty(name) && Array.isArray(target[name])) {
            for (var x = 0; x < value.length; x++) {
                var index = rolesUtil.genericIndexOf(target[name], value[x]);
                if (index === -1) {
                    target[name].push(value[x]);
                }
            }
        } else if (target.hasOwnProperty(name) && _.isObject(target[name])) {
            for (var key in value) {
                target[name] = value[key];
            }
        } else {
            target[name] = value;
        }

        //Return the result object
        return {
            "value" : target[name]
        };
    };

    /*
     * Remove an attribute value from the existing target attribute. Returns an object containing the new value for
     * the attribute.
     *
     * @param {Object} target the target object
     * @param {string} name the attribute name
     * @param {(Object[] | Object | string | integer | boolean} value the attribute value
     */
    exports.removeValues = function (target, name, value, attributesInfo) {
        if (target.hasOwnProperty(name)) {
            var targetValue = target[name];
            if (target.hasOwnProperty(name) && Array.isArray(target[name])) {
                for (var x = 0; x < value.length; x++) {
                    var index = rolesUtil.genericIndexOf(targetValue, value[x]);
                    if (index > -1) {
                        targetValue.splice(index, 1);
                    }
                }
            } else if (target.hasOwnProperty(name) && _.isObject(target[name])) {
                delete targetValue[name];
            } else {
                target[name] = null;
            }
        }
        //Return the result object
        return {
            "value" : target[name]
        };
    };

    /*
     * Replaces an attribute value on the target. This operation makes use of the attributesInfo object by keeping
     * track of target attributes that have already been replaced. This way multiple replaceTarget operations on the
     * same attribute will be merged. Returns an object containing the new value for the attribute and an updated
     * attributesInfo object.
     *
     * @param {Object} target the target object
     * @param {string} name the attribute name
     * @param {(Object[] | Object | string | integer | boolean} value the attribute value
     */
    exports.replaceValues = function (target, name, value, attributesInfo) {
        // Determine if the target has already been replaced by looking at the attributesInfo.replaced.
        // The value of attributesInfo.replaced is an object that will contain a true/false value for every
        // attributeName that has already been replaced in the target object.
        var replaced = {};
        if (attributesInfo.hasOwnProperty("replaced")) {
            // There have been previous replaceTarget operations, check if any have replaced this attribute
            replaced = attributesInfo.replaced;
            if (replaced.hasOwnProperty(name) && replaced[name] === true) {
                // This attribute has been previously replace, so merge values
                exports.mergeValues(target, name, value);
            } else {
                // Mark the current attribute as replaced
                replaced[name] = true;
                // Do the replace on the target
                target[name] = value;
            }

        } else {
            // No replaceTarget operations have been performed, initialize attributeInfo.replaced
            replaced[name] = true;
            // Do the replace on the target
            target[name] = value;
        }

        // Update attributesInfo
        attributesInfo["replaced"] = replaced;

        // Return the result object with the updated attributesInfo
        return {
            "value" : target[name],
            "attributesInfo" : attributesInfo
        };
    };

    /*
     * This script simply returns the mapped attribute value in the target object.
     *
     * @param {Object} target the target object
     * @param {string} name the attribute name
     * @param {(Object[] | Object | string | integer | boolean} value the attribute value
     */
    exports.noOp = function (target, name, value, attributesInfo) {
        return {
            "value" : target[name]
        };
    };
}());