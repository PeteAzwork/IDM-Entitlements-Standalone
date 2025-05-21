"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "bootstrap", "dimple", "moment", "org/forgerock/openidm/ui/common/dashboard/widgets/AbstractWidget", "org/forgerock/openidm/ui/admin/delegates/AuditDelegate", "org/forgerock/openidm/ui/common/delegates/SocialDelegate", "org/forgerock/openidm/ui/admin/dashboard/widgets/util/TimezoneUtil"], function ($, _, bootstrap, dimple, moment, AbstractWidget, AuditDelegate, SocialDelegate, TimezoneUtil) {
    var widgetInstance = {},
        Widget = AbstractWidget.extend({
        template: "templates/admin/dashboard/widgets/SocialDetailsWidgetTemplate.html",
        model: {
            overrideTemplate: "dashboard/widget/_socialCountWidget",
            auditType: "",
            socialQuery: "",
            aggregateFields: "",
            socialProvidersDetails: [],
            socialProviderCount: {},
            socialProviderPieChart: null,
            socialProviderBarChart: null,
            chartWidth: "100%",
            chartHeight: 300,
            barChartX: 0,
            barChartY: 0,
            pieChartX: 0,
            pieChartY: 70,
            drawTime: 1000,
            canvasWidth: "100%",
            canvasHeight: 390,
            totalCount: 0
        },

        customSettingsSave: function customSettingsSave(dialogRef, widget) {
            widget.size = dialogRef.$modalBody.find("#widgetSize").val();
            widget.timezone = TimezoneUtil.getTimezoneOffset(dialogRef);

            return widget;
        },

        customSettingsLoad: function customSettingsLoad(dialogRef) {
            TimezoneUtil.setupOffsetInputs(dialogRef, this.model.widget);
        },

        widgetRender: function widgetRender(args, callback) {
            var _this = this;

            var pieSvg, pieChart, barSvg, barChart;

            this.model.widget = args.widget;
            this.data.simpleWidget = false;
            this.model.totalCount = 0;

            this.events["click .refresh-social-info"] = "refresh";
            this.events["click .widget-toggle-view-btn"] = "changeGraphView";

            this.data.menuItems = [{
                "icon": "fa-refresh",
                "menuClass": "refresh-social-info",
                "title": "Refresh"
            }];

            this.partials.push("partials/dashboard/widget/_socialCountWidget.html", "partials/dashboard/widget/_timezoneGroup.html");

            if (!_.has(this.model.widget, "timezone")) {
                this.model.widget.timezone = TimezoneUtil.getLocalOffset();
            }

            this.model.offset = TimezoneUtil.getOffsetString(this.model.widget.timezone);
            this.model.today = moment().zone(this.model.offset).startOf("day").toISOString();
            this.model.tomorrow = moment(this.model.today).add(1, "days").toISOString();

            this.model.socialQuery = 'and !(eventName eq "SESSION") and !(eventName eq "FAILED") and provider gt ""';
            this.model.auditType = 'authentication';
            this.model.aggregateFields = "TIMESTAMP=/timestamp;scale:month;utcOffset:" + this.model.offset + ",VALUE=/provider";

            this.parentRender(function () {
                _this.model.currentData = {};

                $.when(AuditDelegate.getAuditReport(_this.model.auditType, _this.model.today, _this.model.tomorrow, _this.model.socialQuery, _this.model.aggregateFields), SocialDelegate.providerList()).then(function (auditData, socialList) {
                    _this.model.socialProviderList = socialList.providers;

                    if (_this.model.socialProviderList.length !== 0 && auditData[0].result.length !== 0) {

                        _this.model.socialProviderCount = _this.formatSocialLoginData(auditData);

                        _.forEach(_this.model.socialProviderList, function (provider) {
                            var tempCount = _this.model.socialProviderCount[provider.provider];

                            if (_.isUndefined(tempCount)) {
                                tempCount = 0;
                            }

                            _this.model.totalCount = _this.model.totalCount + tempCount;

                            _this.model.socialProvidersDetails.push({
                                "provider": _.capitalize(provider.provider),
                                "count": tempCount
                            });
                        });

                        //pie chart
                        pieSvg = dimple.newSvg(_this.$el.find(".pie-chart")[0], _this.model.canvasWidth, _this.model.canvasHeight);

                        _this.model.socialProviderPieChart = new dimple.chart(pieSvg, _this.model.socialProvidersDetails);
                        _this.model.socialProviderPieChart.setBounds(_this.model.pieChartX, _this.model.pieChartY, _this.model.chartWidth, _this.model.chartHeight);
                        _this.model.socialProviderPieChart.addMeasureAxis("p", "count");

                        _this.model.socialProviderPieChart.addLegend(0, 10, 90, 300, "left");

                        pieChart = _this.model.socialProviderPieChart.addSeries("provider", dimple.plot.pie);
                        pieChart.addOrderRule("provider", true);

                        if (_this.model.totalCount > 0) {
                            _this.model.socialProviderPieChart.draw();
                            _this.$el.find(".pie-chart").toggleClass("hidden", true);
                        }

                        //bar chart
                        barSvg = dimple.newSvg(_this.$el.find(".bar-chart")[0], _this.model.canvasWidth, _this.model.canvasHeight);

                        _this.model.socialProviderBarChart = new dimple.chart(barSvg, _this.model.socialProvidersDetails);
                        _this.model.socialProviderBarChart.setBounds(_this.model.barChartX, _this.model.barChartY, _this.model.chartWidth, _this.model.chartHeight);

                        _this.model.socialProviderBarChart.addCategoryAxis("x", "provider");
                        _this.model.socialProviderBarChart.addMeasureAxis("y", "count");

                        _this.model.socialProviderBarChart.setMargins(50, 50, 50, 50);

                        barChart = _this.model.socialProviderBarChart.addSeries("provider", dimple.plot.bar);
                        barChart.addOrderRule("provider", true);

                        _this.model.socialProviderBarChart.draw();
                        if (callback) {
                            callback(_this);
                        }
                    } else {
                        _this.$el.find(".bar-chart").toggleClass("hidden", true);
                        _this.$el.find(".pie-chart").toggleClass("hidden", true);

                        _this.$el.find(".no-data").toggleClass("hidden", false);
                        _this.$el.find(".refresh-social-info").hide();
                        _this.$el.find(".chart-toggle-buttons").hide();
                        if (callback) {
                            callback(_this);
                        }
                    }
                });
            });
        },

        /**
         * @param auditData - JSON object of the current result from audit data
         *
         * Formatts the audit data returned for social login
         */
        formatSocialLoginData: function formatSocialLoginData(auditData) {
            var providerCount = {};

            _.forEach(auditData[0].result, function (registration) {
                providerCount[registration.provider] = registration.count;
            });

            return providerCount;
        },

        /**
         * @param event - Click event on refresh menu item
         *
         * Refreshes both the bar and pie chart graphs with the latest audit data
         */
        refresh: function refresh(event) {
            var _this2 = this;

            event.preventDefault();

            AuditDelegate.getAuditReport(this.model.auditType, this.model.today, this.model.tomorrow, this.model.socialQuery, this.model.aggregateFields).then(function (auditData) {
                _this2.model.socialProviderCount = [];
                _this2.model.socialProvidersDetails = [];
                _this2.model.totalCount = 0;

                if (auditData.result.length !== 0 && auditData[0].result.length !== 0) {
                    _this2.$el.find(".bar-chart").toggleClass("hidden", false);
                    _this2.$el.find(".pie-chart").toggleClass("hidden", false);

                    _this2.$el.find(".chart-toggle-buttons").show();

                    _this2.model.socialProviderCount = _this2.formatSocialLoginData(auditData);

                    _.forEach(_this2.model.socialProviderList, function (provider) {
                        var tempCount = _this2.model.socialProviderCount[provider.provider];

                        if (_.isUndefined(tempCount)) {
                            tempCount = 0;
                        }

                        _this2.model.totalCount = _this2.model.totalCount + tempCount;

                        _this2.model.socialProvidersDetails.push({
                            "provider": _.capitalize(provider.provider),
                            "count": tempCount
                        });
                    });

                    _this2.model.socialProviderBarChart.data = _this2.model.socialProvidersDetails;
                    _this2.model.socialProviderPieChart.data = _this2.model.socialProvidersDetails;

                    _this2.model.socialProviderBarChart.draw(_this2.model.drawTime);

                    if (_this2.model.totalCount > 0) {
                        _this2.model.socialProviderPieChart.draw(_this2.model.drawTime);
                    }

                    _this2.$el.find(".widget-toggle-view-btn").toggleClass("active", false);
                    _this2.$el.find(".widget-toggle-view-btn:first").toggleClass("active", true);
                    _this2.$el.find(".bar-chart").toggleClass("hidden", false);
                    _this2.$el.find(".pie-chart").toggleClass("hidden", true);
                    _this2.$el.find(".no-data").toggleClass("hidden", true);
                } else {
                    _this2.$el.find(".bar-chart").toggleClass("hidden", true);
                    _this2.$el.find(".pie-chart").toggleClass("hidden", true);

                    _this2.$el.find(".no-data").toggleClass("hidden", false);
                    _this2.$el.find(".chart-toggle-buttons").hide();
                }
            });
        },
        /**
         * This is called from the dashboard function to ensure that as a user resizes their browser the charts resize dynamically
         */
        resize: function resize() {
            if (this.model.socialProviderBarChart) {
                this.model.socialProviderBarChart.draw(0, true);
            }

            if (this.model.socialProviderPieChart && this.model.totalCount > 0) {
                this.model.socialProviderPieChart.draw(0, true);
            }
        },

        /**
         * @param event - Click event for the toggle view buttons
         *
         * Switches between graph and pie chart views. We cannot rely on bootstrap for this since it is possible that multiple widgets
         * of this view are on the same page (bootstrap relies on ID for tab control).
         */
        changeGraphView: function changeGraphView(event) {
            event.preventDefault();
            var type, button;

            if ($(event.target).hasClass("widget-toggle-view-btn")) {
                button = $(event.target);
            } else {
                button = $(event.target).parents(".widget-toggle-view-btn");
            }

            type = button.attr("data-type");

            this.$el.find(".widget-toggle-view-btn").toggleClass("active", false);
            button.toggleClass("active", true);

            if (type === "bar") {
                this.$el.find(".bar-chart").toggleClass("hidden", false);
                this.$el.find(".pie-chart").toggleClass("hidden", true);

                this.model.socialProviderBarChart.draw(0, true);
            } else {
                this.$el.find(".bar-chart").toggleClass("hidden", true);
                this.$el.find(".pie-chart").toggleClass("hidden", false);

                this.model.socialProviderPieChart.draw(0, true);
            }
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
