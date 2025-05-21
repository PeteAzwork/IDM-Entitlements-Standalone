"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "bootstrap", "dimple", "form2js", "org/forgerock/openidm/ui/common/dashboard/widgets/AbstractWidget", "org/forgerock/openidm/ui/common/delegates/ResourceDelegate", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate"], function ($, _, bootstrap, dimple, form2js, AbstractWidget, ResourceDelegate, ConfigDelegate) {
    var widgetInstance = {},
        Widget = AbstractWidget.extend({
        template: "templates/admin/dashboard/widgets/GraphWidgetTemplate.html",
        model: {
            overrideTemplate: "dashboard/widget/_graphConfig",
            resourceData: null,
            managedData: null,
            chartX: 0,
            chartY: 0,
            chartWidth: "100%",
            chartHeight: 215,
            canvasWidth: "100%",
            canvasHeight: 265,
            chart: null
        },
        data: {
            widgetTitle: "",
            resourceList: [],
            resource: "user",
            metricList: [],
            metric: "accountStatus",
            graphType: "bar"
        },

        widgetRender: function widgetRender(args, callback) {
            var _this = this;

            this.data.widget = args.widget;
            this.data.widgetTitle = args.widget.widgetTitle;
            this.data.subTitle = args.widget.subTitle;
            this.data.resource = args.widget.resource;
            this.data.metric = args.widget.metric;
            this.data.graphType = args.widget.graphType;

            this.partials.push("partials/dashboard/widget/_graphConfig.html");

            this.parentRender(function () {
                $.when(ConfigDelegate.readEntity("managed"), ResourceDelegate.searchResource("true", "managed/" + _this.data.resource)).then(function (managed, responseData) {
                    var svg = dimple.newSvg(_this.$el.find(".widget-chart")[0], _this.model.canvasWidth, _this.model.canvasHeight),
                        currentSchema = _.find(managed.objects, function (m) {
                        return m.name === _this.data.resource;
                    });

                    //If managed object isn't found fall back to the first
                    if (_.isUndefined(currentSchema)) {
                        currentSchema = managed.objects[0];
                    }

                    _this.model.resourceData = responseData[0].result;
                    _this.model.managedData = managed.objects;

                    _.forEach(_this.model.managedData, function (managed) {
                        _this.data.resourceList.push(managed.name);
                    });

                    //Filter by resource name .schema on return pass to generateMetricList
                    _this.data.metricList = _this.generateMetricList(currentSchema.schema);

                    //If metric isn't found fall back to the first
                    if (_.indexOf(_this.data.metricList, _this.data.metric) === -1) {
                        _this.data.metric = _this.data.metricList[0];
                    }

                    switch (_this.data.graphType) {
                        case "area":
                            _this.setChartArea(svg, _this.data.metric);
                            break;
                        case "bar":
                            _this.setChartBar(svg, _this.data.metric);
                            break;
                        case "pie":
                            _this.setChartPie(svg, _this.data.metric, false);
                            break;
                        case "ring":
                            _this.setChartPie(svg, _this.data.metric, true);
                            break;
                        case "line":
                            _this.setChartLine(svg, _this.data.metric, false);
                            break;
                        case "step":
                            _this.setChartLine(svg, _this.data.metric, true);
                            break;
                    }

                    if (callback) {
                        callback(_this);
                    }
                });
            });
        },

        customSettingsLoad: function customSettingsLoad(dialogRef) {
            var _this2 = this;

            this.generateSelect(dialogRef.$modalBody.find("#graphResource"), this.data.resourceList, this.data.resource);

            dialogRef.$modalBody.find("#graphResource").bind("change", function () {
                var resource = dialogRef.$modalBody.find("#graphResource").val(),
                    currentSchema = _.find(_this2.model.managedData, { name: resource });

                dialogRef.$modalBody.find("#graphMetric").empty();

                _this2.data.resource = resource;
                _this2.data.metricList = _this2.generateMetricList(currentSchema.schema);

                _this2.generateSelect(dialogRef.$modalBody.find("#graphMetric"), _this2.data.metricList, null);
            });

            this.generateSelect(dialogRef.$modalBody.find("#graphMetric"), this.data.metricList, this.data.metric);
        },

        generateSelect: function generateSelect(select, list, value) {
            select.empty();

            _.forEach(list, function (listItem) {
                var tempOption = "<option value=\"" + listItem + "\">" + listItem + "</option>";

                select.append(tempOption);
            });

            if (value) {
                select.val(value);
            }
        },

        generateMetricList: function generateMetricList(managedSchema) {
            var metricList = [];

            _.forEach(managedSchema.properties, function (schemaItem, key) {
                if (schemaItem.type === "string" || schemaItem.type === "boolean" || schemaItem.type === "Number") {
                    metricList.push(key);
                }
            });

            return metricList;
        },

        countResource: function countResource(category, data) {
            var chartData = [];

            _.forEach(data, function (record) {
                var found = _.find(chartData, function (c) {
                    return c[category] === record[category];
                });

                if (_.isUndefined(record[category])) {
                    record[category] = "Unavailable";
                }

                if (found) {
                    found.count = found.count + 1;
                } else {
                    var tempRecord = {};

                    tempRecord[category] = record[category];
                    tempRecord.count = 1;

                    chartData.push(tempRecord);
                }
            });

            return chartData;
        },

        setChartBar: function setChartBar(svg, category) {
            var xAxis;

            this.model.chart = new dimple.chart(svg, this.countResource(category, this.model.resourceData));

            this.model.chart.setBounds(this.model.chartX, this.model.chartY, this.model.chartWidth, this.model.chartHeight);

            xAxis = this.model.chart.addCategoryAxis("x", category);
            xAxis.addOrderRule(category);

            this.model.chart.addMeasureAxis("y", "count");
            this.model.chart.setMargins("30px", "20px", "30px", "40px");
            this.model.chart.addSeries(null, dimple.plot.bar);

            this.model.chart.draw();
        },

        setChartPie: function setChartPie(svg, category, innerRadius) {
            var series;

            this.model.chart = new dimple.chart(svg, this.countResource(category, this.model.resourceData));
            this.model.chart.setBounds(this.model.chartX, this.model.chartY, this.model.chartWidth, this.model.chartHeight);
            this.model.chart.addMeasureAxis("p", "count");

            series = this.model.chart.addSeries(category, dimple.plot.pie);

            this.model.chart.addLegend(70, 20, 90, 300, "left");

            if (innerRadius) {
                series.innerRadius = "50%";
            }

            this.model.chart.draw();
        },

        setChartLine: function setChartLine(svg, category, reverse) {
            var xAxis, yAxis;

            this.model.chart = new dimple.chart(svg, this.countResource(category, this.model.resourceData));

            this.model.chart.setBounds(this.model.chartX, this.model.chartY, this.model.chartWidth, this.model.chartHeight);

            if (reverse) {
                yAxis = this.model.chart.addCategoryAxis("y", category);
                yAxis.addOrderRule(category);

                this.model.chart.addMeasureAxis("x", "count");
                this.model.chart.setMargins("100px", "20px", "30px", "40px");
            } else {
                xAxis = this.model.chart.addCategoryAxis("x", category);
                xAxis.addOrderRule(category);

                this.model.chart.addMeasureAxis("y", "count");
                this.model.chart.setMargins("70px", "20px", "30px", "40px");
            }

            this.model.chart.addSeries(null, dimple.plot.line);

            this.model.chart.draw();
        },

        setChartArea: function setChartArea(svg, category) {
            var xAxis;

            this.model.chart = new dimple.chart(svg, this.countResource(category, this.model.resourceData));

            this.model.chart.setBounds(this.model.chartX, this.model.chartY, this.model.chartWidth, this.model.chartHeight);

            xAxis = this.model.chart.addCategoryAxis("x", category);
            xAxis.addOrderRule(category);

            this.model.chart.addMeasureAxis("y", "count");
            this.model.chart.setMargins("30px", "20px", "30px", "40px");
            this.model.chart.addSeries(null, dimple.plot.area);

            this.model.chart.draw();
        },

        resize: function resize() {
            if (this.model.chart) {
                this.model.chart.draw(0, true);
            }
        },

        customSettingsSave: function customSettingsSave() {
            return _.assignIn(this.data.widget, form2js("widgetConfigForm", ".", false));
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
