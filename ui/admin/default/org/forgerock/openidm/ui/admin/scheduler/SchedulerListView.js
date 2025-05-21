"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "backgrid", "backgrid-paginator", "handlebars", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/openidm/ui/admin/util/Scheduler", "org/forgerock/openidm/ui/admin/scheduler/SchedulerCollection", "org/forgerock/openidm/ui/admin/util/SchedulerUtils", "org/forgerock/commons/ui/common/main/Router"], function ($, _, Backgrid, BackgridPaginator, handlebars, AdminAbstractView, AdminUtils, BackgridUtils, ConnectorDelegate, constants, eventManager, scheduler, SchedulerCollection, SchedulerUtils, Router) {
    var SchedulerListView = AdminAbstractView.extend({
        template: "templates/admin/scheduler/SchedulerListViewTemplate.html",
        events: {
            "change #typeFilter": "showSubFilters",
            "change .subFilters select": "buildGrid"
        },
        partials: ["partials/scheduler/_ScheduleTypeDisplay.html"],
        model: {},
        render: function render(args, callback) {
            var _this2 = this;

            $.when(AdminUtils.getAvailableResourceEndpoints(), ConnectorDelegate.currentConnectors()).then(function (availableEnpoints, currentConnectors) {
                _this2.data.availableConnectorTypes = _.map(currentConnectors, function (connector) {
                    var bundleNameArray = connector.connectorRef.bundleName.split(".");
                    return {
                        type: connector.connectorRef.bundleName,
                        display: bundleNameArray[bundleNameArray.length - 1]
                    };
                });
                _this2.data.availableEnpoints = availableEnpoints;
                _this2.parentRender(function () {
                    _this2.buildGrid().then(function () {
                        _this2.$el.find("select").selectize();
                        if (callback) {
                            callback();
                        }
                    });
                });
            });
        },
        buildGrid: function buildGrid(filter) {
            var _this3 = this;

            var _this = this,
                url = constants.context + "/scheduler/job",
                paginator,
                schedulerGrid;

            return this.constructQueryFilter().then(function (queryFilter) {
                // when this view is on the mapping page, the query filter is updated to only return assocaited schedules
                if (filter) {
                    queryFilter += " and invokeContext/mapping eq '" + filter + "'";
                }

                _this3.model.scheduleCollection = new SchedulerCollection([], {
                    url: url,
                    state: BackgridUtils.getState("invokeService"),
                    _queryFilter: queryFilter
                });

                _this3.$el.find("#schedulerGrid").empty();
                _this3.$el.find("#schedulerGrid-paginator").empty();

                schedulerGrid = new Backgrid.Grid({
                    className: "table backgrid table-hover",
                    emptyText: $.t("templates.admin.ResourceList.noData"),
                    row: BackgridUtils.ClickableRow.extend({
                        callback: function callback() {
                            eventManager.sendEvent(constants.ROUTE_REQUEST, { routeName: "editSchedulerView", args: [this.model.attributes._id, Router.getURIFragment()] });
                        }
                    }),
                    columns: BackgridUtils.addSmallScreenCell([{
                        name: "",
                        label: $.t("templates.scheduler.type"),
                        sortable: false,
                        editable: false,
                        cell: Backgrid.Cell.extend({
                            render: function render() {
                                var icon = "fa fa-calendar",
                                    display,
                                    scheduleName;

                                if (this.model.attributes) {
                                    scheduleName = _this.getScheduleTypeDisplay(this.model.attributes);
                                }

                                display = '<div class="image circle">' + '<i class="' + icon + '"></i></div>' + scheduleName;

                                this.$el.html(display);

                                return this;
                            }
                        })
                    }, {
                        name: "",
                        label: $.t("templates.scheduler.schedule"),
                        sortable: false,
                        editable: false,
                        cell: Backgrid.Cell.extend({
                            render: function render() {
                                var displayText = scheduler.cronToHumanReadable(this.model.attributes.schedule);

                                this.$el.html(displayText);

                                return this;
                            }
                        })
                    }, {
                        name: "nextRunDate",
                        label: $.t("templates.scheduler.nextScheduledRun"),
                        sortable: false,
                        editable: false,
                        cell: Backgrid.Cell.extend({
                            render: function render() {
                                var nextRunDate = this.model.attributes.nextRunDate,
                                    isRunning = this.model.attributes.triggers[0] && this.model.attributes.triggers[0].nodeId && this.model.attributes.triggers[0].state > 0;

                                if (isRunning) {
                                    this.$el.html($.t("templates.scheduler.runningNow") + " - <span class='text-muted'>" + this.model.attributes.triggers[0].nodeId + "</span>");
                                } else if (nextRunDate) {
                                    this.$el.html(new Date(nextRunDate).toUTCString());
                                } else {
                                    this.$el.html($.t("templates.scheduler.unavailable"));
                                }

                                return this;
                            }
                        })
                    }, {
                        name: "",
                        label: $.t("templates.scheduler.status"),
                        sortable: false,
                        editable: false,
                        cell: Backgrid.Cell.extend({
                            render: function render() {
                                var iconClass = "fa-check-circle",
                                    txtClass = "text-success",
                                    txt = $.t("templates.scheduler.enabled");

                                if (!this.model.attributes.enabled) {
                                    iconClass = "fa-ban";
                                    txtClass = "text-warning";
                                    txt = $.t("templates.scheduler.disabled");
                                }

                                this.$el.html('<div class="' + txtClass + '"><i class="fa fa-lg ' + iconClass + '"></i> ' + txt + '</div>');

                                return this;
                            }
                        })
                    }]),
                    collection: _this3.model.scheduleCollection
                });

                paginator = new Backgrid.Extension.Paginator({
                    collection: _this3.model.scheduleCollection,
                    goBackFirstOnSort: false,
                    windowSize: 0,
                    controls: {
                        rewind: {
                            label: " ",
                            title: $.t("templates.backgrid.first")
                        },
                        back: {
                            label: " ",
                            title: $.t("templates.backgrid.previous")
                        },
                        forward: {
                            label: " ",
                            title: $.t("templates.backgrid.next")
                        },
                        fastForward: {
                            label: " ",
                            title: $.t("templates.backgrid.last")
                        }
                    }
                });

                $("#schedulerGrid").append(schedulerGrid.render().el);
                $("#schedulerGrid-paginator").append(paginator.render().el);

                return _this3.model.scheduleCollection.getFirstPage();
            });
        },
        /**
         * Toggles on/of subFilters based on the value in the typeFilter dropdown
         * and fires build grid to repopulate the grid with a new filtered query
         *
         * @param {object} event - optional event object
         */
        showSubFilters: function showSubFilters(e) {
            var typeFilter = $(e.target).val();

            e.preventDefault();

            this.$el.find(".subFilters").hide();
            this.$el.find("#persistedSchedulesNote").show();

            switch (typeFilter) {
                case "reconciliation":
                    this.$el.find("#mappingSubfilter").show();
                    break;
                case "liveSync":
                    this.$el.find("#connectorTypeSubfilter").show();
                    break;
                case "taskScanner":
                    this.$el.find("#resourceSubfilter").show();
                    break;
                case "inMemory":
                    this.$el.find("#persistedSchedulesNote").hide();
                    break;
            }

            this.buildGrid();
        },
        /**
         * Compiles scheduler type
         *
         * @param {string} type
         * @param {string} descriptor
         * @returns html string
         */
        renderTypePartial: function renderTypePartial(type, descriptor) {
            return $(handlebars.compile("{{> scheduler/_ScheduleTypeDisplay}}")({
                type: type,
                descriptor: descriptor
            })).html().toString();
        },
        /**
         * Builds a the display for the cells in the "Type" column
         * each scheduler "Type" has it's own specific meta-data
         *
         * @param {object} schedule
         * @returns html string
         */
        getScheduleTypeDisplay: function getScheduleTypeDisplay(schedule) {
            var scheduleTypeData = SchedulerUtils.getScheduleTypeData(schedule);

            return this.renderTypePartial(scheduleTypeData.display, scheduleTypeData.meta);
        },
        /**
         * Reads the value of the filter selections
         *
         * @returns - object
         */
        getFilters: function getFilters() {

            var obj = {
                typeFilter: this.$el.find("#typeFilter").val(),
                resourceSubfilter: this.$el.find("#resourceSubfilter select").val(),
                connectorTypeSubfilter: this.$el.find("#connectorTypeSubfilter select").val()
            };
            ["resourceSubfilter", "connectorTypeSubfilter"].forEach(function (subfilter) {
                if (obj[subfilter] === "all") {
                    obj[subfilter] = "";
                }
            });
            return obj;
        },
        /**
         * Creates a queryFilter string to be used when querying for the list of schedules
         *
         * @param {object} filters - object containing the filters defined in the page's filter select fields
         * @param {array} connectors - **OPTIONAL** array of connector objects
         * @returns string
         */
        getQueryFilterString: function getQueryFilterString(filters, connectors) {
            var queryFilter = "persisted eq true and (schedule pr or type eq 'simple')",
                //we only want persisted schedules and jobs with schedules defined by default
            orClauseArray;

            switch (filters.typeFilter) {
                case "liveSync":
                    queryFilter += " and invokeContext/action/ eq 'liveSync'";
                    if (connectors) {
                        orClauseArray = _.map(connectors, function (connector) {
                            return "invokeContext/source/ co 'system/" + connector.name + "/'";
                        });

                        queryFilter += " and (";
                        queryFilter += orClauseArray.join(" or ");
                        queryFilter += ")";
                    }
                    break;
                case "userDefined":
                    queryFilter += " and !(invokeContext/script/source co 'roles/onSync-roles') and !(invokeContext/script/source co 'triggerSyncCheck')";
                    break;
                case "reconciliation":
                    queryFilter += " and invokeContext/action/ eq 'reconcile'";
                    break;
                case "taskScanner":
                    queryFilter += " and invokeContext/task/ pr";
                    if (filters.resourceSubfilter) {
                        queryFilter += " and invokeContext/scan/object/ eq '" + filters.resourceSubfilter + "'";
                    }
                    break;
                case "temporalConstraintsOnRole":
                    queryFilter += " and invokeContext/script/source co 'roles/onSync-roles'";
                    break;
                case "temporalConstraintsOnGrant":
                    queryFilter += " and invokeContext/script/source co 'triggerSyncCheck'";
                    break;
                case "script":
                    queryFilter += " and invokeContext/script/ pr and !(invokeContext/script/source co 'roles/onSync-roles') and !(invokeContext/script/source co 'triggerSyncCheck')";
                    break;
                case "inMemory":
                    queryFilter = "persisted eq false and schedule pr";
                    break;
                case "runningNow":
                    queryFilter += " and triggers/0/nodeId pr and triggers/0/state gt 0";
                    break;
            }

            return queryFilter;
        },
        /**
         * Creates a queryFilter based on typeFilter and it's relative subType
         *
         * **Note**liveSync subFilter (Connector Type) is a special case and requires
         * some extra information to put together the correct queryFilter
         *
         * @returns - promise
         */
        constructQueryFilter: function constructQueryFilter() {
            var _this4 = this;

            var prom = $.Deferred(),
                filters = this.getFilters();

            if (filters.typeFilter === "liveSync" && filters.connectorTypeSubfilter) {
                ConnectorDelegate.getConnectorsOfType(filters.connectorTypeSubfilter).then(function (connectors) {
                    prom.resolve(_this4.getQueryFilterString(filters, connectors));
                });
            } else {
                prom.resolve(this.getQueryFilterString(filters));
            }

            return prom;
        }
    });

    return new SchedulerListView();
});
