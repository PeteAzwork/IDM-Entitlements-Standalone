"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
define(["jquery", "lodash", "org/forgerock/openidm/ui/common/dashboard/widgets/AbstractWidget", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate", "org/forgerock/openidm/ui/admin/delegates/ReportDelegate", "org/forgerock/openidm/ui/common/delegates/SocialDelegate"], function ($, _, AbstractWidget, ConnectorDelegate, ReportDelegate, SocialDelegate) {
    var widgetInstance = {},
        Widget = AbstractWidget.extend({
        template: "templates/admin/dashboard/widgets/CounterWidgetTemplate.html",
        model: {
            "overrideTemplate": "dashboard/widget/_counterConfig"
        },
        widgetRender: function widgetRender(args, callback) {
            var _this = this;

            this.partials.push("partials/dashboard/widget/_counterConfig.html");

            var selected = args.widget.selected || "activeUsers",
                countOptions = {
                activeUsers: {
                    count: 0,
                    description: $.t('dashboard.counterWidget.activeUsers')
                },
                socialEnabled: {
                    count: 0,
                    description: $.t('dashboard.counterWidget.socialEnabled')
                },
                rolesEnabled: {
                    count: 0,
                    description: $.t('dashboard.counterWidget.rolesEnabled')
                },
                activeConnectors: {
                    count: 0,
                    description: $.t('dashboard.counterWidget.activeConnectors')
                },
                manualRegistrations: {
                    count: 0,
                    description: $.t('dashboard.counterWidget.manualRegistrations')
                }
            };

            $.when(ConnectorDelegate.currentConnectors(), SocialDelegate.providerList(), ReportDelegate.getActiveUsers(), ReportDelegate.getRoles(), ReportDelegate.getManualRegistrations()).then(function (connectors, socialList, activeUsers, roles, manual) {
                _this.element = args.element[0];

                if (connectors.length) {
                    countOptions.activeConnectors.count = connectors.length;
                }

                if (socialList.providers.length) {
                    countOptions.socialEnabled.count = socialList.providers.length;
                }

                if (roles[0].result.length) {
                    countOptions.rolesEnabled.count = roles[0].resultCount;
                }

                if (activeUsers[0].result.length) {
                    countOptions.activeUsers.count = activeUsers[0].result[0].count;
                }

                if (manual[0].result.length) {
                    var result = _.filter(manual[0].result, function (elem) {
                        if (elem.idps) {
                            return elem.idps.length === 0;
                        }
                        return { count: 0 };
                    });
                    countOptions.manualRegistrations.count = result.length;
                }

                if (_.isUndefined(args.menuItems)) {
                    args.menuItems = [];
                }

                if (_.isUndefined(args.hideSettings)) {
                    args.hideSettings = false;
                }

                _this.data.option = countOptions[selected];

                _this.parentRender(function () {
                    if (callback) {
                        callback(_this);
                    }
                });
            });
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
