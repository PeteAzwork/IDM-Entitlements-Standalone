"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "handlebars", "backbone", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/util/ProgressiveProfileUtils", "backgrid", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/commons/ui/common/util/Constants"], function ($, _, handlebars, Backbone, AdminAbstractView, ProgressiveProfileUtils, Backgrid, BackgridUtils, AdminUtils, Constants) {
    var AttributesView = AdminAbstractView.extend({
        template: "templates/admin/progressiveProfileForms/tabs/AttributesViewTemplate.html",
        events: {
            "click .btn-add-attribute": "openAddRow",
            "keypress .attributes-list": "enterHandler"
        },
        model: {},
        partials: ["partials/progressiveProfileForms/_progressiveProfileFormNewAttributeRow.html", "partials/progressiveProfileForms/_progressiveProfileFormEditAttributeRow.html", "partials/progressiveProfileForms/_attributeDisplay.html", "partials/managed/schema/_propertyRequiredCell.html"],
        render: function render(args, callback) {
            var _this2 = this;

            if (args.element) {
                this.element = args.element;
            }

            this.model.identityServiceUrl = args.identityServiceUrl;

            this.model.attributesCollection = new Backbone.Collection(args.attributes);

            this.onSave = args.onSave;

            this.getAvailableProps().then(function (availableProps) {
                _this2.model.availablePropsSchema = _.cloneDeep(availableProps.schema);
                _this2.model.availableProps = availableProps.displayList;

                _this2.parentRender(function () {
                    _this2.loadAttributesGrid();
                    if (callback) {
                        callback();
                    }
                });
            });
        },
        getValue: function getValue() {
            return this.model.attributesCollection.toJSON();
        },
        getAvailableProps: function getAvailableProps() {
            var _this3 = this;

            return AdminUtils.findPropertiesList(this.model.identityServiceUrl.split("/")).then(function (schema) {
                var existingProps = _.toArray(_.mapValues(_this3.model.attributesCollection.toJSON(), "name")),

                //filter the list based on what properties have already been added
                filteredList = ProgressiveProfileUtils.filteredPropertiesList(schema, existingProps),

                //loop over the list and create an array of objects to be used in the selectize dropdown
                displayMap = _.map(filteredList, function (propName) {
                    var title = ProgressiveProfileUtils.getPropertyTitle(schema, propName);

                    return {
                        label: title,
                        value: propName
                    };
                }),

                //we need to have a map of the schema that looks like the displayMap so we can add and remove these
                //objects from our displayMap when we add/remove attributes from form collection
                schemaMap = _.map(schema, function (val, key) {
                    var title = ProgressiveProfileUtils.getPropertyTitle(schema, key);

                    return {
                        label: title,
                        value: key
                    };
                });

                return {
                    displayList: _.sortBy(displayMap, "label"),
                    schema: schemaMap
                };
            });
        },
        openAddRow: function openAddRow(e) {
            this.$el.find(".new-attribute-row").removeClass("hidden");
            this.$el.find("tr.empty").hide();

            if (e) {
                e.preventDefault();
                // we know this is from pressing the "Add a Property" button so we want to focus on the selectize-input
                this.$el.find(".new-attribute-row").find(".selectize-input input").focus();
            }
        },

        enterHandler: function enterHandler(event) {
            if (event.keyCode === Constants.ENTER_KEY && this.$el.find(".save-new-attribute").is(":visible")) {
                this.$el.find(".save-new-attribute").trigger("click");
            }
        },
        getAvailablePropByValue: function getAvailablePropByValue(val) {
            return _.cloneDeep(_.find(this.model.availablePropsSchema, { value: val }));
        },
        getAttributesDisplay: function getAttributesDisplay(label, value) {
            return handlebars.compile("{{> progressiveProfileForms/_attributeDisplay}}")({
                label: label,
                value: value
            });
        },
        loadAttributesGrid: function loadAttributesGrid() {
            var _this4 = this;

            var _this = this,
                saveEditRow = function saveEditRow(e, isNew) {
                var row = $(e.target).closest("tr"),
                    rowValue = {
                    name: row.find(".edit-attributeName").val(),
                    isRequired: row.find(".edit-isRequired:checked").length ? true : false
                },
                    rowIndex = AdminUtils.getClickedRowIndex(e);

                e.preventDefault();

                if (rowValue.name) {
                    if (isNew) {
                        _this4.model.attributesCollection.add(rowValue);
                    } else {
                        _this4.model.attributesCollection.models[rowIndex].set(rowValue);
                    }

                    //remove property from availableProps for this object
                    _this4.model.availableProps.splice(_.findIndex(_this4.model.availableProps, { value: rowValue.name }), 1);

                    _this4.loadAttributesGrid();

                    if (isNew) {
                        _this4.openAddRow();
                    }

                    _this4.onSave();
                }
            },
                cols = [{
                name: "name",
                label: $.t("templates.progressiveProfile.attributeName"),
                cell: Backgrid.Cell.extend({
                    render: function render() {
                        var propSchema = _this.getAvailablePropByValue(this.model.get("name")),
                            html = _this.getAttributesDisplay(propSchema.label, propSchema.value);

                        this.$el.html(html);
                        this.$el.addClass("col-sm-5");

                        return this;
                    }
                }),
                sortable: false,
                editable: false
            }, {
                name: "isRequired",
                label: $.t("common.form.validation.required"),
                cell: Backgrid.Cell.extend({
                    render: function render() {
                        this.$el.html($(handlebars.compile("{{> managed/schema/_propertyRequiredCell}}")({
                            required: this.model.get("isRequired")
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
                        _this.model.attributesCollection.remove(this.model);
                        _this.model.availableProps.push(_this.getAvailablePropByValue(this.model.get("name")));
                        _this.model.availableProps = _.sortBy(_this.model.availableProps, "label");
                        _this.loadAttributesGrid();
                        _this.onSave();
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
                attributesGrid,
                makeSortable,
                newRow = $(handlebars.compile("{{> progressiveProfileForms/_progressiveProfileFormNewAttributeRow }}")({
                availableProps: this.model.availableProps
            }));

            makeSortable = function makeSortable() {
                BackgridUtils.sortable({
                    "containers": [_this4.$el.find(".attributes-list tbody")[0]],
                    "rows": _.cloneDeep(_this4.model.attributesCollection.toJSON())
                }, function (newOrder) {
                    _this4.model.attributesCollection = new Backbone.Collection(newOrder);
                    _this4.onSave();
                });
            };

            attributesGrid = new Backgrid.Grid({
                className: "backgrid table table-hover",
                emptyText: $.t("templates.admin.ResourceList.noData"),
                columns: BackgridUtils.addSmallScreenCell(cols),
                collection: this.model.attributesCollection,
                row: BackgridUtils.ClickableRow.extend({
                    callback: _.bind(function (e) {
                        var _this5 = this;

                        var readOnlyRow = $(e.target).closest("tr"),
                            attributeName = readOnlyRow.find("td:eq(0) .attribute-name").text(),
                            isRequired = readOnlyRow.find("td:eq(1)").text().length > 0,
                            availableProps = [this.getAvailablePropByValue(attributeName)].concat(this.model.availableProps),
                            //add this propName back to availableProps for display purposes on this edit row
                        editableRow = $(handlebars.compile("{{> progressiveProfileForms/_progressiveProfileFormEditAttributeRow }}")({
                            attributeName: attributeName,
                            isRequired: isRequired,
                            availableProps: availableProps
                        }));

                        e.preventDefault();
                        //remove all other visible editable rows
                        readOnlyRow.parent().find(".edit-attribute-row").remove();
                        //show all other rows
                        readOnlyRow.parent().find("tr").show();

                        //hide the current row
                        readOnlyRow.hide();
                        //add the editable row after the hidden row
                        readOnlyRow.after(editableRow);

                        //set selectize dropdown
                        editableRow.find(".edit-attributeName").selectize({
                            create: false,
                            render: {
                                option: function option(item) {
                                    return _this.getAttributesDisplay(item.text, item.value);
                                },
                                item: function item(_item) {
                                    return _this.getAttributesDisplay(_item.text, _item.value);
                                }
                            }
                        });
                        //hide the add row
                        editableRow.parent().find(".new-attribute-row").hide();

                        editableRow.find(".cancel-edit-attribute").click(function (e) {
                            e.preventDefault();
                            _this5.loadAttributesGrid();
                        });

                        editableRow.find(".save-edit-attribute").click(function (e) {
                            var savedRow = $(e.target).closest("tr"),
                                newAttributeName = savedRow.find(".edit-attributeName").val();

                            //remove the hidden readOnlyRow...the saveEditRow relies on an accurate number of rows to calculate the rowIndex
                            //if not opts.listValue will be wrong because there is an extra row in there
                            readOnlyRow.remove();

                            //if the newPropName differs from the previous propName we need to add the old propName back to the list of availableProps
                            if (newAttributeName !== attributeName) {
                                _this5.model.availableProps.push(_this5.getAvailablePropByValue(attributeName));
                                _this5.model.availableProps = _.sortBy(_this5.model.availableProps, "label");
                            }
                            saveEditRow(e);
                        });
                    }, this)
                })
            });

            //empty previously existing
            this.$el.find(".attributes-list").empty();

            this.$el.find(".attributes-list").append(attributesGrid.render().el);

            this.$el.find(".attributes-list tbody").append(newRow);

            //selectize the dropdown
            newRow.find(".edit-attributeName").selectize({
                create: false,
                render: {
                    option: function option(item) {
                        return handlebars.compile("{{> progressiveProfileForms/_attributeDisplay}}")({
                            label: item.text,
                            value: item.value
                        });
                    }
                }
            });

            newRow.find(".save-new-attribute").click(function (e) {
                saveEditRow(e, true);
            });

            makeSortable();
        }
    });

    return new AttributesView();
});
