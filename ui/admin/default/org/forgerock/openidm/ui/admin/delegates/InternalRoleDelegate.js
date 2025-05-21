"use strict";

/*
 * Copyright 2018-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate"], function (Constants, AbstractDelegate) {

    var obj = new AbstractDelegate(Constants.host + Constants.context + "/internal/role");

    obj.serviceCall = function (callParams) {
        callParams.errorsHandlers = callParams.errorsHandlers || {};
        callParams.errorsHandlers.policy = {
            status: 403,
            event: Constants.EVENT_POLICY_FAILURE
        };

        return AbstractDelegate.prototype.serviceCall.call(this, callParams);
    };

    return obj;
});
