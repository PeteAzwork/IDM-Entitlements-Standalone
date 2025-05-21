"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "org/forgerock/openidm/ui/admin/selfservice/AbstractSelfServiceView"], function ($, AbstractSelfServiceView) {
    var ForgotUsernameConfigView = AbstractSelfServiceView.extend({
        template: "templates/admin/selfservice/ForgotUsernameConfigTemplate.html",
        partials: AbstractSelfServiceView.prototype.partials.concat(["partials/selfservice/_userQuery.html", "partials/selfservice/_captcha.html", "partials/selfservice/_emailUsername.html", "partials/selfservice/_retrieveUsername.html"]),
        model: {
            surpressSave: false,
            uiConfigurationParameter: "forgotUsername",
            serviceType: "username",
            configUrl: "selfservice/username",
            msgType: "selfServiceUsername",
            viewName: "genericDetails",
            "configDefault": {
                "stageConfigs": [{
                    "name": "captcha",
                    "recaptchaSiteKey": "",
                    "recaptchaSecretKey": "",
                    "recaptchaUri": "https://www.google.com/recaptcha/api/siteverify"
                }, {
                    "name": "userQuery",
                    "validQueryFields": ["mail", "givenName", "sn"],
                    "identityIdField": "_id",
                    "identityEmailField": "mail",
                    "identityUsernameField": "userName",
                    "identityServiceUrl": "managed/user"
                }, {
                    "name": "emailUsername",
                    "emailServiceUrl": "external/email",
                    "emailServiceParameters": {
                        "waitForCompletion": false
                    },
                    "from": "info@example.com",
                    "mimeType": "text/html",
                    "subjectTranslations": {
                        "en": "Account Information - username"
                    },
                    "messageTranslations": {
                        "en": "<h3>Username is:</h3><br />%username%"
                    },
                    "usernameToken": "%username%"
                }, {
                    "name": "retrieveUsername"
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
            }]
        },
        render: function render(args, callback) {
            this.data.helpText = $.t("templates.selfservice.usernameSelfServiceHelp");
            this.data.blockHeaderText = $.t("templates.selfservice.usernameSteps");

            this.data.configList = [{
                type: "captcha",
                title: $.t("templates.selfservice.username.captchaTitle"),
                help: $.t("templates.selfservice.captcha.description"),
                editable: true,
                enabledByDefault: false
            }, {
                type: "userQuery",
                title: $.t("templates.selfservice.userQuery.name"),
                help: $.t("templates.selfservice.userQuery.description"),
                editable: true,
                enabledByDefault: true,
                icon: "user"
            }, {
                type: "emailUsername",
                title: $.t("templates.selfservice.emailUsername.name"),
                help: $.t("templates.selfservice.emailUsername.description"),
                editable: true,
                enabledByDefault: true,
                emailStep: true
            }, {
                type: "retrieveUsername",
                title: $.t("templates.selfservice.retrieveUsername.name"),
                help: $.t("templates.selfservice.retrieveUsername.description"),
                editable: false,
                enabledByDefault: true
            }];

            this.selfServiceRender(args, callback);
        }
    });

    return new ForgotUsernameConfigView();
});
