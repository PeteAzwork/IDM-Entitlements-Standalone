"use strict";

/*
 * Copyright 2014-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/admin/mapping/properties/EditPropertyMappingDialog", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "selectize"], function ($, _, MappingAdminAbstractView, conf, uiUtils, eventManager, constants, EditPropertyMappingDialog, AdminUtils, BootstrapDialogUtils) {

    var AddPropertyMappingDialog = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/properties/AddPropertyMappingDialogTemplate.html",
        data: {
            width: 600,
            height: 400
        },
        el: "#dialogs",
        events: {
            "click input[type=submit]": "formSubmit"
        },
        model: {},

        formSubmit: function formSubmit(event) {
            var property = $("#addPropertySelect", this.$el).val(),
                mappingProperties = this.data.currentProperties;

            if (event) {
                event.preventDefault();
            }

            if (property && property.length) {
                this.$el.empty();

                mappingProperties.push({ target: property });

                this.model.saveCallback(mappingProperties);

                this.close();
                EditPropertyMappingDialog.render({
                    usesLinkQualifier: this.data.usesLinkQualifier,
                    id: mappingProperties.length.toString(),
                    mappingProperties: mappingProperties,
                    availProperties: this.data.sourcePropertiesList,
                    targetSchema: this.data.targetScehma,
                    sourceSchema: this.data.sourceSchema,
                    saveCallback: this.model.saveCallback
                });
            }
        },

        close: function close() {
            $("#dialogs").hide();
        },

        render: function render(params, callback) {
            this.data.usesLinkQualifier = params.usesLinkQualifier;
            this.property = "_new";
            this.data.currentProperties = params.mappingProperties;
            this.model.saveCallback = params.saveCallback;
            this.data.targetPropertiesList = params.availProperties.target.properties;
            this.data.sourcePropertiesList = params.availProperties.source.properties;
            this.data.targetScehma = params.availProperties.target.schema;
            this.data.sourceSchema = params.availProperties.source.schema;

            var _this = this,
                settings;

            settings = {
                "title": $.t("templates.mapping.propertyAdd.title"),
                "template": this.template,
                "postRender": _.bind(function () {
                    _this.$el.find("#addPropertySelect").selectize({
                        persist: false,
                        create: true,
                        onChange: _.bind(function (value) {
                            if (value.length > 0) {
                                this.model.dialog.$modalFooter.find("#scriptDialogUpdate").prop("disabled", false).focus();
                            } else {
                                this.model.dialog.$modalFooter.find("#scriptDialogUpdate").prop("disabled", true);
                            }
                        }, this)
                    });
                }, this)
            };

            this.currentDialog = $('<form id="propertyMappingDialogForm"></form>');

            $('#dialogs').append(this.currentDialog);
            this.setElement(this.currentDialog);

            this.model.dialog = BootstrapDialogUtils.createModal({
                title: settings.title,
                message: this.currentDialog,
                onshown: function onshown() {
                    uiUtils.renderTemplate(settings.template, _this.$el, _.assignIn(conf.globalData, _this.data), function () {
                        settings.postRender();

                        _this.model.dialog.$modalFooter.find("#scriptDialogUpdate").prop("disabled", false).focus();

                        if (callback) {
                            callback();
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
                    label: $.t("common.form.add"),
                    id: "scriptDialogUpdate",
                    cssClass: 'btn-primary',
                    hotkey: 13,
                    action: _.bind(function (dialogRef) {
                        this.formSubmit();
                        dialogRef.close();
                    }, _this)
                }]
            }).open();
        }
    });

    return new AddPropertyMappingDialog();
});
