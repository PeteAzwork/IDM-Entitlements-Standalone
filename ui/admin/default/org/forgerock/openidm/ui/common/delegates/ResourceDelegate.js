"use strict";

/*
 * Copyright 2011-2022 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/components/Messages", "org/forgerock/openidm/ui/common/delegates/SchemaDelegate", "org/forgerock/commons/ui/common/util/ObjectUtil"], function ($, _, Constants, AbstractDelegate, configDelegate, messagesManager, SchemaDelegate, ObjectUtil) {

    var obj = new AbstractDelegate(Constants.host + Constants.context + "/");

    obj.getSchema = function (args) {
        var objectType = args[0],
            objectName = args[1],
            objectName2 = args[2];

        if (objectType === "managed") {
            return configDelegate.readEntity("managed").then(function (managed) {
                var managedObject = _.find(managed.objects, { name: objectName });

                if (managedObject) {
                    if (managedObject.schema) {
                        managedObject.schema.allSchemas = managed.objects;
                        return managedObject.schema;
                    } else {
                        return false;
                    }
                } else {
                    return "invalidObject";
                }
            });
        } else if (objectType === "system") {
            return obj.getProvisioner(objectType, objectName).then(function (prov) {
                var schema;

                if (prov.objectTypes) {
                    schema = prov.objectTypes[objectName2];
                    if (schema) {
                        schema.title = objectName;
                        return schema;
                    } else {
                        return false;
                    }
                } else {
                    return "invalidObject";
                }
            });
        } else if (objectType === "internal") {
            return SchemaDelegate.getSchema(objectType + "/" + objectName).always(function (schema) {
                return schema;
            });
        } else {
            return $.Deferred().resolve({});
        }
    };

    obj.serviceCall = function (callParams) {
        callParams.errorsHandlers = callParams.errorsHandlers || {};
        callParams.errorsHandlers.policy = {
            status: 403,
            event: Constants.EVENT_POLICY_FAILURE
        };

        return AbstractDelegate.prototype.serviceCall.call(this, callParams);
    };

    obj.createResource = function (serviceUrl) {
        return AbstractDelegate.prototype.createEntity.apply(_.assignIn({}, AbstractDelegate.prototype, this, { "serviceUrl": serviceUrl }), _.toArray(arguments).slice(1));
    };
    obj.readResource = function (serviceUrl) {
        return AbstractDelegate.prototype.readEntity.apply(_.assignIn({}, AbstractDelegate.prototype, this, { "serviceUrl": serviceUrl }), _.toArray(arguments).slice(1));
    };
    obj.updateResource = function (serviceUrl) {
        return AbstractDelegate.prototype.updateEntity.apply(_.assignIn({}, AbstractDelegate.prototype, this, { "serviceUrl": serviceUrl }), _.toArray(arguments).slice(1));
    };
    obj.deleteResource = function (serviceUrl, id, successCallback, errorCallback) {
        var callParams = {
            serviceUrl: serviceUrl, url: "/" + id,
            type: "DELETE",
            success: successCallback,
            error: errorCallback,
            errorsHandlers: {
                "Conflict": {
                    status: 409
                }
            },
            headers: {
                "If-Match": "*"
            }
        };

        return obj.serviceCall(callParams).fail(function (err) {
            var response = err.responseJSON;
            if (response.code === 409) {
                messagesManager.messages.addMessage({ "type": "error", "message": response.message });
            }
        });
    };
    obj.patchResourceDifferences = function (serviceUrl, queryParameters, oldObject, newObject, successCallback, errorCallback) {
        var schemaArgs = serviceUrl.split("/");
        schemaArgs = schemaArgs.slice(2);
        schemaArgs.push(queryParameters.id);
        return obj.getSchema(schemaArgs).then(function (schema) {
            var patchDefinition = ObjectUtil.generatePatchSet(newObject, oldObject);
            // Relationship singleton objects need to be patched with the entire object
            _.forEach(patchDefinition, function (patch, key) {
                var patchFieldArray = patch.field.split("/"),
                    // looks like => ["","manager","_ref"]
                propertyName = patchFieldArray[1],
                    propertyObject = schema.properties[propertyName],
                    propertyObjectType = propertyObject.type,
                    // type is either "string" or "array" if relationship property is nullable
                isSingletonRelationship = propertyObject && (_.isString(propertyObjectType) && propertyObjectType === "relationship" || _.isArray(propertyObjectType) && propertyObjectType[0] === "relationship");
                if (isSingletonRelationship && patch.operation === "replace" && patchFieldArray.length > 2 && typeof patch.value === "string") {
                    patch.field = propertyName;
                    // check to see if this is a change to a subProperty of _refProperties
                    if (patchFieldArray[3] && patchFieldArray[2] === "_refProperties") {
                        // in this case patchFieldArray looks like => ["","devices","_refProperties","statusCode"]
                        var _refProperties = _.cloneDeep(newObject[propertyName]._refProperties),
                            subPropName = patchFieldArray[3];
                        // set the changed _refProperties subProperty
                        _refProperties[subPropName] = patch.value;
                        patch.value = {
                            "_ref": newObject[propertyName]._ref,
                            "_refProperties": _refProperties
                        };
                    } else {
                        // in this case patchFieldArray looks like => ["","devices","_ref"]
                        // set _ref to the patch value and _refProperties from the non-changed newObject[propertyName]._refProperties
                        patch.value = {
                            "_ref": patch.value,
                            "_refProperties": newObject[propertyName]._refProperties
                        };
                    }
                }
            });
            if (patchDefinition.length === 0) {
                return $.Deferred().resolve(oldObject).then(successCallback(oldObject));
            } else {
                return AbstractDelegate.prototype.patchEntity.apply(_.assignIn({}, AbstractDelegate.prototype, this, { "serviceUrl": serviceUrl }), [queryParameters, patchDefinition, successCallback, errorCallback]);
            }
        });
    };

    obj.getServiceUrl = function (args) {
        var url = Constants.context + "/" + args[0] + "/" + args[1];

        if (args[0] === "system") {
            url += "/" + args[2];
        }

        return url;
    };

    obj.searchResource = function (filter, serviceUrl) {
        return obj.serviceCall({
            url: serviceUrl + "?_queryFilter=" + filter
        });
    };

    obj.getProvisioner = function (objectType, objectName) {
        return obj.serviceCall({
            serviceUrl: obj.serviceUrl + objectType + "/" + objectName,
            url: "?_action=test",
            type: "POST",
            errorsHandlers: {
                "NotFound": {
                    status: 404
                }
            }
        }).then(function (connector) {
            var config = connector.config.replace("config/", "");

            return configDelegate.readEntity(config);
        });
    };

    obj.linkedView = function (id, resourcePath) {
        return obj.serviceCall({
            serviceUrl: Constants.host + Constants.context + "/sync?_action=getLinkedResources&resourceName=" + resourcePath,
            url: id,
            type: "POST"
        });
    };

    obj.queryStringForSearchableFields = function (searchFields, query) {
        var queryFilter = "",
            queryFilterArr = [];
        /*
         * build up the queryFilterArr based on searchFields
         */
        _.forEach(searchFields, function (field) {
            queryFilterArr.push(field + " sw \"" + query + "\"");
        });

        queryFilter = queryFilterArr.join(" or ") + "&_pageSize=10&_fields=*";

        return queryFilter;
    };

    obj.getResource = function (url) {
        return obj.serviceCall({ url: url });
    };

    return obj;
});
