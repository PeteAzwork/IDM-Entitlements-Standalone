"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/*
 * Copyright 2014-2022 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/openidm/ui/admin/delegates/SyncDelegate", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/SpinnerManager", "org/forgerock/openidm/ui/admin/util/InlineScriptEditor", "org/forgerock/openidm/ui/admin/mapping/util/LinkQualifierFilterEditor", "org/forgerock/openidm/ui/common/util/QueryFilterEditor", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/openidm/ui/common/delegates/ScriptDelegate", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "bootstrap-tabdrop", "selectize", "jsonEditor"], function ($, _, MappingAdminAbstractView, syncDelegate, validatorsManager, conf, uiUtils, eventManager, constants, spinner, inlineScriptEditor, LinkQualifierFilterEditor, QueryFilterEditor, AdminUtils, ScriptDelegate, BootstrapDialogUtils, tabdrop, selectize, JSONEditor) {

    var EditPropertyMappingDialog = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/properties/EditPropertyMappingDialogTemplate.html",
        el: "#dialogs",
        events: {
            "change :input[name=source]": "updateProperty",
            "change :input": "validateMapping",
            "onValidate": "onValidate",
            "click .toggle-view-btn": "conditionalUpdateType",
            "click .apply-default-encryption-transformer": "applyDefaultEncryptionTransformer",
            "shown.bs.tab #conditionalScript": "conditionalTabChange"
        },

        updateProperty: function updateProperty(e) {
            if (this.data.property.source) {
                this.showHideEncryptedPropertyWarning();
            }
            if ($(e.target).val().length || _.has(this.data.property, "source")) {
                this.data.property.source = $(e.target).val();
                this.showHideEncryptedPropertyWarning();
            }
        },

        showHideEncryptedPropertyWarning: function showHideEncryptedPropertyWarning() {
            var property = this.data.property.source,
                warningElement = this.$el.find(".encrypted-property-warning");
            if (!_.isUndefined(this.data.sourceSchema) && _.has(this.data.sourceSchema[property], "encryption") && !_.has(this.data.property, "transform") && !_.has(this.data.property, "condition")) {
                warningElement.removeClass("hidden");
            } else {
                warningElement.addClass("hidden");
            }
        },

        applyDefaultEncryptionTransformer: function applyDefaultEncryptionTransformer(event) {
            event.preventDefault();
            this.$el.find(".encrypted-property-warning").addClass("hidden");
            this.conditional_script_editor.cmBox.setValue("object." + this.data.property.source + " != null");
            this.transform_script_editor.cmBox.setValue("openidm.decrypt(source);");
            this.$el.find("#conditionalScript").click();
            this.$el.find(".transform-script-tab-button").click();
        },

        conditionalUpdateType: function conditionalUpdateType(event) {
            var type = $(event.target).attr("id"),
                filter = "";

            $(event.target).toggleClass("active", true);
            this.$el.find(".toggle-view-btn").not(event.target).toggleClass("active", false);

            if (type === "conditionalFilter") {
                if (this.conditionFilterEditor === null) {

                    if (this.data.usesLinkQualifier) {
                        this.conditionFilterEditor = new LinkQualifierFilterEditor();
                    } else {
                        this.conditionFilterEditor = new QueryFilterEditor();
                    }

                    if (_.has(this.data.property, "condition")) {
                        if (!_.has(this.data.property.condition, "type")) {
                            filter = this.data.property.condition;
                        }
                    }

                    this.conditionFilterEditor.render({
                        "queryFilter": filter,
                        "mappingName": this.data.mappingName,
                        "mapProps": this.data.availableSourceProps,
                        "sourceSchema": this.data.sourceSchema,
                        "element": "#" + "conditionFilterHolder",
                        "resource": ""
                    });
                }
            }
        },

        validateMapping: function validateMapping() {
            var source = $("input[name='source']", this.currentDialog).val(),
                hasAvailableSourceProps = this.data.availableSourceProps && this.data.availableSourceProps.length,
                hasSourceValue = source && source.length,
                invalidSourceProp = hasAvailableSourceProps && hasSourceValue && !_.includes(this.data.availableSourceProps, source),
                proplistValidationMessage = $("#Property_List .validation-message", this.currentDialog),
                transformValidationMessage = $("#Transformation_Script .validation-message", this.currentDialog),
                conditionValidationMessage = $("#Condition_Script .validation-message", this.currentDialog),
                disableSave = function disableSave(el, message) {
                $("#scriptDialogUpdate").prop("disabled", true);
                el.text(message);
            };

            if (invalidSourceProp) {
                disableSave(proplistValidationMessage, $.t("templates.mapping.validPropertyRequired"));
                return false;
            } else if ($("#exampleResult", this.currentDialog).val() === "ERROR WITH SCRIPT") {
                disableSave(transformValidationMessage, $.t("templates.mapping.invalidScript"));
                return false;
            } else if ($("#conditionResult", this.currentDialog).text() === "ERROR WITH SCRIPT") {
                disableSave(conditionValidationMessage, $.t("templates.mapping.invalidConditionScript"));
                return false;
            } else {
                $("#scriptDialogUpdate").prop("disabled", false);
                transformValidationMessage.text("");
                conditionValidationMessage.text("");
                proplistValidationMessage.text("");
                return true;
            }
        },

        formSubmit: function formSubmit(event, dialogRef) {
            var _this2 = this;

            if (event) {
                event.preventDefault();
            }

            var mappingProperties = _.cloneDeep(this.data.currentProperties),
                target = this.property,
                propertyObj = mappingProperties[target - 1];

            // in the case when our property isn't currently found in the sync config...
            if (!propertyObj) {
                propertyObj = { "target": this.property };
                _.find(this.getCurrentMapping(), function (o) {
                    return o.name === this.data.mappingName;
                }).properties.push(propertyObj);
            }

            if (this.$el.find("#sourcePropertySelect").val()) {
                propertyObj.source = this.$el.find("#sourcePropertySelect").val();
            } else {
                delete propertyObj.source;
            }

            if (this.transform_script_editor !== undefined) {
                propertyObj.transform = this.transform_script_editor.generateScript();

                if (propertyObj.transform === null) {
                    delete propertyObj.transform;
                } else if (!propertyObj.source) {
                    propertyObj.source = "";
                }
            } else {
                delete propertyObj.transform;
            }

            if (this.currentDialog.find(".toggle-view-btn.active").attr("id") === "conditionalScript" && this.conditional_script_editor !== undefined) {
                propertyObj.condition = this.conditional_script_editor.generateScript();

                if (propertyObj.condition === null) {
                    delete propertyObj.condition;
                }
            } else if (this.currentDialog.find(".toggle-view-btn.active").attr("id") === "conditionalFilter") {
                propertyObj.condition = {};
                propertyObj.condition = this.conditionFilterEditor.getFilterString();
                // applies when the filter option selected is "No Filter"
                if (propertyObj.condition.length === 0) {
                    delete propertyObj.condition;
                }
            } else {
                delete propertyObj.condition;
            }

            propertyObj["default"] = this.data.defaultEditor.getValue();

            if (_.isObject(propertyObj["default"]) && _.isEmpty(propertyObj["default"]) || !propertyObj["default"] && propertyObj["default"] !== false) {
                delete propertyObj["default"];
            }

            if (propertyObj.condition && propertyObj.condition.queryFilter) {
                //make sure this is a valid queryFilter
                ScriptDelegate.parseQueryFilter(propertyObj.condition).then(function () {
                    //this queryFilter is valid
                    _this2.data.saveCallback(mappingProperties);
                    dialogRef.close();
                }, function () {
                    //this queryFilter is invalid
                    eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "invalidConditionFilter");
                });
            } else {
                this.data.saveCallback(mappingProperties);
                dialogRef.close();
            }
        },

        close: function close() {
            $("#dialogs").hide();
        },

        conditionalTabChange: function conditionalTabChange() {
            this.conditional_script_editor.refresh();
        },

        render: function render(params, callback) {
            var _this3 = this;

            var currentProperties,
                _this = this,
                settings;

            this.data.usesLinkQualifier = params.usesLinkQualifier;
            this.data.mappingName = this.getMappingName();
            this.property = params.id;
            this.transform_script_editor = undefined;
            this.conditional_script_editor = undefined;
            this.conditionFilterEditor = null;
            this.data.targetSchema = params.targetSchema;
            this.data.sourceSchema = params.sourceSchema;

            this.data.saveCallback = params.saveCallback;
            this.data.availableSourceProps = params.availProperties || [];

            this.data.resourcePropertiesList = _.chain(this.data.availableSourceProps).sortBy().value();

            this.data.currentProperties = currentProperties = params.mappingProperties || this.getCurrentMapping().properties;
            this.data.property = _.cloneDeep(currentProperties[this.property - 1]);

            if (this.data.property.source) {
                var indexCheck = _.findIndex(this.data.resourcePropertiesList, function (prop) {
                    return prop === _this3.data.property.source;
                });

                if (indexCheck === -1) {
                    this.data.resourcePropertiesList.push(this.data.property.source);
                }
            }

            if (conf.globalData.sampleSource) {
                this.data.sampleSourceTooltip = JSON.stringify(conf.globalData.sampleSource, null, 2);
            } else {
                this.data.sampleSourceTooltip = null;
            }

            if ((_.isUndefined(this.data.property.source) || this.data.property.source.length === 0) && this.data.sampleSourceTooltip !== null) {
                this.data.showSampleTooltip = false;
            } else {
                this.data.showSampleTooltip = true;
            }

            this.data.currentMappingDetails = this.getCurrentMapping();

            settings = {
                "title": $.t("templates.mapping.propertyEdit.title", { "property": this.data.property.target }),
                "template": this.template,
                "postRender": _.bind(this.loadData, this)
            };

            this.currentDialog = $('<form id="propertyMappingDialogForm"></form>');

            $('#dialogs').append(this.currentDialog);
            this.setElement(this.currentDialog);

            BootstrapDialogUtils.createModal({
                title: settings.title,
                closable: false,
                message: this.currentDialog,
                onshown: function onshown() {
                    uiUtils.renderTemplate(settings.template, _this.currentDialog, _.assignIn(conf.globalData, _this.data), function () {
                        var schema = {};

                        if (_this.data.targetSchema && _this.data.targetSchema[_this.data.property.target] && _this.data.targetSchema[_this.data.property.target].type !== "relationship") {
                            schema = {
                                type: _this.data.targetSchema[_this.data.property.target].type
                            };
                        }

                        settings.postRender();

                        _this.$el.find("#sourcePropertySelect").selectize({
                            persist: false,
                            create: true
                        });

                        _this.$el.find("#sourcePropertySelect").on("change", function () {
                            var sourceProperty = _this.$el.find("#sourcePropertySelect")[0].selectize.getValue();

                            if (sourceProperty.length > 0) {
                                _this.currentDialog.find(".source-name").html(sourceProperty);
                                _this.currentDialog.find(".fa-eye").hide();
                            } else {
                                _this.currentDialog.find(".source-name").html("Complete User Object");

                                if (_this.data.sampleSourceTooltip) {
                                    _this.currentDialog.find(".fa-eye").show();
                                }
                            }
                        });

                        if (_this.data.property.source) {
                            _this.$el.find("#sourcePropertySelect")[0].selectize.setValue(_this.data.property.source);
                        }

                        _this.currentDialog.find(".nav-tabs").tabdrop();

                        _this.currentDialog.find(".nav-tabs").on("shown.bs.tab", function (e) {
                            if ($(e.target).attr("href") === "#Transformation_Script") {
                                _this.transform_script_editor.refresh();
                            } else if ($(e.target).attr("href") === "#Condition_Script") {
                                _this.conditional_script_editor.refresh();
                            }
                        });

                        if (callback) {
                            callback();
                        }

                        _this.$el.find(".details-tooltip").popover({
                            content: function content() {
                                return $(this).find(".tooltip-details").clone().show();
                            },
                            placement: 'right',
                            container: 'body',
                            html: 'true',
                            title: ''
                        });

                        _this.data.defaultEditor = new JSONEditor(_this.$el.find("#defaultPropertyValue")[0], {
                            disable_array_reorder: true,
                            disable_collapse: true,
                            disable_edit_json: false,
                            disable_properties: false,
                            iconlib: "fontawesome4",
                            no_additional_properties: false,
                            theme: "bootstrap3",
                            schema: schema
                        });

                        if (_this.data.property.default !== undefined) {
                            _this.data.defaultEditor.setValue(_this.data.property.default);
                        }
                    }, "replace");
                },
                buttons: [{
                    label: $.t("common.form.cancel"),
                    id: "scriptDialogCancel",
                    action: function action(dialogRef) {
                        dialogRef.close();
                    }
                }, {
                    label: $.t("common.form.save"),
                    id: "scriptDialogUpdate",
                    cssClass: 'btn-primary',
                    hotkey: null,
                    action: _.bind(function (dialogRef) {
                        this.formSubmit(false, dialogRef);
                    }, _this)
                }]
            }).open();
        },

        loadData: function loadData() {
            var _this = this,
                prop = this.data.property,
                filter = "",
                conditionData = null;

            if (prop) {
                if (_typeof(prop.transform) === "object" && prop.transform.type === "text/javascript" && typeof prop.transform.source === "string") {
                    this.transform_script_editor = inlineScriptEditor.generateScriptEditor({
                        "element": this.currentDialog.find("#transformationScriptHolder"),
                        "eventName": "",
                        "autoFocus": false,
                        "noValidation": true,
                        "scriptData": prop.transform,
                        "disablePassedVariable": false,
                        "placeHolder": "source.givenName.toLowerCase() + \" .\" + source.sn.toLowerCase()"
                    });
                }

                if (_.has(prop, "condition")) {
                    this.$el.find("#conditionTabButtons").toggleClass("active", false);
                    if (_.has(prop.condition, "type")) {
                        this.currentDialog.find("#conditionalScript").toggleClass("active", true);
                        this.currentDialog.find("#conditionScriptTab").toggleClass("active", true);
                    } else {
                        this.currentDialog.find("#conditionalFilter").toggleClass("active", true);
                        this.currentDialog.find("#conditionFilterTab").toggleClass("active", true);

                        if (this.data.usesLinkQualifier) {
                            this.conditionFilterEditor = new LinkQualifierFilterEditor();
                        } else {
                            this.conditionFilterEditor = new QueryFilterEditor();
                        }

                        if (_.has(this.data.property, "condition")) {
                            if (!_.has(this.data.property.condition, "type")) {
                                filter = this.data.property.condition;
                            }
                        }

                        this.conditionFilterEditor.render({
                            "queryFilter": filter,
                            "mappingName": this.data.mappingName,
                            "mapProps": this.data.availableSourceProps,
                            "sourceSchema": this.data.sourceSchema,
                            "element": "#" + "conditionFilterHolder",
                            "resource": ""
                        });
                    }
                } else {
                    this.currentDialog.find("#conditionalNone").toggleClass("active", true);
                    this.currentDialog.find("#noneTab").toggleClass("active", true);
                }
            }

            _this.transform_script_editor = inlineScriptEditor.generateScriptEditor({
                "element": _this.currentDialog.find("#transformationScriptHolder"),
                "eventName": "transform",
                "autoFocus": false,
                "noValidation": true,
                "scriptData": _this.data.property.transform,
                "disablePassedVariable": false,
                "placeHolder": "source.givenName.toLowerCase() + \" .\" + source.sn.toLowerCase()"
            });

            if (!_.isString(_this.data.property.condition)) {
                conditionData = _this.data.property.condition;
            }

            _this.conditional_script_editor = inlineScriptEditor.generateScriptEditor({
                "element": _this.currentDialog.find("#conditionScriptHolder"),
                "autoFocus": false,
                "eventName": "conditional",
                "noValidation": true,
                "scriptData": conditionData,
                "disablePassedVariable": false
            });

            $('#mappingDialogTabs a', this.currentDialog).click(function (e) {
                e.preventDefault();
                $(this).tab('show');
                $('#mappingDialogTabs .active :input:first', _this.currentDialog).focus();
            });

            $('#mappingDialogTabs a:first', this.currentDialog).tab('show');

            $('#mappingDialogTabs .active :input:first', this.currentDialog).focus();

            $("input[name='source']", this.currentDialog).on('change autocompleteclose', function (e, initialRender) {
                var val = $(this).val(),
                    isValid;

                if (val) {
                    $("#currentSourceDisplay", _this.currentDialog).val(val);
                } else {
                    $("#currentSourceDisplay", _this.currentDialog).val($.t("templates.mapping.completeSourceObject"));
                }

                isValid = _this.validateMapping();

                if (isValid && initialRender !== "true" && $('#propertyMappingDialogForm').length() === 0) {
                    _this.formSubmit();
                }
            });

            $("input[name='source']", this.currentDialog).trigger('change', 'true');

            spinner.hideSpinner();
        }
    });

    return new EditPropertyMappingDialog();
});
