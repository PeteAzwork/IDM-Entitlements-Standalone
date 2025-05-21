"use strict";

/*
 * Copyright 2017-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "handlebars", "selectize", "org/forgerock/commons/ui/common/util/UIUtils", "backbone", "backgrid", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/openidm/ui/admin/util/AdminUtils"], function ($, _, handlebars, selectize, UIUtils, Backbone, Backgrid, BackgridUtils, AdminUtils) {
    var obj = {};

    /**
    * @param {object} schema - an object schema (at the least "properties", "order", "required")
    * @returns {array} - an array of property objects ordered by schema.order
    */
    obj.convertSchemaToPropertiesArray = function (schema) {
        return _.map(schema.order || _.keys(schema.properties), function (propName) {
            var prop = schema.properties[propName];

            prop.required = _.indexOf(schema.required, propName) >= 0;

            prop.propName = propName;

            return prop;
        });
    };
    /**
    * @param {array} propArray - an ordered array of property objects
    * @returns {object} - a schema object including ("properties", "order", "required")
    */
    obj.convertPropertiesArrayToSchema = function (propArray) {
        var schema = {
            properties: {},
            order: [],
            required: []
        };

        _.forEach(propArray, function (prop) {
            schema.order.push(prop.propName);

            if (prop.required) {
                schema.required.push(prop.propName);
            }

            schema.properties[prop.propName] = _.omit(prop, "propName", "required");
        });

        return schema;
    };
    /**
    * digs into items of an array and gets a ref to the last spot where items exist
    * this is here so to handle deeply nested objects (why would anyone do such a thing?!?)
    * @param {object} - the object representing the "items" property of an array type property
    * @returns {object} - the last in the line of array items objects
    */
    obj.handleArrayNest = function (arrayItems) {
        var getItemsFromItems = function getItemsFromItems(items) {
            items = items.items;

            if (items.items) {
                return getItemsFromItems(items);
            } else {
                return items;
            }
        };

        if (arrayItems.items) {
            arrayItems = getItemsFromItems(arrayItems);
        }

        return arrayItems;
    };
    /**
    * This function takes in a title and propertyType and returns a default schema property based on propertyType
    * @param {string} title
    * @param {string} propertyType
    * @returns {object} - a schema property object
    */
    obj.getPropertyTypeDefault = function (title, propertyType) {
        var defaultProps = {
            "boolean": {
                title: title,
                type: "boolean",
                viewable: true,
                searchable: false,
                userEditable: true
            },
            "array": {
                title: title,
                type: "array",
                viewable: true,
                searchable: false,
                userEditable: true,
                items: {
                    type: "string"
                }
            },
            "object": {
                title: title,
                type: "object",
                viewable: true,
                searchable: false,
                userEditable: true,
                properties: {},
                order: [],
                required: []
            },
            "relationship": {
                title: title,
                type: "relationship",
                viewable: true,
                searchable: false,
                userEditable: false,
                returnByDefault: false,
                reverseRelationship: false,
                reversePropertyName: "",
                validate: false,
                properties: {
                    _ref: {
                        type: "string"
                    },
                    _refProperties: {
                        type: "object",
                        properties: {
                            _id: {
                                type: "string"
                            }
                        }
                    }
                },
                resourceCollection: []
            },
            "relationships": {
                title: title,
                type: "array",
                items: {
                    type: "relationship",
                    reverseRelationship: false,
                    reversePropertyName: "",
                    validate: false,
                    properties: {
                        _ref: {
                            type: "string"
                        },
                        _refProperties: {
                            type: "object",
                            properties: {
                                _id: {
                                    type: "string"
                                }
                            }
                        }
                    },
                    resourceCollection: []
                },
                viewable: true,
                searchable: false,
                userEditable: false,
                returnByDefault: false
            },
            "number": {
                title: title,
                type: "number",
                viewable: true,
                searchable: false,
                userEditable: true
            },
            "string": {
                title: title,
                type: "string",
                viewable: true,
                searchable: false,
                userEditable: true
            }
        };

        return defaultProps[propertyType || "string"];
    };
    /**
    * This function is called when a managed object is deleted. It looks into all managed objects,
    * grabs all their relationship type properties, and removes and any resourceCollection array items
    * that have path equal to the managed object being deleted.
    **/
    obj.removeRelationshipOrphans = function (managedConfigObjects, deletedObject) {
        var deletedObjectPath = "managed/" + deletedObject;

        _.forEach(managedConfigObjects, function (managedObject) {
            var singletonRelationships = _.filter(managedObject.schema.properties, { type: "relationship" }),
                arraysOfRelatiohsips = _.filter(managedObject.schema.properties, function (prop) {
                return prop.type === "array" && prop.items.type === "relationship";
            }),
                doDelete = function doDelete(resourceCollection) {
                var removeIndex = _.findIndex(resourceCollection, { path: deletedObjectPath });
                if (removeIndex > -1) {
                    resourceCollection.splice(removeIndex, 1);
                }
            };

            _.forEach(singletonRelationships, function (rel) {
                doDelete(rel.resourceCollection);
            });

            _.forEach(arraysOfRelatiohsips, function (rel) {
                doDelete(rel.items.resourceCollection);
            });
        });

        return managedConfigObjects;
    };
    /**
     * loads partials that obj.buildEditableResourcePropertiesGrid depends upon
     */
    obj.loadPropertiesGridPartials = function () {
        return $.when(UIUtils.preloadPartial("partials/managed/schema/_resourceCollectionFieldNewRow.html"), UIUtils.preloadPartial("partials/managed/schema/_resourceCollectionFieldEditableRow.html"));
    };
    /**
     * sets up editable grid with selectize inputs
     * needs the partials loaded by the above obj.loadPropertiesGridPartials function
     * @param {object} opts - options object
     * example : {
             listElement : dialogRef.$modalContent.find("#searchFieldsList"),
             availableProps : availableProps,
             listValue : listValue,
             onReloadGrid : (newValue) => {
                 dialogRef.$modalBody.find("#relationshipWidgetSearchProperty").val(newValue.join(","));
             },
             onSaveRow : _.noop,
             onReorder : _.noop
         }
     */
    obj.buildEditableResourcePropertiesGrid = function (opts) {
        var propertiesCollection = new Backbone.Collection(),
            reloadGrid = function reloadGrid() {
            obj.buildEditableResourcePropertiesGrid(opts);

            if (opts.onReloadGrid) {
                opts.onReloadGrid(opts.listValue);
            }
        },
            saveEditRow = function saveEditRow(e, isNew) {
            var row = $(e.target).closest("tr"),
                propName = row.find(".resourceCollectionFieldName").val(),
                rowIndex = AdminUtils.getClickedRowIndex(e);

            e.preventDefault();

            if (propName.length) {
                if (isNew) {
                    opts.listValue.push(propName);
                } else {
                    opts.listValue[rowIndex] = propName;
                }

                //remove property from availableProps for this object
                opts.availableProps.splice(_.indexOf(opts.availableProps, propName), 1);

                if (opts.onSaveRow) {
                    opts.onSaveRow(propName);
                }

                reloadGrid();
            }
        },
            cols = [{
            name: "name",
            label: $.t("templates.managed.schemaEditor.propertyName"),
            cell: "string",
            sortable: false,
            editable: false
        }, {
            label: "",
            cell: BackgridUtils.ButtonCell([{
                className: "fa fa-times grid-icon col-sm-1 pull-right",
                callback: function callback(e) {
                    var itemIndex = AdminUtils.getClickedRowIndex(e);

                    //remove the item from the list
                    opts.listValue.splice(itemIndex, 1);
                    //add the removed item back to availableProps
                    opts.availableProps.push(opts.listValue[itemIndex]);

                    if (opts.onRemoveRow) {
                        opts.onRemoveRow(itemIndex);
                    }

                    reloadGrid();
                }
            }, {
                // No callback necessary, the row click will trigger the edit
                className: "fa fa-pencil grid-icon col-sm-1 pull-right"
            }, {
                className: "dragToSort fa fa-arrows grid-icon col-sm-1 pull-right"
            }]),
            sortable: false,
            editable: false
        }],
            propertiesGrid,
            newRow,
            makeSortable = function makeSortable() {
            BackgridUtils.sortable({
                "containers": [opts.listElement.find("tbody")[0]],
                "rows": _.cloneDeep(opts.listValue)
            }, function (newOrder) {
                opts.listValue = newOrder;

                if (opts.onReorder) {
                    opts.onReorder(newOrder);
                }

                reloadGrid();
            });
        };

        //empty the existing
        opts.listElement.empty();

        newRow = $(handlebars.compile("{{> managed/schema/_resourceCollectionFieldNewRow}}")({
            availableProps: opts.availableProps
        }));

        _.forEach(opts.listValue, function (prop) {
            var propObject = {
                name: prop
            };
            propertiesCollection.add(propObject);
        });

        propertiesGrid = new Backgrid.Grid({
            columns: BackgridUtils.addSmallScreenCell(cols),
            collection: propertiesCollection,
            row: BackgridUtils.ClickableRow.extend({
                callback: _.bind(function (e) {
                    var readOnlyRow = $(e.target).closest("tr"),
                        propName = readOnlyRow.find("td:eq(0)").text(),
                        availableProps = [propName].concat(opts.availableProps),
                        //add this propName back to availableProps for display purposes on this edit row
                    editableRow;

                    editableRow = $(handlebars.compile("{{> managed/schema/_resourceCollectionFieldEditableRow}}")({
                        propName: propName,
                        availableProps: availableProps
                    }));

                    e.preventDefault();
                    //remove all other visible editable rows
                    readOnlyRow.parent().find(".resourceCollectionFieldEditableRow").remove();
                    //show all other rows
                    readOnlyRow.parent().find("tr").show();

                    //hide the current row
                    readOnlyRow.hide();
                    //add the editable row after the hidden row
                    readOnlyRow.after(editableRow);

                    //set selectize dropdown
                    editableRow.find(".resourceCollectionFieldName").selectize({ create: true });
                    //hide the add row
                    editableRow.parent().find(".resourceCollectionFieldNewRow").hide();

                    editableRow.find(".cancelEditResourceCollectionFieldRow").click(function (e) {
                        e.preventDefault();
                        reloadGrid();
                    });

                    editableRow.find(".saveEditResourceCollectionFieldRow").click(function (e) {
                        var savedRow = $(e.target).closest("tr"),
                            newPropName = savedRow.find("resourceCollectionFieldName").val();

                        //remove the hidden readOnlyRow...the saveEditRow relies on an accurate number of rows to calculate the rowIndex
                        //if not opts.listValue will be wrong because there is an extra row in there
                        readOnlyRow.remove();

                        //if the newPropName differs from the previous propName we need to add the old propName back to the list of availableProps
                        if (newPropName !== propName) {
                            opts.availableProps.push(propName);
                            opts.availableProps.sort();
                        }
                        saveEditRow(e);
                    });
                }, this)
            })
        });

        opts.listElement.append(propertiesGrid.render().el);

        opts.listElement.find("tbody").append(newRow);
        //selectize the dropdown
        newRow.find(".resourceCollectionFieldName").selectize({
            create: true,
            onChange: function onChange() {
                newRow.find(".addNewResourceCollectionFieldButton").click();
            }
        });

        newRow.find(".addNewResourceCollectionFieldButton").click(function (e) {
            saveEditRow(e, true);
        });

        makeSortable();
    };

    return obj;
});
