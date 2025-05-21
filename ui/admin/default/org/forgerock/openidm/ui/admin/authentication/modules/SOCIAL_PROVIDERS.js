"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "form2js", "org/forgerock/openidm/ui/admin/authentication/AuthenticationAbstractView", "org/forgerock/openidm/ui/common/delegates/SocialDelegate"], function ($, _, Form2js, AuthenticationAbstractView, SocialDelegate) {

    var SocialProvidersView = AuthenticationAbstractView.extend({
        template: "templates/admin/authentication/modules/SOCIAL_PROVIDERS.html",
        events: _.assignIn({
            "change #toggle-enabled": "enableModule"
        }, AuthenticationAbstractView.prototype.events),

        partials: AuthenticationAbstractView.prototype.partials.concat(["partials/_alert.html"]),

        enableModule: function enableModule(e) {
            function setDisableState(state) {
                this.$el.find("#noSocialProvidersAlert").toggle(state);
            }

            if ($(e.currentTarget).is(":checked")) {
                SocialDelegate.providerList().then(_.bind(function (data) {
                    if (data.providers.length === 0) {
                        setDisableState.call(this, true);
                    } else {
                        setDisableState.call(this, false);
                    }
                }, this));
            } else {
                setDisableState.call(this, false);
            }
        },

        render: function render(args, callback) {
            var _this = this;

            this.data = _.cloneDeep(args);
            if (!_.has(this.data, "config.properties.augmentSecurityContext")) {
                this.data.config.properties.augmentSecurityContext = {
                    "type": "text/javascript",
                    "file": "auth/populateAsManagedUserFromRelationship.js"
                };
            }
            this.data.userOrGroupOptions = _.cloneDeep(AuthenticationAbstractView.prototype.userOrGroupOptions);
            this.data.customProperties = this.getCustomPropertiesList(this.knownProperties, this.data.config.properties || {});
            this.data.userOrGroupDefault = this.getUserOrGroupDefault(this.data.config || {});

            this.parentRender(function () {
                callback();

                _this.postRenderComponents({
                    "customProperties": _this.data.customProperties,
                    "name": _this.data.config.name,
                    "augmentSecurityContext": _this.data.config.properties.augmentSecurityContext || {},
                    "userOrGroup": _this.data.userOrGroupDefault
                });
            });
        }

    });

    return new SocialProvidersView();
});
