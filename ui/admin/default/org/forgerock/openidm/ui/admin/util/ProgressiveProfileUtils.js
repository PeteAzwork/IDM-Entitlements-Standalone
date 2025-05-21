"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash"], function ($, _) {

    var obj = {};
    /**
     * @param availableProps {array} - array of availableProps objects
     * @param existingProps {array} - properties to be filtered out
     * @returns {array} - an array of property names
     *
     * This function looks a list of available properties, digs into all the properties of type object
     * with the userEditable and viewable flags set to true, grabs each of their respective nested properties,
     * and adds them to the list of availableProps. It then filters out the all props that are not of
     * type string or boolean, are named "_id", are encrypted, or are already in existingProps list.
     */
    obj.filteredPropertiesList = function (availableProps, existingProps) {
        var nestedProps = {},
            addNestedProps = function addNestedProps(prop, key) {
            _.forEach(prop.properties, function (nestedProp, nestedPropKey) {
                var fullPropKey = key + "/" + nestedPropKey;

                if (nestedProp.type === "object") {
                    addNestedProps(nestedProp, fullPropKey);
                } else {
                    nestedProps[fullPropKey] = nestedProp;
                }
            });
        };

        _.forEach(availableProps, function (prop, key) {
            if (prop.type === "object" && prop.userEditable && prop.viewable) {
                addNestedProps(prop, key);
            }
        });

        availableProps = _.assignIn(availableProps, nestedProps);

        return _.chain(availableProps).omit(function (prop, key) {
            var typeToOmit = prop.type !== "string" && prop.type !== "boolean";

            return typeToOmit || key === "_id" || _.has(prop, "encryption") || _.includes(existingProps, key);
        }).keys().sortBy().value();
    };
    /**
     * @param schema {array} - the properties object of a managed object schema
     * @param propName {string} - the name of the property being selected from the schema
     * @returns {string}
     *
     * This function finds a property in a schema properties object and returns a human readable title string.
     * If the selected property is nested in an object (example: "preferences/marketing") the returned string will represent
     * each level of nesting (example: "Preferences: marketing")
     *
     */
    obj.getPropertyTitle = function (schema, propName) {
        var title = "",
            propNameArray = propName.split("/"),
            basePropName = propNameArray[0],
            baseProp = schema[basePropName],
            basePropTitle = baseProp.title;

        //get rid of the first item in the propNameArray example "preferences/marketeing/foo" turns into "marketing/foo"
        propNameArray.shift();

        if (propNameArray.length) {
            var nestedProp = baseProp,
                nestedPropTitle = basePropTitle;

            _.forEach(propNameArray, function (nestedPropName) {
                nestedProp = nestedProp.properties[nestedPropName];
                nestedPropTitle += ": " + (nestedProp.title || nestedPropName);
            });

            title = nestedPropTitle;
        } else {
            title = basePropTitle || basePropName;
        }

        return title;
    };

    return obj;
});
