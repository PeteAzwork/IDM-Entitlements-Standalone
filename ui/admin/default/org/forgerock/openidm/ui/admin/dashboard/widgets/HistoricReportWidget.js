"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "bootstrap", "dimple", "moment", "d3", "org/forgerock/openidm/ui/common/dashboard/widgets/AbstractWidget", "org/forgerock/openidm/ui/common/delegates/ResourceDelegate", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/common/delegates/SocialDelegate", "org/forgerock/openidm/ui/admin/delegates/AuditDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/openidm/ui/common/util/HandlebarHelperUtils"], function ($, _, bootstrap, dimple, moment, d3, AbstractWidget, ResourceDelegate, ConfigDelegate, SocialDelegate, AuditDelegate, Constants) {
    var widgetInstance = {},
        Widget = AbstractWidget.extend({
        template: "templates/admin/dashboard/widgets/HistoricReportWidget.html",
        model: {
            overrideTemplate: "dashboard/widget/_historicReportConfig",
            chartWidth: "100%",
            chartHeight: "100%",
            chartX: 0,
            chartY: 0,
            canvasWidth: "100%",
            canvasHeight: 250,
            NO_SOCIAL: "Username/Password",
            defaultColors: [new dimple.color("#5bc0de"), new dimple.color("#5cb85c"), new dimple.color("#d9534f"), new dimple.color("#f0ad4e")],
            daysOfWeek: moment.weekdaysShort(),
            svg: null,
            series: null,
            dimpleChart: null,
            xAxis: null,
            yAxis: null,
            timeFormat: "%m-%d-%Y",
            timeFormatter: null
        },
        data: {},

        widgetRender: function widgetRender(args, callback) {
            var _this = this;

            this.partials.push("partials/dashboard/widget/_historicReportConfig.html");
            this.data = _.cloneDeep(args);
            this.data.docHelpUrl = Constants.DOC_URL;
            this.data.widgetTitle = this.data.widget.widgetTitle;
            this.data.subTitle = $.t("dashboard.historicalReportWidget.thisWeek");
            this.model.timeFormatter = d3.time.format(this.model.timeFormat);

            var _getTimeUnits = this.getTimeUnits(),
                _getTimeUnits2 = _slicedToArray(_getTimeUnits, 3),
                endUnit = _getTimeUnits2[0],
                thisUnit = _getTimeUnits2[1],
                lastUnit = _getTimeUnits2[2],
                auditType = this.data.widgetConfig.auditType,
                aggregateFields = this.data.widgetConfig.aggregateFields,
                socialQuery = this.data.widgetConfig.socialQuery;

            $.when(this.data.widgetConfig.serviceEnabled(), AuditDelegate.getAuditReport(auditType, thisUnit, endUnit, socialQuery, aggregateFields), AuditDelegate.getAuditReport(auditType, lastUnit, thisUnit, socialQuery, aggregateFields), SocialDelegate.providerList()).then(function (serviceEnabled, thisWeekResponse, lastWeekResponse, providerList) {

                var thisWeek = _this.data.widgetConfig.removeUnusedProvider ? _this.removeUnrequiredProviders(thisWeekResponse[0].result) : thisWeekResponse[0].result,
                    lastWeek = _this.data.widgetConfig.removeUnusedProvider ? _this.removeUnrequiredProviders(lastWeekResponse[0].result) : lastWeekResponse[0].result;

                // Calls a custom data formatting functions per widget from the DashboardWidgetLoader
                if (_.has(_this.data.widgetConfig, "cleanData")) {
                    thisWeek = _this.data.widgetConfig.cleanData(thisWeek);
                    lastWeek = _this.data.widgetConfig.cleanData(lastWeek);
                }

                if (thisWeek.length === 0 && lastWeek.length === 0) {
                    _this.data.noData = true;
                }

                if (!serviceEnabled) {
                    _this.data.noData = true;
                    _this.data.notConfiged = true;
                }

                _this.setTrendText(thisWeek, lastWeek);

                // Overrides the default configurations for the settings dialog to include a list of potential providers
                _this.data.overrideConfig = _.assignIn(_.clone(_this.data.widget, true), _this.data.widgetConfig);

                if (_this.data.widgetConfig.removeUnusedProvider) {
                    _this.data.overrideConfig.providersList = _.sortBy(_.union(_.map(providerList.providers, function (provider) {
                        return _.capitalize(provider.provider);
                    }), _this.data.overrideConfig.providers, [_this.model.NO_SOCIAL]));
                }

                _this.parentRender(function () {
                    if (_this.model.dimpleChart) {
                        _this.model.svg.selectAll('*').remove();
                    }
                    if (!_this.data.noData) {
                        _this.model.svg = dimple.newSvg(_this.$el.find(".fr-chart")[0], _this.model.canvasWidth, _this.model.canvasHeight);
                        _this.model.chartData = _this.formatGraphData(thisWeek);
                        _this.model.dimpleChart = new dimple.chart(_this.model.svg, _this.model.chartData);
                        _this.model.dimpleChart.defaultColors = _this.model.defaultColors;
                        _this.model.dimpleChart.setBounds(_this.model.chartX, _this.model.chartY, _this.model.chartWidth, _this.model.chartHeight);
                        _this.model.dimpleChart.setMargins(30, 30, 30, 30);

                        switch (_this.data.widget.graphType) {
                            case "fa-pie-chart":
                                _this.createPieChart();
                                break;
                            case "fa-bar-chart":
                                _this.createBarChart();
                                break;
                            default:
                                _this.createLineChart();
                                break;
                        }
                    }

                    if (callback) {
                        callback();
                    }
                });
            });
        },

        removeUnrequiredProviders: function removeUnrequiredProviders(results) {
            return _.filter(results, _.bind(function (record) {
                if (_.isNull(record.provider)) {
                    record.provider = this.model.NO_SOCIAL;
                } else {
                    record.provider = _.capitalize(record.provider);
                }

                return _.includes(this.data.widget.providers, record.provider);
            }, this));
        },

        getTimeUnits: function getTimeUnits() {
            var endUnit, thisUnit, lastUnit;

            endUnit = moment().utcOffset(0).endOf("week").endOf("day").toISOString();
            thisUnit = moment(endUnit).utcOffset(0).startOf("week").toISOString();
            lastUnit = moment(endUnit).utcOffset(0).subtract(1, "week").startOf("week").toISOString();

            return [endUnit, thisUnit, lastUnit];
        },
        setTrendText: function setTrendText(present, past) {
            var presentCount = _.sum(_.map(present, "count")),
                pastCount = _.sum(_.map(past, "count"));

            this.data.trend = {
                total: _.sum(_.map(present, "count")),
                increase: presentCount > pastCount,
                percent: Math.abs(Math.round((pastCount - presentCount) / pastCount * 100)),
                historicalRecords: pastCount > 0
            };
        },


        /**
         * This is called from the dashboard function to ensure that as a user resizes their browser the charts resize dynamically
         */
        resize: function resize() {
            if (this.model.dimpleChart) {
                this.model.dimpleChart.draw(0, true);
                this.updateChartStyles();
            }
        },

        /**
         * This updates the horizontal line between the chart and the x axis to be slightly longer and to not have ticks
         * It also updated the data markers to be solid bubble instead of hollow
         */
        updateChartStyles: function updateChartStyles() {
            var _this2 = this;

            // Updates the horizonal line under the line/bar chart to not have tick marks
            if (this.model.xAxis) {
                var path = this.model.xAxis.shapes.selectAll("path").attr("d"),
                    pathWidth = parseInt(path.split("H")[1].split("V")[0], 10);
                this.model.xAxis.shapes.selectAll("path").attr("d", "M10,2H" + (pathWidth + 20));
            }

            // Fills the data markers of a line chart
            this.model.svg.selectAll(".dimple-marker").attr("r", 1.5);
            this.model.svg.selectAll(".dimple-marker").attr("fill", "none");

            // Makes the charts all solid opacity
            this.model.svg.selectAll(".dimple-pie, .dimple-bar, .dimple-line, .dimple-marker").attr("opacity", 1);

            if (this.model.series) {
                // Updates the tooltips
                this.model.series.getTooltipText = function (d) {
                    var provider = d.aggField[0],
                        usesProviders = _.findIndex(_this2.model.chartData, function (record) {
                        return _.has(record, "provider");
                    }) !== -1,
                        record = _.find(_this2.model.chartData, function (record) {
                        if (usesProviders) {
                            if (d.x) {
                                return record.timestamp === moment(d.x).utcOffset(0).format("MM-DD-YYYY") && record.provider === provider;
                            } else {
                                return record.provider === provider;
                            }
                        } else {
                            return record.timestamp === moment(d.x).utcOffset(0).format("MM-DD-YYYY");
                        }
                    });

                    return [record.provider ? "Provider: " + record.provider : "", record.timestamp ? "Date: " + record.timestamp : "", record.count ? "Count: " + record.count : ""];
                };
            }
        },


        /**
         * Given an array of report objects this function will format the data for dimple and add in empty days
         * @param rawData
         * @return {array}
         */
        formatGraphData: function formatGraphData(rawData) {
            var _this3 = this;

            var hasProvider = _.findIndex(rawData, function (record) {
                return _.has(record, "provider");
            }) !== -1,
                formattedData = _.map(rawData, function (entry) {
                var provider = {};
                if (hasProvider) {
                    provider = {
                        provider: !_.isNull(entry.provider) ? _.capitalize(entry.provider) : _this3.model.NO_SOCIAL
                    };
                }

                return _.assignIn(provider, {
                    timestamp: moment(entry.timestamp.iso8601).utcOffset(0).format("MM-DD-YYYY"),
                    count: entry.count
                });
            }),
                uniqueProviders = _.uniq(_.map(formattedData, function (data) {
                return data.provider;
            })),
                beginningOfWeek = this.getTimeUnits()[1],
                dayDiff = moment().endOf("day").utcOffset(0).diff(moment(beginningOfWeek).utcOffset(0), "days");

            // These charts should only ever have 4 categories, if more than 4 categories exist combine the categories with
            // the smallest counts into a new category: "Other"
            if (uniqueProviders.length > 4) {
                var counts = [],
                    otherProviders = void 0;
                _.forEach(_.groupBy(formattedData, "provider"), function (records, key) {
                    var consolidatedRecord = { "provider": key, "count": 0 };

                    _.forEach(records, function (record) {
                        consolidatedRecord.count += record.count;
                    });

                    counts.push(consolidatedRecord);
                });

                counts = _.sortBy(counts, function (record) {
                    return -record.count;
                });

                otherProviders = _.uniq(_.map(counts.splice(3), function (data) {
                    return data.provider;
                }));

                _.forEach(formattedData, function (record) {
                    if (_.includes(otherProviders, record.provider)) {
                        record.provider = "Other";
                    }
                });

                uniqueProviders = _.uniq(_.map(formattedData, function (data) {
                    return data.provider;
                }));
            }

            // For every unique provider
            _.forEach(uniqueProviders, function (provider) {
                var seriesData = void 0;
                if (hasProvider) {
                    seriesData = _.filter(formattedData, { "provider": provider });
                } else {
                    seriesData = formattedData;
                }

                // If the provider doesn't have data for every day that has elapsed this week
                if (seriesData.length < dayDiff) {
                    var today = moment();

                    // Loop through each day that has elapsed
                    _.times(dayDiff, function () {

                        var timestamp = today.format("MM-DD-YYYY");
                        today.subtract(1, "day"); // Include the first day of the week;

                        // If data is missing for this day add it
                        if (_.filter(seriesData, { "timestamp": timestamp }).length < 1) {
                            var providerObj = provider ? { "provider": provider } : {};
                            formattedData.push(_.assignIn(providerObj, {
                                "timestamp": timestamp,
                                "count": 0
                            }));
                        }
                    });
                }
            });

            if (this.data.widget.graphType === "fa-pie-chart") {
                formattedData = _.chain(formattedData).groupBy("provider").map(function (record) {
                    return {
                        "provider": record[0].provider,
                        "count": _.reduce(record, function (n, item) {
                            return item.count + n;
                        }, 0)
                    };
                }).value();
            }

            return formattedData;
        },
        createPieChart: function createPieChart() {
            // Pie charts don't need dates, removing the timestamp cleans up the tooltip.
            this.model.chartData = _.map(this.model.chartData, function (record) {
                return _.omit(record, "timestamp");
            });

            this.model.dimpleChart.addMeasureAxis("p", "count");
            this.model.series = this.model.dimpleChart.addSeries("provider", dimple.plot.pie);
            this.model.series.innerRadius = "50%";
            this.model.dimpleChart.draw();
            this.updateChartStyles();
        },
        createLineChart: function createLineChart() {
            this.model.xAxis = this.model.dimpleChart.addTimeAxis("x", "timestamp", this.model.timeFormat, "%a");
            this.model.xAxis.title = "";
            this.model.xAxis.overrideMin = this.model.timeFormatter.parse(moment().utcOffset(0).startOf("week").format("MM-DD-YYYY"));
            this.model.xAxis.overrideMax = this.model.timeFormatter.parse(moment().utcOffset(0).endOf("week").format("MM-DD-YYYY"));

            this.model.yAxis = this.model.dimpleChart.addMeasureAxis("y", "count");
            this.model.yAxis.hidden = true;

            this.model.series = this.model.dimpleChart.addSeries("provider", dimple.plot.line);
            this.model.series.interpolation = "monotone";
            this.model.series.lineMarkers = true;
            this.model.series.lineWeight = 3;

            this.model.dimpleChart.draw();
            this.updateChartStyles();
        },
        createBarChart: function createBarChart() {
            this.model.xAxis = this.model.dimpleChart.addTimeAxis("x", "timestamp", this.model.timeFormat, "%a");
            this.model.xAxis.title = "";
            this.model.xAxis.overrideMin = this.model.timeFormatter.parse(moment().utcOffset(0).startOf("week").format("MM-DD-YYYY"));
            this.model.xAxis.overrideMax = this.model.timeFormatter.parse(moment().utcOffset(0).endOf("week").format("MM-DD-YYYY"));
            this.model.xAxis.floatingBarWidth = "20";

            this.model.yAxis = this.model.dimpleChart.addMeasureAxis("y", "count");
            this.model.yAxis.hidden = true;

            this.model.series = this.model.dimpleChart.addSeries("provider", dimple.plot.bar);
            this.model.dimpleChart.draw();
            this.updateChartStyles();
        },


        customSettingsLoad: function customSettingsLoad(dialogRef) {
            dialogRef.$modalBody.find("#widgetProviders").selectize({
                delimiter: ',',
                persist: false,
                create: true,
                maxItems: null
            });

            dialogRef.$modalBody.find("select").selectize();

            dialogRef.$modalBody.find(".toggle-graph-type-btn").on("click", function (event) {
                var target = $(event.target);

                if (target.hasClass("fa")) {
                    target = target.parents(".btn");
                }

                dialogRef.$modalBody.find(".toggle-graph-type-btn").toggleClass("active", false);
                target.toggleClass("active", true);
            });
        },

        customSettingsSave: function customSettingsSave(dialogRef, widget) {
            widget.widgetTitle = dialogRef.$modalBody.find("#title").val();
            widget.size = dialogRef.$modalBody.find("#widgetSize").val();
            widget.graphType = dialogRef.$modalBody.find(".btn-group .active").attr("data-chart-type");
            if (dialogRef.$modalBody.find("#widgetProviders")) {
                widget.providers = dialogRef.$modalBody.find("#widgetProviders").val();
            }

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
