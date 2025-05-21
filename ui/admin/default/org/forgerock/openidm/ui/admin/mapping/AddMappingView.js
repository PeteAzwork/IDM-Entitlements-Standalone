"use strict";

/*
 * Copyright 2014-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "bootstrap", "backbone", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/openidm/ui/admin/util/ConnectorUtils", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/mapping/MapResourceView", "backgrid", "org/forgerock/openidm/ui/common/util/BackgridUtils"], function ($, _, bootstrap, Backbone, AdminAbstractView, eventManager, constants, router, ConnectorDelegate, uiUtils, connectorUtils, ConfigDelegate, MapResourceView, Backgrid, BackgridUtils) {

    var MappingAddView = AdminAbstractView.extend({
        template: "templates/admin/mapping/AddMappingTemplate.html",
        events: {
            "click #resourceCardContainer .card": "addResourceCardEvent",
            "click #resourceGrid .add-to-mapping": "addResourceGridEvent",
            "click .toggle-view-btn": "toggleButtonChange",
            "change .resource-type-filter": "changeResourceTypeEvent",
            "keyup .filter-input": "filterResourceEvent",
            "paste .filter-input": "filterResourceEvent"
        },
        addMappingView: false,
        data: {
            resourceList: []
        },
        model: {},
        render: function render(args, callback) {
            var _this = this;

            var connectorPromise, managedPromise;

            this.data.docHelpUrl = constants.DOC_URL;
            this.data.resourceList = [];

            connectorPromise = ConnectorDelegate.currentConnectors();
            managedPromise = ConfigDelegate.readEntity("managed");

            $.when(connectorPromise, managedPromise).then(function (connectors, managedObjects) {
                _this.model.connectors = connectors;
                _this.model.managedObjects = managedObjects.objects;

                _.forEach(_this.model.connectors, function (connector, index) {
                    if (connector.ok === true) {
                        var tempIconClass = void 0;

                        connector = _this.setupDisplayConnector(connector);

                        tempIconClass = connectorUtils.getIcon(connector.connectorRef.connectorName);

                        _this.model.connectors[index].icon = tempIconClass.iconClass;
                        _this.model.connectors[index].objectTypes = connector.objectTypes;

                        _this.data.resourceList.push({
                            "name": connector.name,
                            "displayName": $.t("templates.connector." + connectorUtils.cleanConnectorName(connector.connectorRef.connectorName)),
                            "type": "connector",
                            "icon": tempIconClass.iconClass,
                            "displayObjectType": connector.displayObjectType
                        });
                    }
                });

                _.forEach(_this.model.managedObjects, function (managedObject) {
                    var managedIcon = connectorUtils.getIcon("managedobject").iconClass;

                    if (managedObject.schema.icon) {
                        managedIcon = "fa " + managedObject.schema.icon;
                    }

                    managedObject.icon = managedIcon;

                    _this.data.resourceList.push({
                        "name": managedObject.name,
                        "displayName": "Managed Object",
                        "type": "managed",
                        "icon": managedIcon,
                        "displayObjectType": null
                    });
                });

                _this.data.resourceList = _.sortBy(_this.data.resourceList, 'name');

                _this.parentRender(function () {
                    var preselectResult = void 0,
                        ResourceModel = Backbone.Model.extend({}),
                        Resources = Backbone.Collection.extend({ model: ResourceModel }),
                        resourceGrid = void 0,
                        RenderRow = void 0;

                    _this.$el.find('#resourceMappingBody').affix({
                        offset: {
                            top: function top() {
                                return _this.bottom = $("#footer").outerHeight(true);
                            }
                        }
                    });

                    RenderRow = Backgrid.Row.extend({
                        render: function render() {
                            RenderRow.__super__.render.apply(this, arguments);

                            this.$el.attr('data-name', this.model.attributes.name);
                            this.$el.attr('data-resource-type', this.model.attributes.type);

                            return this;
                        }
                    });

                    _this.model.resourceCollection = new Resources();

                    _.forEach(_this.data.resourceList, function (resource) {
                        _this.model.resourceCollection.add(resource);
                    });

                    resourceGrid = new Backgrid.Grid({
                        className: "table backgrid",
                        emptyText: $.t("templates.connector.noResourceTitle"),
                        row: RenderRow,
                        columns: BackgridUtils.addSmallScreenCell([{
                            name: "name",
                            sortable: false,
                            editable: false,
                            cell: Backgrid.Cell.extend({
                                render: function render() {
                                    var display = '<div class="image circle">' + '<i class="' + this.model.attributes.icon + '"></i></div>' + this.model.attributes.name;

                                    this.$el.html(display);

                                    return this;
                                }
                            })
                        }, {
                            name: "displayName",
                            label: "type",
                            cell: "string",
                            sortable: false,
                            editable: false
                        }, {
                            name: "",
                            sortable: false,
                            editable: false,
                            cell: Backgrid.Cell.extend({
                                className: "button-right-align",
                                render: function render() {
                                    var display = $('<button type="button" class="btn btn-default btn-xs add-to-mapping">' + '<i class="fa fa-plus"></i> Add to Mapping </button>');

                                    this.$el.html(display);

                                    return this;
                                }
                            })
                        }]),
                        collection: _this.model.resourceCollection
                    });

                    _this.$el.find("#resourceGrid").append(resourceGrid.render().el);

                    MapResourceView.render({
                        "removeCallback": function removeCallback() {
                            _this.$el.find(".add-resource-button").prop("disabled", false);
                        },
                        "addCallback": function addCallback(source, target) {
                            if (source && target) {
                                _this.$el.find(".add-resource-button").prop("disabled", true);
                            }
                        }
                    }, function () {
                        if (args.length > 0) {
                            preselectResult = _this.preselectMappingCard(args, _this.model.connectors, _this.model.managedObjects);

                            if (preselectResult !== null) {
                                MapResourceView.addMapping(preselectResult);
                            }
                        }

                        if (callback) {
                            callback();
                        }
                    });
                });
            });
        },

        /**
         * @param event - Click event for toggling between views
         *
         * Switches between grid and card view
         */
        toggleButtonChange: function toggleButtonChange(event) {
            var target = $(event.target);

            if (target.hasClass("fa")) {
                target = target.parents(".btn");
            }

            this.$el.find(".toggle-view-btn").toggleClass("active", false);
            target.toggleClass("active", true);
        },

        /**
         * @param event - Change event for the reasource type
         */
        changeResourceTypeEvent: function changeResourceTypeEvent(event) {
            this.changeResourceType($(event.target).val());
        },

        /**
         * @param type - String that corresponds to three types (managed, connector and all)
         *
         * Filters the card and grid list by type and clears any currect text filters
         */
        changeResourceType: function changeResourceType(type) {
            this.$el.find(".filter-input").val("");

            if (type === "all") {
                this.$el.find(".card-spacer").show();
                this.$el.find(".backgrid tbody tr").show();
            } else {
                _.forEach(this.$el.find(".card-spacer"), _.bind(function (card) {
                    if ($(card).attr("data-resource-type") === type) {
                        $(card).show();
                    } else {
                        $(card).hide();
                    }
                }, this));

                _.forEach(this.$el.find(".backgrid tbody tr"), _.bind(function (row) {
                    if ($(row).attr("data-resource-type") === type) {
                        $(row).show();
                    } else {
                        $(row).hide();
                    }
                }, this));
            }
        },
        /**
         * @param event - Event fired when pasting or keypressing to filter for a resource
         */
        filterResourceEvent: function filterResourceEvent(event) {
            this.filterResource($(event.target).val().toLowerCase());
        },

        /**
         * @param search - String of text to filter by
         */
        filterResource: function filterResource(search) {
            var resourceViewType = this.$el.find(".resource-type-filter").val();

            if (search.length > 0) {
                this.filterDom(this.$el.find(".card-spacer"), resourceViewType, search);
                this.filterDom(this.$el.find(".backgrid tbody tr"), resourceViewType, search);
            } else {
                this.changeResourceType(resourceViewType);
            }
        },

        /**
         * @param list - List of dom elements (either grid rows or cards)
         * @param type - The type currently selected in the resrouce type dropdown
         * @param search - Text currently entered into the search field
         *
         * This function shows the appropriate cards and grid rows based off the name of the connector / managed object and type
         */
        filterDom: function filterDom(list, type, search) {
            _.forEach(list, function (resource) {
                if ($(resource).attr("data-name").toLowerCase().indexOf(search) > -1) {
                    if (type === "all" || $(resource).attr("data-resource-type") === type) {
                        $(resource).show();
                    } else {
                        $(resource).hide();
                    }
                } else {
                    $(resource).hide();
                }
            });
        },

        /**
         * @param displayConnector - Standard connector object returned from IDM (config and objecttypes)
         * @returns {*} - Returns a modified connector object containing display elements for listing objectType, icon, and sorting
         */
        setupDisplayConnector: function setupDisplayConnector(displayConnector) {
            var connector = _.clone(displayConnector),
                splitConfig;

            if (connector.objectTypes) {
                connector.objectTypes = _.chain(connector.objectTypes).filter(function (objectTypes) {
                    return objectTypes !== "__ALL__";
                }).sortBy(function (objectType) {
                    return objectType;
                }).value();

                if (connector.objectTypes.length > 2) {
                    connector.displayObjectType = connector.objectTypes[0] + ", " + connector.objectTypes[1] + ", (" + (connector.objectTypes.length - 2) + " " + $.t("templates.mapping.more") + ")";
                } else {
                    connector.displayObjectType = connector.objectTypes.join(", ");
                }
            }

            splitConfig = connector.config.split("/");

            connector.cleanUrlName = splitConfig[1] + "_" + splitConfig[2];
            connector.cleanEditName = splitConfig[2];

            return connector;
        },

        /**
         * @param selected - Array of URL arguments with type and name ["connector", "ldap"]
         * @param connectors - Array of connector object details
         * @param managedObjects - Array of managed object details
         * @returns {*} Returns the correct connector or managed object details based on the URL arguments to allow for on load selection of a resource
         */
        preselectMappingCard: function preselectMappingCard(selected, connectors, managedObjects) {
            var resourceData = null;

            if (selected[0] === "connector") {
                resourceData = _.find(connectors, function (connector) {
                    return selected[1] === connector.name;
                });

                if (resourceData !== null) {
                    resourceData.resourceType = selected[0];
                }
            } else {
                resourceData = _.find(managedObjects, function (managed) {
                    return selected[1] === managed.name;
                });

                if (resourceData !== null) {
                    resourceData.resourceType = selected[0];
                }
            }

            return resourceData;
        },

        /**
         * @param event - Click event on a card selected in the add mapping view
         *
         * This event finds the dom location of the card and type and passes the details onto addResourceMapping to find the appropriate resource details
         */
        addResourceCardEvent: function addResourceCardEvent(event) {
            var resourceSelected = $(event.currentTarget).closest(".card-spacer"),
                resourceType = resourceSelected.attr("data-resource-type"),
                resourceName = resourceSelected.attr("data-name");

            MapResourceView.addMapping(this.addResourceMapping(resourceType, resourceName, this.model.connectors, this.model.managedObjects));
        },

        /**
         * @param event - Click event on a grid row in the add mapping view
         *
         * This event finds gets the row meta data and passes that information to addResourceMapping to find the appropriate resource details
         */
        addResourceGridEvent: function addResourceGridEvent(event) {
            var resourceSelected = $(event.currentTarget).closest("tr"),
                resourceType = resourceSelected.attr("data-resource-type"),
                resourceName = resourceSelected.attr("data-name");

            MapResourceView.addMapping(this.addResourceMapping(resourceType, resourceName, this.model.connectors, this.model.managedObjects));
        },

        /**
         *
         * @param resourceType - Current resource type connector or managed
         * @param resourceName - Name assoicated with the resource
         * @param connectors - Array of connector object details
         * @param managedObjects - Array of managed object details
         * @returns {*} Returns the correct connector or managed object details based on the URL arguments to allow for on load selection of a resource
         */
        addResourceMapping: function addResourceMapping(resourceType, resourceName, connectors, managedObjects) {
            var resourceData = null;

            if (resourceType === "connector") {
                resourceData = _.find(connectors, function (connector) {
                    return connector.name === resourceName;
                });
                resourceData.resourceType = resourceType;
            } else {
                resourceData = _.find(managedObjects, function (managedObject) {
                    return managedObject.name === resourceName;
                });
                resourceData.resourceType = resourceType;
            }

            return resourceData;
        }

    });

    return new MappingAddView();
});
