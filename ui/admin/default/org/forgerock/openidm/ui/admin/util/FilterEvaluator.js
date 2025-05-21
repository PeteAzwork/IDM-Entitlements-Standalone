"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["underscore"], function (_) {
    return {
        getValueFromJSONPointer: function getValueFromJSONPointer(pointer, object) {
            var parts = pointer.split('/');
            if (parts[0] === "") {
                parts = parts.splice(1);
            }
            return _.reduce(parts, function (entry, key) {
                return entry ? entry[key] : undefined;
            }, object);
        },
        evaluate: function evaluate(filter, object) {
            var value;
            switch (filter.op) {
                case "none":
                    // no filter means everything evaluates to true
                    return true;
                case "and":
                    return _.reduce(filter.children, _.bind(function (currentResult, child) {
                        if (currentResult) {
                            // since this is "and" we can short-circuit evaluation by only continuing to evaluate if we haven't yet hit a false result
                            return this.evaluate(child, object);
                        } else {
                            return currentResult;
                        }
                    }, this), true);
                case "or":
                    return _.reduce(filter.children, _.bind(function (currentResult, child) {
                        if (!currentResult) {
                            // since this is "or" we can short-circuit evaluation by only continuing to evaluate if we haven't yet hit a true result
                            return this.evaluate(child, object);
                        } else {
                            return currentResult;
                        }
                    }, this), false);
                case "expr":
                    value = this.getValueFromJSONPointer(filter.name, object);
                    switch (filter.tag) {
                        case "equalityMatch":
                            return value === filter.value;
                        case "ne":
                            return value !== filter.value;
                        case "approxMatch":
                            return value.indexOf(filter.value) === 0;
                        case "co":
                            return value.indexOf(filter.value) !== -1;
                        case "greaterOrEqual":
                            return value >= filter.value;
                        case "gt":
                            return value > filter.value;
                        case "lessOrEqual":
                            return value <= filter.value;
                        case "lt":
                            return value < filter.value;
                        case "pr":
                            return value !== null && value !== undefined;
                    }
                    break;
            }
        }
    };
});
