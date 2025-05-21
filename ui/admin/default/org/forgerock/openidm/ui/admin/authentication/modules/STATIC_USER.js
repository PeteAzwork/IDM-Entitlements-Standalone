"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "form2js", "org/forgerock/openidm/ui/admin/authentication/AuthenticationAbstractView"], function ($, _, Form2js, AuthenticationAbstractView) {

    var StaticUserView = AuthenticationAbstractView.extend({
        template: "templates/admin/authentication/modules/STATIC_USER.html",

        knownProperties: AuthenticationAbstractView.prototype.knownProperties.concat(["username", "password"]),

        render: function render(args, callback) {
            var _this = this;

            this.data = _.cloneDeep(args);
            this.data.resources = ["internal/user"]; // STATIC and INTERNAL modules only have the single option.
            this.data.customProperties = this.getCustomPropertiesList(this.knownProperties, this.data.config.properties || {});

            this.parentRender(function () {
                callback();
                _this.postRenderComponents({
                    "customProperties": _this.data.customProperties,
                    "name": _this.data.config.name,
                    "augmentSecurityContext": _this.data.config.properties.augmentSecurityContext || {}
                });
            });
        }
    });

    return new StaticUserView();
});
