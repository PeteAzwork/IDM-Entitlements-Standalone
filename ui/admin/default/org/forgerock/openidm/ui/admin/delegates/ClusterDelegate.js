"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate"], function ($, Constants, AbstractDelegate) {

    var obj = new AbstractDelegate(Constants.host + Constants.context);

    obj.getNodes = function () {
        return obj.serviceCall({
            url: "/cluster?_queryId=query-cluster-instances&fields=*",
            type: "GET",
            suppressSpinner: true
        });
    };

    obj.getIndividualNode = function (nodeId) {
        return obj.serviceCall({
            url: "/cluster/" + nodeId,
            type: "GET",
            suppressSpinner: true
        });
    };

    return obj;
});
