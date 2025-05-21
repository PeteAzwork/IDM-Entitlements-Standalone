"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate"], function ($, _, Constants, AbstractDelegate) {

    var obj = new AbstractDelegate(Constants.host + Constants.context + "/maintenance");

    obj.getStatus = function () {
        return obj.serviceCall({
            url: "?_action=status",
            type: "POST"
        });
    };

    obj.disable = function () {
        return obj.serviceCall({
            url: "?_action=disable",
            type: "POST"
        });
    };

    obj.enable = function () {
        return obj.serviceCall({
            url: "?_action=enable",
            type: "POST"
        });
    };

    obj.availableUpdateVersions = function () {
        return obj.serviceCall({
            url: "/update?_action=available",
            type: "POST"
        });
    };

    obj.getLicense = function (archive) {
        return obj.serviceCall({
            url: "/update?_action=getLicense&archive=" + archive,
            type: "POST"
        });
    };

    obj.getRepoUpdates = function (archive) {
        return obj.serviceCall({
            url: "/update?_action=listRepoUpdates&archive=" + archive,
            type: "POST"
        });
    };

    obj.getUpdateFile = function (archive, path) {
        return obj.serviceCall({
            url: "/update/archives/" + archive + "/" + path + "?_fields=/contents",
            type: "GET"
        });
    };

    obj.markComplete = function (updateId) {
        return obj.serviceCall({
            url: "/update?_action=markComplete&updateId=" + updateId,
            type: "POST"
        });
    };

    obj.preview = function (archive) {
        return obj.serviceCall({
            url: "/update?_action=preview&archive=" + archive,
            type: "POST"
        });
    };

    obj.update = function (archive) {
        return obj.serviceCall({
            url: "/update?_action=update&archive=" + archive + "&acceptLicense=true",
            type: "POST"
        });
    };

    obj.restartIDM = function () {
        return obj.serviceCall({
            url: "/update?_action=restart",
            type: "POST"
        });
    };

    obj.getLastUpdateId = function () {
        return obj.serviceCall({
            url: "/update?_action=lastUpdateId",
            type: "POST",
            timeout: 1000,
            errorsHandlers: {
                "timeout": {
                    value: 0,
                    field: "readyState"
                }
            }
        });
    };

    obj.getLogDetails = function (logId) {
        return obj.serviceCall({
            url: "/update/log/" + logId,
            type: "GET"
        });
    };

    obj.getUpdateLogs = function (options) {
        var queryString = this.parseQueryOptions(this.getUpdateLogFields(), options, true);
        return obj.serviceCall({
            url: "/update/log/?_queryFilter=true" + queryString,
            type: "GET"
        });
    };

    obj.getUpdateLogFields = function () {
        return ['archive', 'completedTasks', 'endDate', 'files', 'nodeId', 'startDate', 'status', 'statusMessage', 'totalTasks', 'userName'];
    };

    obj.parseQueryOptions = function (fields, options) {
        if (options) {
            if (options.fields) {
                return '&_fields=' + options.fields.join(',');
            } else if (options.excludeFields) {
                return '&_fields=' + fields.filter(function (field) {
                    return options.excludeFields.indexOf(field) === -1;
                }).join(',');
            }
        }
        return '';
    };

    return obj;
});
