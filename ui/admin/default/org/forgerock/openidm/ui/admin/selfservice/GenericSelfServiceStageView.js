"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "form2js", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/openidm/ui/admin/selfservice/SelfServiceUtils", "libs/codemirror/lib/codemirror", "libs/codemirror/mode/xml/xml", "libs/codemirror/addon/display/placeholder"], function ($, _, form2js, AdminAbstractView, AdminUtils, SelfServiceUtils, codeMirror) {

    var GenericSelfServiceStageView = AdminAbstractView.extend({
        noBaseTemplate: true,
        element: "#SelfServiceStageDialog",
        partials: ["partials/selfservice/_translationMap.html", "partials/selfservice/_translationItem.html", "partials/form/_basicInput.html", "partials/form/_basicSelectize.html", "partials/form/_tagSelectize.html"],
        model: {
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

        render: function render(args, dialogRef) {
            var _this = this;

            var self = this;
            this.data = _.cloneDeep(args.data);
            this.args = _.cloneDeep(args);
            this.data.useCodeMirror = true;
            this.data.noTextArea = false;

            this.template = "partials/selfservice/_" + args.type + ".html";

            if (this.data.name === "emailValidation") {
                this.data.useCodeMirror = false;
            } else if (this.data.name === "termsAndConditions" || this.data.name === "consent") {
                this.data.noTextArea = true;
            }

            this.parentRender(function () {
                _.forEach(dialogRef.$modalBody.find(".email-message-code-mirror-disabled"), function (instance) {
                    codeMirror.fromTextArea(instance, _.assignIn({ readOnly: true, cursorBlinkRate: -1 }, _this.model.codeMirrorConfig));
                });

                if (dialogRef.$modalBody.find(".email-message-code-mirror")[0]) {
                    SelfServiceUtils.setcmBox(codeMirror.fromTextArea(dialogRef.$modalBody.find(".email-message-code-mirror")[0], _this.model.codeMirrorConfig), function () {
                        SelfServiceUtils.checkAddTranslation();
                    }, _this.model.codeMirrorConfig);
                }

                if (_this.data.userPreferencesDisplay) {
                    _.forEach(_this.data.registrationPreferences, function (value) {
                        dialogRef.$modalBody.find("#checkbox-" + value).prop('checked', true);
                    });
                }

                if (_this.data.name === "termsAndConditions" || _this.data.name === "consent") {
                    var options = void 0,
                        keysToOptions = function keysToOptions(key) {
                        return { "value": key, "text": key };
                    };

                    if (_.keys(_this.data.termsTranslations).length) {
                        options = _.map(_.keys(_this.data.termsTranslations), keysToOptions);
                    } else {
                        options = _.map(_.keys(_this.data.consentTranslations), keysToOptions);
                    }

                    _this.model.localeSelect = dialogRef.$modalBody.find(".newTranslationLocale").selectize({
                        "create": true,
                        "persist": false,
                        "allowEmptyOption": true,
                        "options": options
                    });
                } else if (_this.data.name === "emailValidation") {
                    var _keysToOptions = function _keysToOptions(key) {
                        return { "value": key, "text": key };
                    },
                        messageOptions = _.map(_.keys(_this.data.messageTranslations), _keysToOptions) || "",
                        subjectOptions = _.map(_.keys(_this.data.subjectTranslations), _keysToOptions) || "";

                    // Mime type selectize
                    dialogRef.$modalBody.find(".basic-selectize-field").selectize({
                        "create": true,
                        "persist": false,
                        "allowEmptyOption": true
                    });
                    // Email subject selectize
                    dialogRef.$modalBody.find(".newTranslationLocale[data-translation-type='Email Subject']").selectize({
                        "create": true,
                        "persist": false,
                        "allowEmptyOption": true,
                        "options": subjectOptions
                    });
                    // Email message selectize
                    dialogRef.$modalBody.find(".newTranslationLocale[data-translation-type='Email Message']").selectize({
                        "create": true,
                        "persist": false,
                        "allowEmptyOption": true,
                        "options": messageOptions
                    });
                }

                //Setup for both selectizes for the identity provider
                _this.model.identityEmailFieldSelect = dialogRef.$modalBody.find("#select-identityEmailField").selectize();
                _this.model.identityServiceSelect = dialogRef.$modalBody.find("#select-identityServiceUrl").selectize({
                    "create": true,
                    "persist": false,
                    "allowEmptyOption": true,
                    onChange: function onChange(value) {
                        var _this2 = this;

                        if (self.model.identityEmailFieldSelect.length > 0) {
                            self.model.identityEmailFieldSelect[0].selectize.clearOptions();
                            self.model.identityEmailFieldSelect[0].selectize.load(function (callback) {
                                AdminUtils.findPropertiesList(value.split("/")).then(_.bind(function (properties) {
                                    var keyList = _.chain(properties).keys().sortBy().value(),
                                        propertiesList = [];

                                    _.forEach(keyList, function (key) {
                                        propertiesList.push({
                                            text: key,
                                            value: key
                                        });
                                    });

                                    callback(propertiesList);

                                    self.model.identityEmailFieldSelect[0].selectize.setValue(propertiesList[0].value);
                                }, _this2));
                            });
                        }
                    }
                });

                dialogRef.$modalBody.on("submit", "form", function (e) {
                    e.preventDefault();
                    return false;
                });
                dialogRef.$modalBody.on("click", ".translationMapGroup button.add", { currentStageConfig: _this.args.data }, _.bind(SelfServiceUtils.addTranslation, SelfServiceUtils));

                dialogRef.$modalBody.on("click", ".translationMapGroup button.delete", { currentStageConfig: _this.args.data }, _.bind(SelfServiceUtils.deleteTranslation, SelfServiceUtils));

                dialogRef.$modalBody.on("keyup", ".translationMapGroup .newTranslationLocale, .translationMapGroup .newTranslationText", { currentStageConfig: _this.args.data }, _.bind(SelfServiceUtils.checkAddTranslation, SelfServiceUtils));

                if (dialogRef.$modalBody.find(":text").length > 0) {
                    dialogRef.$modalBody.find(":text")[0].focus();
                }
            });
        },

        getData: function getData() {
            var formData = form2js("configDialogForm", ".", true);

            if (this.args.type === "idmUserDetails") {
                _.filter(this.args.stageConfigs, { "name": "idmUserDetails" })[0].identityEmailField = formData.identityEmailField;
                var localAutoLogin = _.filter(this.args.stageConfigs, { "name": "localAutoLogin" })[0];
                if (localAutoLogin) {
                    localAutoLogin.successUrl = formData.successUrl;
                }
                _.filter(this.args.stageConfigs, { "name": "idmUserDetails" })[0].registrationPreferences = formData.registrationPreferences;
                _.filter(this.args.stageConfigs, { "name": "selfRegistration" })[0].identityServiceUrl = formData.identityServiceUrl;
            } else if (this.args.title === "forgotUsername" || this.args.title === "passwordReset") {
                _.filter(this.args.stageConfigs, { "name": "userQuery" })[0].identityServiceUrl = formData.identityServiceUrl;
            } else {
                _.assignIn(this.args.data, formData);
            }

            if (formData.snapshotToken) {
                this.args.snapshotToken = formData.snapshotToken;
            }

            return this.args;
        }
    });

    return new GenericSelfServiceStageView();
});
