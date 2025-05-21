"use strict";

/*
 * Copyright 2014-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "jsonEditor", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/commons/ui/common/util/Constants"], function ($, _, JSONEditor, AbstractView, validatorsManager, ConnectorDelegate, UIUtils, constants) {
    var ConnectorTypeAbstractView = AbstractView.extend({
        element: "#connectorDetails",
        noBaseTemplate: true,

        render: function render(args, callback) {
            var _this = this;

            var base = "templates/admin/connector/";
            this.data.docHelpUrl = constants.DOC_URL;

            $("#connectorDetails").hide();

            this.data.connectorDefaults = args.connectorDefaults;

            ConnectorDelegate.templateCheck(args.connectorType).then(function (data) {
                _this.template = base + args.connectorType + ".html";

                UIUtils.templates[constants.host + _this.template] = data;

                _this.renderTemplate(callback, false, args);
            }, function () {
                _this.template = base + "GenericConnector.html";

                _this.renderTemplate(callback, true, args);
            });
        },

        renderTemplate: function renderTemplate(callback, jsonEditorLoad, args) {
            var schema = {
                $schema: "http://forgerock.org/json-schema#",
                "type": "object",
                "properties": {}
            };

            this.parentRender(_.bind(function () {
                if (args.animate) {
                    $("#connectorDetails").slideDown("slow", function () {});
                } else {
                    $("#connectorDetails").show();
                }

                if (!jsonEditorLoad) {
                    this.fieldButtonCheck();

                    this.isGeneric = false;

                    validatorsManager.bindValidators(this.$el);
                } else {
                    JSONEditor.defaults.options = {
                        theme: "bootstrap3",
                        iconlib: "fontawesome4",
                        disable_edit_json: true,
                        disable_array_reorder: true,
                        disable_collapse: true,
                        disable_properties: true,
                        show_errors: "never"
                    };

                    this.isGeneric = true;

                    // For now we will allow the schema to be generic with no restrictions
                    // this.setSchema(schema, orderCount);

                    this.editor = new JSONEditor(this.$el.find("#genericConnectorBody")[0], {
                        schema: schema
                    });
                    this.editor.setValue(this.data.connectorDefaults.configurationProperties);
                }

                if (this.$el.find(":text").length > 0) {
                    this.$el.find(":text")[0].focus();
                }

                if (callback) {
                    callback();
                }
            }, this));
        },

        setSchema: function setSchema(schema, orderCount) {
            _.forEach(this.data.connectorDefaults.configurationProperties, _.bind(function (value, key) {
                if (value === null) {
                    this.data.connectorDefaults.configurationProperties[key] = "";

                    schema.properties[key] = {
                        type: "string",
                        propertyOrder: orderCount
                    };
                } else if (value === true || value === false) {
                    schema.properties[key] = {
                        type: "boolean",
                        propertyOrder: orderCount
                    };
                } else if (_.isObject(value)) {
                    schema.properties[key] = {
                        type: "object",
                        propertyOrder: orderCount
                    };
                } else if (_.isArray(value)) {
                    schema.properties[key] = {
                        type: "array",
                        propertyOrder: orderCount
                    };
                } else {
                    schema.properties[key] = {
                        type: "string",
                        propertyOrder: orderCount
                    };
                }
                orderCount++;
            }, this));
        },

        getGenericState: function getGenericState() {
            return this.isGeneric;
        },

        getGenericConnector: function getGenericConnector() {
            return this.editor.getValue();
        },

        fieldButtonCheck: function fieldButtonCheck() {
            var arrayComponents = $(".connector-array-component");

            _.forEach(arrayComponents, _.bind(function (component) {
                if ($(component).find(".remove-btn").length === 1) {
                    $(component).find(".input-group-addon").hide();
                } else {
                    $(component).find(".input-group-addon").show();
                }
            }, this));
        },

        addField: function addField(event) {
            event.preventDefault();

            var clickedEle = event.target,
                field_type,
                field;

            if ($(clickedEle).not("button")) {
                clickedEle = $(clickedEle).closest("button");
            }

            field_type = $(clickedEle).attr('field_type');
            field = $(clickedEle).parent().next().clone();
            field.find('input[type=text]').val('');

            $('#' + field_type + 'Wrapper').append(field);
            $('#' + field_type + 'Wrapper').find('.input-group-addon').show();

            validatorsManager.bindValidators(this.$el.find('#' + field_type + 'Wrapper'));

            $(field).find("input").trigger("validate");
        },

        removeField: function removeField(event) {
            event.preventDefault();

            var clickedEle = event.target,
                field_type;

            if ($(clickedEle).not("button")) {
                clickedEle = $(clickedEle).closest("button");
            }

            field_type = $(clickedEle).attr('field_type');

            if ($('#' + field_type + 'Wrapper').find('.field').size() > 1) {
                $(clickedEle).parents(".form-group").remove();
            }

            if ($('#' + field_type + 'Wrapper').find('.field').size() === 1) {
                $('#' + field_type + 'Wrapper').find('.input-group-addon').hide();
            }

            validatorsManager.bindValidators(this.$el.find('#' + field_type + 'Wrapper'));
            $('#' + field_type + 'Wrapper').find(':text').trigger("validate");
        }
    });

    return ConnectorTypeAbstractView;
});
