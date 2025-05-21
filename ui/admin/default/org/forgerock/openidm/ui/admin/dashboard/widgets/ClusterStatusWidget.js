"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "bootstrap", "handlebars", "org/forgerock/openidm/ui/common/dashboard/widgets/AbstractWidget", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "org/forgerock/openidm/ui/admin/util/ClusterUtils"], function ($, _, bootstrap, Handlebars, AbstractWidget, Router, BootstrapDialogUtils, ClusterUtils) {
    var widgetInstance = {},
        Widget = AbstractWidget.extend({
        template: "templates/admin/dashboard/widgets/ClusterStatusWidgetTemplate.html",
        model: {
            "overrideTemplate": "dashboard/widget/_clusterStatusConfig",
            "defaultRefreshRate": 30000 //30 seconds
        },
        widgetRender: function widgetRender(args, callback) {
            var _this2 = this;

            //widgetRender will sometimes be called with no args
            if (args && args.widget) {
                this.data.refreshRate = args.widget.refreshRate;
            }

            //add to events and load settings partial
            this.events["click .refreshClusterData"] = "reloadWidget";
            this.events["click .fr-node-card a"] = "showNodeDetails";
            this.partials.push("partials/dashboard/widget/_clusterStatusConfig.html");
            this.partials.push("partials/util/_clusterNodeDetail.html");

            //set the startView to be used in conditional logic to make sure we are
            //still on the dashboard page
            this.startView = this.startView || Router.currentRoute.view;

            //add the refresh button to the the ellipse under the "Settings" button
            this.data.menuItems = [{
                "icon": "fa-refresh",
                "menuClass": "refreshClusterData",
                "title": $.t("dashboard.clusterStatusWidget.refresh")
            }];

            ClusterUtils.getClusterData().then(function (cluster) {
                var dialog = $("#WidgetNodeStatusDialog");

                if (dialog.length > 0) {
                    var instanceIndex = dialog.attr("data-instance-index"),
                        data = _.assignIn({
                        instanceIndex: instanceIndex
                    }, _this2.data.cluster[instanceIndex]);

                    dialog.replaceWith($(Handlebars.compile("{{> util/_clusterNodeDetail}}")(data)));
                }

                if (cluster) {
                    _this2.data.cluster = _.sortBy(cluster, function (o) {
                        return o.instanceId;
                    });
                    _this2.data.clusterCount = _this2.data.cluster.length;
                }

                _this2.parentRender(function () {
                    var _this = _this2;

                    if (_this2.startView === Router.currentRoute.view) {
                        _.delay(function () {
                            _this.reloadWidget();
                        }, _this2.data.refreshRate || _this2.model.defaultRefreshRate);
                    }

                    if (callback) {
                        callback(_this2);
                    }
                });
            });
        },

        reloadWidget: function reloadWidget(e) {
            if (e) {
                e.preventDefault();
            }
            this.widgetRender();
        },
        /**
        * This function is called on node row click and opens up a BootstrapDialog which loads node details
        **/
        showNodeDetails: function showNodeDetails(e) {
            var instanceIndex = $(e.target).closest("a").attr("data-instance-index"),
                data = _.assignIn({
                instanceIndex: instanceIndex
            }, this.data.cluster[instanceIndex]);

            e.preventDefault();
            this.dialog = BootstrapDialogUtils.createModal({
                title: data.instanceId,
                cssClass: "add-widget-preview",
                message: $(Handlebars.compile("{{> util/_clusterNodeDetail}}")(data)),
                buttons: ["close"]
            }).open();
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
