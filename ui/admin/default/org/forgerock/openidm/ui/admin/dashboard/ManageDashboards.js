"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "backgrid", "backbone", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/dashboard/DashboardUtils", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/common/util/BackgridUtils"], function ($, _, Backgrid, Backbone, AdminAbstractView, DashboardUtils, Configuration, Router, ValidatorsManager, ConfigDelegate, EventManager, Constants, BackgridUtils) {

    var ManageDashboardsView = AdminAbstractView.extend({
        template: "templates/admin/dashboard/ManageDashboardsTemplate.html",
        events: {
            "click .toggle-view-btn": "toggleView",
            "click .dashboard-rename": "dashboardRenameEvent",
            "click .dashboard-delete": "deleteDashboardEvent",
            "click .dashboard-make-default": "defaultDashboardEvent"
        },
        model: {
            "adminDashboards": []
        },
        partials: ["partials/dashboard/_RenameDashboard.html", "partials/util/_noData.html"],

        render: function render(renderWithGrid, callback) {
            var _this2 = this;

            var DashboardModel = Backbone.Model.extend({}),
                Dashboards = Backbone.Collection.extend({ model: DashboardModel });

            this.model.dashboardCollection = new Dashboards();
            this.data.renderWithGrid = renderWithGrid;

            ConfigDelegate.readEntity("ui/dashboard").then(function (dashboardConfig) {
                _this2.model.uiConf = dashboardConfig;

                if (_.has(_this2.model.uiConf, "adminDashboards")) {
                    _this2.data.adminDashboards = _this2.model.uiConf.adminDashboards;
                }

                _.forEach(_this2.data.adminDashboards, function (dashboard) {
                    _this2.model.dashboardCollection.add(dashboard);
                });

                _this2.parentRender(function () {
                    _this2.renderDashboardGrid();

                    if (callback) {
                        callback();
                    }
                });
            });
        },

        renderDashboardGrid: function renderDashboardGrid() {
            var _this = this,
                RenderRow = Backgrid.Row.extend({
                render: function render() {
                    RenderRow.__super__.render.apply(this, arguments);
                    this.$el.attr('data-index', _.findIndex(_this.data.adminDashboards, { "name": this.model.attributes.name }));
                    this.$el.attr('class', "dashboard-card");
                    return this;
                }
            });

            this.model.dashboardGrid = new Backgrid.Grid({
                className: "table backgrid",
                emptyText: $.t("templates.connector.noResourceTitle"),
                row: RenderRow,
                columns: BackgridUtils.addSmallScreenCell([{
                    name: "name",
                    label: $.t("dashboard.new.name"),
                    sortable: false,
                    editable: false,
                    cell: Backgrid.Cell.extend({
                        render: function render() {
                            this.$el.html("<div class=\"image circle\"><i class=\"fa fa-dashboard\"></i></div>" + escape(unescape(this.model.attributes.name)));
                            return this;
                        }
                    })
                }, {
                    name: "type",
                    label: $.t("dashboard.new.type"),
                    sortable: false,
                    editable: false,
                    cell: Backgrid.Cell.extend({
                        render: function render() {
                            if (this.model.attributes.embeddedDashboard) {
                                this.$el.html($.t("dashboard.new.embedded"));
                            } else {
                                this.$el.html($.t("dashboard.new.widgets"));
                            }
                            return this;
                        }
                    })
                }, {
                    name: "default",
                    label: $.t("dashboard.new.default"),
                    sortable: false,
                    editable: false,
                    cell: Backgrid.Cell.extend({
                        render: function render() {
                            if (this.model.attributes.isDefault) {
                                this.$el.html($("<span class='text-primary dashboard-default-label'><i class='fa fa-check'></i>" + $.t("dashboard.new.default") + "</span>"));
                            }
                            return this;
                        }
                    })
                }, {
                    name: "",
                    sortable: false,
                    editable: false,
                    cell: Backgrid.Cell.extend({
                        className: "button-right-align",
                        render: function render() {
                            var index = _.findIndex(_this.data.adminDashboards, { "name": this.model.attributes.name }),
                                display = $('<div class="btn-group"><button type="button" class="btn btn-link fa-lg dropdown-toggle" data-toggle="dropdown" aria-expanded="false">' + '<i class="fa fa-ellipsis-v"></i>' + '</button></div>');

                            $(display).append(_this.$el.find("[data-index='" + index + "'] .dropdown-menu").clone());

                            this.$el.html(display);
                            return this;
                        }
                    })
                }]),
                collection: this.model.dashboardCollection
            });

            this.$el.find("#dashboardGrid").append(this.model.dashboardGrid.render().el);
        },

        toggleView: function toggleView(e) {
            e.preventDefault();
            var target = $(event.target);

            if (target.hasClass("fa")) {
                target = target.parents(".btn");
            }
            this.$el.find(".toggle-view-btn").toggleClass("active", false);
            target.toggleClass("active", true);
        },

        /**
         Override validation to allow dialog to enable/disable Save correctly
         */
        validationSuccessful: function validationSuccessful(event) {
            DashboardUtils.validationSuccessful.call(this, event);
        },

        validationFailed: function validationFailed(event, details) {
            DashboardUtils.validationFailed.call(this, event, details);
        },

        dashboardRenameEvent: function dashboardRenameEvent(e) {
            var _this3 = this;

            e.preventDefault();

            var index = parseInt($(e.currentTarget).closest(".dashboard-card").attr("data-index"), 10);

            DashboardUtils.renameDashboard.call(this, _.cloneDeep(this.data.adminDashboards), index, function (dashboards) {
                _this3.saveChanges("dashboardRenamed", dashboards);
            });
        },

        defaultDashboardEvent: function defaultDashboardEvent(e) {
            e.preventDefault();

            var index = parseInt($(e.currentTarget).closest(".dashboard-card").attr("data-index"), 10),
                updatedDashboards = DashboardUtils.setDefaultDashboard(_.cloneDeep(this.data.adminDashboards), index);

            this.saveChanges("dashboardDefaulted", updatedDashboards);
        },

        deleteDashboardEvent: function deleteDashboardEvent(e) {
            e.preventDefault();

            var index = parseInt($(e.currentTarget).closest(".dashboard-card").attr("data-index"), 10),
                updatedDashboards = DashboardUtils.deleteDashboard(_.cloneDeep(this.data.adminDashboards), index).dashboards;

            this.saveChanges("dashboardDeleted", updatedDashboards);
        },

        saveChanges: function saveChanges(message, dashboards, callback) {
            this.model.uiConf.adminDashboards = dashboards;

            ConfigDelegate.updateEntity("ui/dashboard", this.model.uiConf).then(_.bind(function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, message);
                EventManager.sendEvent(Constants.EVENT_UPDATE_NAVIGATION);

                this.render(this.$el.find(".grid-button").hasClass("active"));

                if (callback) {
                    callback();
                }
            }, this));
        }
    });

    return new ManageDashboardsView();
});
