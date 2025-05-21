"use strict";

/*
 * Copyright 2015-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/common/util/CommonUIUtils", "org/forgerock/openidm/ui/admin/managed/schema/dataTypes/ObjectTypeView", "org/forgerock/commons/ui/common/main/ValidatorsManager"], function ($, _, AdminAbstractView, CommonUIUtils, ObjectTypeView, ValidatorsManager) {
    var SchemaEditorView = AdminAbstractView.extend({
        template: "templates/admin/managed/schema/SchemaEditorViewTemplate.html",
        element: "#managedSchemaContainer",
        noBaseTemplate: true,
        model: {},
        events: {},

        render: function render(args, callback) {
            var _this = this;

            this.parent = args[0];

            this.parentRender(function () {
                var wasJustSaved = false;

                if (_.isObject(_this.model.managedObjectSchema) && _this.model.managedObjectSchema.data.wasJustSaved && _this.parent.data.currentManagedObject.name === _this.model.managedObjectSchema.model.propertyRoute) {
                    wasJustSaved = true;
                }

                _this.model.managedObjectSchema = new ObjectTypeView();

                _this.model.managedObjectSchema.render({
                    elementId: "managedSchema",
                    schema: _this.parent.data.currentManagedObject.schema,
                    saveSchema: _.bind(_this.saveManagedSchema, _this),
                    deleteRelationshipSchema: _.bind(_this.deleteRelationshipSchema, _this),
                    propertyRoute: _this.parent.data.currentManagedObject.name,
                    topLevelObject: true,
                    wasJustSaved: wasJustSaved
                }, function () {
                    ValidatorsManager.bindValidators(_this.$el.find("#managedObjectSchemaForm"));

                    if (callback) {
                        callback();
                    }
                });
            });
        },
        getManagedSchema: function getManagedSchema() {
            var managedSchema = _.assignIn({
                "$schema": "http://forgerock.org/json-schema#",
                "type": "object",
                "title": this.parent.$el.find("#managedObjectTitle").val(),
                "description": this.parent.$el.find("#managedObjectDescription").val(),
                "icon": this.parent.$el.find("#managedObjectIcon").val()
            }, this.model.managedObjectSchema.getValue());

            return managedSchema;
        },

        saveManagedSchema: function saveManagedSchema(e, callback) {
            var _this2 = this;

            if (e) {
                e.preventDefault();
            }

            this.parent.data.currentManagedObject.schema = CommonUIUtils.replaceEmptyStringWithNull(this.getManagedSchema());

            this.parent.saveManagedObject(this.parent.data.currentManagedObject, this.parent.data.managedObjects, false, function () {
                _this2.parent.$el.find('a[href="#managedSchemaContainer"]').tab('show');

                if (callback) {
                    callback();
                }
            });
        },

        deleteRelationshipSchema: function deleteRelationshipSchema(propertyName, callback) {
            var _this3 = this;

            this.parent.data.currentManagedObject.schema = CommonUIUtils.replaceEmptyStringWithNull(this.getManagedSchema());
            this.parent.deleteRelationshipProperty(this.parent.data.currentManagedObject, this.parent.data.currentManagedObject.name, propertyName, false, function () {
                _this3.parent.$el.find('a[href="#managedSchemaContainer"]').tab('show');
                if (callback) {
                    callback();
                }
            });
        }
    });

    return new SchemaEditorView();
});
