/*
 * Copyright 2018-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
/*
    This script needs access to router-authz's allowRequest() function to test access to
    each relationship _ref in this response.
*/
var allowRequest = require("router-authz").allowRequest,
    _ = require("lib/lodash"),
    originalRequest = _.cloneDeep(request),
    testAccess = function (_ref) {
        var requestTemplate = {
                "method": "read",
                "fields": {},
                "resourcePath": "",
                "additionalParameters": {}
            };
        /*
            If the object has a _ref set the global request variable to the
            requestTemplate, replace the resourcePath with the _ref of the
            object in question, then try to run router-authz's allowRequest() on this path.
        */
        requestTemplate.resourcePath = _ref;
        request = requestTemplate;

        return allowRequest(request);
    },
    isRelationship = function (property) {
        return _.isObject(property) && _.has(property, "_ref") && _.has(property, "_refProperties");
    },
    isArrayOfRelationships = function (property) {
        return _.isObject(property) &&
            _.toArray(property).length > 0 &&
            _.filter(property, function (arrayItem) { return isRelationship(arrayItem); }).length > 0
    },
    handleRelationship = function (relationship) {
        if (!testAccess(relationship._ref)) {
            /*
                Set a _refError flag on this unauthorized relationship
                so we can remove it from the response.
            */
            relationship._refError = true;
        } else {
            // filter the response of this authorized relationship object
            filterResponse(relationship);
        }
    },
    filterResponse = function (obj) {
        // loop over each property in the object
        _.each(_.keys(obj), function (key) {
            // check to see if the property is a relationship
            if (isRelationship(obj[key])) {
                handleRelationship(obj[key]);
                // delete the property if it is has a _refError
                if (obj[key]._refError === true) {
                    delete obj[key];
                }
            }
            // check to see if the property is an array of relationships
            if (isArrayOfRelationships(obj[key])) {
                // loop over each array item and and handle each individually
                _.each(_.toArray(obj[key]), function (arrayItem) {
                    handleRelationship(arrayItem);
                });
                // filter out all the _refErrors
                obj[key] = _.toArray(_.pick(obj[key], function (item) {
                    return !item._refError;
                }));
                // If this property is empty after filtering _refErrors delete it from the response.
                if (obj[key].length === 0) {
                    delete obj[key];
                }
            }
        });
    };

(function () {
    exports.filterResponse = function() {
        filterResponse(response.content);
        //put global request variable back to it's original state
        request = originalRequest;
    }
}());
