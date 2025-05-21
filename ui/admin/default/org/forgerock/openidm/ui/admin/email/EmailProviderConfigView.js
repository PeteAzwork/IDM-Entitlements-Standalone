"use strict";

/*
 * Copyright 2015-2024 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "form2js", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/openidm/ui/admin/selfservice/SelfServiceUtils"], function ($, _, form2js, AdminAbstractView, eventManager, constants, ConfigDelegate, validatorsManager, SelfServiceUtils) {

    var EmailConfigView = AdminAbstractView.extend({
        template: "templates/admin/email/EmailProviderConfigTemplate.html",
        element: "#emailContainer",
        noBaseTemplate: true,
        events: {
            "click #emailAuth": "toggleUserPass",
            "change #emailToggle": "toggleEmail",
            "change #emailAuthPassword": "updatePassword",
            "click #saveEmailConfig": "save"
        },
        model: {
            externalEmailExists: false
        },
        data: {
            "password": null,
            "config": {
                "host": "",
                "port": "",
                "timeout": 300000,
                "writetimeout": 300000,
                "connectiontimeout": 300000,
                "auth": {
                    "enable": false,
                    "username": "",
                    "password": ""
                },
                "starttls": {
                    "enable": false
                },
                "ssl": {
                    "enable": false
                },
                "from": ""
            }
        },

        render: function render(args, callback) {
            var _this = this;

            this.data.docHelpUrl = constants.DOC_URL;

            ConfigDelegate.readEntityAlways("external.email").then(function (email) {
                if (!_.isUndefined(email)) {
                    _.assignIn(_this.data.config, email);

                    _this.data.password = _this.findPassword(email);

                    if (!_.isNull(_this.data.password) && _.isString(_this.data.password)) {
                        var passwordIsPurpose = _this.data.password.match(/&\s*{(.*?)}|"\$purpose"/gm);
                        if (passwordIsPurpose) {
                            _this.data.passwordPurpose = _this.data.password;
                        } else {
                            _this.data.passwordPlaceholder = $.t("common.form.passwordPlaceholder");
                        }
                    }

                    _this.model.externalEmailExists = true;
                }

                _this.setup(callback);
            });
        },

        /**
         * @param emailConfig - Object of the current email config
         * @returns {*} - Found password crypto if it exists
         */
        findPassword: function findPassword(emailConfig) {
            var foundPassword = null;

            if (_.has(emailConfig, "auth") && _.has(emailConfig.auth, "password")) {
                foundPassword = emailConfig.auth.password;
            }

            return foundPassword;
        },

        setup: function setup(callback) {
            this.parentRender(_.bind(function () {
                if (_.isEmpty(this.data.config) || !this.data.config.host) {
                    this.$el.find("#emailToggle").prop("checked", false);
                    this.$el.find("#emailSettingsForm").hide();
                } else {
                    this.$el.find("#emailToggle").prop("checked", true);
                    this.toggleEmail();
                }

                if (callback) {
                    callback();
                }
            }, this));
        },

        toggleUserPass: function toggleUserPass(e) {
            this.$el.find("#smtpauth").slideToggle($(e.currentTarget).prop("checked"));
        },

        toggleEmail: function toggleEmail() {
            if (!this.$el.find("#emailToggle").is(":checked")) {
                if (this.$el.find("#smtpauth").is(":visible")) {
                    this.$el.find("#smtpauth").slideToggle();
                }
                this.$el.find("fieldset").find("input:checkbox").prop("checked", false);
                this.$el.find("fieldset").prop("disabled", true);
                this.$el.find("#emailSettingsForm").hide();

                validatorsManager.clearValidators(this.$el.find("#emailConfigForm"));
                this.$el.find("#saveEmailConfig").prop('disabled', false);

                SelfServiceUtils.removeSelfServiceEmailSteps();
            } else {
                this.$el.find("fieldset").prop("disabled", false);
                this.$el.find("#emailSettingsForm").show();

                validatorsManager.bindValidators(this.$el.find("#emailConfigForm"));
                validatorsManager.validateAllFields(this.$el.find("#emailConfigForm"));
            }
        },

        updatePassword: function updatePassword(e) {
            this.data.password = $(e.currentTarget).val();
        },

        /**
         *
         * @param saveConfig - Object of the current email configuration
         * @param formData - Object of the current HTML form details inputted by the user
         * @param oldData - Object of the current HTML form details inputted by the user
         * @param password - The current password if available
         * @returns {*} - Returns an updated email configuration object used for saving
         */
        cleanSaveData: function cleanSaveData(saveConfig, formData, oldData, password) {
            _.assignIn(saveConfig, formData);

            // copy fields that are not editable in the UI
            saveConfig.debug = oldData.debug === true;
            saveConfig.smtpProperties = oldData.smtpProperties || [];
            saveConfig.threadPoolSize = oldData.threadPoolSize || 20;

            if (!_.has(formData, "starttls") || !_.has(formData.starttls, "enable")) {
                delete saveConfig.starttls;
            }
            if (!_.has(formData, "ssl") || !_.has(formData.ssl, "enable")) {
                delete saveConfig.ssl;
            }

            if (_.isObject(oldData.port) && oldData.port.$int === saveConfig.port) {
                saveConfig.port = oldData.port;
            } else if (formData.port) {
                var portInt = parseInt(formData.port, 10);
                if (isNaN(portInt) && /^&{.+}$/i.test(formData.port)) {
                    saveConfig.port = formData.port;
                } else {
                    saveConfig.port = parseInt(formData.port, 10);
                }
            }

            if (_.has(formData, "auth")) {
                if (password) {
                    saveConfig.auth.password = password;
                }

                if (!_.has(formData.auth, "enable")) {
                    delete saveConfig.auth;
                }
            }

            if (saveConfig.connectiontimeout && !_.isNaN(parseInt(saveConfig.connectiontimeout, 10))) {
                saveConfig.connectiontimeout = parseInt(saveConfig.connectiontimeout, 10);
            } else if (saveConfig.connectiontimeout === "") {
                delete saveConfig.connectiontimeout;
            }

            if (saveConfig.writetimeout && !_.isNaN(parseInt(saveConfig.writetimeout, 10))) {
                saveConfig.writetimeout = parseInt(saveConfig.writetimeout, 10);
            } else if (saveConfig.writetimeout === "") {
                delete saveConfig.writetimeout;
            }

            if (saveConfig.timeout && !_.isNaN(parseInt(saveConfig.timeout, 10))) {
                saveConfig.timeout = parseInt(saveConfig.timeout, 10);
            } else if (saveConfig.timeout === "") {
                delete saveConfig.timeout;
            }

            return saveConfig;
        },

        save: function save(e) {
            var _this2 = this;

            e.preventDefault();
            var formData = form2js("emailConfigForm", ".", false),
                oldData = _.clone(this.data.config);

            if (this.$el.find("#emailToggle").is(":checked")) {
                this.data.config = this.cleanSaveData(this.data.config, formData, oldData, this.data.password);

                if (this.model.externalEmailExists) {
                    ConfigDelegate.updateEntity("external.email", this.data.config).then(function () {
                        eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "emailConfigSaveSuccess");
                        _this2.render();
                    });
                } else {
                    ConfigDelegate.createEntity("external.email", this.data.config).then(function () {
                        eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "emailConfigSaveSuccess");
                        _this2.model.externalEmailExists = true;
                    });
                }
            } else {
                ConfigDelegate.deleteEntity("external.email").then(function () {
                    eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "emailConfigSaveSuccess");
                    _this2.data.config = {};
                    _this2.model.externalEmailExists = false;
                });
            }
        }
    });

    return new EmailConfigView();
});
