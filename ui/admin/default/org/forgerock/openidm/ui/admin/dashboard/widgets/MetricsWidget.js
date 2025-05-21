"use strict";

/*
 * Copyright 2017-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "backbone", "backgrid", "dimple", "org/forgerock/openidm/ui/common/dashboard/widgets/AbstractWidget", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/delegates/MetricsDelegate", "org/forgerock/commons/ui/common/main/Router"], function ($, _, backbone, backgrid, dimple, AbstractWidget, BackgridUtils, ConfigDelegate, MetricsDelegate, Router) {
    var widgetInstance = {},
        Widget = AbstractWidget.extend({
        template: "templates/admin/dashboard/widgets/MetricsWidgetTemplate.html",
        data: {
            rows: [],
            formattedMetricsData: []
        },
        model: {
            seconds: 0,
            buttonCount: 0,
            startView: null,
            metricsChart: null,
            line: null,
            legend: null,
            collection: null,
            timer: null,
            metricsGrid: null,
            buttonState: [],
            chartWidth: "100%",
            chartHeight: 280,
            lineChartX: 0,
            lineChartY: 0,
            drawTime: 1000,
            pollingInterval: 5000,
            canvasWidth: "100%",
            canvasHeight: 390,
            initializedStructure: false,
            metricsChartVisible: false
        },
        events: {
            "keyup #pathFilter": "filterPaths",
            "click .add-series": "addSeriesToGraph",
            "click .remove-series": "removeSeriesFromGraph",
            "click .remove-all-series": "removeAllSeriesFromGraph"
        },

        widgetRender: function widgetRender(args, callback) {
            var _this = this;

            // if a setTimeout is triggered during preview, it needs to be cleaned up
            if ($(args.element).hasClass("preview-container")) {
                this.killAllTimeouts();
            }

            this.model.startView = Router.currentRoute.view;

            ConfigDelegate.readEntity("metrics").then(function (metrics) {
                if (metrics.enabled) {
                    MetricsDelegate.getDropwizardMetrics().then(function (data) {
                        if (data.result && data.result.length) {
                            _this.data.formattedMetricsData = _.sortBy(_this.formatMetricsForGrid(data.result), function (elem) {
                                return elem.id;
                            });
                            _this.model.collection = new backbone.Collection(_this.data.formattedMetricsData);
                        }

                        _this.parentRender(function () {
                            if (_this.model.collection) {
                                _this.removeAllSeriesFromGraph();
                                _this.startPollingMetrics();
                                _this.renderMetricsTable(_this.model.collection);
                                _this.$el.find("#metricsGraph").hide();
                            }

                            if (callback) {
                                callback(_this);
                            }
                        });
                    });
                } else {
                    _this.parentRender(function () {
                        if (callback) {
                            callback(_this);
                        }
                    });
                }
            });
        },

        killAllTimeouts: function killAllTimeouts(e) {
            if (e) {
                e.preventDefault();
            }

            // if defined, remove singular timer
            if (this.model.timer) {
                clearTimeout(this.model.timer);
                // make sure orphaned setTimeouts are removed
            } else {
                // generate id greater than orphaned timeout call
                var id = setTimeout(null, 0);
                // killing all timeouts leaves success alert hung
                setTimeout(function () {
                    $("div[role='alert']").remove();
                }, 5000);

                // clear all timeouts
                while (id--) {
                    clearTimeout(id);
                }
            }
        },

        formatMetricsForGrid: function formatMetricsForGrid(data) {
            var _this2 = this;

            return _.map(data, function (value) {
                return {
                    "id": value._id,
                    "action": _.last(value._id.split(".")),
                    "path": value._id.substring(0, value._id.lastIndexOf(".")),
                    "count": value.count,
                    "min": _this2.twoDecimalPlaces(value.min),
                    "max": _this2.twoDecimalPlaces(value.max),
                    "mean": _this2.twoDecimalPlaces(value.mean),
                    "stddev": _this2.twoDecimalPlaces(value.stddev)
                };
            });
        },

        twoDecimalPlaces: function twoDecimalPlaces(num) {
            var ONEHUNDRED = 100;

            return Math.round(num * ONEHUNDRED) / ONEHUNDRED;
        },

        initializeGraph: function initializeGraph() {
            var series;

            var MARGINLEFT = 70,
                MARGINTOP = 30,
                MARGINRIGHT = 150,
                MARGINBOTTOM = 35,
                LEGENDX = 800,
                LEGENDY = 20,
                LEGENDWIDTH = 60,
                LEGENDHEIGHT = 300;

            this.model.line = dimple.newSvg("#metricsGraph", this.model.canvasWidth, this.model.canvasHeight);
            this.model.metricsChart = new dimple.chart(this.model.line, []);
            this.model.metricsChart.setBounds(this.model.lineChartX, this.model.lineChartY, this.model.chartWidth, this.model.chartHeight);
            this.model.metricsChart.addCategoryAxis("x", "time");
            this.model.metricsChart.addMeasureAxis("y", "count");
            this.model.metricsChart.setMargins(MARGINLEFT, MARGINTOP, MARGINRIGHT, MARGINBOTTOM);

            series = this.model.metricsChart.addSeries("path", dimple.plot.line);
            series.stacked = true;
            series.addOrderRule("count");

            this.model.metricsChart.addLegend(LEGENDX, LEGENDY, LEGENDWIDTH, LEGENDHEIGHT, "left", series);
        },

        startPollingMetrics: function startPollingMetrics() {
            var _this3 = this;

            var ONETHOUSAND = 1000;

            MetricsDelegate.getDropwizardMetrics().then(function (data) {
                if (!_this3.model.initializedStructure) {
                    _this3.data.rows = {};
                    _this3.model.initializedStructure = true;

                    _.forEach(data.result, function (value) {
                        _this3.data.rows[value._id] = [{
                            "id": value._id,
                            "action": _.last(value._id.split(".")),
                            "path": value._id.substring(0, value._id.lastIndexOf(".")),
                            "count": 0,
                            "min": 0,
                            "max": 0,
                            "mean": 0,
                            "stddev": 0,
                            "time": 0
                        }];
                    });
                }

                _this3.model.seconds += _this3.model.pollingInterval / ONETHOUSAND;
                _this3.storeMetricsForGraph(data.result);

                if (_this3.model.metricsChartVisible) {
                    _this3.updateGraph();
                }

                _this3.data.formattedMetricsData = _.sortBy(_this3.formatMetricsForGrid(data.result), function (elem) {
                    return elem.id;
                });

                _this3.model.collection.set(_this3.data.formattedMetricsData);
                _this3.filterPaths();

                _.forEach(_this3.model.buttonState, function (button) {
                    var path = button.split(":")[0],
                        action = button.split(":")[1],
                        cell = $($("td:contains(" + path + action + ")").closest("tr").find(".btn")[0]);

                    cell.removeClass("btn-primary add-series").addClass("btn-danger remove-series");
                    cell.text($.t("dashboard.metricsWidget.removeFromGraph"));
                });

                _this3.model.timer = setTimeout(_this3.startPollingMetrics.bind(_this3), _this3.model.pollingInterval);

                // end setTimeout if navigating away from widget
                if (Router.currentRoute.view !== _this3.model.startView) {
                    clearTimeout(_this3.model.timer);
                    _this3.removeAllSeriesFromGraph();
                }
            });
        },

        storeMetricsForGraph: function storeMetricsForGraph(data) {
            var _this4 = this;

            _.forEach(data, function (value) {
                if (value && _this4.data.rows[value._id]) {
                    _this4.data.rows[value._id].push({
                        "id": value._id,
                        "action": _.last(value._id.split(".")),
                        "path": value._id.substring(0, value._id.lastIndexOf(".")),
                        "count": value.count,
                        "min": _this4.twoDecimalPlaces(value.min),
                        "max": _this4.twoDecimalPlaces(value.max),
                        "mean": _this4.twoDecimalPlaces(value.mean),
                        "stddev": _this4.twoDecimalPlaces(value.stddev),
                        "time": _this4.model.seconds
                    });
                }
            });
        },

        updateGraph: function updateGraph() {
            var _this5 = this;

            var keys = _.uniq(_.map(this.model.metricsChart.data, function (datum) {
                return datum.id;
            }));

            this.model.metricsChart.data = _.flatten(_.map(keys, function (key) {
                return _.flatten(_this5.data.rows[key]);
            }));

            this.model.metricsChart.draw(this.model.drawTime);
        },

        renderMetricsTable: function renderMetricsTable(collection) {
            this.model.metricsGrid = new backgrid.Grid({
                className: "table backgrid table-hover",
                columns: BackgridUtils.addSmallScreenCell([{
                    name: "path",
                    label: $.t("dashboard.metricsWidget.path"),
                    cell: backgrid.Cell.extend({
                        render: function render() {
                            var cell = '<div style="overflow:scroll;">' + this.model.attributes.path + '</div>';

                            this.$el.html(cell);
                            return this;
                        }
                    }),
                    sortable: false,
                    editable: false
                }, {
                    name: "action",
                    label: $.t("dashboard.metricsWidget.action"),
                    cell: "string",
                    sortable: false,
                    editable: false
                }, {
                    name: "count",
                    label: $.t("dashboard.metricsWidget.count"),
                    cell: "string",
                    sortable: false,
                    editable: false
                }, {
                    name: "min",
                    label: $.t("dashboard.metricsWidget.min"),
                    cell: "string",
                    sortable: false,
                    editable: false
                }, {
                    name: "max",
                    label: $.t("dashboard.metricsWidget.max"),
                    cell: "string",
                    sortable: false,
                    editable: false
                }, {
                    name: "mean",
                    label: $.t("dashboard.metricsWidget.mean"),
                    cell: "string",
                    sortable: false,
                    editable: false
                }, {
                    name: "stddev",
                    label: $.t("dashboard.metricsWidget.stddev"),
                    cell: "string",
                    sortable: false,
                    editable: false
                }, {
                    name: "",
                    cell: backgrid.Cell.extend({
                        render: function render() {
                            var button = '<button type="button" class="add-series pull-right btn btn-primary btn-sm">' + $.t("dashboard.metricsWidget.addToGraph") + '</button>';

                            this.$el.html(button);
                            return this;
                        }
                    }),
                    sortable: false,
                    editable: false
                }], true),
                collection: collection
            });

            this.$el.find("#metricsTable").append('<div class="col-sm-3"><input id="pathFilter" class="form-control input-sm" type="search" placeholder="Filter paths..." name="path"></div>');
            this.$el.find("#metricsTable").append(this.model.metricsGrid.render().el);
        },

        filterPaths: function filterPaths(e) {
            if (e) {
                e.preventDefault();
            }

            var input, filter, table, trs, td;

            var NEGATIVEONE = -1;

            input = this.$el.find("#pathFilter").val();
            filter = input.toUpperCase();
            table = this.$el.find("#metricsTable .table");
            trs = table.find("tr");

            // Loop through all table rows, and hide those who don't match the search query
            _.forEach(trs, function (tr) {
                td = tr.getElementsByTagName("td")[0];

                if (td) {
                    if (td.innerHTML.toUpperCase().indexOf(filter) > NEGATIVEONE) {
                        tr.style.display = "";
                    } else {
                        tr.style.display = "none";
                    }
                }
            });
        },

        getKey: function getKey(e) {
            var $row = $(e.target).closest("tr"),
                key = $row.find("td:nth-child(1)").text() + "." + $row.find("td:nth-child(2)").text();

            return key;
        },

        addSeriesToGraph: function addSeriesToGraph(e) {
            if (e) {
                e.preventDefault();
            }
            var key = this.getKey(e),
                path,
                action;

            // if the chart isn't visible and the preview instance isn't visible
            if (!this.model.metricsChartVisible && !$("#metricsGraph:visible").length) {
                this.$el.find("#metricsGraph").show();
                this.initializeGraph();
                this.model.metricsChartVisible = true;
                this.model.metricsChart.data = this.data.rows[key];
            } else {
                this.model.metricsChart.data = this.model.metricsChart.data.concat(this.data.rows[key]);
            }

            this.updateGraph();

            $(e.target).removeClass("btn-primary add-series").addClass("btn-danger remove-series");
            $(e.target).text($.t("dashboard.metricsWidget.removeFromGraph"));

            path = $(e.target).closest('tr').find('td:first').text();
            action = $(e.target).closest('tr').find('td:nth-child(2)').text();

            this.model.buttonState.push(path + ":" + action);
        },

        removeSeriesFromGraph: function removeSeriesFromGraph(e) {
            if (e) {
                e.preventDefault();
            }

            var key = this.getKey(e);

            if (this.model.metricsChart && this.model.metricsChart.data) {
                this.model.metricsChart.data = _.filter(this.model.metricsChart.data, function (datum) {
                    return datum.id !== key;
                });
            }

            $(e.target).removeClass("btn-danger remove-series").addClass("btn-primary add-series");
            $(e.target).text($.t("dashboard.metricsWidget.addToGraph"));

            this.model.buttonState = _.filter(this.model.buttonState, function (button) {
                return key !== button.split(":").join(".");
            });

            if (this.model.metricsChart.data && this.model.metricsChart.data.length) {
                this.model.metricsChart.draw(this.model.drawTime);
            } else {
                this.model.metricsChartVisible = false;
                this.$el.find("#metricsGraph").hide().empty();
            }
        },

        removeAllSeriesFromGraph: function removeAllSeriesFromGraph(e) {
            if (e) {
                e.preventDefault();
            }

            if (this.model.metricsChart) {
                this.model.metricsChart.data = [];
            }

            this.model.metricsChartVisible = false;
            this.$el.find("#metricsGraph").hide().empty();

            _.forEach(this.$el.find(".remove-series"), function (button) {
                $(button).removeClass("btn-danger remove-series").addClass("btn-primary add-series");
                $(button).text($.t("dashboard.metricsWidget.addToGraph"));
            });

            this.model.buttonState = [];
        },

        resize: function resize() {
            if (this.model.metricsChart) {
                this.model.metricsChart.draw(0, true);
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
