"use strict";

/*
 * Copyright 2016-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "backbone", "backgrid", "handlebars", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/openidm/ui/admin/managed/schema/util/SchemaUtils", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/commons/ui/common/main/ValidatorsManager"], function ($, _, Backbone, Backgrid, Handlebars, AbstractView, AdminUtils, BackgridUtils, SchemaUtils, UIUtils, ValidatorsManager) {
    var EditResourceFormView;

    EditResourceFormView = AbstractView.extend({
        element: "#editResourceCollectionDialog",
        events: {
            "click .advanced-options-toggle": "toggleAdvancedOptions",
            "keyup input[name='propertyName']": "setPropertyName",
            "click input[name='notify']": "setNotify",
            "keyup .resource-collection-query-filter": "setQueryFilter",
            "change input[name='validate']": "setValidate",
            "customValidate": "toggleSaveButton"
        },
        model: {
            fields: {},
            sortKeys: {}
        },
        template: "templates/admin/managed/schema/dataTypes/EditResourceCollectionDialogTemplate.html",
        partials: ["partials/managed/schema/_resourceCollectionFieldNewRow.html", "partials/managed/schema/_resourceCollectionFieldEditableRow.html", "partials/managed/schema/_selectizeIconItem.html"],
        initialize: function initialize(args) {
            AbstractView.prototype.initialize.call(this);
            this.data = _.omit(_.cloneDeep(args), "dataHandler");
            this.dataHandler = args.dataHandler;
            this.data.existingResource = false;
            if (!_.isEmpty(this.data.currentValue.path)) {
                this.data.existingResource = true;
                this.data.name = _.last(args.currentValue.path.split("/"));
            }
        },
        exportResource: function exportResource() {
            if (this.data.reverseRelationship) {
                this.dataHandler({
                    propertyName: this.data.propertyName,
                    title: this.data.title,
                    notify: this.data.notify || false,
                    resource: this.data.currentValue,
                    validate: this.data.validate || false });
            } else {
                this.dataHandler(this.data.currentValue);
            }
        },
        isValid: function isValid() {
            return this.data.currentValue && this.data.currentValue.path && ValidatorsManager.formValidated(this.$el.find("form"));
        },
        showResourceDetails: function showResourceDetails(path) {
            var currentValue = this.data.currentValue;
            if (!_.isEmpty(path)) {
                currentValue.path = path;
                currentValue.label = _.capitalize(_.last(path.split("/")));
                this.$el.find(".resource-dependent").removeClass("hidden");
                this.setupResourcePropertiesGrid(this.data.currentValue.path, this.data.currentValue.query.fields);
            } else {
                currentValue.path = "";
                this.$el.find(".resource-dependent").addClass("hidden");
            }
        },
        render: function render(args, callback) {
            var _this = this;

            if (args.dialogRef) {
                this.model.dialogRef = args.dialogRef;
            }

            this.parentRender(function () {
                if (!_this.data.existingResource) {
                    var showResourceDetails = _.bind(_this.showResourceDetails, _this),
                        managedObjects = _this.data.managedObjects,
                        selectizeItemTemplate = Handlebars.compile("{{> managed/schema/_selectizeIconItem}}");
                    _this.$el.find("select[name='resource']").selectize({
                        onChange: showResourceDetails,
                        render: {
                            option: function option(data) {
                                var name = _.last(data.value.split("/")),
                                    object = _.find(managedObjects, { name: name }),
                                    icon = object.schema.icon;
                                return selectizeItemTemplate({ icon: icon, name: name });
                            },
                            item: function item(data) {
                                if (data.value.length) {
                                    var name = _.last(data.value.split("/")),
                                        object = _.find(managedObjects, { name: name }),
                                        icon = object.schema.icon;
                                    return selectizeItemTemplate({ icon: icon, name: name });
                                }
                            }
                        }
                    });
                } else {
                    var propertyInput = _this.$el.find("input[name='propertyName']");

                    _this.$el.find(".resource-dependent").removeClass("hidden");
                    _this.setupResourcePropertiesGrid(_this.data.currentValue.path, _this.data.currentValue.query.fields);

                    if (propertyInput.is(":visible")) {
                        propertyInput.focus();
                    } else {
                        _this.toggleSaveButton();
                    }
                }

                ValidatorsManager.bindValidators(_this.$el.find("form"));

                if (callback) {
                    callback();
                }
            });
        },
        setPropertyName: function setPropertyName(event) {
            var name = event.target.value;
            this.data.propertyName = name;
            this.data.title = _.capitalize(name);
        },
        setNotify: function setNotify(event) {
            var notify = $(event.target).prop("checked");
            this.data.notify = notify;
            this.data.currentValue.notify = notify;
        },
        setQueryFilter: function setQueryFilter(event) {
            this.data.currentValue.query.queryFilter = event.target.value;
        },
        toggleAdvancedOptions: function toggleAdvancedOptions(event) {
            var _this2 = this;

            event.preventDefault();
            this.$el.find(".advanced-options-toggle").toggle();
            this.$el.find(".advanced-show-hide").slideToggle(function () {
                _this2.data.showAdvanced = _this2.$el.find(".advanced-show-hide").is(":visible");
            });
        },
        setTitle: function setTitle(event) {
            event.preventDefault();
            this.data.currentValue.title = _.capitalize($(event.target).val());
        },
        setValidate: function setValidate(event) {
            event.preventDefault();
            this.data.validate = $(event.target).prop("checked");
        },


        /**
         * sets up editable grid with selectize inputs
         *
         * @param {string} path - resource path ("managed/user")
         * @param {array} listValue - an array of properties
         */
        setupResourcePropertiesGrid: function setupResourcePropertiesGrid(path, listValue) {
            var _this3 = this;

            AdminUtils.findPropertiesList(path.split("/")).then(function (availableProps) {
                /*
                    filter out the all props that are named "_id", are not of type string,
                    , are encrypted, or are already in the current list from the availableProps
                */
                availableProps = AdminUtils.filteredPropertiesList(availableProps, _this3.data.currentValue.query.fields);
                SchemaUtils.buildEditableResourcePropertiesGrid({
                    listElement: _this3.$el.find(".resource-collection-fields-list"),
                    availableProps: availableProps,
                    listValue: listValue,
                    onReloadGrid: function onReloadGrid() {
                        _this3.setupResourcePropertiesGrid(_this3.data.currentValue.path, _this3.data.currentValue.query.fields);
                    },
                    onSaveRow: _.noop,
                    onReorder: function onReorder(newOrder) {
                        _this3.data.currentValue.query.fields = newOrder;
                        _this3.data.currentValue.query.sortKeys = newOrder;
                    },
                    onRemoveRow: function onRemoveRow(itemIndex) {
                        _this3.data.currentValue.query.sortKeys.splice(itemIndex, 1);
                    }
                });

                if (_this3.data.currentValue.path.length) {
                    _this3.$el.find(".resource-dependent").removeClass("hidden");
                }
            });
        },

        toggleSaveButton: function toggleSaveButton() {
            var dialogRef = this.model.dialogRef,
                modalFooter = dialogRef.$modalFooter,
                saveButton = modalFooter.find("#resourceCollectionDialogSaveBtn");

            saveButton.toggleClass("disabled", !this.isValid());
        }

    });

    return EditResourceFormView;
});
