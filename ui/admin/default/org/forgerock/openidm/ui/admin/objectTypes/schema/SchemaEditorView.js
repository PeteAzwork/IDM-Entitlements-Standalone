"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/objectTypes/schema/PropertiesListView"], function ($, _, AdminAbstractView, PropertiesListView) {
    var SchemaEditorView = AdminAbstractView.extend({
        template: "templates/admin/objectTypes/schema/SchemaEditorViewTemplate.html",
        element: "#objectTypeSchemaContainer",
        noBaseTemplate: true,
        model: {},
        events: {},

        render: function render(args, callback) {
            var _this = this;

            this.parent = args[0];

            this.parentRender(function () {
                var wasJustSaved = false;

                if (_.isObject(_this.model.propertiesListView) && _this.model.propertiesListView.data.wasJustSaved) {
                    wasJustSaved = true;
                }

                _this.model.propertiesListView = new PropertiesListView();

                _this.model.propertiesListView.render({
                    elementId: "objectTypeSchema",
                    objectTypeName: _this.parent.data.objectTypeName,
                    schema: _this.parent.data.objectType,
                    saveSchema: _.bind(_this.saveObjectTypeSchema, _this),
                    propertyRoute: _this.parent.data.fullConnectorName + "/" + _this.parent.data.objectTypeName,
                    availableObjectTypes: _this.parent.data.availableObjectTypes,
                    wasJustSaved: wasJustSaved
                });

                if (callback) {
                    callback();
                }
            });
        },
        getObjectTypeSchema: function getObjectTypeSchema() {
            var objectTypeSchema = _.assignIn({
                "$schema": "http://json-schema.org/draft-03/schema",
                "type": "object",
                "id": this.parent.$el.find("#objectTypeId").val(),
                "nativeType": this.parent.$el.find("#nativeType").val()
            }, this.model.propertiesListView.getValue());

            return objectTypeSchema;
        },
        saveObjectTypeSchema: function saveObjectTypeSchema(e, callback) {
            var _this2 = this;

            if (e) {
                e.preventDefault();
            }

            this.parent.data.objectType = this.getObjectTypeSchema();

            this.parent.saveObjectType(false, function () {
                _this2.parent.$el.find('a[href="#objectTypeSchemaContainer"]').tab('show');

                if (callback) {
                    callback();
                }
            });
        }
    });

    return new SchemaEditorView();
});
