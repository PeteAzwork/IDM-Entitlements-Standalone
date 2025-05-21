"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["org/forgerock/openidm/ui/admin/authentication/modules/DelegatedAbstractView"], function (DelegatedAbstractView) {

    var InternalUserView = DelegatedAbstractView.extend({
        customPreRender: function customPreRender() {
            this.data.resources = ["internal/user"]; // STATIC and INTERNAL modules only have the single option.
        }
    });

    return new InternalUserView();
});
