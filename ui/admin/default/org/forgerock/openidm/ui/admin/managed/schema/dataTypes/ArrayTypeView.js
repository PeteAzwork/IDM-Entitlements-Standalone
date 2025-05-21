"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "handlebars", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/managed/schema/dataTypes/ObjectTypeView", "org/forgerock/openidm/ui/admin/managed/schema/dataTypes/ArrayTypeView"], function ($, _, handlebars, AdminAbstractView, ObjectTypeView) {

    var ArrayTypeView = AdminAbstractView.extend({
        template: "templates/admin/managed/schema/dataTypes/ArrayTypeViewTemplate.html",
        noBaseTemplate: true,
        events: {},
        model: {},
        partials: [],
        /**
        * @param {object} args - example
                this.data.arrayTypeView.render({
                    elementId: "arrayTypeContainer",
                    propertyName: this.data.propertyName,
                    propertyRoute: this.args.join("/"),
                    items: this.data.property.items,
                    makeChanges: _.bind(this.saveProperty,this),
                    nestingIndex: 0
                });
        * @param {function} callback - a function to be executed after load
        */
        render: function render(args, callback) {
            var _this = this;

            if (args) {
                this.element = "#" + args.elementId;
                this.data.propertyName = args.propertyName;
                this.data.propertyRoute = args.propertyRoute;
                this.data.items = args.items;
                this.makeChanges = args.makeChanges;
                this.data.nestingIndex = args.nestingIndex;
            }

            this.parentRender(function () {

                if (_this.data.items) {
                    _this.loadNestedView(_this.data.items.type);
                } else {
                    _this.$el.find(".nestedItemTypeContainer").hide();
                }
                _this.setItemTypeChangeEvent();

                if (callback) {
                    callback();
                }
            });
        },
        getValue: function getValue() {
            var itemType = this.$el.find("#itemTypeSelect_" + this.data.nestingIndex).val(),
                items = {
                type: itemType
            };

            if (this.data.arrayTypeView) {
                items.items = this.data.arrayTypeView.getValue();
            }

            if (this.data.objectProperties) {
                items = _.assignIn(items, this.data.objectProperties.getValue());
            }

            return items;
        },
        setItemTypeChangeEvent: function setItemTypeChangeEvent() {
            var _this2 = this;

            this.$el.find("#itemTypeSelect_" + this.data.nestingIndex).on("change", function (e) {
                var type = $(e.target).val();

                _this2.$el.find("#nestedItemTypeContainer_" + _this2.data.nestingIndex).empty();

                _this2.loadNestedView(type);
            });
        },
        loadNestedView: function loadNestedView(type) {
            var _this3 = this;

            this.$el.find(".nestedItemTypeContainer").show();
            if (type === "object") {
                this.data.objectProperties = new ObjectTypeView();

                this.data.objectProperties.render({
                    elementId: "nestedItemTypeContainer_" + this.data.nestingIndex,
                    schema: this.data.items,
                    saveSchema: function saveSchema() {
                        _this3.makeChanges();
                    },
                    parentObjectName: this.data.propertyName,
                    propertyRoute: this.data.propertyRoute,
                    isArrayItem: true
                });
            } else if (type === "array") {
                this.data.arrayTypeView = new ArrayTypeView();

                this.data.arrayTypeView.render({
                    elementId: "nestedItemTypeContainer_" + this.data.nestingIndex,
                    propertyName: this.data.propertyName,
                    propertyRoute: this.data.propertyRoute,
                    items: this.data.items.items || this.data.items,
                    makeChanges: this.makeChanges,
                    nestingIndex: parseInt(this.data.nestingIndex, 10) + 1
                });
            } else {
                this.$el.find(".nestedItemTypeContainer").hide();
            }
        }
    });

    return ArrayTypeView;
});
