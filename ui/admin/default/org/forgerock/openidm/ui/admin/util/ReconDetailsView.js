"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/*
 * Copyright 2014-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/openidm/ui/admin/delegates/ReconDelegate", "org/forgerock/openidm/ui/common/util/PolicyValidatorsManager", "org/forgerock/openidm/ui/admin/mapping/util/ReconFailures/ReconFailuresGridView", "moment", "handlebars", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils"], function ($, _, AbstractView, ReconDelegate, PolicyValidatorsManager, ReconFailuresGridView, moment, handlebars, BootstrapDialogUtils) {
    handlebars.registerHelper('millisecondsToTimeDisplay', function (t) {
        return moment.utc(t).format("HH:mm:ss:SSS");
    });

    var ReconDetailsView = AbstractView.extend({
        template: "templates/admin/util/ReconDetailsTemplate.html",
        element: "#syncStatusDetails",
        noBaseTemplate: true,
        events: {
            "click .toggle-data": "toggleData",
            "click .show-recon-results": "toggleShowReconResults",
            "click .view-failure-details": "failureDetailDialog",
            "click .summary-toggle": "toggleCurrentSummaryTab"
        },

        render: function render(syncDetails, persistAssociations, callback) {
            var _this = this;

            this.data.persistAssociations = !!persistAssociations;
            this.data.syncDetails = syncDetails;

            if (syncDetails) {
                if (_.isEmpty(syncDetails.sourceProcessedByNode)) {
                    this.data.syncDetails.sourceProcessedByNode = false;
                }

                this.data.situationDetails = this.getSituationRowData(syncDetails.situationSummary);
                this.data.showReconSummaryTabMenu = false;

                if (syncDetails.statusSummary.FAILURE > 0) {
                    this.renderTemplate(function () {
                        ReconDelegate.getReconAssoc(syncDetails._id).then(function (auditReportData) {
                            _this.data.showReconFailureMessage = false;
                            _this.data.reconFailuresAuditReportResults = _this.formatReconFailuresAuditReportData(auditReportData);
                            _this.data.showReconSummaryTabMenu = !_.isEmpty(_this.data.reconFailuresAuditReportResults);
                            _this.renderTemplate(callback);
                        }, function () {
                            _this.data.showReconFailureMessage = !_this.data.persistAssociations;
                            _this.data.showReconSummaryTabMenu = false;
                            _this.data.currentSummaryTab = null;
                            _this.renderTemplate(callback);
                        });
                    });
                } else {
                    this.data.currentSummaryTab = null;
                    this.renderTemplate(callback);
                }
            } else {
                this.renderTemplate(callback);
            }
        },

        renderTemplate: function renderTemplate(callback) {
            this.parentRender(_.bind(function () {
                if (this.data.showReconResults && this.data.currentSummaryTab) {
                    this.$el.find("a[href=\"#" + this.data.currentSummaryTab + "\"]").tab("show");
                }

                this.$el.find(".fa-info-circle").popover({
                    content: function content() {
                        return $(this).attr("data-title");
                    },
                    container: 'body',
                    placement: 'top',
                    html: 'true',
                    title: ''
                });

                if (callback) {
                    callback();
                }
            }, this));
        },

        toggleData: function toggleData(e) {
            var elementId = $(e.target).closest(".toggle-data").attr("id"),
                //either "showReconResults", "showDuration"
            listElement = this.$el.find("#" + elementId);

            if (this.data[elementId]) {
                listElement.addClass("hover");
            } else {
                listElement.removeClass("hover");
            }

            this.data[elementId] = !this.data[elementId];

            this.render(this.data.syncDetails);
        },

        /**
         * Keeps the state of recon results panel accross re-renders of the view.
         * @param  {DomEvent} event user click on the panel header to open/close the panel
         */
        toggleShowReconResults: function toggleShowReconResults() {
            this.data.showReconResults = !this.data.showReconResults;
        },

        /**
         * Keeps the state of summary tab panel accross re-renders of the view
         * @param  {DomEvent} event user click on summary tab
         */
        toggleCurrentSummaryTab: function toggleCurrentSummaryTab(event) {
            this.data.currentSummaryTab = $(event.target).attr("aria-controls");
        },

        /**
         * Formats situation data from recon results to be consumed by the template.
         * If any situations need to be added it can be done here without the need to
         * adjust the template.
         * @param  {object} situationSummary
         * @return {object} situation summary template data
         */
        getSituationRowData: function getSituationRowData(situationSummary) {
            var displayTypeLookup = [["failure", ["AMBIGUOUS", "SOURCE_MISSING", "MISSING", "FOUND_ALREADY_LINKED", "UNQUALIFIED", "UNASSIGNED"]], ["warning", ["TARGET_IGNORED", "SOURCE_IGNORED"]], ["success", ["CONFIRMED", "FOUND", "ABSENT"]]];

            return displayTypeLookup.reduce(function (acc, pair) {
                var _pair = _slicedToArray(pair, 2),
                    displayType = _pair[0],
                    situations = _pair[1];

                return acc.concat(situations.map(function (situation) {
                    var reconAnalysisString = "templates.mapping.reconAnalysis." + _.camelCase(situation.toLowerCase());

                    if (_.has(situationSummary, situation)) {
                        return {
                            displayType: displayType,
                            recordCount: situationSummary[situation],
                            situation: $.t(reconAnalysisString),
                            situationMessage: $.t(reconAnalysisString + "Message")
                        };
                    } else {
                        return [];
                    }
                }));
            }, []);
        },

        /**
         * Filter exceptions from stack trace by lines that begin with `Caused by`
         * and format them to be consumed by the template
         * @param  {string} stackTrace
         * @return {string[]} array of
         */
        getFailureCausesFromStackTrace: function getFailureCausesFromStackTrace(stackTrace) {
            return stackTrace.split(/\n/).filter(function (line) {
                return line.match(/^Caused by/);
            }).map(function (cause) {
                return cause.split(/:/).map(_.trim);
            });
        },

        formatReconFailuresAuditReportData: function formatReconFailuresAuditReportData(auditReportData) {
            var _this2 = this;

            var resultIgnore = ["Reconciliation initiated", "SOURCE_IGNORED"],
                policyValidationMessage = "Policy validation failed";

            return auditReportData.result.filter(function (result) {
                return _.isEmpty(resultIgnore.map(function (term) {
                    return result.message.match(term);
                }).filter(function (matches) {
                    return matches;
                }));
            }).map(function (result) {
                if (result.message === policyValidationMessage && _.has(result, 'messageDetail.detail.failedPolicyRequirements')) {
                    return _.set(result, "policyFailureReport", PolicyValidatorsManager.failedPolicyRequirementObjectsToStrings(_.cloneDeep(result.messageDetail.detail.failedPolicyRequirements)));
                }
                if (result.messageDetail) {
                    return _.set(result, "messageDetail", _this2.formatMessageDetail(result.messageDetail));
                }
                return _.set(result, "exception", result.exception);
            });
        },

        formatMessageDetail: function formatMessageDetail(messageDetail) {
            return _.keys(_.omit(messageDetail, "message")).map(function (key) {
                return key + ": " + messageDetail[key];
            }).join(", ");
        },

        /**
         * parse failed policy requirements out of stack trace
         * @param  {object} result a returned result from auditReport/recon
         * @return {string[]} a list of policy validation failures
         */
        createFailedPolicyReport: function createFailedPolicyReport(failedPolicyRequirements) {
            return _.toPairs(_.groupBy(failedPolicyRequirements, "property")).map(function (pair) {
                var _pair2 = _slicedToArray(pair, 2),
                    propName = _pair2[0],
                    policyDetails = _pair2[1];

                return [propName].concat(policyDetails.map(function (detail) {
                    return detail.policyRequirements.map(function (req) {
                        return req.policyRequirement;
                    });
                }));
            }).map(function (pair) {
                return "\"" + _.first(pair) + "\" failed " + _.last(pair).join(", ");
            });
        },

        failureDetailDialog: function failureDetailDialog(event) {
            if (event) {
                event.preventDefault();
            }

            var dataKey = $(event.target).data("key"),
                reportResult = this.data.reconFailuresAuditReportResults[dataKey];

            if (reportResult && reportResult.messageDetail) {
                var args = {
                    element: $("<div>", { id: "reconFailuresGridContainer" }),
                    entries: [reportResult]
                };

                ReconFailuresGridView.render(args, function () {
                    BootstrapDialogUtils.createModal({
                        title: $.t("templates.mapping.reconAnalysis.failureDetails"),
                        message: $(ReconFailuresGridView.el),
                        buttons: ["close"]
                    }).open();
                });
            } else {
                BootstrapDialogUtils.createModal({
                    title: $.t("templates.mapping.reconAnalysis.failureDetails"),
                    message: "<div style=\"white-space: pre; overflow: auto; font-family: Roboto Mono, monospace;\">" + reportResult.exception + "</div>",
                    buttons: ["close"]
                }).open();
            }
        }
    });

    return new ReconDetailsView();
});
