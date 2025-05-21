"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/openidm/ui/admin/authentication/AuthenticationAbstractView", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "selectize"], function ($, _, AdminUtils, AuthenticationAbstractView, BootstrapDialogUtils) {

    var AuthenticationModuleDialogView = AuthenticationAbstractView.extend({
        element: "#dialogs",
        noBaseTemplate: true,
        events: {
            "click .advancedForm > div > h3": "toggleAdvanced",
            "change .changes-watched": "changed"
        },
        model: {},
        data: {},

        /**
         * @param configs {object}
         * @param configs.config {object} - the existing config for the module
         * @param callback
         */
        render: function render(configs) {
            this.model = _.assignIn({
                defaultUserRoles: ["internal/role/openidm-admin", "internal/role/openidm-authorized", "internal/role/openidm-cert", "internal/role/openidm-reg", "internal/role/openidm-task-manager"]
            }, configs);

            this.model.readableName = $.t("templates.auth.modules." + this.model.config.name + ".name");

            // Get resources and get the JSON schema
            $.when(AdminUtils.getAvailableResourceEndpoints(), this.getModuleView(this.model.config.name)).done(_.bind(function (resources, view) {
                var _this = this;

                $("#missingTemplateError").toggleClass("hidden", true);

                this.parentRender(function () {
                    var self = _this,
                        prefix = $.t("templates.auth.modules.edit");

                    if (_this.model.newModule) {
                        prefix = $.t("templates.auth.modules.new");
                    }

                    _this.model.currentDialog = $('<div id="AuthenticationModuleDialog"></div>');
                    _this.setElement(_this.model.currentDialog);
                    $('#dialogs').append(_this.model.currentDialog);

                    view.reSetElement($('<div id="AuthenticationModuleDialogContainer"></div>'));

                    view.render(_.assignIn({ "resources": resources }, _this.model), function () {
                        var content = view.el;
                        BootstrapDialogUtils.createModal({
                            title: prefix + " " + _this.model.readableName + " " + $.t("templates.auth.modules.authFieldsetName"),
                            message: $(content),
                            onshown: function onshown() {
                                view.$el.find("select").first().focus();
                            },
                            buttons: ["cancel", {
                                label: $.t("common.form.save"),
                                id: "submitAuth",
                                cssClass: "btn-primary",
                                action: function action(dialogRef) {
                                    var newConfig = view.getConfig();

                                    if (this.hasClass("disabled")) {
                                        return false;
                                    }

                                    if (_.has(self.model.config.properties.password, "$crypto") && !_.has(newConfig.properties, "password")) {
                                        newConfig.properties.password = self.model.config.properties.password;
                                    }

                                    self.model.saveCallback(newConfig);
                                    dialogRef.close();
                                }
                            }]
                        }).open();
                    });
                });
            }, this)).fail(function (brokenModuleName) {
                $("#missingTemplateError").toggleClass("hidden", false);
                $("#missingTemplateName").text(brokenModuleName);
            });
        },

        /**
         * Gets the view corresponding to the moduleName provided
         *
         * @param moduleName
         * @returns {promise}
         */
        getModuleView: function getModuleView(moduleName) {
            var viewPromise = $.Deferred();

            require(["org/forgerock/openidm/ui/admin/authentication/modules/" + moduleName], function (result) {
                viewPromise.resolve(result);
            }, function () {
                viewPromise.reject(moduleName);
            });

            return viewPromise;
        }
    });

    return new AuthenticationModuleDialogView();
});
