"use strict";

/*
 * Copyright 2014-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/main/AbstractDelegate"], function ($, _, Constants, ConfigDelegate, AbstractDelegate) {

    var obj = new AbstractDelegate(Constants.host + Constants.context + "/system");

    obj.connectorDelegateCache = {};

    obj.availableConnectors = function () {
        return obj.serviceCall({
            url: "?_action=availableConnectors",
            type: "POST"
        });
    };

    obj.detailsConnector = function (connectorParams) {
        return obj.serviceCall({
            url: "?_action=createCoreConfig",
            type: "POST",
            data: JSON.stringify(connectorParams)
        });
    };

    obj.testConnector = function (connectorParams) {
        var errorHandlers = {
            "error": {
                status: "500"
            }
        };

        return obj.serviceCall({
            url: "?_action=createFullConfig",
            type: "POST",
            data: JSON.stringify(connectorParams),
            errorsHandlers: errorHandlers
        });
    };

    obj.currentConnectors = function () {
        var deferred = $.Deferred(),
            promise = deferred.promise();

        if (obj.connectorDelegateCache.currentConnectors) {
            deferred.resolve(_.clone(obj.connectorDelegateCache.currentConnectors));
        } else {
            var currentConnectors = [];
            ConfigDelegate.configQuery("_id sw 'provisioner.openicf/'").then(function (response) {
                response.result.forEach(function (result) {
                    var objectTypes = ["__ALL__"];
                    if (result.objectTypes) {
                        Object.keys(result.objectTypes).forEach(function (key) {
                            objectTypes.push(key);
                        });
                    }
                    currentConnectors.push({
                        name: _.last(result._id.split('/')),
                        enabled: result.enabled,
                        config: "config/" + result._id,
                        connectorRef: result.connectorRef,
                        displayName: result.connectorRef.displayName,
                        objectTypes: objectTypes,
                        ok: false
                    });
                });
                obj.serviceCall({
                    url: "?_action=test",
                    type: "POST"
                }).then(function (result) {
                    result.forEach(function (connector) {
                        var existingConnectorIndex = currentConnectors.findIndex(function (currentConnector) {
                            return currentConnector.name === connector.name;
                        });
                        if (existingConnectorIndex > -1) {
                            currentConnectors[existingConnectorIndex] = connector;
                        } else {
                            currentConnectors.push(connector);
                        }
                    });
                    obj.connectorDelegateCache.currentConnectors = currentConnectors;

                    deferred.resolve(result);
                });
            });
        }

        return promise;
    };

    obj.queryConnector = function (name) {
        return obj.serviceCall({
            url: "/" + name + "?_queryFilter=true&_fields=_id,dn",
            type: "GET"
        });
    };

    obj.deleteCurrentConnectorsCache = function () {
        delete obj.connectorDelegateCache.currentConnectors;
    };

    obj.connectorDefault = function (name, type) {
        return $.ajax({
            dataType: "json",
            type: "GET",
            url: "templates/admin/connector/configs/" + type + "/" + name + ".json"
        });
    };

    obj.templateCheck = function (name) {
        return $.ajax({
            type: "GET",
            url: "templates/admin/connector/" + name + ".html"
        });
    };

    obj.getConnectorsOfType = function (bundleName) {
        return obj.currentConnectors().then(function (currentConnectors) {
            return _.reject(currentConnectors, function (connector) {
                return bundleName !== connector.connectorRef.bundleName;
            });
        });
    };

    obj.performLiveSync = function (sourceObject) {
        var errorHandlers = {
            "error": {
                status: "500"
            }
        };

        return obj.serviceCall({
            serviceUrl: Constants.host + Constants.context + "/" + sourceObject,
            url: "?_action=livesync",
            type: "POST",
            errorsHandlers: errorHandlers
        });
    };

    obj.getLastLivesync = function (sourceObject) {
        var _id = sourceObject.split("/").join("").toUpperCase();

        return obj.serviceCall({
            serviceUrl: Constants.host + Constants.context + "/repo/synchronisation/pooledSyncStage",
            url: '?_queryFilter=_id eq "' + _id + '"',
            type: "GET"
        }).then(function (lastLivesync) {
            return lastLivesync.result[0];
        });
    };

    return obj;
});
