/*
 * Copyright 2016-2017 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/**
 * Used to perform transform operations (add/remove) against the objects array.
 * @module managedPatchHelper
 * @see managed
 */

(function () {
    /**
     * The remove operation.
     * @param {array} content The content
     * @param {string} name The unique name field
     * @param {string} path The path in dot notation
     * @returns {array} The appropriately-modified content
     */
    exports.remove = function (content, name, path) {
        var target = content;
        var currentObj;
        for (var i = 0; i < target.length; i++) {
            currentObj = target[i];
            if (currentObj["name"] === name) {
                var nodes = path.split(".");
                var obj = currentObj;
                for (var n = 0; n < nodes.length - 1; n++) {
                    obj = obj[nodes[n]];
                }
                delete obj[nodes[nodes.length - 1]];
            }
        }
        return target;
    };

    /**
     * The add operation.
     * @param {array} content The content
     * @param {string} name The unique name field
     * @param {string} path The path in dot notation
     * @param {string} value The value to be added
     * @returns {array} The appropriately-modified content
     */
    exports.add = function (content, name, path, value) {
        var target = content;
        var currentObj;
        for (var i = 0; i < target.length; i++) {
            currentObj = target[i];
            if (currentObj["name"] === name) {
                index(currentObj, path, value);
            }
        }
        return target;
    };

    exports.replace = function (content, name, path, value) {
        var target = content;
        var currentObj;
        for (var i = 0; i < target.length; i++) {
            currentObj = target[i];
            if (currentObj["name"] === name) {
                var nodes = path.split(".");
                var obj = currentObj;
                for (var n = 0; n < nodes.length - 1; n++) {
                    obj = obj[nodes[n]];
                }
                delete obj[nodes[nodes.length - 1]];
                index(currentObj, path, value);
            }
        }
        return target;
    };

    // Convert JavaScript string in dot notation into an object reference
    function index(obj, is, value) {
        if (typeof is == 'string')
            return index(obj, is.split('.'), value);
        else if (is.length == 1 && is[0] === "-" && value !== undefined)
            return obj.push(value) && obj;
        else if (is.length == 1 && value !== undefined)
            return obj[is[0]] = value;
        else if (is.length == 0)
            return obj;
        else
            return index(obj[is[0]], is.slice(1), value);
    }
}());
