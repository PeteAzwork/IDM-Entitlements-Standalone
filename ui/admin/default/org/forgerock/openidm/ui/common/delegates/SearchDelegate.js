"use strict";

/*
 * Copyright 2015-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate"], function ($, _, conf, Constants, AbstractDelegate) {

    var obj = new AbstractDelegate(Constants.host + Constants.context + "");

    obj.searchResults = function (resource, props, searchString, comparisonOperator, additionalQuery) {
        var _this = this;

        var maxPageSize = 10,
            queryFilter = additionalQuery,
            url = "/" + resource + "?_pageSize=" + maxPageSize;

        return this.getQueryThreshold(resource).then(function (queryThreshold) {
            if (searchString.length) {
                queryFilter = obj.generateQueryFilter(props, searchString, additionalQuery, comparisonOperator); // [a,b] => "a or (b)"; [a,b,c] => "a or (b or (c))"
            }

            if (queryFilter === undefined) {
                queryFilter = "true";
            }
            // add queryFilter to url
            url = url + "&_queryFilter=" + queryFilter;

            if (queryThreshold && queryFilter === "true") {
                // do not add sort keys
            } else {
                url = url + "&_sortKeys=" + props[0];
            }

            if (!queryThreshold || queryThreshold && queryFilter === "true" || queryThreshold && searchString.length >= queryThreshold) {
                return _this.serviceCall({
                    "type": "GET",
                    "url": url
                }).then(function (qry) {
                    return _.take(qry.result, maxPageSize); //we never want more than 10 results from search in case _pageSize does not work
                }, function (error) {
                    console.error(error);
                });
            } else {
                return $.Deferred().resolve({ result: [] });
            }
        });
    };

    obj.generateQueryFilter = function (props, searchString, additionalQuery, comparisonOperator) {
        var operator = comparisonOperator ? comparisonOperator : "sw",
            queryFilter,
            conditions = _(props).reject(function (p) {
            return !p;
        }).map(function (p) {
            var op = operator;

            if (p === "_id" && op !== "neq") {
                op = "eq";
            }

            if (op !== "pr") {
                return p + ' ' + op + ' "' + encodeURIComponent(searchString) + '"';
            } else {
                return p + ' pr';
            }
        }).value();

        queryFilter = "(" + conditions.join(" or (") + new Array(conditions.length).join(")") + ")";

        if (additionalQuery) {
            queryFilter = "(" + queryFilter + " and (" + additionalQuery + "))";
        }

        return queryFilter;
    };

    obj.getQueryThreshold = function (resource) {
        var promise = $.Deferred(),
            objectName = resource.split("/")[1],
            countOnlyUrl = "/" + resource + "?_countOnly=true&_queryFilter=true&_totalPagedResultsPolicy=EXACT",
            defaultMinimumUIFilterLength = Constants.MINIMUM_UI_FILTER_LENGTH;

        if (resource.startsWith("system/") || resource.startsWith("internal/")) {
            promise.resolve(0);
        } else if (resource.startsWith("managed/") && _.has(conf.globalData, "platformSettings.managedObjectsSettings." + objectName + ".minimumUIFilterLength")) {
            // there is a config setting for this object's minimumUIFilterLength
            // this setting always takes precedence
            promise.resolve(conf.globalData.platformSettings.managedObjectsSettings[objectName].minimumUIFilterLength);
        } else if (_.has(conf.globalData.managedObjectMinimumUIFilterLength, objectName)) {
            // there is a conf.globalData.managedObjectMinimumUIFilterLength setting for this object
            // which means the _countOnly query has been executed and the setting was saved based on it's results
            // this keeps the number of _countOnly queries to a minimum
            promise.resolve(conf.globalData.managedObjectMinimumUIFilterLength[objectName]);
        } else {
            // there are no conf.globalData settings saved for this object's minimumUIFilterLength
            // execute a _countOnly query and if the resultCount is > 1000 set the queryThreshold to
            // defaultMinimumUIFilterLength else set queryThreshold to zero then add a setting
            // to conf.globalData.managedObjectMinimumUIFilterLength for the object.
            var setManagedObjectMinimumUIFilterLength = function setManagedObjectMinimumUIFilterLength(minimumUIFilterLength) {
                if (!_.has(conf.globalData, "managedObjectMinimumUIFilterLength")) {
                    conf.globalData.managedObjectMinimumUIFilterLength = {};
                }

                conf.globalData.managedObjectMinimumUIFilterLength[objectName] = minimumUIFilterLength;
            };

            this.serviceCall({
                "type": "GET",
                "url": countOnlyUrl,
                "headers": {
                    "accept-api-version": "protocol=2.2,resource=1.0"
                }
            }).then(function (countOnlyResult) {
                if (_.has(countOnlyResult, "resultCount")) {
                    if (countOnlyResult.resultCount > 1000) {
                        setManagedObjectMinimumUIFilterLength(defaultMinimumUIFilterLength);
                        promise.resolve(defaultMinimumUIFilterLength);
                    } else {
                        setManagedObjectMinimumUIFilterLength(0);
                        promise.resolve(0);
                    }
                } else {
                    // the _countOnly query did not return a resultCount in this case use
                    // defaultMinimumUIFilterLength as the queryThreshold;
                    setManagedObjectMinimumUIFilterLength(defaultMinimumUIFilterLength);
                    promise.resolve(defaultMinimumUIFilterLength);
                }
            });
        }

        return promise;
    };

    return obj;
});
