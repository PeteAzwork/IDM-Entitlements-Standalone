"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate"], function ($, Constants, AbstractDelegate) {

    var obj = new AbstractDelegate(Constants.host + Constants.context + "/");

    obj.availableHandlers = function () {
        return obj.serviceCall({
            url: "audit?_action=availableHandlers",
            type: "POST"
        });
    };

    obj.getAuditData = function (auditType, auditQuery) {
        var promise = $.Deferred();

        obj.serviceCall({
            url: "audit/" + auditType + "?_queryFilter=" + auditQuery,
            type: "GET"
        }).then(function (data) {
            promise.resolve(data);
        }, function (data) {
            promise.reject(data);
        });

        return promise.promise();
    };

    obj.getAuditReport = function (event, start, end, filter, aggregateFields) {
        var queryFilter = "report/audit/" + event + "?_queryFilter=timestamp+gt+\"" + start + "\"+and+timestamp+lt+\"" + end + "\"" + filter + "&aggregateFields=" + aggregateFields;

        return obj.serviceCall({
            url: queryFilter,
            type: "GET",
            suppressSpinner: true
        });
    };

    obj.getAuditReportWithCustomFilter = function (event, filter, aggregateFields) {
        var url = "report/audit/" + event + "?_queryFilter=" + filter + "&aggregateFields=" + aggregateFields;

        return obj.serviceCall({
            url: url,
            type: "GET",
            suppressSpinner: true
        });
    };

    return obj;
});
