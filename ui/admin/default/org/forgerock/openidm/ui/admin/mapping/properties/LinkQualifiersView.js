"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/openidm/ui/admin/util/InlineScriptEditor", "org/forgerock/openidm/ui/common/delegates/ScriptDelegate", "org/forgerock/openidm/ui/admin/util/LinkQualifierUtils", "selectize"], function ($, _, MappingAdminAbstractView, ConfigDelegate, Constants, EventManager, inlineScriptEditor, ScriptDelegate, LinkQualifierUtils) {

    var LinkQualifiersView = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/properties/LinkQualifiersTemplate.html",
        element: "#mappingLinkQualifiers",
        noBaseTemplate: true,
        partials: ["partials/_alert.html"],
        events: {
            "click #linkQualifierTabs .btn": "sectionControl",
            "click .linkQualifierSave": "save"
        },
        model: {},
        data: {},

        render: function render(args, callback) {
            var _this = this;

            this.model.mappingName = this.getMappingName();
            this.model.mapping = this.getCurrentMapping();

            this.model.linkQualifiers = this.model.mapping.linkQualifiers || ["default"];

            if (!_.isArray(this.model.linkQualifiers)) {
                this.data.displayLinkQualifiers = ["default"];
            } else {
                this.data.displayLinkQualifiers = this.model.linkQualifiers;
            }

            this.parentRender(function () {
                if (_this.$el.find("#scriptLinkQualifierBody").length === 0) {
                    return;
                }
                var scriptData = "",
                    linkQualifiers;

                _this.$el.find(".static-link-qualifier").selectize({
                    persist: true,
                    create: true
                });

                if (_this.model.mapping.linkQualifiers !== undefined && _this.model.mapping.linkQualifiers.type !== undefined) {
                    scriptData = _this.model.mapping.linkQualifiers;

                    _this.$el.find("#linkQualifierTabs").find('.active').removeClass('active');
                    _this.$el.find("#linkQualifierTabBodies").find('.active').removeClass('active');

                    _this.$el.find("#scriptQualifierTab").toggleClass('active', true);
                    _this.$el.find("#scriptLinkQualifier").toggleClass('active', true);

                    linkQualifiers = LinkQualifierUtils.getLinkQualifier(_this.model.mappingName);

                    _this.populateScriptLinkQualifier(linkQualifiers);
                }

                if (scriptData && scriptData.globals && scriptData.globals.returnAll) {
                    delete scriptData.globals.returnAll;
                }

                _this.linkQualifierScript = inlineScriptEditor.generateScriptEditor({
                    "element": _this.$el.find("#scriptLinkQualifierBody"),
                    "eventName": "linkQualifierScript",
                    "scriptData": scriptData,
                    "disablePassedVariable": false,
                    "disableValidation": false,
                    "placeHolder": "if(returnAll){ ['test', 'admin'] } else { /* script */ }"
                }, function () {
                    if (callback) {
                        callback();
                    }
                });

                $("#linkQualifierPanel").on('shown.bs.collapse', _.bind(function () {
                    this.linkQualifierScript.refresh();
                }, _this));

                _this.$el.find("#linkQualifierTabs a").on("shown.bs.tab", function (e) {
                    if ($(e.target).attr("id") === "scriptQualifierTab") {
                        _this.linkQualifierScript.refresh();
                    }
                });
            });
        },

        populateScriptLinkQualifier: function populateScriptLinkQualifier(data) {
            if (_.isArray(data) === true) {
                this.$el.find("#scriptLinkQualifierList").show();
                this.$el.find("#scriptLinkQualifierList .message").html(data.join(","));
                this.$el.find("#badLinkQualifierScript").hide();
            } else {
                this.$el.find("#badLinkQualifierScript .message").html($.t("templates.mapping.badScript"));
                this.$el.find("#badLinkQualifierScript").show();
            }
        },

        sectionControl: function sectionControl(event) {
            var selected = $(event.target);

            selected.parent().find('.active').removeClass('active');

            selected.toggleClass('active', true);
        },

        save: function save() {
            var currentTab = this.$el.find("#linkQualifierTabs .active").prop("id");

            this.model.scriptError = false;

            if (currentTab === "staticQualifierTab") {
                this.saveDeclarative();
            } else {
                this.saveScript();
            }
        },

        saveDeclarative: function saveDeclarative() {
            var _this2 = this;

            this.model.linkQualifiers = this.$el.find(".static-link-qualifier")[0].selectize.getValue();

            if (this.model.linkQualifiers.length > 0) {
                this.model.linkQualifiers = this.model.linkQualifiers.split(",");
            } else {
                this.model.linkQualifiers = ["default"];
            }

            this.model.mapping.linkQualifiers = this.model.linkQualifiers;

            LinkQualifierUtils.setLinkQualifier(this.model.linkQualifiers, this.model.mappingName);

            this.AbstractMappingSave(this.model.mapping, function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "linkQualifierSaveSuccess");
                EventManager.sendEvent(Constants.EVENT_QUALIFIER_CHANGED, _this2.model.mappingName);
            });
        },

        saveScript: function saveScript() {
            var _this3 = this;

            var scriptDetails;

            scriptDetails = this.linkQualifierScript.generateScript();

            if (scriptDetails !== null) {
                ScriptDelegate.evalLinkQualifierScript(scriptDetails).then(function (result) {
                    if (_.isArray(result)) {
                        _.forEach(result, _.bind(function (item) {
                            if (!_.isString(item)) {
                                this.model.scriptError = true;
                                this.model.errorMessage = $.t("templates.mapping.validLinkQualifierScript");
                            }
                        }, _this3));
                    } else {
                        _this3.model.scriptError = true;
                        _this3.model.errorMessage = $.t("templates.mapping.linkQualifierNotArray");
                    }

                    if (!_this3.model.scriptError) {
                        _this3.model.scriptResult = result;

                        _this3.model.mapping.linkQualifiers = _this3.linkQualifierScript.generateScript();
                        LinkQualifierUtils.setLinkQualifier(_this3.model.scriptResult, _this3.model.mappingName);

                        _this3.AbstractMappingSave(_this3.model.mapping, function () {
                            EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "linkQualifierSaveSuccess");
                            EventManager.sendEvent(Constants.EVENT_QUALIFIER_CHANGED, _this3.model.mappingName);
                        });
                    } else {
                        _this3.showErrorMessage(_this3.model.errorMessage);
                    }
                }, function (result) {
                    _this3.model.scriptError = true;
                    _this3.showErrorMessage(result.responseJSON.message);
                });
            } else {
                this.$el.find("#staticLinkQualifierList").empty();
                this.$el.find("#staticLinkQualifierList").append('<button type="button" class="removeLinkQualifier btn btn-primary">' + '<span class="linkQualifier">default</span>' + '</button>');

                this.saveDeclarative();
            }
        },

        showErrorMessage: function showErrorMessage(message) {
            this.$el.find("#badLinkQualifierScript .message").html(message);
            this.$el.find("#badLinkQualifierScript").show();
            this.$el.find("#scriptLinkQualifierList").hide();
        }
    });

    return new LinkQualifiersView();
});
