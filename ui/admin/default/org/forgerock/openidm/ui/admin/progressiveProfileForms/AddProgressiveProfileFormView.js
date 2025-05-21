"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "backbone", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/progressiveProfileForms/tabs/DetailsView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/commons/ui/common/main/ValidatorsManager"], function ($, _, Backbone, AdminAbstractView, ConfigDelegate, DetailsView, EventManager, Constants, Router, ValidatorsManager) {
    var AddProgressiveProfileFormView = AdminAbstractView.extend({
        template: "templates/admin/progressiveProfileForms/AddProgressiveProfileFormViewTemplate.html",
        events: {
            "click .btn-save": "saveForm",
            "keypress #detailsForm": "enterHandler",
            "keyup input": "checkValidation"
        },
        model: {},

        render: function render(args, callback) {
            var _this = this;

            //this is the default version a stageConfig
            this.model.stageConfig = {
                "name": "conditionaluser",
                "identityServiceUrl": "managed/user",
                "condition": { "type": "loginCount", "interval": "at", "amount": 25 },
                "evaluateConditionOnField": "user",
                "onConditionTrue": {
                    "name": "attributecollection",
                    "identityServiceUrl": "managed/user",
                    "uiConfig": {
                        "displayName": "",
                        "purpose": "",
                        "buttonText": $.t("common.form.save")
                    },
                    "attributes": []
                }
            };
            //set the default config
            this.model.defaultConfig = {
                "stageConfigs": []
            };

            //make sure we get a fresh config every time we render
            delete this.model.profileCompletionConfig;

            ConfigDelegate.readEntityAlways("selfservice/profile").then(function (profileCompletionConfig) {
                if (profileCompletionConfig) {
                    _this.model.profileCompletionConfig = profileCompletionConfig;
                    _this.profileCompletionConfigExists = true;
                } else {
                    _this.profileCompletionConfigExists = false;
                    //there is no config so we need to generate one
                    _this.model.profileCompletionConfig = _this.model.defaultConfig;
                }

                _this.parentRender(function () {
                    DetailsView.render({
                        element: "#detailsTabContainer",
                        uiConfig: _this.model.stageConfig.onConditionTrue.uiConfig
                    }, function () {
                        ValidatorsManager.bindValidators(_this.$el.find("#detailsForm"));
                        _this.$el.find("input:eq(0)").focus();

                        if (callback) {
                            callback();
                        }
                    });
                });
            });
        },

        saveForm: function saveForm(event) {
            var _this2 = this;

            var savePromise,
                details = DetailsView.getValue();
            details.displayName = escape(details.displayName);

            event.preventDefault();
            //get uiConfig value from DetailsView
            this.model.stageConfig.onConditionTrue.uiConfig = details;
            //add the default stage
            this.model.profileCompletionConfig.stageConfigs.push(this.model.stageConfig);

            if (this.profileCompletionConfigExists) {
                savePromise = ConfigDelegate.updateEntity("selfservice/profile", this.model.profileCompletionConfig);
            } else {
                savePromise = ConfigDelegate.createEntity("selfservice/profile", this.model.profileCompletionConfig);
            }

            savePromise.then(function () {
                var stageConfigIndex = _this2.model.profileCompletionConfig.stageConfigs.length - 1;
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "progressiveProfileFormSaveSuccess");
                //after creating the new stageConfig switch to it's edit view
                EventManager.sendEvent(Constants.EVENT_CHANGE_VIEW, {
                    route: Router.configuration.routes.editProgressiveProfileForm,
                    args: [stageConfigIndex.toString(), "attributes"]
                });
            });
        },

        enterHandler: function enterHandler(event) {
            if (event.keyCode === Constants.ENTER_KEY && this.$el.find("#saveForm").is(":enabled")) {
                this.$el.find("#saveForm").trigger("click");
            }
        },
        checkValidation: function checkValidation() {
            if (ValidatorsManager.formValidated(this.$el.find("#detailsForm"))) {
                this.$el.find(".btn-save").prop("disabled", false);
            } else {
                this.$el.find(".btn-save").prop("disabled", true);
            }
        }
    });

    return new AddProgressiveProfileFormView();
});
