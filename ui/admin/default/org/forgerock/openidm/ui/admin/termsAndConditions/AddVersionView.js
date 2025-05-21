"use strict";

/*
 * Copyright 2018-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "handlebars", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/commons/ui/common/main/ValidatorsManager", "libs/codemirror/lib/codemirror", "libs/codemirror/mode/xml/xml", "libs/codemirror/addon/display/placeholder", "htmlsanitizer"], function ($, _, handlebars, AdminAbstractView, ConfigDelegate, Constants, EventManager, Router, ValidatorsManager, codemirror) {
    var AddVersionView = AdminAbstractView.extend({
        template: "templates/admin/termsAndConditions/AddVersionTemplate.html",
        partials: ["partials/termsAndConditions/_versionFormPartial.html", "partials/termsAndConditions/_translationMap.html", "partials/termsAndConditions/_translationItem.html"],
        events: {
            "change .new-translation-locale": "toggleAddButton",
            "change input": "inputHandler",
            "click .btn-add-locale": "addTranslation",
            "click .btn-delete-item": "deleteTranslation",
            "click .btn-save": "save",
            "keypress input": "inputHandler",
            "validationFailed": "toggleSaveButton"
        },

        codeMirrorConfig: {
            lineNumbers: true,
            autofocus: false,
            viewportMargin: Infinity,
            theme: "forgerock",
            mode: "xml",
            htmlMode: true,
            lineWrapping: true
        },

        render: function render(args, callback) {
            var _this = this;

            this.data = {
                useCodeMirror: true,
                versionConfig: {
                    version: "",
                    termsTranslations: {},
                    createDate: new Date()
                }
            };

            this.model = {};

            ConfigDelegate.readEntityAlways("selfservice.terms").then(function (terms) {
                if (!_.isUndefined(terms)) {
                    _this.model.terms = terms;
                    _this.model.update = true;
                    _this.data.existingVersions = JSON.stringify(_.pick(terms.versions, "version"));
                    _this.data.firstVersion = false;
                } else {
                    _this.model.terms = {
                        versions: [],
                        uiConfig: {
                            "displayName": $.t("templates.selfservice.termsAndConditions.formPageHeaderPlaceholder"),
                            "purpose": $.t("templates.selfservice.termsAndConditions.formDescriptionPlaceholder"),
                            "buttonText": $.t("common.form.accept")
                        }
                    };
                    _this.data.existingVersions = JSON.stringify([]);
                    _this.data.firstVersion = true;
                }

                _this.parentRender(function () {
                    _this.model.cmBox = codemirror.fromTextArea(_this.$el.find(".email-message-code-mirror")[0], _this.codeMirrorConfig);
                    _this.model.cmBox.on("change", _this.toggleAddButton.bind(_this));

                    ValidatorsManager.bindValidators(_this.$el.find("form"));

                    _this.$el.find("input").first().focus();
                    _this.$el.find("select").selectize({ create: true });

                    if (callback) {
                        callback();
                    }
                });
            });
        },

        toggleAddButton: function toggleAddButton() {
            var localeNotSet = _.isEmpty(this.$el.find(".new-translation-locale").val()),
                translationNotAdded = _.isEmpty(this.model.cmBox.getValue());

            this.$el.find(".btn-add-locale").attr("disabled", localeNotSet || translationNotAdded);
        },

        addTranslation: function addTranslation(event) {
            var translationMapGroup = $(event.target).closest(".translation-map-group"),
                addBtn = translationMapGroup.find(".add"),
                versionConfig = this.data.versionConfig,
                field = translationMapGroup.attr("field"),
                locale = translationMapGroup.find(".new-translation-locale"),
                val = this.model.cmBox.getValue(),
                text = HtmlSanitizer.SanitizeHtml(val);

            if (event) {
                event.preventDefault();
            }

            if (!_.has(versionConfig[field][locale.val()])) {
                versionConfig[field][locale.val()] = text;
                translationMapGroup.find("ul .list-group-item:last").before(handlebars.compile("{{> termsAndConditions/_translationItem }}")({
                    locale: locale.val(),
                    text: text
                }));

                if (this.model.cmBox) {
                    this.model.cmBox.setValue("");
                }

                translationMapGroup.find(".new-translation-text").val("");
                locale[0].selectize.removeOption(locale.val());
                addBtn.attr("disabled", true);
                this.$el.find("select")[0].selectize.focus();
            }

            this.toggleSaveButton();
        },

        deleteTranslation: function deleteTranslation(event) {
            if (event) {
                event.preventDefault();
            }
            var translationMapGroup = $(event.target).closest(".translation-map-group"),
                versionConfig = this.data.versionConfig,
                field = translationMapGroup.attr("field"),
                localeField = translationMapGroup.find(".new-translation-locale"),
                localeValue = $(event.target).closest("li").attr("locale"),
                textValue = $(event.target).closest("li").find(".localized-text").text();

            delete versionConfig[field][localeValue];
            translationMapGroup.find("li[locale='" + localeValue + "']").remove();
            localeField[0].selectize.setValue(localeValue);

            if (translationMapGroup.find(".CodeMirror").length) {
                this.model.cmBox.setValue(textValue);
                this.model.cmBox.focus();
            } else {
                translationMapGroup.find(".new-translation-locale").val(textValue);
                translationMapGroup.find(".new-translation-locale").focus();
            }

            translationMapGroup.find(".add").prop("disabled", false);
        },

        inputHandler: function inputHandler(event) {
            var name = event.target.name,
                type = event.target.type,
                value = type === "checkbox" ? event.target.checked : event.target.value;

            if (name) {
                this.data.versionConfig[name] = value;
            }
            this.toggleSaveButton();
        },

        toggleSaveButton: function toggleSaveButton(event) {
            var versionEmpty = _.isEmpty(this.data.versionConfig.version),
                noTranslations = _.isEmpty(this.data.versionConfig.termsTranslations),
                inputNotValid = !ValidatorsManager.formValidated(this.$el.find("form"));

            if (event) {
                event.preventDefault();
            }

            this.$el.find(".btn-save").attr("disabled", versionEmpty || noTranslations || inputNotValid);
        },

        save: function save() {
            var terms = this.model.terms;

            if (this.data.versionConfig.setAsActive || this.data.firstVersion) {
                terms.active = this.data.versionConfig.version;
                delete this.data.versionConfig.setAsActive;
            }

            terms.versions.push(this.data.versionConfig);

            ConfigDelegate[this.model.update ? "updateEntity" : "createEntity"]("selfservice.terms", terms).then(function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "termsAndConditionsSaveSuccess");
                EventManager.sendEvent(Constants.EVENT_CHANGE_VIEW, { route: Router.configuration.routes.termsAndConditions });
            });
        }
    });

    return new AddVersionView();
});
