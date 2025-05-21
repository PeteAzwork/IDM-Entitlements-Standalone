"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "handlebars", "form2js", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/delegates/SiteConfigurationDelegate", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/admin/selfservice/SelfServiceStageDialogView", "org/forgerock/openidm/ui/admin/selfservice/SelfServiceUtils", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "selectize", "org/forgerock/commons/ui/common/util/AutoScroll", "libs/codemirror/lib/codemirror", "libs/codemirror/mode/xml/xml", "libs/codemirror/addon/display/placeholder"], function ($, _, handlebars, form2js, AdminAbstractView, ConfigDelegate, SiteConfigurationDelegate, AdminUtils, EventManager, Constants, Router, SelfServiceStageDialogView, SelfServiceUtils, BootstrapDialogUtils, selectize, AutoScroll, codeMirror) {

    var AbstractSelfServiceView = AdminAbstractView.extend({
        events: {
            "click .all-check": "controlAllSwitch",
            "change .section-check": "controlSectionSwitch",
            "click .save-config": "saveConfig",
            "click .wide-card.active": "showDetail",
            "click #enableSelfServiceModalHolder a": "openDetails",
            "click li.disabled a": "preventTab",
            "click #configureCaptcha": "configureCaptcha"
        },
        partials: ["partials/selfservice/_identityServiceUrl.html", "partials/selfservice/_translationMap.html", "partials/selfservice/_translationItem.html", "partials/selfservice/_steps.html", "partials/selfservice/_advancedoptions.html", "partials/selfservice/_selfserviceblock.html", "partials/form/_basicInput.html", "partials/form/_basicSelectize.html", "partials/form/_tagSelectize.html"],
        data: {
            hideAdvanced: true,
            config: {},
            configList: [],
            resources: null,
            emailRequired: false,
            emailConfigured: false,
            EMAIL_STEPS: ["emailUsername", "emailValidation"],
            codeMirrorConfig: {
                lineNumbers: true,
                autofocus: false,
                viewportMargin: Infinity,
                theme: "forgerock",
                mode: "xml",
                htmlMode: true,
                lineWrapping: true
            }
        },

        createConfig: function createConfig() {
            this.setKBAEnabled();
            return $.when(ConfigDelegate.createEntity(this.model.configUrl, this.model.saveConfig), ConfigDelegate.updateEntity("ui/configuration", this.model.uiConfig)).then(function () {
                SiteConfigurationDelegate.updateConfiguration(function () {
                    EventManager.sendEvent(Constants.EVENT_UPDATE_NAVIGATION);
                });
            });
        },
        deleteConfig: function deleteConfig() {
            this.setKBAEnabled();
            return $.when(ConfigDelegate.deleteEntity(this.model.configUrl), ConfigDelegate.updateEntity("ui/configuration", this.model.uiConfig)).then(function () {
                SiteConfigurationDelegate.updateConfiguration(function () {
                    EventManager.sendEvent(Constants.EVENT_UPDATE_NAVIGATION);
                });
            });
        },
        controlAllSwitch: function controlAllSwitch() {
            var check = this.$el.find(".all-check"),
                tempConfig;

            this.data.enableSelfService = check.is(":checked");

            if (this.data.enableSelfService) {
                this.enableForm();

                this.model.surpressSave = true;

                _.forEach(this.$el.find(".wide-card"), _.bind(function (card) {
                    tempConfig = _.find(this.data.configList, _.bind(function (config) {
                        return $(card).attr("data-type") === config.type;
                    }, this));

                    if (tempConfig.editable) {
                        $(card).find(".section-check").prop("disabled", false);
                    }

                    if (tempConfig.enabledByDefault) {
                        if ($(card).find(".section-check").length > 0) {
                            if (tempConfig.emailStep && !this.data.emailConfigured) {
                                $(card).find(".section-check").prop("checked", false).trigger("change", true);
                                $(card).find(".section-check").prop("disabled", true);
                                $(card).find(".email-step-error-container").show();
                            } else {
                                $(card).find(".section-check").prop("checked", true).trigger("change");
                                $(card).find(".section-check").prop("disabled", false);
                            }
                        } else {
                            $(card).toggleClass("disabled", false);
                        }
                    } else {
                        this.model.saveConfig.stageConfigs = _.reject(this.model.saveConfig.stageConfigs, function (stage) {
                            return stage.name === $(card).attr("data-type");
                        });
                    }
                }, this));

                this.model.surpressSave = false;

                this.model.uiConfig.configuration[this.model.uiConfigurationParameter] = true;

                this.createConfig().then(_.bind(function () {
                    EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, this.model.msgType + "Save");

                    this.openDetails();
                }, this));
            } else {
                this.disableForm();

                this.model.surpressSave = true;
                this.$el.find(".section-check:checked").prop("checked", false).trigger("change");
                this.$el.find(".email-step-error-container").hide();
                this.model.surpressSave = false;

                this.model.uiConfig.configuration[this.model.uiConfigurationParameter] = false;

                this.deleteConfig().then(_.bind(function () {
                    EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, this.model.msgType + "Delete");
                }, this));
            }

            tempConfig = this.showHideEmailWarning(this.model.saveConfig.stageConfigs, this.data.EMAIL_STEPS, this.data.emailConfigured);
            this.data.emailRequired = tempConfig.emailRequired;
        },

        disableForm: function disableForm() {
            this.$el.find(".self-service-body").hide();
            this.$el.find(".self-service-modal-edit").hide();
        },

        enableForm: function enableForm() {
            this.$el.find(".self-service-body").show();
            this.$el.find(".self-service-modal-edit").show();
        },

        controlSectionSwitch: function controlSectionSwitch(event, fromControlAll) {
            var check = $(event.target),
                card = check.parents(".wide-card"),
                type = card.attr("data-type"),
                removeConfig = false,
                orderPosition,
                tempConfig,
                configPosition = _.findIndex(this.model.configDefault.stageConfigs, function (defaultStage) {
                return defaultStage.name === type;
            });

            if (check.is(":checked")) {
                card.toggleClass("disabled", false);
                card.toggleClass("active", true);

                orderPosition = this.$el.find(".selfservice-holder .wide-card:not(.disabled)").index(card);

                if (_.filter(this.model.saveConfig.stageConfigs, { "name": type }).length === 0) {
                    if (this.model.saveConfig.stageConfigs[0].name === "parameters") {
                        // the parameters stages exists and must always be at the top of the stageConfigs array
                        // so increment the order position by 1
                        orderPosition++;
                    }
                    this.model.saveConfig.stageConfigs.splice(orderPosition, 0, _.clone(this.model.configDefault.stageConfigs[configPosition]));
                }
            } else {
                card.toggleClass("active", false);
                card.toggleClass("disabled", true);

                if (this.$el.find(".section-check:checked").length === 0 && this.$el.find(".all-check:checked").length !== 0 && !fromControlAll) {
                    this.$el.find(".all-check").trigger("click");
                    removeConfig = true;
                }

                this.model.saveConfig.stageConfigs = _.reject(this.model.saveConfig.stageConfigs, function (stage) {
                    return stage.name === type;
                });
            }

            if (_.indexOf(this.data.EMAIL_STEPS, type) > -1) {
                tempConfig = this.showHideEmailWarning(this.model.saveConfig.stageConfigs, this.data.EMAIL_STEPS, this.data.emailConfigured);
                this.data.emailRequired = tempConfig.emailRequired;
            }

            this.showCaptchaWarning(this.model.saveConfig.stageConfigs);

            if (!this.model.surpressSave && !removeConfig) {
                this.saveConfig();
            }
        },

        showDetail: function showDetail(event) {
            var el,
                type = $(event.target).parents(".wide-card").attr("data-type"),
                editable = $(event.target).parents(".wide-card").attr("data-editable"),
                currentData = _.filter(this.model.saveConfig.stageConfigs, { "name": type })[0],
                defaultConfig = _.filter(this.data.configList, { "type": type })[0],
                orderPosition = $(event.target).closest(".self-service-card.active").index(),
                self = this;

            if ($(event.target).hasClass("self-service-card")) {
                el = $(event.target);
            } else {
                el = $(event.target).closest(".self-service-card");
            }

            if (el.hasClass("disabled")) {
                return false;
            }

            // If there is no data for the selected step and icon property is present, icon property indicates the step is mandatory
            if (!currentData && defaultConfig.icon.length > 0) {
                defaultConfig = _.clone(_.filter(this.model.configDefault.stageConfigs, { "name": type })[0]);

                if (_.filter(this.model.saveConfig.stageConfigs, { "name": type }).length === 0) {
                    this.model.saveConfig.stageConfigs.splice(orderPosition, 0, defaultConfig);
                }

                currentData = _.filter(this.model.saveConfig.stageConfigs, { "name": type })[0];
            }

            currentData.identityServiceProperties = this.data.identityServiceProperties;

            if (this.filterPropertiesList) {
                currentData.identityServiceProperties = this.filterPropertiesList(currentData.identityServiceProperties, type, this.data.identityServicePropertiesDetails);
            }
            //kbaSecurityAnswerDefinitionStage from user reg and kbaSecurityAnswerVerificationStage from password reset
            if ((type === "kbaSecurityAnswerDefinitionStage" || type === "kbaSecurityAnswerVerificationStage") && $(event.target).parents(".checkbox").length === 0 && editable === "true") {
                EventManager.sendEvent(Constants.EVENT_CHANGE_VIEW, { route: Router.configuration.routes.kba });
            } else if (type === "consent" && _.isFunction(this.showDetailDialog)) {
                this.showDetailDialog(event);
            } else if ($(event.target).parents(".checkbox").length === 0 && editable === "true") {
                this.dialog = BootstrapDialogUtils.createModal({
                    title: $.t("templates.selfservice." + this.model.serviceType + "." + type + "Title"),
                    message: $(handlebars.compile("{{> selfservice/_" + type + "}}")(currentData)),
                    onshown: _.bind(function (dialogRef) {
                        var _this = this;

                        _.forEach(dialogRef.$modalBody.find(".email-message-code-mirror-disabled"), function (instance) {
                            codeMirror.fromTextArea(instance, _.assignIn({ readOnly: true, cursorBlinkRate: -1 }, _this.data.codeMirrorConfig));
                        });

                        if (dialogRef.$modalBody.find(".email-message-code-mirror")[0]) {
                            SelfServiceUtils.setcmBox(codeMirror.fromTextArea(dialogRef.$modalBody.find(".email-message-code-mirror")[0], this.data.codeMirrorConfig), function () {
                                SelfServiceUtils.checkAddTranslation();
                            }, this.data.codeMirrorConfig);
                        }

                        dialogRef.$modalBody.find(".basic-selectize-field").selectize({
                            "create": true,
                            "persist": false,
                            "allowEmptyOption": true
                        });

                        dialogRef.$modalBody.find(".array-selection").selectize({
                            delimiter: ",",
                            persist: false,
                            create: function create(input) {
                                return {
                                    value: input,
                                    text: input
                                };
                            }
                        });

                        if (currentData.name === "emailValidation" || currentData.name === "emailUsername") {
                            var keysToOptions = function keysToOptions(key) {
                                return { "value": key, "text": key };
                            },
                                messageOptions = _.map(_.keys(currentData.messageTranslations), keysToOptions) || "",
                                subjectOptions = _.map(_.keys(currentData.subjectTranslations), keysToOptions) || "";

                            dialogRef.$modalBody.find(".newTranslationLocale[data-translation-type='Email Subject']").selectize({
                                "create": true,
                                "persist": false,
                                "allowEmptyOption": true,
                                "options": subjectOptions
                            });

                            dialogRef.$modalBody.find(".newTranslationLocale[data-translation-type='Email Message']").selectize({
                                "create": true,
                                "persist": false,
                                "allowEmptyOption": true,
                                "options": messageOptions
                            });
                        }

                        dialogRef.$modalBody.on("submit", "form", function (e) {
                            e.preventDefault();
                            return false;
                        });
                        dialogRef.$modalBody.on("click", ".translationMapGroup button.add", { currentStageConfig: currentData }, _.bind(SelfServiceUtils.addTranslation, SelfServiceUtils));
                        dialogRef.$modalBody.on("click", ".translationMapGroup button.delete", { currentStageConfig: currentData }, _.bind(SelfServiceUtils.deleteTranslation, SelfServiceUtils));
                        dialogRef.$modalBody.on("keyup", ".translationMapGroup .newTranslationLocale, .translationMapGroup .newTranslationText", { currentStageConfig: currentData }, _.bind(SelfServiceUtils.checkAddTranslation, SelfServiceUtils));
                    }, this),
                    buttons: ["cancel", {
                        label: $.t("common.form.save"),
                        cssClass: "btn-primary",
                        id: "saveUserConfig",
                        action: function action(dialogRef) {
                            var formData = form2js("configDialogForm", ".", true),
                                tempName;

                            _.assignIn(currentData, formData);

                            //Check for array items and set the values
                            _.forEach(dialogRef.$modalBody.find("input.array-selection"), _.bind(function (arraySelection) {
                                tempName = $(arraySelection).prop("name");
                                currentData[tempName] = $(arraySelection)[0].selectize.getValue().split(",");
                            }, this));

                            self.saveConfig();

                            dialogRef.close();
                        }
                    }]
                }).open();
            }
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

        getSelfServiceConfig: function getSelfServiceConfig() {
            var promise = $.Deferred();

            ConfigDelegate.readEntity(this.model.configUrl).always(function (result) {
                promise.resolve(result);
            });

            return promise.promise();
        },

        /**
         * @param stageConfigs {Array.<Object>}
         * @param EMAIL_STEPS {Array.<String>}
         * @param emailConfigured {boolean}
         *
         * @returns {{emailRequired: boolean, showWarning: boolean}}
         */
        showHideEmailWarning: function showHideEmailWarning(stageConfigs, EMAIL_STEPS, emailConfigured) {
            var emailRequired = false,
                show = false;

            _.forEach(stageConfigs, function (stage) {
                if (_.indexOf(EMAIL_STEPS, stage.name) > -1) {
                    emailRequired = true;
                }
            });

            if (emailRequired && !emailConfigured) {
                show = true;
            }

            return {
                "emailRequired": emailRequired,
                "showWarning": show
            };
        },

        showCaptchaWarning: function showCaptchaWarning(stageConfigs) {
            if (typeof stageConfigs === "boolean") {
                this.$el.find("#captchaNotConfiguredWarning").toggle(stageConfigs);
            } else {
                this.$el.find("#captchaNotConfiguredWarning").toggle(this.checkCaptchaConfigs(stageConfigs));
            }
        },

        checkCaptchaConfigs: function checkCaptchaConfigs(stageConfigs) {
            var captchaStage = stageConfigs.filter(function (value) {
                return value.name === "captcha";
            })[0];
            if (captchaStage && (!captchaStage.recaptchaSiteKey || !captchaStage.recaptchaSecretKey)) {
                return true;
            } else {
                return false;
            }
        },

        configureCaptcha: function configureCaptcha(event) {
            event.preventDefault();
            this.$el.find("[data-type='captcha'] i.fa.fa-pencil").trigger("click");
        },

        getIdentityServiceURL: function getIdentityServiceURL(stageConfigs) {
            var defaultIdentityServiceURL = "";

            _.find(this.model.identityServiceURLSaveLocations, function (data) {
                var stage = _.find(stageConfigs, { "name": data.stepName });
                if (_.has(stage, "identityServiceUrl")) {
                    defaultIdentityServiceURL = stage.identityServiceUrl;
                    return true;
                }
            });

            return defaultIdentityServiceURL;
        },

        selfServiceRender: function selfServiceRender(args, callback) {
            var disabledList,
                configList = [];

            $.when(this.getResources(), ConfigDelegate.readEntity("ui/configuration"), this.getSelfServiceConfig()).then(_.bind(function (resources, uiConfig, selfServiceConfig) {
                var _this2 = this;

                ConfigDelegate.readEntity("external.email").always(function (config) {
                    _this2.data.emailConfigured = !_.isUndefined(config) && _.has(config, "host");
                    _this2.data.resources = resources;
                    _this2.model.uiConfig = uiConfig;

                    if (selfServiceConfig) {

                        $.extend(true, _this2.model.saveConfig, selfServiceConfig);
                        $.extend(true, _this2.data.config, selfServiceConfig);

                        _this2.data.hideAdvanced = false;

                        var defaultIdentityServiceURL = _this2.getIdentityServiceURL(_this2.model.saveConfig.stageConfigs);
                        AdminUtils.findPropertiesList(defaultIdentityServiceURL.split("/")).then(_.bind(function (properties) {
                            this.data.identityServiceProperties = _.chain(properties).keys().sortBy().value();
                            this.data.identityServicePropertiesDetails = properties;
                        }, _this2));

                        _.forEach(_this2.data.configList, function (config, pos) {
                            config.index = pos;
                        });

                        disabledList = _.filter(_this2.data.configList, function (config) {
                            var filterCheck = true;

                            _.forEach(selfServiceConfig.stageConfigs, _.bind(function (stage) {
                                if (stage.name === config.type) {
                                    filterCheck = false;

                                    // If a step is enabled and it is an email step, require the email config
                                    if (_.indexOf(this.data.EMAIL_STEPS, config.type) > -1) {
                                        this.data.emailRequired = true;
                                    }
                                }
                            }, _this2));

                            return filterCheck;
                        });

                        _.forEach(selfServiceConfig.stageConfigs, _.bind(function (stage) {
                            _.forEach(this.data.configList, function (config) {
                                if (stage.name === config.type) {
                                    configList.push(config);
                                }
                            });
                        }, _this2));

                        _.forEach(disabledList, function (config) {
                            configList.splice(config.index, 0, config);
                        });

                        _this2.data.configList = configList;
                        _this2.data.enableSelfService = true;

                        _.forEach(_this2.data.configList, function (config) {
                            if (config.emailStep) {
                                config.editable = _this2.data.emailConfigured;
                                config.showEmailError = !_this2.data.emailConfigured;
                            }
                        });

                        _this2.parentRender(_.bind(function () {
                            var _this3 = this;

                            this.$el.find(".all-check").prop("checked", true);
                            this.$el.find(".all-check").val(true);
                            this.$el.find(".section-check").prop("disabled", false);
                            this.$el.find(".has-email-error").prop("disabled", true);

                            this.model.surpressSave = true;

                            _.forEach(selfServiceConfig.stageConfigs, function (stage) {
                                _this3.$el.find(".wide-card[data-type='" + stage.name + "']").toggleClass("disabled", false);
                                _this3.$el.find(".wide-card[data-type='" + stage.name + "'] .section-check").prop("checked", true).trigger("change");
                            });
                            this.showCaptchaWarning(this.model.saveConfig.stageConfigs);

                            this.model.surpressSave = false;

                            if (callback) {
                                callback();
                            }
                        }, _this2));
                    } else {
                        $.extend(true, _this2.model.saveConfig, _this2.model.configDefault);
                        $.extend(true, _this2.data.config, _this2.model.configDefault);

                        _this2.data.enableSelfService = false;

                        _this2.parentRender(_.bind(function () {
                            this.disableForm();
                            this.showCaptchaWarning(false);
                            if (callback) {
                                callback();
                            }
                        }, _this2));
                    }
                });
            }, this));
        },

        saveConfig: function saveConfig(identityServiceURL) {
            var advancedFormData = {},
                saveData = {},
                tempStepConfig;

            if (this.$el.find("#advancedOptions").length > 0) {
                advancedFormData = form2js("advancedOptions", ".", true);
            }

            if (identityServiceURL) {
                // For each key/property location that the identity service URL should be saved
                // find the corresponding location and set it.
                _.forEach(this.model.identityServiceURLSaveLocations, _.bind(function (data) {
                    tempStepConfig = _.filter(this.model.saveConfig.stageConfigs, { "name": data.stepName })[0];
                    if (tempStepConfig) {
                        tempStepConfig[data.stepProperty] = identityServiceURL;
                    }
                }, this));
            }

            $.extend(true, saveData, this.model.saveConfig, advancedFormData);

            if (!_.isUndefined(saveData.snapshotToken)) {
                saveData.snapshotToken.tokenExpiry = parseInt(saveData.snapshotToken.tokenExpiry, 10);
            }

            _.forEach(saveData.stageConfigs, function (step) {
                if (_.has(step, "identityServiceProperties")) {
                    delete step.identityServiceProperties;
                    delete step.identityServicePropertiesDetails;
                }
            });

            this.setKBAEnabled();
            return $.when(ConfigDelegate.updateEntity(this.model.configUrl, saveData), ConfigDelegate.updateEntity("ui/configuration", this.model.uiConfig)).then(_.bind(function () {
                SiteConfigurationDelegate.updateConfiguration(function () {
                    EventManager.sendEvent(Constants.EVENT_UPDATE_NAVIGATION);
                });
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, this.model.msgType + "Save");
                this.showCaptchaWarning(this.model.saveConfig.stageConfigs);
            }, this));
        },
        setKBAEnabled: function setKBAEnabled() {
            this.model.uiConfig.configuration.kbaEnabled = !!this.model.uiConfig.configuration.kbaDefinitionEnabled || !!this.model.uiConfig.configuration.kbaVerificationEnabled;

            /*
                If kbaUpdate is enabled we want to make sure the kbaEnabled flag is set to true
                so a user can edit his or her kba questions and answers in the end user profile view.
            */
            if (!this.model.uiConfig.configuration.kbaEnabled && this.model.kbaUpdateEnabled) {
                this.model.uiConfig.configuration.kbaEnabled = true;
            }
        },
        preventTab: function preventTab(event) {
            event.preventDefault();
        },

        openDetails: function openDetails(event) {
            if (event) {
                event.preventDefault();
            }
            var details;

            if (this.getDetails) {
                details = this.getDetails();
            } else {
                details = {
                    "identityResourceOptions": this.data.resources,
                    "snapshotToken": this.model.saveConfig.snapshotToken,
                    "identityServiceUrl": this.getIdentityServiceURL(this.model.saveConfig.stageConfigs)
                };
            }

            this.loadSelfServiceDialog(_.noop, this.model.viewName, this.model.uiConfigurationParameter, details);
        },
        loadSelfServiceDialog: function loadSelfServiceDialog(el, type, title, data) {
            var _this4 = this;

            SelfServiceStageDialogView.render({
                "element": el,
                "type": type,
                "title": title,
                "data": data,
                "saveCallback": function saveCallback(config, oldData) {
                    var defaultIdentityServiceURL = _this4.getIdentityServiceURL(config.stageConfigs);

                    AdminUtils.findPropertiesList(defaultIdentityServiceURL.split("/")).then(_.bind(function (properties) {
                        this.data.identityServiceProperties = _.chain(properties).keys().sortBy().value();
                        this.data.identityServicePropertiesDetails = properties;
                    }, _this4));

                    _.assignIn(_this4.model.saveConfig.stageConfigs, config.stageConfigs);

                    if (config.snapshotToken) {
                        _.assignIn(_this4.model.saveConfig.snapshotToken, config.snapshotToken);
                    }

                    if (_this4.customSaveConfig) {
                        _this4.customSaveConfig(_this4.model.saveConfig, oldData);
                    } else {
                        _this4.saveConfig(defaultIdentityServiceURL);
                    }
                },
                "stageConfigs": this.model.saveConfig.stageConfigs
            });
        }
    });

    return AbstractSelfServiceView;
});
