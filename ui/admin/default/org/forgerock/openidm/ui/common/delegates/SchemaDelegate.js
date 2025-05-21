"use strict";

/*
 * Copyright 2017-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate", "org/forgerock/commons/ui/common/main/Configuration"], function (Constants, AbstractDelegate, conf) {

    var obj = new AbstractDelegate(Constants.host + Constants.context + "/schema/");

    obj.getSchema = function (location) {
        return obj.serviceCall({
            url: location,
            type: "GET",
            headers: {
                "accept-api-version": "resource=2.0"
            },
            errorsHandlers: {
                "noSchemaFound": { status: 404 }
            } });
    };

    obj.getPropertySchema = function (propertyUrl) {
        return obj.getSchema(propertyUrl);
    };

    obj.updateEntity = function (id, objectParam, successCallback, errorCallback) {
        var headers = {};
        // _id is not needed in calls to the config service, and can sometimes cause problems by being there.
        delete objectParam._id;

        if (objectParam._rev) {
            headers["If-Match"] = '"' + objectParam._rev + '"';
        } else {
            headers["If-Match"] = '"' + "*" + '"';
        }

        headers["Accept-API-Version"] = "resource=2.0";

        return obj.serviceCall({ url: id,
            type: "PUT",
            success: successCallback,
            error: errorCallback,
            data: JSON.stringify(objectParam),
            headers: headers
        }).always(function () {
            delete conf.delegateCache.config[id.split("/")[0]];
        });
    };

    obj.deleteEntity = function (id, successCallback, errorCallback) {
        return obj.getSchema(id).then(function (data) {
            var callParams = { url: id, type: "DELETE", success: successCallback, error: errorCallback };
            callParams.headers = [];
            callParams.headers["Accept-API-Version"] = "resource=2.0";
            if (data._rev) {
                callParams.headers["If-Match"] = '"' + data._rev + '"';
            }
            return obj.serviceCall(callParams);
        }).always(function () {
            delete conf.delegateCache.config[id.split("/")[0]];
        });
    };

    return obj;
});
