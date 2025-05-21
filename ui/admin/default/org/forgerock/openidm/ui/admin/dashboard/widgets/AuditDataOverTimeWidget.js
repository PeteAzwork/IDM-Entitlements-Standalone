"use strict";

/*
 * Copyright 2017-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "handlebars", "bootstrap", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "org/forgerock/openidm/ui/common/dashboard/widgets/AbstractWidget", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/openidm/ui/admin/delegates/AuditDelegate", "org/forgerock/openidm/ui/common/util/QueryFilterEditor", "org/forgerock/openidm/ui/admin/util/SpinnerUtil", "org/forgerock/openidm/ui/admin/dashboard/widgets/util/TimezoneUtil", "org/forgerock/openidm/ui/admin/mapping/util/ReconFailures/ReconFailuresGridView", "selectize", "moment", "calHeatmap"], function ($, _, Handlebars, Bootstrap, BootstrapDialogUtils, AbstractWidget, ValidatorsManager, AuditDelegate, QueryFilterEditor, SpinnerUtil, TimezoneUtil, ReconFailuresGridView, Selectize, moment, CalHeatMap) {

    var widgetInstance = {},
        Widget = AbstractWidget.extend({
        template: "templates/admin/dashboard/widgets/AuditDataOverTimeWidgetTemplate.html",
        model: {
            "overrideTemplate": "dashboard/widget/_auditConfig",
            "constants": {
                "DEFAULT_EVENT_TOPIC": "authentication",
                "GRANULARITY_SETTINGS": {
                    "week": {
                        titleFormatStart: "MMM Do",
                        titleFormatEnd: "MMM Do, YYYY",
                        width: "540px",
                        aggregate: "hour",
                        calSettings: {
                            domain: 'day',
                            subDomain: "hour",
                            cellSize: 16,
                            domainGutter: 8,
                            colLimit: 24,
                            domainLabelFormat: function domainLabelFormat(date) {
                                return moment(date).format("ddd, MMM Do");
                            },
                            verticalOrientation: true,
                            label: {
                                position: "left"
                            },
                            range: 7
                        }
                    },
                    "month": {
                        titleFormatStart: "MMMM YYYY",
                        width: "310px",
                        aggregate: "day",
                        calSettings: {
                            domain: 'month',
                            subDomain: "x_day",
                            cellSize: 40,
                            domainLabelFormat: "",
                            domainGutter: 20,
                            subDomainTextFormat: "%e",
                            cellPadding: 5,
                            range: 1
                        }
                    },
                    "year": {
                        titleFormatStart: "YYYY",
                        width: "336px",
                        aggregate: "month",
                        calSettings: {
                            domain: 'year',
                            subDomain: 'x_month',
                            cellSize: 80,
                            subDomainTextFormat: "%B",
                            rowLimit: 4,
                            domainLabelFormat: "",
                            domainGutter: 20,
                            cellPadding: 5,
                            range: 1
                        }
                    }
                }
            },
            viewGranularity: "month"
        },

        customSettingsSave: function customSettingsSave(dialogRef, widget) {
            var displayType = dialogRef.$modalBody.find("#filterSelection").val(),
                title = dialogRef.$modalBody.find("#title").val();

            delete widget.topic;
            delete widget.queryFilter;
            delete widget.filter;
            delete widget.timezone;
            delete widget.title;
            delete widget.minRange;
            delete widget.maxRange;
            widget.legendRange = {};

            if (displayType === "queryFilter") {
                widget.topic = dialogRef.$modalBody.find(".auditEvent").val();
                widget.queryFilter = this.model.queryFilterEditor.getFilterString();
            } else if (displayType === "presetFilter") {
                widget.topic = dialogRef.$modalBody.find(".auditEvent").val();
                widget.filter = this.model.presetFilterSelects[widget.topic].val();
            } else if (displayType === "interactiveFilter") {
                widget.topic = dialogRef.$modalBody.find(".auditEvent").val();
            }

            widget.timezone = TimezoneUtil.getTimezoneOffset(dialogRef);

            if (title.length > 0) {
                widget.title = title;
            }

            _.forEach(dialogRef.$modalBody.find("input.auditRangeSelect"), function (range) {
                widget.legendRange[$(range).attr("data-granularity")] = _.map($(range).val().split(","), function (item) {
                    return parseInt(item, 10);
                });
            });

            widget.minRange = dialogRef.$modalBody.find(".min-color .color").val();
            widget.maxRange = dialogRef.$modalBody.find(".max-color .color").val();

            return widget;
        },

        customSettingsLoad: function customSettingsLoad(dialogRef) {
            var widgetChanges = _.clone(this.data.widget),
                self = this,
                changeFunctions,
                topicSelectize = null;

            TimezoneUtil.setupOffsetInputs(dialogRef, this.data.widget);

            self.model.presetFilterSelects = {};

            function setFilter() {
                self.model.presetFilterSelects[dialogRef.$modalBody.find(".auditEvent").val()].next().show();

                if (_.has(widgetChanges, "filter")) {
                    self.model.presetFilterSelects[dialogRef.$modalBody.find(".auditEvent").val()][0].selectize.setValue(widgetChanges.filter);
                }
            }

            function setTopic() {
                dialogRef.$modalBody.find(".sub-filter").hide();

                if (_.isNull(topicSelectize)) {
                    topicSelectize = dialogRef.$modalBody.find(".auditEvent").selectize({ placeholder: "Select a Value" });
                }

                if (_.has(widgetChanges, "topic")) {
                    topicSelectize[0].selectize.setValue(widgetChanges.topic);
                }
            }

            function initRangeSelectize() {
                var select = dialogRef.$modalBody.find("input.auditRangeSelect");

                select.selectize({
                    delimiter: ',',
                    persist: false,
                    onChange: function onChange() {
                        var range = select.val().split(","),
                            sortedRange = _.sortBy(range, function (val) {
                            return parseInt(val, 10);
                        });

                        if (!_.isEqual(range, sortedRange)) {
                            this.setValue(sortedRange);
                        }
                    },
                    create: true,
                    maxItems: null,
                    createFilter: function createFilter(e) {
                        var isNum = $.isNumeric(parseInt(e, 10)),
                            isUnique = !_.includes(select.val().split(","), e);

                        return isNum && isUnique;
                    }
                });
            }

            changeFunctions = {
                "interactive": function interactive() {
                    dialogRef.$modalBody.find(".filter-sub-selection").hide();
                    dialogRef.$modalBody.find(".sub-filter").hide();
                },
                "interactiveFilter": function interactiveFilter() {
                    dialogRef.$modalBody.find("#eventTopicsContainer").show();
                    dialogRef.$modalBody.find("#eventPresetFiltersContainer").hide();
                    dialogRef.$modalBody.find("#eventQueryFilterContainer").hide();

                    setTopic();
                },
                "presetFilter": function presetFilter() {
                    dialogRef.$modalBody.find("#eventTopicsContainer").show();
                    dialogRef.$modalBody.find("#eventPresetFiltersContainer").show();
                    dialogRef.$modalBody.find("#eventQueryFilterContainer").hide();

                    setTopic();
                    setFilter();
                },
                "queryFilter": function queryFilter() {
                    dialogRef.$modalBody.find("#eventTopicsContainer").show();
                    dialogRef.$modalBody.find("#eventQueryFilterContainer").show();
                    dialogRef.$modalBody.find("#eventPresetFiltersContainer").hide();
                    setTopic();
                }
            };

            // Setup preset filter selects
            _.forEach(dialogRef.$modalBody.find("#eventPresetFiltersContainer .sub-filter"), function (select) {
                self.model.presetFilterSelects[$(select).attr("data-audit-event")] = $(select).selectize({ placeholder: "Select a Value" });
            });

            // Setup query filter widget
            this.model.queryFilterEditor = new QueryFilterEditor();
            this.model.queryFilterEditor.render({
                element: "#eventQueryFilter",
                data: {
                    config: {
                        ops: ["and", "or", "not", "expr"],
                        tags: ["pr", "equalityMatch", "approxMatch", "co", "greaterOrEqual", "gt", "lessOrEqual", "lt"]
                    },
                    showSubmitButton: false
                },
                queryFilter: widgetChanges.queryFilter || ""
            });

            // Setup change event for color groups
            dialogRef.$modalBody.find(".hex, .color").bind("change", function (e) {
                var changeInput = $(e.currentTarget),
                    curVal = changeInput.val(),
                    siblingInput;

                if (changeInput.hasClass("hex")) {
                    var isHexColor = void 0;

                    siblingInput = changeInput.closest(".color-group").find(".color");

                    //test if real color
                    isHexColor = /^#[0-9A-F]{6}$/i.test(curVal);

                    // Set the color input if the color is valid
                    if (isHexColor) {
                        if (siblingInput.val() !== curVal) {
                            siblingInput.val(curVal);
                        }
                        // Revert the input if provided a bad value
                    } else if (siblingInput.val() !== curVal) {
                        changeInput.val(siblingInput.val());
                    }
                } else if (changeInput.hasClass("color")) {
                    siblingInput = changeInput.closest(".color-group").find(".hex");
                    if (siblingInput.val() !== curVal) {
                        siblingInput.val(curVal);
                    }
                }
            });

            // Setup change event for filter selection
            dialogRef.$modalBody.find("#filterSelection").bind("change", function (e) {
                changeFunctions[$(e.currentTarget).val()]();
            });

            // Setup change event for topic selection
            dialogRef.$modalBody.find(".auditEvent").bind("change", function (e) {
                dialogRef.$modalBody.find(".sub-filter").hide();
                widgetChanges.topic = $(e.currentTarget).val();

                if (widgetChanges.topic !== self.data.widget.topic) {
                    widgetChanges.filter = "";
                }

                setFilter();
            });

            // Setup filter selection
            var filterSelection = dialogRef.$modalBody.find("#filterSelection").selectize({ placeholder: "Select a Value" });
            filterSelection[0].selectize.setValue(this.getFilterType(this.data.widget));
            initRangeSelectize([]);
        },

        getFilterType: function getFilterType(widget) {
            // These strings correspond to the value of the display settings options in the settings window
            var filter = "interactive";

            if (_.has(widget, "queryFilter")) {
                filter = "queryFilter";
            } else if (_.has(widget, "filter")) {
                filter = "presetFilter";
            } else if (_.has(widget, "topic")) {
                filter = "interactiveFilter";
            }

            return filter;
        },

        widgetRender: function widgetRender(args, callback) {
            this.data = _.cloneDeep(args);
            var filter = this.getFilterType(this.data.widget);

            this.data.toolbar = true;
            this.data.topic = true;
            this.data.filter = true;

            if (filter === "queryFilter" || filter === "presetFilter") {
                this.data.topic = false;
                this.data.filter = false;
                this.data.toolbar = false;
            } else if (filter === "interactiveFilter") {
                this.data.topic = false;
            }

            this.partials.push("partials/dashboard/widget/_auditConfig.html", "partials/dashboard/widget/_filters.html", "partials/dashboard/widget/_NodeDetails.html", "partials/dashboard/widget/_timezoneGroup.html", "partials/dashboard/widget/_auditTopics.html");

            this.events = _.assignIn(this.events, {
                "change .auditEvent": "showSubFilter",
                "change .sub-filter": "renderGraph",
                "click .prevView": "prevView",
                "click .today": "today",
                "click .nextView": "nextView",
                "click .viewSelector": "changeViewGranularityEvent"
            });

            this.parentRender(_.bind(function () {
                var title = this.data.title;
                if (_.has(this.data.widget, "title")) {
                    title = this.data.widget.title;
                }

                this.$el.parent().find(".widget-section-title .widget-title").text(title);

                this.model.viewOffset = 0;

                this.initCal();

                if (callback) {
                    this.model.callback = callback;
                }
            }, this));
        },

        initCal: function initCal() {
            var _this = this;

            if (this.model.cal) {
                this.model.cal = this.model.cal.destroy();
                this.$el.find(".ch-tooltip").remove();
            }

            this.model.cal = new CalHeatMap();

            var granularitySettings = this.getGranularitySetting();

            this.model.cal.init(_.assignIn({
                itemSelector: this.$el.find(".cal-heatmap")[0],
                tooltip: true,
                itemName: [$.t("dashboard.auditData.event"), $.t("dashboard.auditData.events")],
                displayLegend: true,
                data: {},
                legendColors: {
                    min: this.data.widget.minRange,
                    max: this.data.widget.maxRange,
                    base: "#eee"
                },
                legendVerticalPosition: "top",
                animationDuration: 0,
                onClick: function onClick(date, nb) {
                    var scope = _this.$el.find(".audit-nav-btns .pull-right .btn-primary").attr("data-granularity"),
                        now = moment(),
                        clickedDate = moment(date);

                    clickedDate.subtract(TimezoneUtil.getOffsetMinutes(_this.data.widget.timezone), "minutes");
                    clickedDate.subtract(now.zone(), "minutes");

                    // if date is in the future return;
                    if (now.diff(clickedDate, "hours", true) < 0) {
                        return;
                    }

                    // The popover elements are root level and are not contained in this.$el scope
                    $(".popover").popover("hide");

                    // IF CLICK ON WEEK VIEW SHOW DETAILS
                    if (scope === "week") {

                        var tooltipParts = _this.$el.find(".ch-tooltip").text().split("h, "),
                            _date = moment(_.last(tooltipParts)).set("hour", _.last(tooltipParts[0].split(" "))),
                            queryDate = moment(_date),
                            dateRange = void 0;

                        queryDate.subtract(TimezoneUtil.getOffsetMinutes(_this.data.widget.timezone), "minutes");
                        queryDate.subtract(_date.zone(), "minutes");
                        dateRange = "timestamp+gt+\"" + queryDate.toISOString() + "\"+and+timestamp+lt+\"" + queryDate.endOf("hour").toISOString() + "\"" + _this.getFilter();

                        AuditDelegate.getAuditData(_this.getAuditEvent(), dateRange).then(function (data) {
                            var content = void 0,
                                prettyData = _.map(data.result, function (result) {
                                return JSON.stringify(result, null, 2).trim();
                            }),
                                startHour = _date.startOf("hour").format("HH:mm:ss"),
                                endHour = moment(_date).add(1, "hour").format("HH:mm:ss"),
                                title = $.t("dashboard.auditData.nodeDetailsTitle", {
                                event: _.capitalize(_this.getAuditEvent()),
                                startHour: startHour,
                                endHour: endHour,
                                offset: TimezoneUtil.getOffsetString(_this.data.widget.timezone, true),
                                date: _date.format("MMMM Do YYYY"),
                                count: nb || 0
                            });

                            if (_this.getAuditEvent() === "recon" && _this.getFilter().match(/status.*"FAILURE"/)) {
                                var args = {
                                    element: $("<div>", { id: "reconFailuresGridContainer" }),
                                    entries: data.result
                                };

                                ReconFailuresGridView.render(args, function () {
                                    _this.showDialog(title, ReconFailuresGridView.el);
                                });
                            } else {
                                content = $(Handlebars.compile("{{> dashboard/widget/_NodeDetails}}")({ "entries": prettyData }));
                                _this.showDialog(title, content);
                            }
                        });

                        // IF CLICK WHILE IN MONTH VIEW, OPEN THE FIRST WEEK OF THAT MONTH
                    } else if (scope === "month") {
                        _this.changeViewGranularity(_this.$el.find(".audit-nav-btns .pull-right .btn[data-granularity='week']"), date);

                        // IF CLICK WHILE IN YEAR VIEW, OPEN THAT MONTH
                    } else if (scope === "year") {
                        _this.changeViewGranularity(_this.$el.find(".audit-nav-btns .pull-right .btn[data-granularity='month']"), date);
                    }
                }
            }, granularitySettings));

            this.$el.find(".audit-cal-heatmap-container").width(this.model.constants.GRANULARITY_SETTINGS[this.model.viewGranularity].width);
            this.showSubFilter();
        },

        showDialog: function showDialog(title, content) {
            BootstrapDialogUtils.createModal({
                title: title,
                message: content,
                buttons: ["close"]
            }).open();
        },

        getGranularitySetting: function getGranularitySetting() {
            var additionalSetting = {
                "legend": this.data.widget.legendRange[this.model.viewGranularity],
                "start": moment().subtract(this.model.viewOffset, this.model.viewGranularity).startOf(this.model.viewGranularity).toDate()
            };

            return _.assignIn(additionalSetting, this.model.constants.GRANULARITY_SETTINGS[this.model.viewGranularity].calSettings);
        },

        prevView: function prevView(e) {
            e.preventDefault();
            this.model.viewOffset++;
            this.initCal();

            this.$el.find(".today").toggleClass("disabled", this.model.viewOffset === 0);
            this.$el.find(".nextView").toggleClass("disabled", this.model.viewOffset === 0);
        },

        today: function today(e) {
            e.preventDefault();
            if ($(e.currentTarget).hasClass("disabled")) {
                return false;
            }

            this.model.viewOffset = 0;
            this.initCal();
            this.$el.find(".today").toggleClass("disabled", true);
            this.$el.find(".nextView").toggleClass("disabled", true);
        },

        nextView: function nextView(e) {
            e.preventDefault();

            if (this.model.viewOffset <= 0 || $(e.currentTarget).hasClass("disabled")) {
                this.model.viewOffset = 0;
                this.$el.find(".nextView").toggleClass("disabled", true);
                this.$el.find(".today").toggleClass("disabled", true);
                return false;
            }

            this.model.viewOffset--;
            this.initCal();
            this.$el.find(".today").toggleClass("disabled", this.model.viewOffset === 0);
            this.$el.find(".nextView").toggleClass("disabled", this.model.viewOffset === 0);
        },

        getAuditEvent: function getAuditEvent() {
            var eventTopic = this.model.constants.DEFAULT_EVENT_TOPIC;

            if (this.$el.find(".auditEvent").length) {
                eventTopic = this.$el.find(".auditEvent").val();
            } else if (_.has(this.data.widget, "topic")) {
                eventTopic = this.data.widget.topic;
            }

            return eventTopic;
        },

        showSubFilter: function showSubFilter() {
            var filter = this.getFilterType(this.data.widget),
                event = this.getAuditEvent();

            this.$el.find(".event-type").text(event);

            if (filter === "interactive" || filter === "interactiveFilter") {
                this.$el.find(".sub-filter").hide();
                this.$el.find(".sub-filter[data-audit-event='" + event + "']").show();
            }
            this.renderGraph();
        },

        getFilter: function getFilter() {
            var dataFilter = "",
                auditEvent = this.getAuditEvent();

            if (_.has(this.data.widget, "filter")) {
                if (this.data.widget.filter === "ALL") {
                    dataFilter = "";
                } else {
                    var operator = this.$el.find("[data-audit-event='" + this.data.widget.topic + "']").find("[value='" + this.data.widget.filter + "']").attr("data-filter");
                    dataFilter = "+and+" + operator + "+eq+\"" + this.data.widget.filter + "\"";

                    if (operator === "status") {
                        dataFilter = "+and+" + operator + "+pr" + dataFilter;
                    }
                }
            } else if (_.has(this.data.widget, "queryFilter")) {
                dataFilter = "+and+" + this.data.widget.queryFilter;
            } else {
                var filterValue = this.$el.find("[data-audit-event='" + auditEvent + "']").val();
                if (filterValue === "ALL") {
                    dataFilter = "";
                } else {
                    var _operator = this.$el.find("[data-audit-event='" + auditEvent + "']").find(":selected").attr("data-filter");
                    dataFilter = "+and+" + _operator + "+eq+\"" + filterValue + "\"";

                    if (_operator === "status") {
                        dataFilter = "+and+" + _operator + "+pr" + dataFilter;
                    }
                }
            }

            return dataFilter;
        },

        renderGraph: function renderGraph(e) {
            var _this2 = this;

            if (e) {
                e.preventDefault();
            }

            var currentView,
                days = {},
                counts = [],
                unixTimestamps = [],
                auditEvent = this.getAuditEvent(),
                start,
                end,
                subFilter = this.getFilter(),
                offset,
                widget = this.data.widget,
                offsetminutes,
                title,
                aggregate = this.model.constants.GRANULARITY_SETTINGS[this.model.viewGranularity].aggregate,
                aggregateFields;

            // Set Timezone object if none
            if (!_.has(widget, "timezone")) {
                widget.timezone = TimezoneUtil.getLocalOffset();
            }

            offset = TimezoneUtil.getOffsetString(widget.timezone);

            offsetminutes = TimezoneUtil.getOffsetMinutes(widget.timezone);

            // Get the moment object for the current date viewed in the calendar, account for offset
            currentView = moment().zone(offset).subtract(this.model.viewOffset, this.model.viewGranularity);

            // Determine the start and end dates for the query
            start = currentView.startOf(this.model.viewGranularity).toISOString();
            end = currentView.endOf(this.model.viewGranularity).toISOString();

            // Set the title of the calendar to the current viewed date range
            title = moment(start).zone(0).format(this.model.constants.GRANULARITY_SETTINGS[this.model.viewGranularity].titleFormatStart);
            if (_.has(this.model.constants.GRANULARITY_SETTINGS[this.model.viewGranularity], "titleFormatEnd")) {
                title += " - " + moment(end).format(this.model.constants.GRANULARITY_SETTINGS[this.model.viewGranularity].titleFormatEnd);
            }

            this.$el.find(".viewed-dates").html(title);

            aggregateFields = "TIMESTAMP=/timestamp;scale:" + aggregate + ";utcOffset:" + offset;

            SpinnerUtil.showSpinner(this.$el);
            AuditDelegate.getAuditReport(auditEvent, start, end, subFilter, aggregateFields).then(function (data) {
                counts = _.map(data.result, function (agg) {
                    return agg.count;
                });

                unixTimestamps = _.map(data.result, function (agg) {
                    return TimezoneUtil.adjustUnixTimestamp(agg.timestamp.epochSeconds, offsetminutes);
                });

                days = _.zipObject(unixTimestamps, counts);

                _this2.$el.find(".result-count").html(_.sum(counts));

                _this2.model.cal.update(days);

                _this2.showPopovers();
                SpinnerUtil.hideSpinner(_this2.$el);

                if (_this2.model.callback) {
                    _this2.model.callback(_this2);
                }
            });
        },

        showPopovers: function showPopovers() {
            var _this3 = this;

            // Place tooltip content in attribute
            $("rect").on("mouseover", function (event) {
                $(event.currentTarget).attr("data-content", _this3.$el.find(".ch-tooltip").text());
            });

            // Legend tooltips render on init and don't require a mouseover
            _.forEach(this.$el.find(".graph-legend rect"), function (el) {
                var title = $(el).find("title").text();
                $(el).find("title").remove();
                $(el).attr("data-content", title);
            });

            $(".cal-heatmap rect").popover({
                placement: 'top',
                container: 'body',
                html: 'true'
            });
        },

        changeViewGranularityEvent: function changeViewGranularityEvent(e) {
            var offsetMinutes = TimezoneUtil.getOffsetMinutes(this.data.widget.timezone),
                date = moment().zone(offsetMinutes).subtract(this.model.viewOffset, this.model.viewGranularity).startOf(this.model.viewGranularity);

            this.changeViewGranularity(e.currentTarget, date);
        },

        /**
         * Given a but and a date this function will "select" that button and set the
         * view scope so that the given date is visible upon the re init of the cal.
         * @param button {el} a button with a "data-granularity" attribute on it
         * @param date {date} the date to scope the view to
         */
        changeViewGranularity: function changeViewGranularity(button, date) {
            var scopedDate,
                now = moment();

            this.$el.find(".viewSelector").removeClass("btn-primary");
            $(button).removeClass("btn-secondary");
            if (!$(button).hasClass("btn-primary")) {
                $(button).addClass("btn-primary");
            }

            this.model.viewGranularity = $(button).attr("data-granularity");
            scopedDate = moment(date).startOf(this.model.viewGranularity).toString();
            this.model.viewOffset = now.subtract(now.zone(), "minutes").diff(scopedDate, this.model.viewGranularity);

            this.initCal();
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
