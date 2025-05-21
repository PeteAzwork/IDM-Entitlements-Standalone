/*
 * Copyright 2014-2019 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

 /*global source, linkQualifier, require */
 (function () {
    var _ = require('lib/lodash');

    /**
     * This function will be called for the onCreate trigger for managed users. It must determine which
     * conditional role grants will be preserved/applied-to/removed-from the given user.
     * @param user the newly-created, or updated, user
     * @param rolesPropName the name of the array in the user referencing the user's roles
     */
    function valueForTargetField(mapping, sourceObject, field) {
        var j = 0, p,
            conditionResult,
            returnValue,
            source = {};

        for (j = 0; j < mapping.properties.length; j++) {
            p = mapping.properties[j];
            if (p.target === field) {

                if (typeof p.condition === "object" && p.condition !== null) {

                    // If this condition uses a linkQualifier to distinguish it, then make sure that the given qualifier
                    // matches the qualifier used to execute this script. Otherwise, skip it.
                    if (p.condition.linkQualifier !== undefined &&
                        typeof linkQualifier !== undefined &&
                        p.condition.linkQualifier !== linkQualifier) {
                        return "";
                    }

                    // If this is a condition script (assuming based on the presence of a "type" property) then
                    // evaluate that condition and decide whether or not to include it based on the result
                    if (typeof p.condition.type !== "undefined") {
                        if (openidm.action("script", "eval", _.extend(p.condition,
                                {
                                    "globals": {
                                        "object": sourceObject,
                                        "linkQualifier": linkQualifier
                                    }
                                })
                            ) !== true) {

                            return "";
                        }
                    }
                }

                if (typeof p.transform === "object" && p.transform.type === "text/javascript" &&
                        typeof (p.transform.source) === "string") {

                    if (typeof(p.source) !== "undefined" && p.source.length) {
                        source = sourceObject[p.source];
                    } else {
                        source = sourceObject;
                    }

                    // A failure to evaluate the script implies that the source script isn't a valid candidate for syncing;
                    // errors thrown as a result will prevent the sync from occurring.
                    try {
                        returnValue = eval(p.transform.source); // references to "source" variable expected within this string
                    } catch (e) {
                        throw {
                            "code" : 500,
                            "message" : "Unable to evaluate transformation script for field " + field,
                            "detail": {
                                "message": "Unable to evaluate transformation script for field " + field
                            }
                        };
                    }

                } else if (typeof(p.source) !== "undefined" && p.source.length) {

                    returnValue = sourceObject[p.source];

                }

                if (typeof(p["default"]) !== "undefined" && p["default"].length) {

                    if (returnValue === null || returnValue === undefined) {
                        returnValue = p["default"];
                    }

                }

                if (returnValue) {
                    return returnValue;
                } else {
                    return "";
                }
            }
        }
        return "";
    };

    /**
     * This function will be called for the onCreate trigger for managed users. It must determine which
     * conditional role grants will be preserved/applied-to/removed-from the given user.
     * @param user the newly-created, or updated, user
     * @param rolesPropName the name of the array in the user referencing the user's roles
     */
    function parseExpression(mapping, expression) {
        var equalTo = org.forgerock.util.query.QueryFilter.equalTo,
            or = org.forgerock.util.query.QueryFilter.or,
            and = org.forgerock.util.query.QueryFilter.and,
            alwaysFalse = org.forgerock.util.query.QueryFilter.alwaysFalse,
            getResults = function (container) {
                var j,tmp,resultArray = [];
                for (j = 0; j<container.length; j++) {
                    if (typeof container[j] === "string") {
                        resultArray.push(equalTo(container[j], valueForTargetField(mapping, source, container[j])));
                    } else {
                        tmp = parseExpression(mapping, container[j]);
                        if (typeof tmp === "object") {
                            resultArray.push(tmp);
                        }
                    }
                }
                return resultArray.length ? resultArray : alwaysFalse();
            };

        if (typeof expression.any === "object") {
            return or(getResults(expression.any));
        } else if (typeof expression.all === "object") {
            return and(getResults(expression.all));
        } else {
            return "";
        }

    };

    function queryFilterForMapping(mapping) {
        var syncConfig = openidm.read("config/sync"),
            expression = "",
            i = 0;
        while (i < syncConfig.mappings.length) {
            if (syncConfig.mappings[i].name === mapping) {
                break;
            }
            i++;
        }

        if (i < syncConfig.mappings.length) {
            if (typeof expressionTree === "object" && expressionTree !== null) {
                expression = parseExpression(syncConfig.mappings[i], expressionTree);
            }
        }

        return {'_queryFilter': expression.toString()}
    };


    // Only export functions if loaded via require()
    if (typeof(exports) == "undefined") {
        // Direct script execution
        return queryFilterForMapping(mapping);
    } else {
        (function () {
            exports.queryFilterForMapping = queryFilterForMapping;
            exports.parseExpression = parseExpression;

            // if request is not available this file has been loaded by require('correlateTreeToQueryFilter') from a test script
            if (typeof(request) == 'undefined') {
                // provide a mock openidm object for testing
                exports.mockRouter = function (router) {
                    openidm = router;
                };
                exports.mockSource = function (mockSource) {
                    source = mockSource
                };
            }
        }());
    }
}());
