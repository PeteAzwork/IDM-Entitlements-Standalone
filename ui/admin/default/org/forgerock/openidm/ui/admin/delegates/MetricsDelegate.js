"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate"], function ($, Constants, AbstractDelegate) {

    var obj = new AbstractDelegate(Constants.host + Constants.context);

    obj.getDropwizardMetrics = function () {
        return obj.serviceCall({
            url: "/metrics/api?_queryFilter=_type+eq+'timer'",
            type: "GET",
            suppressSpinner: true
        });
    };

    return obj;
});
