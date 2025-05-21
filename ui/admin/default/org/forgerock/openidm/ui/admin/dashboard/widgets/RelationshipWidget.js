"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "bootstrap", "selectize", "d3", "backbone", "handlebars", "org/forgerock/openidm/ui/common/dashboard/widgets/AbstractWidget", "org/forgerock/openidm/ui/common/delegates/ResourceDelegate", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/openidm/ui/admin/managed/schema/util/SchemaUtils", "org/forgerock/openidm/ui/admin/dashboard/widgets/util/RelationshipWidget/RadialLayout", "org/forgerock/openidm/ui/admin/dashboard/widgets/util/RelationshipWidget/CollapsibleTreeLayout"], function ($, _, bootstrap, selectize, d3, Backbone, handlebars, AbstractWidget, ResourceDelegate, ConfigDelegate, AdminUtils, SchemaUtils, RadialLayout, CollapsibleTreeLayout) {
    var widgetInstance = {},
        Widget = AbstractWidget.extend({
        template: "templates/admin/dashboard/widgets/RelationshipWidgetTemplate.html",
        model: {
            "overrideTemplate": "dashboard/widget/_relationshipConfig"
        },
        customSettingsLoad: function customSettingsLoad(dialogRef) {
            var _this2 = this;

            $.when(ConfigDelegate.readEntity("managed"), SchemaUtils.loadPropertiesGridPartials()).then(function (managed) {
                var defaultObj = dialogRef.$modalContent.find(".defaultObjectDropdown");

                _this2.model.availablePropsMap = {};

                //set the first managed object to be the defaultBaseObject if not yet defined
                if (!_this2.data.baseObject) {
                    _this2.data.baseObject = managed.objects[0].name;
                }

                _.forEach(managed.objects, function (managedObject) {
                    var option = $("<option>" + managedObject.schema.title + "</option>");

                    option.val(managedObject.name);

                    if (_this2.data.baseObject === managedObject.name) {
                        option.prop("selected", true);
                    }

                    defaultObj.append(option);

                    _this2.model.availablePropsMap[managedObject.name] = AdminUtils.filteredPropertiesList(managedObject.schema.properties, _this2.data.searchFields);
                });

                dialogRef.$modalContent.find(".defaultObjectDropdown").change(function (e) {
                    _this2.data.searchFields = [];
                    _this2.setupSearchFieldsGrid(dialogRef, _this2.model.availablePropsMap[$(e.target).val()], _this2.data.searchFields);
                });

                _this2.setupSearchFieldsGrid(dialogRef, _this2.model.availablePropsMap[_this2.data.baseObject], _this2.data.searchFields);
            });
        },
        /**
         * sets up editable grid with selectize inputs
         *
         * @param {object} dialogRef - reference to settings dialog
         * @param {array} availableProps - array of avaliable properties
         * @param {array} listValue - array of already set properties
         */
        setupSearchFieldsGrid: function setupSearchFieldsGrid(dialogRef, availableProps, listValue) {
            SchemaUtils.buildEditableResourcePropertiesGrid({
                listElement: dialogRef.$modalContent.find(".searchFieldsList"),
                availableProps: availableProps,
                listValue: listValue,
                onReloadGrid: function onReloadGrid(newValue) {
                    //set the value of the hidden form element that represents the searchFields setting
                    dialogRef.$modalBody.find(".relationship-widget-search-property").val(newValue.join(","));
                },
                onSaveRow: _.noop,
                onReorder: _.noop,
                onRemoveRow: _.noop
            });
        },
        widgetRender: function widgetRender(args, callback) {
            var _this = this;

            /*
             * if baseObject does not exist use widget defaults for baseOjbect and searchFields settings
             */
            if (!this.data.baseObject) {
                this.data.baseObject = args.widget.defaultObject;
                this.data.chartType = args.widget.chartType;
                this.data.searchFields = [];
                if (args.widget.searchProperty) {
                    this.data.searchFields = args.widget.searchProperty.split(",");
                }
                this.data.displaySubRelationships = args.widget.displaySubRelationships;
            }

            this.partials.push("partials/dashboard/widget/_relationshipConfig.html");
            ResourceDelegate.getSchema(["managed", this.data.baseObject]).then(_.bind(function (schema) {
                /*
                 * get the schema for baseObject then figure out which properties of this object are either
                 * type relationship or type array of relationships
                 */
                this.data.relationshipProps = this.getRelationshipProps(schema.properties);
                /*
                 * if there are no searchFields defined then set the searchFields array to
                 * a single string value containing the second value in the schema order
                 * this assumes that "_id" is the value of schema.order[0]
                 * TODO figure out a better way of handling this
                 */
                if (schema.order && !this.data.searchFields) {
                    this.data.searchFields = [schema.order[1]];
                }

                this.data.schema = schema;

                this.parentRender(_.bind(function () {
                    /*
                     * build the selectize search field
                     */
                    this.$el.find(".findRelationship").selectize({
                        /*
                         * had to use something for valueField that would always be available here
                         */
                        valueField: _this.data.searchFields[0],
                        searchField: _this.data.searchFields,
                        maxOptions: 10,
                        create: false,
                        onChange: function onChange(value) {
                            if (value.length) {
                                _this.$el.find(".relationshipGraphStatus h2").text($.t("dashboard.relationshipWidget.gatheringRelationshipData"));
                                _this.getResourceRenderChart(this.options[value]._id);
                            }
                        },
                        render: {
                            option: function option(item, selectizeEscape) {
                                var element = $('<div class="fr-search-option"></div>'),
                                    counter = 0;

                                _.forEach(_this.data.searchFields, _.bind(function (key) {
                                    if (counter === 0) {
                                        $(element).append('<div class="fr-search-primary">' + selectizeEscape(item[key]) + '</div>');
                                    } else {
                                        $(element).append('<div class="fr-search-secondary text-muted">' + selectizeEscape(item[key]) + '</div>');
                                    }

                                    counter++;
                                }, this));

                                return element.prop('outerHTML');
                            },
                            item: function item(_item, escape) {
                                var txtArr = [];

                                _.forEach(_this.data.searchFields, function (field) {
                                    txtArr.push(escape(_item[field]));
                                });

                                return "<div>" + txtArr.join(" / ") + "</div>";
                            }
                        },
                        load: function load(query, selectizeCallback) {
                            var queryFilter = ResourceDelegate.queryStringForSearchableFields(_this.data.searchFields, query);

                            if (!query.length || query.length < 2) {
                                return selectizeCallback();
                            }

                            ResourceDelegate.searchResource(queryFilter, "managed/" + _this.data.baseObject).then(function (response) {
                                if (response && response.result.length > 0) {
                                    selectizeCallback(response.result);
                                } else {
                                    selectizeCallback();
                                }
                            });
                        }
                    });

                    if (_this.data.resourceUrl) {
                        _this.getResourceRenderChart();
                    }

                    if (callback) {
                        callback(this);
                    }
                }, this));
            }, this));
        },
        /*
         * builds a query to get back all the fields needed to display a
         * resource's relationship chart
         * this function is called when the user clicks on a circle and the widget
         * is refreshed with the view of the new baseObject
         */
        getResourceRenderChart: function getResourceRenderChart(id) {
            var resourceUrl,
                fields = "?_fields=*";

            if (id) {
                resourceUrl = "managed/" + this.data.baseObject + "/" + id;
            }

            if (this.data.resourceUrl) {
                resourceUrl = this.data.resourceUrl;
            }
            _.forEach(this.data.relationshipProps, _.bind(function (prop) {

                fields += "," + prop.propName + "/*";

                if (this.data.displaySubRelationships === "true") {
                    fields += this.addResourceCollectionProps(prop);
                }
            }, this));

            resourceUrl += fields;

            ResourceDelegate.getResource(resourceUrl).then(_.bind(function (response) {
                if (this.data.chartType === "force") {
                    RadialLayout.setupChart(this, response);
                } else {
                    CollapsibleTreeLayout.setupChart(this, response);
                }
            }, this));
        },
        /*
         * returns a list of properties from schema properties with type relationship or type array with itemtype relationship
         */
        getRelationshipProps: function getRelationshipProps(properties) {
            return _.chain(properties).map(function (val, key) {
                return _.assignIn(val, { propName: key });
            }).filter(function (prop) {
                return prop.type === "relationship" || prop.type === "array" && prop.items.type === "relationship";
            }).value();
        },
        /*
         * builds up a list of resource collection properties to add to the _fields property of a read or query
         */
        addResourceCollectionProps: function addResourceCollectionProps(prop) {
            var resourceCollections,
                fields = "";

            if (prop.items) {
                resourceCollections = prop.items.resourceCollection;
            } else {
                resourceCollections = prop.resourceCollection;
            }
            _.forEach(resourceCollections, _.bind(function (resourceCollection) {
                var schema = _.filter(this.data.schema.allSchemas, { name: resourceCollection.path.split("/")[1] }),
                    relProps = [];

                if (schema[0]) {
                    relProps = this.getRelationshipProps(schema[0].schema.properties);
                }

                _.forEach(relProps, function (relProp) {
                    if (prop.type === "relationship") {
                        fields += "," + prop.propName + "/" + relProp.propName + "/*";
                    } else {
                        fields += "," + prop.propName + "/*/" + relProp.propName + "/*";
                    }
                });
            }, this));

            return fields;
        }
    });

    widgetInstance.generateWidget = function (loadingObject, callback) {
        var widget = {};

        $.extend(true, widget, new Widget());

        widget.render(loadingObject, callback);

        return widget;
    };

    return widgetInstance;
});
