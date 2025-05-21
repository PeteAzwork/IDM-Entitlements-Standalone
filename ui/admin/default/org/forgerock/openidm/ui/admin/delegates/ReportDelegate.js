"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate"], function ($, Constants, AbstractDelegate) {

    var obj = new AbstractDelegate(Constants.host + Constants.context + "/");

    obj.getRoles = function () {
        return obj.serviceCall({
            url: "managed/role?_queryFilter=true",
            type: "GET"
        });
    };

    obj.getActiveUsers = function () {
        return obj.serviceCall({
            url: 'report/managed/user?_queryFilter=/accountStatus+eq+"active"&aggregateFields=VALUE=/accountStatus',
            type: "GET"
        });
    };

    obj.getManualRegistrations = function () {
        return obj.serviceCall({
            url: 'report/managed/user?_queryFilter=/accountStatus+eq+"active"&aggregateFields=VALUE=/idps',
            type: "GET"
        });
    };
    return obj;
});
