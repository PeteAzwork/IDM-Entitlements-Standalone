/*
 * Copyright 2017 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

(function () {
    var indexOfIgnoreCase = function (array, elementToFind) {
        var ret = -1;
        elementToFind = elementToFind.toLowerCase ? elementToFind.toLowerCase() : elementToFind;
        array.some(function(item, index, array) {
            item = item.toLowerCase ? item.toLowerCase() : item;
            if (elementToFind === item) {
                ret = index;
                return true;
            }
        });
        return ret;
    };

    /**
     A more flexible version of JavaScript's built-in Array.prototype.indexOf
     Unlike the JS function, this doesn't use strict equality - it will match
     strings without regard for case, and will match non-scalar values which have
     equivalent content.
     @param {Array} - the list to look through
     @param {Object} - any value to look for in the array
     @returns {Integer} - the first position found for the element in the array, or -1 if not found
    */
    exports.genericIndexOf = function (array, element) {
        var JsonValue = org.forgerock.json.JsonValue,
            index;

        if (element instanceof String || typeof(element) === 'string') {
            index = indexOfIgnoreCase(array, element);
        } else {
            index = array.reduce(
                function (result, val, idx) {
                    return JsonValue(val).isEqualTo(JsonValue(element)) ? idx : result
                }, -1);
        }
        return index;
    }
}());
