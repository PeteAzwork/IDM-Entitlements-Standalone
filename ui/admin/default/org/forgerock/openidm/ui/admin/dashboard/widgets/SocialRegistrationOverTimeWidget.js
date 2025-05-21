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
        template: "templates/admin/dashboard/widgets/SocialRegistrationOverTimeWidgetTemplate.html",
        model: {
            offset: "",
            overrideTemplate: "dashboard/widget/_socialCountWidget",
            auditType: null,
            socialQuery: "",
            socialProvidersDetails: [],
            socialProviderCount: {},
            socialProviderLineChart: null,
            chartWidth: "100%",
            chartHeight: 280,
            lineChartX: 0,
            lineChartY: 0,
            drawTime: 1000,
            canvasWidth: "100%",
            canvasHeight: 390,
            overTimeData: {}
        },

        widgetRender: function widgetRender(args, callback) {
            var _this = this;

            var year, lastYear, lineSvg, lineChart, date;

            this.data = _.cloneDeep(args);
            this.data.simpleWidget = false;
            this.data.menuItems = [{
                "icon": "fa-refresh",
                "menuClass": "refresh-social-info",
                "title": "Refresh"
            }];

            this.partials.push("partials/dashboard/widget/_socialCountWidget.html", "partials/dashboard/widget/_timezoneGroup.html");

            this.events["click .refresh-social-info"] = "refresh";

            if (!_.has(this.data.widget, "timezone")) {
                this.data.widget.timezone = TimezoneUtil.getLocalOffset();
            }

            this.model.offset = TimezoneUtil.getOffsetString(this.data.widget.timezone);
            this.model.offsetminutes = TimezoneUtil.getOffsetMinutes(this.data.widget.timezone);

            year = moment().zone(this.model.offset).toISOString();
            lastYear = moment().zone(this.model.offset).subtract(1, "years").toISOString();

            this.model.socialQuery = "and context pr and objectId sw \"managed/user\"";
            this.model.auditType = "activity";
            this.model.aggregateFields = "TIMESTAMP=/timestamp;scale:month;utcOffset:" + this.model.offset + ",VALUE=/context,VALUE=/provider";
            this.parentRender(function () {
                _this.model.currentData = {};

                _this.$el.parent().find(".widget-section-title .widget-title").text(_this.data.title);

                $.when(AuditDelegate.getAuditReport(_this.model.auditType, lastYear, year, _this.model.socialQuery, _this.model.aggregateFields), SocialDelegate.providerList()).then(function (auditData, socialList) {
                    _this.model.socialProviderList = socialList.providers;
                    _this.model.overTimeData = _this.generateOverTimeSkeleton(_.cloneDeep(_this.model.socialProviderList));

                    if (_this.model.socialProviderList.length !== 0) {
                        _this.$el.find(".line-chart").toggleClass("hidden", false);

                        _this.model.overTimeData = _this.updateOverTimeSkeleton(auditData[0].result, _this.model.overTimeData);

                        //pie chart
                        lineSvg = dimple.newSvg(_this.$el.find(".line-chart")[0], _this.model.canvasWidth, _this.model.canvasHeight);

                        _this.model.socialProviderLineChart = new dimple.chart(lineSvg, _this.model.overTimeData);
                        _this.model.socialProviderLineChart.setBounds(_this.model.lineChartX, _this.model.lineChartY, _this.model.chartWidth, _this.model.chartHeight);

                        date = _this.model.socialProviderLineChart.addCategoryAxis("x", "Month");
                        date.addOrderRule("Placement", true);

                        _this.model.socialProviderLineChart.addMeasureAxis("y", "Count");

                        _this.model.socialProviderLineChart.setMargins(110, 30, 10, 45);
                        _this.model.socialProviderLineChart.addLegend(0, 10, 90, 300, "left");

                        lineChart = _this.model.socialProviderLineChart.addSeries("Provider", dimple.plot.line);
                        lineChart.addOrderRule("Placement", true);

                        _this.model.socialProviderLineChart.draw();
                        if (callback) {
                            callback(_this);
                        }
                    } else {
                        _this.$el.find(".line-chart").toggleClass("hidden", true);

                        _this.$el.find(".no-data").toggleClass("hidden", false);
                        _this.$el.find(".refresh-social-info").hide();
                        if (callback) {
                            callback(_this);
                        }
                    }
                });
            });
        },

        /**
         * @param providers - List of available providers
         * @returns {object} JSON object built out for the last year based on social providers
         */
        generateOverTimeSkeleton: function generateOverTimeSkeleton(providers) {
            var _this2 = this;

            var skeleton = {},
                months = 12;

            providers.push({
                "provider": $.t("dashboard.socialDetailsWidget.manual")
            });

            _.forEach(providers, function (provider) {
                var tempProviderName = _.capitalize(provider.provider),
                    tempDate = moment().zone(_this2.model.offset).toISOString();

                skeleton[tempProviderName] = [{
                    "Month": moment(tempDate).format("MMM-YYYY"),
                    "Placement": 0,
                    "Date": "",
                    "Provider": tempProviderName,
                    "Count": 0
                }];

                for (var i = 0; i < months; i++) {
                    tempDate = moment().zone(_this2.model.offset).subtract(i + 1, "months").toISOString();

                    skeleton[tempProviderName].push({
                        "Month": moment(tempDate).format("MMM-YYYY"),
                        "Placement": i + 1,
                        "Date": "",
                        "Provider": tempProviderName,
                        "Count": 0
                    });
                }
            });

            return skeleton;
        },
        /**
         * @param auditData - JSON object of the current result from audit data
         * @param overTimeData - JSON object built out for the last year based off social providers available
         *
         * Formatts the audit data returned for social login
         *
         *
         */
        updateOverTimeSkeleton: function updateOverTimeSkeleton(auditData, overTimeData) {
            var _this3 = this;

            _.forEach(auditData, function (record) {
                //change hardcoded timezone to current
                var tempTime = TimezoneUtil.adjustUnixTimestamp(record.timestamp.epochSeconds, _this3.model.offsetminutes),
                    currentProvider = void 0,
                    foundMonth = void 0;

                if (_.isNull(record.provider)) {
                    currentProvider = $.t("dashboard.socialDetailsWidget.manual");
                } else {
                    currentProvider = _.capitalize(record.provider);
                }

                foundMonth = _.find(overTimeData[currentProvider], function (timeData) {
                    return moment.unix(tempTime).format("MMM-YYYY") === timeData.Month;
                });

                if (!_.isUndefined(foundMonth)) {
                    foundMonth.Date = moment.unix(tempTime).format("DD/MM/YYYY");
                    foundMonth.Count = record.count;
                }
            });

            return _.flattenDeep(_.values(overTimeData));
        },

        /**
         * @param event - Click event on refresh menu item
         *
         * Refreshes line graph
         */
        refresh: function refresh(event) {
            var _this4 = this;

            var year = moment().zone(this.model.offset).toISOString(),
                lastYear = moment().zone(this.model.offset).subtract(1, "years").toISOString();

            event.preventDefault();

            AuditDelegate.getAuditReport(this.model.auditType, lastYear, year, this.model.socialQuery, this.model.aggregateFields).then(function (auditData) {
                _this4.model.overTimeData = _this4.generateOverTimeSkeleton(_.cloneDeep(_this4.model.socialProviderList));
                _this4.model.overTimeData = _this4.updateOverTimeSkeleton(auditData.result, _this4.model.overTimeData);

                _this4.model.socialProviderLineChart.data = _this4.model.overTimeData;

                _this4.model.socialProviderLineChart.draw(_this4.model.drawTime);
            });
        },
        /**
         * This is called from the dashboard function to ensure that as a user resizes their browser the charts resize dynamically
         */
        resize: function resize() {
            if (this.model.socialProviderLineChart) {
                this.model.socialProviderLineChart.draw(0, true);
            }
        },

        customSettingsLoad: function customSettingsLoad(dialogRef) {
            TimezoneUtil.setupOffsetInputs(dialogRef, this.data.widget);
        },

        customSettingsSave: function customSettingsSave(dialogRef, widget) {
            widget.size = dialogRef.$modalBody.find("#widgetSize").val();
            widget.timezone = TimezoneUtil.getTimezoneOffset(dialogRef);

            return widget;
        }
    });

    widgetInstance.createWidget = function () {
        var widget = {};

        $.extend(true, widget, new Widget());

        return widget;
    };

    widgetInstance.generateWidget = function (loadingObject, callback) {
        var widget = widgetInstance.createWidget();

        widget.render(loadingObject, callback);

        return widget;
    };

    return widgetInstance;
});
