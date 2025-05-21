"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate"], function (Constants, AbstractDelegate) {

    var obj = new AbstractDelegate(Constants.host + Constants.context + "/workflow/processdefinition");

    obj.availableWorkflows = function () {
        var errorHandlers = {
            "notFound": {
                status: "404"
            },
            "internalError": {
                status: "500"
            }
        };

        return obj.serviceCall({
            url: "?_queryFilter=true&_fields=_id",
            type: "GET",
            errorsHandlers: errorHandlers
        });
    };

    obj.workflowFormProperties = function (id) {
        var errorHandlers = {
            "notFound": {
                status: "404"
            }
        };

        return obj.serviceCall({
            url: "/" + id,
            type: "GET",
            errorsHandlers: errorHandlers
        });
    };

    return obj;
});
