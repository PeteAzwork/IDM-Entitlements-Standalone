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
    * @param {object} schema - an object schema
    * @returns {array} - an array of property objects
    */
    obj.convertSchemaToPropertiesArray = function (schema) {
        var propertyNames = schema.order;

        if (!propertyNames || !propertyNames.length) {
            propertyNames = _.keys(schema.properties);
        }
        return _.map(propertyNames, function (propName) {
            var prop = schema.properties[propName];

            prop.propName = propName;

            return prop;
        });
    };
    /**
    * @param {array} propArray - an ordered array of property objects
    * @returns {object} - a schema object including ("properties")
    */
    obj.convertPropertiesArrayToSchema = function (propArray) {
        var schema = {
            properties: {}
        };

        _.forEach(propArray, function (prop) {
            schema.properties[prop.propName] = _.omit(prop, "propName");
        });

        return schema;
    };
    /**
    * This function takes in a title and propertyType and returns a default schema property based on propertyType
    * @param {string} title
    * @param {string} propertyType
    * @param {string} nativeType
    * @returns {object} - a schema property object
    */
    obj.getPropertyTypeDefault = function (propName, propertyType, nativeType) {
        var defaultProps = {
            "boolean": {
                "type": "boolean",
                "nativeName": propName,
                "nativeType": nativeType || "boolean"
            },
            "array": {
                "type": "array",
                "items": {
                    "type": "string",
                    "nativeType": nativeType || "string"
                },
                "nativeName": propName,
                "nativeType": nativeType || "string"
            },
            "object": {
                "type": "object",
                "nativeType": nativeType || "object",
                "nativeName": propName
            },
            "number": {
                "type": "number",
                "nativeType": nativeType || "number",
                "nativeName": propName
            },
            "string": {
                "type": "string",
                "nativeName": propName,
                "nativeType": nativeType || "string"
            }
        };

        return defaultProps[propertyType || "string"];
    };

    obj.getAvailableObjectTypes = function (objectTypes, connectorObjectTypes) {
        return _.pick(objectTypes, _.reject(_.keys(objectTypes), function (ot) {
            return _.includes(_.keys(connectorObjectTypes), ot);
        }));
    };

    obj.getObjectTypeAvailableProperties = function (availableObjectTypes, currentObjectType, objectTypeName) {
        var objectTypeSchema = availableObjectTypes[objectTypeName];

        if (objectTypeSchema) {
            return _.pick(objectTypeSchema.properties, _.reject(_.keys(objectTypeSchema.properties), function (prop) {
                return _.includes(_.keys(currentObjectType.properties), prop);
            }));
        } else {
            return {};
        }
    };

    obj.nativeTypes = [
    // based on openidm-provisioner-openicf/src/main/java/org/forgerock/openidm/provisioner/openicf/commons/ConnectorUtil.java, findClassForName javadoc
    "any", "JAVA_TYPE_BIGDECIMAL", "JAVA_TYPE_BIGINTEGER", "JAVA_TYPE_PRIMITIVE_BOOLEAN", "boolean", "JAVA_TYPE_BYTE_ARRAY", "JAVA_TYPE_CHAR", "JAVA_TYPE_CHARACTER", "JAVA_TYPE_DATE", "JAVA_TYPE_PRIMITIVE_DOUBLE", "JAVA_TYPE_DOUBLE", "JAVA_TYPE_FILE", "JAVA_TYPE_PRIMITIVE_FLOAT", "JAVA_TYPE_FLOAT", "JAVA_TYPE_GUARDEDBYTEARRAY", "JAVA_TYPE_GUARDEDSTRING", "JAVA_TYPE_INT", "integer", "JAVA_TYPE_PRIMITIVE_LONG", "JAVA_TYPE_LONG", "JAVA_TYPE_NAME", "number", "object", "JAVA_TYPE_OBJECTCLASS", "JAVA_TYPE_QUALIFIEDUID", "JAVA_TYPE_SCRIPT", "string", "JAVA_TYPE_UID", "JAVA_TYPE_URI"];

    obj.idmTypes = ["string", "boolean", "number", "array", "object"];

    return obj;
});
