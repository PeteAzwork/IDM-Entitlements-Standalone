"use strict";

/*
 * Copyright 2014-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "handlebars", "form2js", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/dashboard/DashboardWidgetLoader", "org/forgerock/openidm/ui/admin/dashboard/DashboardUtils", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/openidm/ui/admin/delegates/SiteConfigurationDelegate", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/commons/ui/common/util/AutoScroll", "dragula"], function ($, _, BootstrapDialogUtils, Handlebars, form2js, AdminAbstractView, DashboardWidgetLoader, DashboardUtils, Configuration, Router, ConfigDelegate, EventManager, Constants, ValidatorsManager, SiteConfigurationDelegate, UIUtils, AutoScroll, dragula) {

    var DashboardView = AdminAbstractView.extend({
        template: "templates/admin/dashboard/DashboardTemplate.html",
        events: {
            "click #RenameDashboard": "renameDashboardEvent",
            "click #DuplicateDashboard": "duplicateDashboard",
            "click #DefaultDashboard": "defaultDashboardEvent",
            "click #DeleteDashboard": "deleteDashboardEvent",
            "click .open-add-widget-dialog": "openAddWidgetDialog",
            "click .widget-delete": "deleteWidgetEvent", //This event relies on child views creating the correct HTML menu item
            "click .toggle-view-btn": "toggleButtonChange",
            "click .widget-settings-btn": "updateSettings"
        },
        partials: ["partials/dashboard/_DuplicateDashboard.html", "partials/dashboard/_RenameDashboard.html", "partials/dashboard/_AddWidget.html", "partials/util/_noData.html"],
        model: {
            firstLoad: true,
            loadedWidgets: [],
            allDashboards: [],
            dashboardIndex: 0
        },
        render: function render(args, callback) {
            var _this = this;

            var holderList = null;

            $.when(ConfigDelegate.readEntity("ui/dashboard")).then(function (dashboardConfig) {
                var widgetList = DashboardWidgetLoader.getWidgetList();
                _this.model.uiConf = dashboardConfig;
                _this.model.dashboardRef = _this;

                if (_.has(_this.model.uiConf, "adminDashboards")) {
                    _this.model.allDashboards = _this.model.uiConf.adminDashboards;
                }

                _this.model.dashboardIndex = parseInt(Router.getCurrentHash().split("/")[1], 10) || 0;

                _this.model.loadedWidgets = [];
                _this.data.dashboard = _this.model.allDashboards[_this.model.dashboardIndex];

                if (!_this.data.dashboard) {
                    EventManager.sendEvent(Constants.EVENT_CHANGE_VIEW, { route: Router.configuration.routes.newDashboardView });
                    return;
                }

                _this.data.isDefault = _this.data.dashboard.isDefault;

                // If the dashboard configuration contains any widgets that are not known remove them.
                _.forEach(_.difference(_.map(_this.data.dashboard.widgets, "type"), _.keys(widgetList)), function (widget) {
                    var index = _.findIndex(_this.data.dashboard.widgets, { "type": widget });

                    _this.data.dashboard.widgets.splice(index, 1);
                });

                _this.parentRender(function () {
                    $(window).unbind("resize.dashboardResize");
                    var renderedWidgetCount = 0;

                    if (!_.isUndefined(_this.data.dashboard.widgets) && _this.data.dashboard.widgets.length > 0) {
                        holderList = _this.$el.find(".widget-holder");

                        _.forEach(_this.data.dashboard.widgets, _.bind(function (widget, index) {
                            this.model.loadedWidgets.push(DashboardWidgetLoader.generateWidget({
                                "element": holderList[index],
                                "widget": widget,
                                "dashboardConfig": dashboardConfig
                            },
                            // This callback is used to make sure every widget has been rendered before initiating the
                            // drag and drop utility.
                            _.bind(function () {
                                renderedWidgetCount++;
                                if (renderedWidgetCount === this.data.dashboard.widgets.length) {
                                    this.initDragDrop();
                                }
                            }, this)));
                        }, _this));
                    }

                    //Calls widget specific resize function if needed
                    $(window).bind("resize.dashboardResize", _.bind(function () {
                        if (!$.contains(document, this.$el.find("#dashboardWidgets")[0])) {
                            $(window).unbind("resize");
                        } else {
                            _.forEach(this.model.loadedWidgets, _.bind(function (dashboardHolder) {
                                if (dashboardHolder.model.widget.resize) {
                                    dashboardHolder.model.widget.resize();
                                }
                            }, this));
                        }
                    }, _this));

                    if (callback) {
                        callback();
                    }
                });
            });
        },

        initDragDrop: function initDragDrop() {
            var start,
                dragDropInstance = dragula([this.$el.find("#dashboardWidgets")[0]], {
                moves: function moves(el, container, handle) {
                    //when inside a d3 svg handle.className is an object
                    if (_.isObject(handle.className)) {
                        return false;
                    } else {
                        return handle.className.indexOf("fa-arrows") > -1 || handle.className.indexOf("btn-move") > -1;
                    }
                }
            });

            dragDropInstance.on("drag", _.bind(function (el, container) {
                start = _.indexOf($(container).find(".widget-holder"), el);
                AutoScroll.startDrag();
            }, this));

            dragDropInstance.on("dragend", _.bind(function (el) {
                var widgetCopy = this.data.dashboard.widgets[start],
                    stop = _.indexOf(this.$el.find("#dashboardWidgets .widget-holder"), el);

                AutoScroll.endDrag();

                this.data.dashboard.widgets.splice(start, 1);
                this.data.dashboard.widgets.splice(stop, 0, widgetCopy);

                this.saveChanges("dashboardWidgetsRearranged", this.model.dashboardIndex);
            }, this));
        },

        openAddWidgetDialog: function openAddWidgetDialog(e) {
            var _this4 = this;

            if (e) {
                e.preventDefault();
            }

            var widgets = DashboardWidgetLoader.getWidgetList(),
                widgetGroups = _.chain(widgets).forEach(function (widget, key) {
                widget.key = key;
            }).groupBy(function (widget) {
                return widget.group;
            }).map(function (widget, key) {
                return {
                    groupName: key,
                    widgets: widget
                };
            }).value();

            this.dialog = BootstrapDialogUtils.createModal({
                title: $.t("dashboard.addWidget"),
                cssClass: "add-widget-preview",
                message: $(Handlebars.compile("{{> dashboard/_AddWidget}}")({ "widgetGroups": widgetGroups })),
                onshown: _.bind(function (dialogRef) {
                    var _this2 = this;

                    this.setElement("#addWidgetDialog");

                    this.model.dialogRef = dialogRef;
                    this.model.widget = false;
                    this.model.widgetConf = false;

                    $('.widget-preview-btn[data-toggle="tab"]').on('shown.bs.tab', function () {
                        _this2.loadPreview(_this2.getConfig());
                    });

                    this.$el.find(".widget-select").selectize({
                        sortField: [{ field: 'optgroup' }],
                        onInitialize: function onInitialize() {
                            var _this3 = this;

                            _.forEach(this.revertSettings.$children, function (child) {
                                $.extend(_this3.options[child.value], $(child).data());
                            });
                        },
                        render: {
                            option: function option(item, selectizeEscape) {
                                var element = $('<div class="fr-search-option"></div>'),
                                    desc = widgets[item.value].desc;

                                $(element).append("<div class=\"fr-search-primary\">" + selectizeEscape(item.text) + "</div>");
                                $(element).append("<div class=\"fr-search-secondary text-muted\">" + desc + "</div>");

                                return element.prop('outerHTML');
                            }
                        },
                        onChange: function onChange(value) {
                            var widgets = DashboardWidgetLoader.getWidgetList();
                            if (widgets[value]) {
                                _this2.model.widget = false;
                                _this2.model.widgetConf = _.assignIn({
                                    "type": value,
                                    size: widgets[value].defaultSize
                                }, _.get(widgets[value], "defaults"));

                                _this2.model.firstLoad = true;

                                if (!_this2.$el.find(".widget-preview-btn").hasClass("active")) {
                                    _this2.$el.find(".widget-preview-btn").addClass("active");
                                    _this2.$el.find(".widget-settings-btn").removeClass("active");
                                    _this2.$el.find("#widgetSettings .panel-body").empty();
                                    _this2.$el.find("#widgetSettings").removeClass("active");
                                    _this2.$el.find("#widgetPreview").addClass("active");
                                }
                                _this2.loadPreview(_this2.model.widgetConf);
                            }
                        }
                    });
                }, this),

                onhidden: _.bind(function () {
                    this.setElement("#content");
                }, this),

                buttons: ["close", {
                    cssClass: "btn-primary",
                    label: $.t("common.form.add"),
                    action: function action(dialogRef) {
                        var config = _this4.getConfig();

                        if (config) {
                            _this4.data.dashboard.widgets.push(config);

                            _this4.saveChanges("dashboardWidgetAdded", _this4.model.dashboardIndex, function () {
                                dialogRef.close();
                            });
                        } else {
                            dialogRef.close();
                        }
                    }
                }]
            }).open();
        },

        toggleButtonChange: function toggleButtonChange(event) {
            var target = $(event.target);

            if (target.hasClass("fa")) {
                target = target.parents(".btn");
            }

            this.$el.find(".toggle-view-btn").toggleClass("active", false);
            target.toggleClass("active", true);
        },

        updateSettings: function updateSettings(e) {
            if (e) {
                e.preventDefault();
            }
            var currentTemplate = "dashboard/widget/_generalConfig";
            if (_.has(this.model.widget, "model.overrideTemplate")) {
                currentTemplate = this.model.widget.model.overrideTemplate;
            }

            if (this.model.firstLoad) {
                this.$el.find("#widgetSettings .panel-body").html($(Handlebars.compile("{{>" + currentTemplate + "}}")(this.model.widgetConf)));

                if (_.has(this.model.widget, "customSettingsLoad")) {
                    this.model.widget.customSettingsLoad(this.model.dialogRef);
                }
                this.model.firstLoad = false;
            }
        },

        getConfig: function getConfig() {
            // If the settings panel has been loaded
            if ($("#widgetSettings .panel-body").children().length > 0) {
                if (_.has(this.model.widget, "customSettingsSave")) {
                    this.model.widgetConf = this.model.widget.customSettingsSave(this.model.dialogRef, this.model.widgetConf);
                } else if (this.$el.find(".widget-settings").length > 0) {
                    _.assignIn(this.model.widgetConf, form2js("widgetConfigForm", ".", true));
                }
            }
            return this.model.widgetConf;
        },

        loadPreview: function loadPreview(config) {
            var _this5 = this;

            if (config) {

                // Removes the size classes while keeping default classes
                this.$el.find("#widgetPreview .preview-container").attr("class", "preview-container");

                switch (config.size) {
                    case "x-small":
                        this.$el.find("#widgetPreview .preview-container").addClass("col-sm-4");
                        break;
                    case "small":
                        this.$el.find("#widgetPreview .preview-container").addClass("col-sm-6");
                        break;
                    case "medium":
                        this.$el.find("#widgetPreview .preview-container").addClass("col-sm-8");
                        break;
                    case "large":
                        this.$el.find("#widgetPreview .preview-container").addClass("col-sm-12");
                        break;
                }

                DashboardWidgetLoader.generateWidget({
                    "element": $("#widgetPreview .preview-container")[0],
                    "widget": config
                }, function (widget) {
                    if (!_this5.model.widget) {
                        _this5.model.widget = widget;
                    }

                    _this5.$el.find("#widgetSettings .no-widget").hide();

                    if (_this5.$el.find(".widget-settings").length > 0) {
                        _this5.$el.find("#widgetSettings .panel").removeClass("hidden");
                        _this5.$el.find("#widgetSettings .no-data").hide();
                        _this5.$el.find("#widgetSettings .no-settings").hide();
                    } else if (_this5.$el.find(".widget-settings").length === 0) {
                        _this5.$el.find("#widgetSettings .no-data").show();
                        _this5.$el.find("#widgetSettings .no-settings").show();
                        _this5.$el.find("#widgetSettings .panel-body").empty();
                    }
                });
            }
        },

        renameDashboardEvent: function renameDashboardEvent(e) {
            var _this6 = this;

            e.preventDefault();

            DashboardUtils.renameDashboard.call(this, this.model.allDashboards, this.model.dashboardIndex, function (dashboards) {
                _this6.data.dashboard.name = dashboards[_this6.model.dashboardIndex].name;
                _this6.saveChanges("dashboardRenamed", _this6.model.dashboardIndex);
            });
        },

        /**
         Override validation to allow dialog to enable/disable Save correctly
         */
        validationSuccessful: function validationSuccessful(event) {
            DashboardUtils.validationSuccessful.call(this.model.dashboardRef, event);
        },

        validationFailed: function validationFailed(event, details) {
            DashboardUtils.validationFailed.call(this.model.dashboardRef, event, details);
        },

        duplicateDashboard: function duplicateDashboard(e) {
            e.preventDefault();

            this.dialog = BootstrapDialogUtils.createModal({
                title: $.t("dashboard.duplicateTitle"),
                message: $(Handlebars.compile("{{> dashboard/_DuplicateDashboard}}")({
                    "defaultName": $.t("dashboard.duplicateOf") + this.data.dashboard.name,
                    "existingDashboards": _.pick(this.model.allDashboards, "name")
                })),
                onshown: _.bind(function (dialogRef) {
                    this.setElement("#DuplicateDashboardDialog");
                    dialogRef.$modalBody.find(":text")[0].focus();
                    ValidatorsManager.bindValidators(dialogRef.$modal.find("#DuplicateDashboardDialog form"));
                    ValidatorsManager.validateAllFields(dialogRef.$modal.find("#DuplicateDashboardDialog form"));
                }, this),
                onhidden: _.bind(function () {
                    this.setElement("#content");
                }, this),
                buttons: ["close", {
                    label: $.t("common.form.save"),
                    cssClass: "btn-primary",
                    id: "SaveNewName",
                    action: _.bind(function (dialogRef) {
                        var newDashboard = _.cloneDeep(this.data.dashboard);

                        newDashboard.name = dialogRef.$modal.find("#DashboardName").val();
                        newDashboard.isDefault = false;
                        this.model.allDashboards.push(newDashboard);

                        this.saveChanges("dashboardDuplicated", this.model.allDashboards.length - 1);

                        dialogRef.close();
                    }, this)
                }]
            }).open();
        },

        defaultDashboardEvent: function defaultDashboardEvent(e) {
            e.preventDefault();

            this.data.dashboard = DashboardUtils.setDefaultDashboard(this.model.allDashboards, this.model.dashboardIndex);

            this.saveChanges("dashboardDefaulted", this.model.dashboardIndex);
        },

        deleteDashboardEvent: function deleteDashboardEvent(e) {
            e.preventDefault();

            var deleteDetails = DashboardUtils.deleteDashboard(this.model.allDashboards, this.model.dashboardIndex);

            this.model.allDashboards = deleteDetails.dashboards;

            this.saveChanges("dashboardDeleted", deleteDetails.index);
        },

        saveChanges: function saveChanges(message, landingIndex, callback) {
            this.model.uiConf.adminDashboards = this.model.allDashboards;

            ConfigDelegate.updateEntity("ui/dashboard", this.model.uiConf).then(_.bind(function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, message);
                EventManager.sendEvent(Constants.EVENT_UPDATE_NAVIGATION);

                if (this.model.dashboardIndex === landingIndex) {
                    this.render();
                } else if (_.isNumber(landingIndex) && landingIndex > -1) {
                    EventManager.sendEvent(Constants.EVENT_CHANGE_VIEW, {
                        route: {
                            view: "org/forgerock/openidm/ui/admin/dashboard/Dashboard",
                            role: "ui-admin",
                            url: "dashboard/" + landingIndex
                        }
                    });
                } else {
                    EventManager.sendEvent(Constants.EVENT_CHANGE_VIEW, { route: Router.configuration.routes.newDashboardView });
                }

                if (callback) {
                    callback();
                }
            }, this));
        },

        deleteWidgetEvent: function deleteWidgetEvent(event) {
            event.preventDefault();

            var currentConf = this.model.uiConf,
                currentWidget = $(event.target).parents(".widget-holder"),
                widgetLocation = this.$el.find(".widget-holder").index(currentWidget);

            currentConf.adminDashboards[this.model.dashboardIndex].widgets = this.deleteWidget(currentConf.adminDashboards[this.model.dashboardIndex].widgets, widgetLocation);

            UIUtils.confirmDialog($.t("dashboard.widgetDelete"), "danger", _.bind(function () {
                ConfigDelegate.updateEntity("ui/dashboard", currentConf).then(_.bind(function () {
                    this.render();
                }, this));
            }, this));
        },

        /**
         *
         * @param widgets - Array of dashboard widgets
         * @param widgetIndex - The index of the removed widget
         * @returns Returns Array of widgets with the deleted widget removed
         */
        deleteWidget: function deleteWidget(widgets, widgetIndex) {
            widgets.splice(widgetIndex, 1);

            return widgets;
        }
    });

    return new DashboardView();
});
