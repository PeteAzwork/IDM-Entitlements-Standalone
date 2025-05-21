"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/openidm/ui/admin/selfservice/AbstractSelfServiceView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate"], function ($, _, AbstractSelfServiceView, ConfigDelegate) {
    var PasswordResetConfigView = AbstractSelfServiceView.extend({
        template: "templates/admin/selfservice/PasswordResetConfigTemplate.html",
        partials: AbstractSelfServiceView.prototype.partials.concat(["partials/selfservice/_userQuery.html", "partials/selfservice/_resetStage.html", "partials/selfservice/_captcha.html", "partials/selfservice/_emailValidation.html"]),
        model: {
            surpressSave: false,
            uiConfigurationParameter: "passwordReset",
            serviceType: "password",
            configUrl: "selfservice/reset",
            msgType: "selfServicePassword",
            viewName: "genericDetails",
            "configDefault": {
                "stageConfigs": [{
                    "name": "parameters",
                    "parameterNames": ["returnParams"]
                }, {
                    "name": "captcha",
                    "recaptchaSiteKey": "",
                    "recaptchaSecretKey": "",
                    "recaptchaUri": "https://www.google.com/recaptcha/api/siteverify"
                }, {
                    "name": "userQuery",
                    "validQueryFields": ["userName", "mail", "givenName", "sn"],
                    "identityIdField": "_id",
                    "identityEmailField": "mail",
                    "identityUsernameField": "userName",
                    "identityServiceUrl": "managed/user"
                }, {
                    "name": "emailValidation",
                    "identityEmailField": "mail",
                    "emailServiceUrl": "external/email",
                    "emailServiceParameters": {
                        "waitForCompletion": false
                    },
                    "from": "info@example.com",
                    "subject": "Reset password email",
                    "mimeType": "text/html",
                    "subjectTranslations": {
                        "en": "Reset your password",
                        "fr": "Réinitialisez votre mot de passe"
                    },
                    "messageTranslations": {
                        "en": "<h3>Click to reset your password</h3><h4><a href=\"%link%\">Password reset link</a></h4>",
                        "fr": "<h3>Cliquez pour réinitialiser votre mot de passe</h3><h4><a href=\"%link%\">Mot de passe lien de réinitialisation</a></h4>"
                    },
                    "verificationLinkToken": "%link%",
                    "verificationLink": "https://localhost:8443/#/passwordreset/"
                }, {
                    "name": "kbaSecurityAnswerVerificationStage",
                    "kbaPropertyName": "kbaInfo",
                    "identityServiceUrl": "managed/user",
                    "kbaConfig": null
                }, {
                    "name": "resetStage",
                    "identityServiceUrl": "managed/user",
                    "identityPasswordField": "password"
                }],
                "snapshotToken": {
                    "type": "jwt",
                    "jweAlgorithm": "RSAES_PKCS1_V1_5",
                    "encryptionMethod": "A128CBC_HS256",
                    "jwsAlgorithm": "HS256",
                    "tokenExpiry": 300
                },
                "storage": "stateless"
            },
            "saveConfig": {},
            identityServiceURLSaveLocations: [{
                "stepName": "userQuery",
                "stepProperty": "identityServiceUrl"
            }, {
                "stepName": "resetStage",
                "stepProperty": "identityServiceUrl"
            }, {
                "stepName": "kbaSecurityAnswerVerificationStage",
                "stepProperty": "identityServiceUrl"
            }]
        },
        render: function render(args, callback) {
            var _this = this;

            this.data.helpText = $.t("templates.selfservice.passwordSelfServiceHelp");
            this.data.blockHeaderText = $.t("templates.selfservice.passwordSteps");

            this.data.configList = [{
                type: "captcha",
                title: $.t("templates.selfservice.password.captchaTitle"),
                help: $.t("templates.selfservice.captcha.description"),
                editable: true,
                enabledByDefault: false
            }, {
                type: "userQuery",
                title: $.t("templates.selfservice.userQuery.name"),
                help: $.t("templates.selfservice.userQuery.description"),
                editable: true,
                icon: "user",
                enabledByDefault: true
            }, {
                type: "emailValidation",
                title: $.t("templates.selfservice.emailValidation"),
                help: $.t("templates.selfservice.emailValidationDescription"),
                editable: true,
                enabledByDefault: true,
                emailStep: true
            }, {
                type: "kbaSecurityAnswerVerificationStage",
                title: $.t("templates.selfservice.kbaSecurityAnswerVerificationStageForm"),
                help: $.t("templates.selfservice.kbaSecurityAnswerVerificationStageFormDescription"),
                editable: true,
                enabledByDefault: true
            }, {
                type: "resetStage",
                title: $.t("templates.selfservice.passwordResetForm"),
                help: $.t("templates.selfservice.passwordResetFormDescription"),
                editable: true,
                enabledByDefault: true,
                icon: "user"
            }];

            ConfigDelegate.readEntityAlways("selfservice/kbaUpdate").then(function (kbaUpdateConfig) {
                _this.model.kbaUpdateEnabled = kbaUpdateConfig && _.isObject(kbaUpdateConfig);
                _this.selfServiceRender(args, callback);
            });
        },
        setKBAVerificationEnabled: function setKBAVerificationEnabled() {
            this.model.uiConfig.configuration.kbaVerificationEnabled = !!_.find(this.model.saveConfig.stageConfigs, function (stage) {
                return stage.name === "kbaSecurityAnswerVerificationStage";
            });
        },
        createConfig: function createConfig() {
            this.setKBAVerificationEnabled();
            return AbstractSelfServiceView.prototype.createConfig.call(this);
        },
        deleteConfig: function deleteConfig() {
            this.setKBAVerificationEnabled();
            return AbstractSelfServiceView.prototype.deleteConfig.call(this);
        },
        saveConfig: function saveConfig(identityServiceUrl) {
            this.setKBAVerificationEnabled();
            return AbstractSelfServiceView.prototype.saveConfig.call(this, identityServiceUrl);
        },
        filterPropertiesList: function filterPropertiesList(properties, type, details) {
            var cleanedList = [];

            if (type === "resetStage") {
                _.forEach(properties, function (prop) {
                    if (_.has(details[prop], "encryption") || _.has(details[prop], "hashed")) {
                        cleanedList.push(prop);
                    }
                });
            } else if (type === "userQuery") {
                _.forEach(properties, function (prop) {
                    if (!_.has(details[prop], "encryption") || !_.has(details[prop], "hashed")) {
                        cleanedList.push(prop);
                    }
                });
            }

            return cleanedList;
        }
    });

    return new PasswordResetConfigView();
});
