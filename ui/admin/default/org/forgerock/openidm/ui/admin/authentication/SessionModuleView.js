"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/authentication/AuthenticationAbstractView"], function ($, _, Constants, ConfigDelegate, AuthenticationAbstractView) {

    var SessionModuleView = AuthenticationAbstractView.extend({
        template: "templates/admin/authentication/SessionModuleTemplate.html",
        element: "#sessionContainer",
        noBaseTemplate: true,
        events: {
            "change .changes-watched": "checkChanges",
            "keyup .changes-watched": "checkChanges",
            "click #reset": "reset",
            "click #save": "save",
            "keydown": "keydownHandler"
        },
        data: {
            "properties": {
                "maxTokenLife": "120",
                "tokenIdleTime": "30",
                "sessionOnly": "false",
                "enableDynamicRoles": "false"
            },
            "docHelpUrl": Constants.DOC_URL
        },
        model: {},

        /**
         * @param [callback]
         */
        render: function render(callback) {
            var _this = this;

            this.model = this.getAuthenticationData();
            this.data.sessionModule = _.cloneDeep(this.model.sessionModule);
            this.data.sessionModuleClean = _.cloneDeep(this.model.sessionModule);
            ConfigDelegate.readEntity("ui/configuration").then(function (uiConfig) {
                _this.data.logoutURLClean = _this.data.logoutURL = _.get(uiConfig, "configuration.logoutUrl");

                if (_.has(_this.data.sessionModule.properties, "maxTokenLifeSeconds")) {
                    _this.data.maxTokenLife = _this.data.sessionModule.properties.maxTokenLifeSeconds;
                    _this.data.maxTokenLifeMinutes = false;
                } else if (_.has(_this.data.sessionModule.properties, "maxTokenLifeMinutes")) {
                    _this.data.maxTokenLife = _this.data.sessionModule.properties.maxTokenLifeMinutes;
                    _this.data.maxTokenLifeMinutes = true;
                }

                if (_.has(_this.data.sessionModule.properties, "tokenIdleTimeSeconds")) {
                    _this.data.tokenIdleTime = _this.data.sessionModule.properties.tokenIdleTimeSeconds;
                    _this.data.tokenIdleTimeMinutes = false;
                } else if (_.has(_this.data.sessionModule.properties, "tokenIdleTimeMinutes")) {
                    _this.data.tokenIdleTime = _this.data.sessionModule.properties.tokenIdleTimeMinutes;
                    _this.data.tokenIdleTimeMinutes = true;
                }

                _this.parentRender(_.bind(function () {
                    this.$el.find("#maxTokenLifeUnits").selectize();
                    this.$el.find("#tokenIdleTimeUnits").selectize();
                    this.$el.find("input[type='text']").first().focus();

                    if (callback) {
                        callback();
                    }
                }, _this));
            });
        },

        checkChanges: function checkChanges() {
            _.forEach(["maxTokenLifeSeconds", "maxTokenLifeMinutes", "tokenIdleTimeSeconds", "tokenIdleTimeMinutes"], _.bind(function (prop) {
                if (_.has(this.data.sessionModule.properties, prop)) {
                    delete this.data.sessionModule.properties[prop];
                }
            }, this));

            this.data.logoutURL = this.$el.find("#logoutURL").val();
            this.data.sessionModule.properties.sessionOnly = this.$el.find("#sessionOnly").is(":checked");
            this.data.sessionModule.properties.enableDynamicRoles = this.$el.find("#enableDynamicRoles").is(":checked");

            if (this.$el.find("#maxTokenLifeUnits").val() === "seconds") {
                this.data.sessionModule.properties.maxTokenLifeSeconds = this.$el.find("#maxTokenLife").val();
            } else {
                this.data.sessionModule.properties.maxTokenLifeMinutes = this.$el.find("#maxTokenLife").val();
            }

            if (this.$el.find("#tokenIdleTimeUnits").val() === "seconds") {
                this.data.sessionModule.properties.tokenIdleTimeSeconds = this.$el.find("#tokenIdleTime").val();
            } else {
                this.data.sessionModule.properties.tokenIdleTimeMinutes = this.$el.find("#tokenIdleTime").val();
            }

            var sessionEqual = _.isEqual(this.data.sessionModuleClean, this.data.sessionModule),
                logoutURLEqual = _.isEqual(this.data.logoutURLClean, this.data.logoutURL);

            this.toggleButtons(sessionEqual && logoutURLEqual);
        },

        toggleButtons: function toggleButtons(state) {
            this.$el.find("#save, #reset").toggleClass("disabled", state);
        },

        reset: function reset(e) {
            e.preventDefault();
            if ($(e.currentTarget).hasClass("disabled")) {
                return false;
            }
            this.render();
        },

        save: function save(e) {
            var _this2 = this;

            e.preventDefault();

            if ($(e.currentTarget).hasClass("disabled")) {
                return false;
            }

            this.saveLogoutURL(this.data.logoutURL).then(function () {
                _this2.setProperties(["sessionModule"], { "sessionModule": _this2.data.sessionModule });
                _this2.saveAuthentication().then(function () {
                    _this2.render();
                });
            });
        },

        keydownHandler: function keydownHandler(event) {
            if (event.keyCode === Constants.ENTER_KEY) {
                this.$el.find("#save").trigger("click");
            }
        }
    });

    return new SessionModuleView();
});
