"use strict";

/*
 * Copyright 2018-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "form2js", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "org/forgerock/commons/ui/common/components/ChangesPending", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/main/ValidatorsManager"], function ($, _, form2js, AbstractView, AdminUtils, BootstrapDialogUtils, ChangesPending, ConfigDelegate, Constants, EventManager, ValidatorsManager) {
    var KbaUpdateConfigView = AbstractView.extend({
        element: "#updateTab",
        template: "templates/admin/kba/UpdateTemplate.html",
        events: {
            "keyup input": "keyupHandler",
            "click #enableKbaUpdate": "enableKbaUpdate",
            "click .save-kbaUpdate-config": "saveConfig"
        },
        model: {
            configUrl: "selfservice/kbaUpdate",
            msgType: "kbaUpdate",
            "configDefault": {
                "stageConfigs": [{
                    "name": "conditionaluser",
                    "identityServiceUrl": "managed/user",
                    "condition": {
                        "type": "kbaQuestions"
                    },
                    "evaluateConditionOnField": "user",
                    "onConditionFalse": {
                        "name": "kbaUpdateStage",
                        "kbaConfig": null,
                        "identityServiceUrl": "managed/user",
                        "uiConfig": {
                            "displayName": $.t("templates.selfservice.kbaStage.defaultDisplayName"),
                            "purpose": $.t("templates.selfservice.kbaStage.defaultPurpose"),
                            "buttonText": $.t("common.form.update")
                        }
                    }
                }]
            },
            "saveConfig": {}
        },
        render: function render(args, callback) {
            var _this = this;

            $.when(ConfigDelegate.readEntityAlways("selfservice/registration"), ConfigDelegate.readEntityAlways("selfservice/reset"), ConfigDelegate.readEntityAlways("selfservice/kbaUpdate"), this.getResources()).then(function (selfRegistrationConfig, passwordResetConfig, kbaUpdateConfig, resources) {
                _this.data.kbaEnabled = false;
                if (selfRegistrationConfig && _.findIndex(selfRegistrationConfig.stageConfigs, { name: "kbaSecurityAnswerDefinitionStage" }) > -1 || passwordResetConfig && _.findIndex(passwordResetConfig.stageConfigs, { name: "kbaSecurityAnswerVerificationStage" }) > -1) {
                    _this.data.kbaEnabled = true;
                }

                if (kbaUpdateConfig) {
                    _this.model.saveConfig = _.cloneDeep(kbaUpdateConfig);
                    _this.data.kbaUpdateEnabled = true;
                } else {
                    _this.model.saveConfig = _.cloneDeep(_this.model.configDefault);
                    _this.data.kbaUpdateEnabled = false;
                }

                _this.data.resources = resources;

                _this.data.identityServiceUrl = _this.model.saveConfig.stageConfigs[0].identityServiceUrl;
                _this.data.uiConfig = _this.model.saveConfig.stageConfigs[0].onConditionFalse.uiConfig;

                _this.parentRender(function () {
                    if (!_this.data.kbaUpdateEnabled) {
                        _this.$el.find(".kba-update-form-field").hide();
                    }

                    _this.model.identityServiceSelect = _this.$el.find("#identityServiceUrl").selectize({
                        "create": true,
                        "persist": false,
                        "allowEmptyOption": true,
                        "onChange": function onChange() {
                            _this.checkChanges();
                        }
                    });

                    ValidatorsManager.bindValidators(_this.$el.find("form"));

                    _this.model.changesModule = ChangesPending.watchChanges({
                        element: _this.$el.find(".update-changes-pending-container"),
                        undo: true,
                        watchedObj: _.cloneDeep(_this.model.saveConfig),
                        undoCallback: function undoCallback() {
                            _this.render();
                        }
                    });

                    if (callback) {
                        callback();
                    }
                });
            });
        },
        getResources: function getResources() {
            var resourcePromise = $.Deferred();

            if (!this.data.resources) {
                AdminUtils.getAvailableResourceEndpoints().then(_.bind(function (resources) {
                    resourcePromise.resolve(resources);
                }, this));
            } else {
                resourcePromise.resolve(this.data.resources);
            }

            return resourcePromise.promise();
        },
        getSaveConfigValue: function getSaveConfigValue() {
            var formData = form2js("kbaUpdateForm", ".", true);

            this.model.saveConfig.stageConfigs[0].identityServiceUrl = formData.identityServiceUrl;
            this.model.saveConfig.stageConfigs[0].onConditionFalse.identityServiceUrl = formData.identityServiceUrl;
            this.model.saveConfig.stageConfigs[0].onConditionFalse.uiConfig = formData.uiConfig;

            return this.model.saveConfig;
        },
        createConfig: function createConfig() {
            var _this2 = this;

            this.data.kbaUpdateEnabled = true;
            return $.when(ConfigDelegate.createEntity(this.model.configUrl, this.model.configDefault), this.checkUIConfigForKbaEnabledSetting()).then(function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, _this2.model.msgType + "Create");
                _this2.render();
            });
        },
        deleteConfig: function deleteConfig() {
            var _this3 = this;

            delete this.data.kbaUpdateEnabled;
            return $.when(ConfigDelegate.deleteEntity(this.model.configUrl), this.checkUIConfigForKbaEnabledSetting()).then(function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, _this3.model.msgType + "Delete");
                _this3.render();
            });
        },
        saveConfig: function saveConfig(e) {
            var _this4 = this;

            if (e) {
                e.preventDefault();
            }

            return ConfigDelegate.updateEntity(this.model.configUrl, this.getSaveConfigValue()).then(function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, _this4.model.msgType + "Save");
                _this4.render();
            });
        },

        checkChanges: function checkChanges() {
            this.model.changesModule.makeChanges(this.getSaveConfigValue());

            if (this.model.changesModule.isChanged() && ValidatorsManager.formValidated(this.$el.find("form"))) {
                this.$el.find(".save-kbaUpdate-config").prop("disabled", false);
            } else {
                this.$el.find(".save-kbaUpdate-config").prop("disabled", true);
            }
        },

        keyupHandler: function keyupHandler(event) {
            this.checkChanges();

            if (this.data.kbaUpdateEnabled && event.keyCode === Constants.ENTER_KEY) {
                event.preventDefault();
                this.saveConfig();
            }
        },
        enableKbaUpdate: function enableKbaUpdate() {
            var _this5 = this;

            var check = this.$el.find("#enableKbaUpdate");

            this.data.enableSelfService = check.is(":checked");

            if (this.data.enableSelfService) {
                this.toggleForm();

                this.createConfig().then(function () {
                    EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, _this5.model.msgType + "Save");
                });
            } else {
                this.toggleForm();

                this.deleteConfig().then(function () {
                    EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, _this5.model.msgType + "Delete");
                });
            }
        },
        toggleForm: function toggleForm() {
            this.$el.find(".kba-update-form-field").toggle();
        },
        checkUIConfigForKbaEnabledSetting: function checkUIConfigForKbaEnabledSetting() {
            var _this6 = this;

            return ConfigDelegate.readEntity("ui/configuration").then(function (uiConfig) {
                /*
                    If kba is not currently enabled in uiConfig we need to enable it when
                    kbaUpdate is on and disable it when kbaUpdate is off.
                */
                if (!_this6.data.kbaEnabled) {
                    uiConfig.configuration.kbaEnabled = _this6.data.kbaUpdateEnabled;

                    return ConfigDelegate.updateEntity("ui/configuration", uiConfig);
                } else {
                    return true;
                }
            });
        }
    });

    return new KbaUpdateConfigView();
});
