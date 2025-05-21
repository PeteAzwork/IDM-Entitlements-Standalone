"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate"], function (Constants, AbstractDelegate) {

    var obj = new AbstractDelegate(Constants.host + Constants.context + "/health");

    obj.connectorDelegateCache = {};

    obj.getOsHealth = function () {
        return obj.serviceCall({
            url: "/os"
        });
    };

    obj.getMemoryHealth = function () {
        return obj.serviceCall({
            url: "/memory"
        });
    };

    obj.getReconHealth = function () {
        return obj.serviceCall({
            url: "/recon"
        });
    };

    return obj;
});
