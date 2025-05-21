"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "handlebars", "backbone", "backgrid", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/objectTypes/util/SchemaUtils", "selectize", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/admin/util/AdminUtils", "stickyTableHeaders"], function ($, _, handlebars, Backbone, Backgrid, BackgridUtils, AdminAbstractView, SchemaUtils, selectize, UIUtils, EventManager, Constants, AdminUtils) {

    var ObjectTypeView = AdminAbstractView.extend({
        template: "templates/admin/objectTypes/schema/PropertiesListViewTemplate.html",
        noBaseTemplate: true,
        events: {
            "click .addNewPropertyButton": "addNewProperty",
            "click .cancelEditProperty": "cancelEditProperty",
            "click .openAddPropertyRow": "openAddPropertyRow",
            "keyup .newPropertyName": "toggleNewPropertySaveButton"
        },
        model: {},
        partials: ["partials/objectTypes/_propertiesNewRow.html", "partials/managed/schema/_propertyRequiredCell.html"],
        /**
        * @param {object} args - { schema: objectSchema, saveSchema: saveFunction, propertyRoute: "device/serialNumber"}
        * @param {function} callback - a function to be executed after load
        */
        render: function render(args, callback) {
            var _this = this;

            var refreshView = false;

            this.data.wasJustSaved = false;

            if (args) {
                this.element = "#" + args.elementId;

                //make sure schema has properties, order, and required properties
                this.model.schema = _.assignIn({ properties: {}, required: [], order: [] }, _.cloneDeep(args.schema));

                this.saveSchema = args.saveSchema || _.noop;
                /*
                    the propertyRoute is used in the clickable grid rows
                    to set the args passed to the property details page
                */
                this.model.propertyRoute = args.propertyRoute;

                this.data.availableProperties = SchemaUtils.getObjectTypeAvailableProperties(args.availableObjectTypes, args.schema, args.objectTypeName);

                if (args.wasJustSaved) {
                    this.data.wasJustSaved = args.wasJustSaved;
                }

                //if there are args we know we need to fully refresh the data in the grid
                refreshView = true;
            }

            this.parentRender(function () {
                _this.loadPropertiesGrid(refreshView, callback);

                if (callback) {
                    callback();
                }
            });
        },
        /**
        * @param {boolean} refreshView - flag used to tell the grid to refresh the data with the latest from the server
        */
        loadPropertiesGrid: function loadPropertiesGrid(refreshView) {
            var _this3 = this;

            var self = this,
                cols = [{
                name: "propName",
                label: $.t("templates.managed.schemaEditor.propertyName"),
                cell: "string",
                sortable: false,
                editable: false
            }, {
                name: "type",
                label: $.t("templates.admin.ResourceEdit.type"),
                cell: Backgrid.Cell.extend({
                    render: function render() {
                        var type = this.model.get("type");

                        this.$el.html(AdminUtils.capitalizeName(type));

                        return this;
                    }
                }),
                sortable: false,
                editable: false
            }, {
                name: "nativeType",
                label: $.t("templates.connector.objectTypes.nativeType"),
                cell: Backgrid.Cell.extend({
                    render: function render() {
                        var type = this.model.get("nativeType") || "";

                        this.$el.html(AdminUtils.capitalizeName(type));

                        return this;
                    }
                }),
                sortable: false,
                editable: false
            }, {
                name: "required",
                label: $.t("common.form.validation.required"),
                cell: Backgrid.Cell.extend({
                    render: function render() {
                        var required = this.model.get("required");

                        this.$el.html($(handlebars.compile("{{> managed/schema/_propertyRequiredCell}}")({
                            required: required
                        })));

                        return this;
                    }
                }),
                sortable: false,
                editable: false
            }, {
                label: "",
                cell: BackgridUtils.ButtonCell([{
                    className: "fa fa-times grid-icon col-sm-1 pull-right",
                    callback: function callback() {
                        var _this2 = this;

                        var overrides = {
                            title: $.t("templates.managed.schemaEditor.deleteProperty"),
                            okText: $.t("common.form.confirm")
                        };
                        UIUtils.confirmDialog($.t("templates.managed.schemaEditor.confirmPropertyDelete", { propName: this.model.get("propName") }), "danger", function () {
                            self.model.propertiesCollection.remove(_this2.model);
                            self.saveSchema();
                        }, overrides);
                    }
                }, {
                    // No callback necessary, the row click will trigger the edit
                    className: "fa fa-pencil grid-icon col-sm-1 pull-right"
                }]),
                sortable: false,
                editable: false
            }],
                propertiesGrid,
                properties = SchemaUtils.convertSchemaToPropertiesArray(this.model.schema),
                addNewRow = $(handlebars.compile("{{> objectTypes/_propertiesNewRow}}")({
                availableProperties: this.data.availableProperties,
                nativeTypes: SchemaUtils.nativeTypes.sort(),
                idmTypes: SchemaUtils.idmTypes.sort()
            }));

            if (refreshView) {
                this.model.propertiesCollection = new Backbone.Collection(properties);
            }

            propertiesGrid = new Backgrid.Grid({
                className: "backgrid table table-hover",
                emptyText: $.t("templates.admin.ResourceList.noData"),
                columns: BackgridUtils.addSmallScreenCell(cols),
                collection: this.model.propertiesCollection,
                row: BackgridUtils.ClickableRow.extend({
                    callback: function callback(e) {
                        var connectorId = self.model.propertyRoute.split("/")[0],
                            objectTypeName = self.model.propertyRoute.split("/")[1],
                            propertyArgs = self.model.propertyRoute.split("/"),
                            propName = this.model.get("propName"),
                            propExists;

                        //remove the first two elements from the array
                        propertyArgs = propertyArgs.slice(2);

                        propertyArgs = propertyArgs.concat(propName);

                        propExists = _.indexOf(_.keys(self.model.schema.properties), propName) > -1;

                        e.preventDefault();

                        //open property detail view here
                        if (!$(e.target).hasClass("fa-times") && propExists) {
                            EventManager.sendEvent(Constants.ROUTE_REQUEST, { routeName: "editObjectTypePropertyView", args: [connectorId, objectTypeName, propertyArgs.join("/")] });
                        }
                    }
                })
            });

            this.$el.find(".object-properties-list").append(propertiesGrid.render().el);

            this.$el.find(".object-properties-list tbody").after(addNewRow);

            this.$el.find(".object-properties-list").find("table").stickyTableHeaders();

            if (!this.model.propertiesCollection.length) {
                this.$el.find(".propertiesNewRow").hide();
            }

            this.model.newPropertyTypeSelect = this.$el.find(".newPropertyTypeSelect").selectize({
                persist: false,
                create: true,
                onChange: function onChange(value) {
                    _this3.$el.find(".newPropertyType").val(value);
                }
            });

            this.model.newPropertyNativeTypeSelect = this.$el.find(".newPropertyNativeTypeSelect").selectize({
                persist: false,
                create: true,
                onChange: function onChange(value) {
                    _this3.$el.find(".newPropertyNativeType").val(value);
                }
            });

            this.model.newPropertyTypeName = this.$el.find(".newPropertyNameSelect").selectize({
                persist: false,
                create: true,
                onChange: function onChange(value) {
                    if (value && _this3.data.availableProperties[value]) {
                        _this3.setNewPropertyFields(_this3.data.availableProperties[value], value);
                    }

                    _this3.$el.find(".newPropertyName").val(value);
                },
                openOnFocus: false
            });

            if (this.data.wasJustSaved) {
                /*
                * this.data.wasJustSaved is set by the addNewProperty() function
                * open the add property row with focus on the name field so the
                * user can continue to add properties without having to use a mouse
                */
                this.openAddPropertyRow();
            }
        },
        setNewPropertyFields: function setNewPropertyFields(selectedProperty) {
            this.model.newPropertyTypeSelect[0].selectize.setValue(selectedProperty.type);
            this.model.newPropertyNativeTypeSelect[0].selectize.setValue(selectedProperty.nativeType);

            this.$el.find(".newPropertyIsRequired").prop("checked", selectedProperty.required);
        },
        /**
        * gets the value of the current state of this view
        */
        getValue: function getValue() {
            if (this.model.propertiesCollection) {
                return SchemaUtils.convertPropertiesArrayToSchema(this.model.propertiesCollection.toJSON());
            } else {
                return this.model.schema;
            }
        },
        /**
        * adds a new property to the properties grid
        */
        addNewProperty: function addNewProperty(e) {
            var propName = this.$el.find(".newPropertyName").val(),
                propertyType = this.$el.find(".newPropertyType").val(),
                propertyNativeType = this.$el.find(".newPropertyNativeType").val(),
                required = this.$el.find(".newPropertyIsRequired").prop("checked"),
                newProp = SchemaUtils.getPropertyTypeDefault(propName, propertyType, propertyNativeType);

            e.preventDefault();

            newProp.propName = propName;
            newProp.required = required;

            //make sure there is a propertyName and there isn't already a property of the same name
            if (propName.trim().length && !this.model.schema.properties[propName]) {
                this.model.propertiesCollection.add(newProp);
                this.data.wasJustSaved = true;
                this.saveSchema();
                this.$el.find(".newPropertyName").val("");
                this.$el.find(".newPropertyName").focus();
                this.$el.find(".addNewPropertyButton").addClass("disabled");
            }
        },
        /**
        * cancels editing a row in the properties grid
        */
        cancelEditProperty: function cancelEditProperty(e) {
            e.preventDefault();
            this.render();
        },

        /**
        * shows and adds focus to the addNewProperty row
        * @param {object} e - an event object
        * @param {boolean} noFocus - this param is here basically for page load ...we only want to focus on this row when a new property has just been added
        */
        openAddPropertyRow: function openAddPropertyRow(e, noFocus) {
            if (e) {
                e.preventDefault();
            }

            this.$el.find(".propertiesNewRow").show();
            this.$el.find("tr.empty").hide();
            this.$el.find(".addNewPropertyButton").addClass("disabled");

            if (!noFocus) {
                this.model.newPropertyTypeName[0].selectize.focus();
            }
        },

        /**
         * toggle state of the row save button based on the target.value of the trigger/ passed event
         * @param {object} e - dom event
         * @return undefined
         */
        toggleNewPropertySaveButton: function toggleNewPropertySaveButton(e) {
            this.$el.find(".addNewPropertyButton").toggleClass("disabled", _.isEmpty(e.target.value));
        }
    });

    return ObjectTypeView;
});
