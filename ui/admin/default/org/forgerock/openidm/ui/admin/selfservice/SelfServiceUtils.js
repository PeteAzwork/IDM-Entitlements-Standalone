"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
define(["jquery", "lodash", "handlebars", "libs/codemirror/lib/codemirror", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate"], function ($, _, handlebars, codeMirror, ConfigDelegate) {
    return {

        /**
          Takes a wellKnownEndpoint from OpenAM (possibly including a realm) and
          breaks it up into parts which are useful for self-service auto login.
           Example:
          "http://rich.example.com:8080/openam/oauth2/testsub/.well-known/openid-configuration" returns
            {
                "openAMBaseUrl": "http://rich.example.com:8080/openam/",
                "authenticationEndpoint": "json/realms/root/realms/testsub/authenticate"
            }
        */
        getAMDetailsFromWellknownEndpoint: function getAMDetailsFromWellknownEndpoint(wellKnownEndpoint) {
            var wellKnownRegexp = new RegExp("/oauth2(/.+)?/\.well-known/openid-configuration");

            if (wellKnownEndpoint && wellKnownEndpoint.match(wellKnownRegexp)) {
                var _wellKnownEndpoint$re = wellKnownEndpoint.replace(wellKnownRegexp, function (full, realm) {
                    return "/json/realms/root" + (realm ? '/realms' + realm : '') + "/authenticate";
                }).split(new RegExp("(json/realms/.*)")),
                    _wellKnownEndpoint$re2 = _slicedToArray(_wellKnownEndpoint$re, 2),
                    openAMBaseUrl = _wellKnownEndpoint$re2[0],
                    authenticationEndpoint = _wellKnownEndpoint$re2[1];

                return {
                    "openAMBaseUrl": openAMBaseUrl,
                    "authenticationEndpoint": authenticationEndpoint,
                    "amDataEndpoints": {
                        "baseUrl": openAMBaseUrl + authenticationEndpoint.replace("/authenticate", "/users/"),
                        "trustedDevices": "/devices/trusted/",
                        "oauthApplications": "/oauth2/applications/",
                        "resourceSet": "/oauth2/resources/sets/",
                        "auditHistory": "/uma/auditHistory/"
                    }
                };
            } else {
                return {};
            }
        },
        setAMAutoLogin: function setAMAutoLogin(openAMBaseUrl, authenticationEndpoint) {
            return this.updateAllLoginConfigs(this.getAMAuthLoginStage(openAMBaseUrl, authenticationEndpoint));
        },
        setLocalAutoLogin: function setLocalAutoLogin(successUrl) {
            return this.updateAllLoginConfigs(this.getLocalLoginStage(successUrl));
        },
        replaceAutoLoginStage: function replaceAutoLoginStage(config, newStage) {
            config = _.cloneDeep(config);
            config.stageConfigs = config.stageConfigs.map(function (stageConfig) {
                if (stageConfig.name === "openAMAutoLogin" || stageConfig.name === "localAutoLogin") {
                    return newStage;
                } else {
                    return stageConfig;
                }
            });
            return config;
        },
        updateAutoLoginConfig: function updateAutoLoginConfig(configId, newStage) {
            var _this = this;

            return ConfigDelegate.readEntityAlways(configId).then(function (config) {
                if (config) {
                    return ConfigDelegate.updateEntity(config._id, _this.replaceAutoLoginStage(config, newStage));
                }
            });
        },
        updateAllLoginConfigs: function updateAllLoginConfigs(newStage) {
            return $.when(this.updateAutoLoginConfig("selfservice/registration", newStage), this.updateAutoLoginConfig("selfservice/socialUserClaim", newStage));
        },
        getLocalLoginStage: function getLocalLoginStage(successUrl, identityUsernameField, identityPasswordField) {
            return {
                "name": "localAutoLogin",
                "identityUsernameField": identityUsernameField || "userName",
                "identityPasswordField": identityPasswordField || "password",
                "successUrl": successUrl || ""
            };
        },
        getAMAuthLoginStage: function getAMAuthLoginStage(openAMBaseUrl, authenticationEndpoint) {
            return {
                "name": "openAMAutoLogin",
                "identityUsernameField": "userName",
                "identityPasswordField": "password",
                "openAMBaseUrl": openAMBaseUrl,
                "authenticationEndpoint": authenticationEndpoint
            };
        },
        getSelfServiceConfigs: function getSelfServiceConfigs() {
            var promise = $.Deferred();

            $.when(ConfigDelegate.readEntityAlways("selfservice/registration"), ConfigDelegate.readEntityAlways("selfservice/username"), ConfigDelegate.readEntityAlways("selfservice/reset")).then(function (userRegistration, userNameRecovery, passwordReset) {
                promise.resolve({
                    userRegistration: userRegistration,
                    userNameRecovery: userNameRecovery,
                    passwordReset: passwordReset
                });
            });

            return promise;
        },
        removeSelfServiceEmailSteps: function removeSelfServiceEmailSteps() {
            var emailStages = {
                userRegistration: {
                    stage: "emailValidation",
                    config: "registration"
                },
                userNameRecovery: {
                    stage: "emailUsername",
                    config: "username"
                },
                passwordReset: {
                    stage: "emailValidation",
                    config: "reset"
                }
            };

            this.getSelfServiceConfigs().then(function (config) {
                _.forEach(emailStages, function (val, key) {
                    if (!_.isUndefined(config[key])) {
                        var index = _.findIndex(config[key].stageConfigs, function (s) {
                            return s.name === val.stage;
                        });

                        if (index !== -1) {
                            config[key].stageConfigs.splice(index, 1);

                            ConfigDelegate.updateEntity("selfservice/" + val.config, config[key]);
                        }
                    }
                });
            });
        },

        setcmBox: function setcmBox(codemirror, changeEvent, codeMirrorConfig) {
            this.cmBox = codemirror;
            this.cmBox.on("change", changeEvent);
            this.codeMirrorConfig = codeMirrorConfig;
        },
        checkAddTranslation: function checkAddTranslation(e) {
            var container,
                locale,
                translation,
                btn,
                usesCodeMirror = false;

            if (e) {
                e.preventDefault();
            }

            if (_.has(e, "currentTarget")) {
                container = $(e.currentTarget).closest(".translationMapGroup");
                // This function was triggered from the codeMirror onchange
            } else {
                container = $(this.cmBox.getTextArea()).closest(".translationMapGroup");
                usesCodeMirror = true;
            }

            if (usesCodeMirror) {
                translation = this.cmBox.getValue();
            } else {
                translation = container.find(".newTranslationText").val();
            }

            btn = container.find(".add");
            locale = container.find("select").text();

            if (translation.length > 0 && locale.length > 0) {
                btn.prop("disabled", false);
            } else {
                btn.prop("disabled", true);
            }
        },

        addTranslation: function addTranslation(e) {
            if (e) {
                e.preventDefault();
            }

            var translationMapGroup = $(e.target).closest(".translationMapGroup"),
                addBtn = translationMapGroup.find(".add"),
                useCodeMirror = JSON.parse(translationMapGroup.attr("data-uses-codemirror") || "false"),
                noTextArea = JSON.parse(translationMapGroup.attr("data-uses-noTextArea") || "false"),
                currentStageConfig = e.data.currentStageConfig,
                field = translationMapGroup.attr("field"),
                locale = translationMapGroup.find(".newTranslationLocale"),
                text;

            if (!useCodeMirror) {
                text = translationMapGroup.find(".newTranslationText").val();
                useCodeMirror = false;
            } else {
                text = this.cmBox.getValue();
            }

            if (!_.has(currentStageConfig[field][locale.val()])) {
                currentStageConfig[field][locale.val()] = text;
                translationMapGroup.find("ul .list-group-item:last").before(handlebars.compile("{{> selfservice/_translationItem useCodeMirror=" + useCodeMirror + "  noTextArea=" + noTextArea + "}}")({
                    locale: locale.val(),
                    text: text
                }));

                if (useCodeMirror && !noTextArea) {
                    codeMirror.fromTextArea(translationMapGroup.find(".email-message-code-mirror-disabled:last")[0], _.assignIn({
                        lineNumbers: true,
                        autofocus: false,
                        viewportMargin: Infinity,
                        theme: "forgerock",
                        mode: "xml",
                        htmlMode: true,
                        lineWrapping: true,
                        readOnly: true,
                        cursorBlinkRate: -1
                    }));
                }

                if (this.cmBox) {
                    this.cmBox.setValue("");
                }

                translationMapGroup.find(".newTranslationText").val("");
                locale[0].selectize.setValue("");
                addBtn.attr("disabled", true);
            }
        },
        deleteTranslation: function deleteTranslation(e) {
            if (e) {
                e.preventDefault();
            }
            var translationMapGroup = $(e.target).closest(".translationMapGroup"),
                currentStageConfig = e.data.currentStageConfig,
                field = translationMapGroup.attr("field"),
                localeField = translationMapGroup.find(".newTranslationLocale"),
                localeValue = $(e.target).closest("li").attr("locale"),
                textValue = $(e.target).closest("li").find(".localizedText").text();

            delete currentStageConfig[field][localeValue];
            translationMapGroup.find("li[locale='" + localeValue + "']").remove();
            localeField[0].selectize.setValue(localeValue);

            if (translationMapGroup.find(".CodeMirror").length) {
                this.cmBox.setValue(textValue);
                this.cmBox.focus();
            } else {
                translationMapGroup.find(".newTranslationText").val(textValue);
                translationMapGroup.find(".newTranslationText").focus();
            }

            translationMapGroup.find(".add").prop("disabled", false);
        }
    };
});
