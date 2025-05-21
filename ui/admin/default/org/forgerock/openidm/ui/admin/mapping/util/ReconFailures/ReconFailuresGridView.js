"use strict";

/*
 * Copyright 2017-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "backgrid", "backgrid-paginator", "handlebars", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/openidm/ui/common/util/PolicyValidatorsManager", "org/forgerock/commons/ui/common/main/AbstractCollection", "org/forgerock/openidm/ui/common/util/Constants"], function ($, _, Backgrid, BackgridPaginator, Handlebars, AdminAbstractView, BackgridUtils, PolicyValidatorsManager, AbstractCollection, Constants) {
    var ReconFailuresGridView = AdminAbstractView.extend({
        template: "templates/admin/mapping/util/ReconFailuresGridViewTemplate.html",
        events: {
            "keyup #failuresGridSearch": "applySearch",
            "keydown form": "enterPressHandler"
        },
        partials: ["partials/mapping/util/_reconFailuresGridRow.html"],

        config: {
            PAGE_SIZE: 5
        },

        render: function render(args, callback) {
            var _this = this;

            this.element = args.element;
            this.model = { entries: this.dataToFormatedEntries(args.entries) };
            this.data.collection = this.createCollection(this.model.entries);

            this.parentRender(function () {
                _this.buildGrid();
                if (callback) {
                    callback();
                }
            });
        },

        dataToFormatedEntries: function dataToFormatedEntries(data) {
            return data.filter(this.filterNonFailedNonEntries.bind(this)).map(this.formatEntryMessageAndEntryMessageDetail.bind(this));
        },

        filterNonFailedNonEntries: function filterNonFailedNonEntries(element) {
            return (element.entryType && element.entryType === "entry" || !element.entryType) && element.status === "FAILURE";
        },

        formatEntryMessageAndEntryMessageDetail: function formatEntryMessageAndEntryMessageDetail(entry) {
            var message = entry.message,
                messageDetail = entry.messageDetail,
                sourceObjectId = entry.sourceObjectId,
                targetObjectId = entry.targetObjectId,
                originalValue = _.cloneDeep(entry),
                messageDetailReport = [];

            if (!_.isUndefined(messageDetail)) {
                if (_.has(messageDetail, "failedPolicyRequirements")) {
                    messageDetailReport = PolicyValidatorsManager.failedPolicyRequirementObjectsToStrings(messageDetail.failedPolicyRequirements);
                } else if (_.has(messageDetail, "detail.failedPolicyRequirements")) {
                    messageDetailReport = PolicyValidatorsManager.failedPolicyRequirementObjectsToStrings(messageDetail.detail.failedPolicyRequirements);
                }
            } else {
                messageDetailReport = this.formatMessageDetail(messageDetail);
            }

            return { message: message, messageDetailReport: messageDetailReport, sourceObjectId: sourceObjectId, targetObjectId: targetObjectId, originalValue: originalValue };
        },

        formatMessageDetail: function formatMessageDetail(messageDetail) {
            return [_.keys(_.omit(messageDetail, "message")).map(function (key) {
                return key + ": " + messageDetail[key];
            }).join(", ")];
        },

        createCollection: function createCollection(entries) {
            var collection = new AbstractCollection(entries, { mode: "client" });
            collection.setPageSize(this.config.PAGE_SIZE);

            return collection;
        },

        buildGrid: function buildGrid(filter, callback) {
            var paginator, reconFailuresGrid;

            this.$el.find("#reconFailuresGrid").empty();
            this.$el.find("#reconFailuresGrid-paginator").empty();

            reconFailuresGrid = new Backgrid.Grid({
                className: "table backgrid table-hover",
                emptyText: $.t("templates.admin.ResourceList.noData"),
                columns: BackgridUtils.addSmallScreenCell([{
                    name: "",
                    sortable: false,
                    editable: false,
                    cell: Backgrid.Cell.extend({
                        className: "failure-grid-item",
                        render: function render() {
                            var id = this.model.cid,
                                originalValue = JSON.stringify(this.model.get("originalValue"), null, "\t"),
                                data = _.merge(this.model.toJSON(), { id: id, originalValue: originalValue });

                            this.$el.html(Handlebars.compile("{{> mapping/util/_reconFailuresGridRow }}")(data));
                            return this;
                        }
                    })
                }]),
                collection: this.data.collection
            });

            paginator = new Backgrid.Extension.Paginator({
                collection: this.data.collection,
                goBackFirstOnSort: false,
                windowSize: 0,
                controls: {
                    rewind: {
                        label: " ",
                        title: $.t("templates.backgrid.first")
                    },
                    back: {
                        label: " ",
                        title: $.t("templates.backgrid.previous")
                    },
                    forward: {
                        label: " ",
                        title: $.t("templates.backgrid.next")
                    },
                    fastForward: {
                        label: " ",
                        title: $.t("templates.backgrid.last")
                    }
                }
            });

            this.$el.find("#reconFailuresGrid").append(reconFailuresGrid.render().el);
            this.$el.find("#reconFailuresGrid-paginator").append(paginator.render().el);

            this.model.grid = reconFailuresGrid;

            if (callback) {
                callback();
            }
            this.data.collection.getFirstPage();
        },

        /**
         * filters results set based on entered search values and reloads the grid
         * @param {object} event - optional event object
         */
        applySearch: function applySearch(event) {
            event.preventDefault();

            var searchValue = new RegExp($(event.target).val(), "i"),
                entries = this.model.entries.filter(function (entry) {
                return ["message", "sourceObjectId", "targetObjectId", "mapping", "messageDetailReport"].reduce(function (acc, path) {
                    if (path === "messageDetailReport") {
                        return acc || !_.isNull(_.get(entry, path, []).join(",").match(searchValue));
                    } else if (_.has(entry, path) && !_.isNull(_.get(entry, path))) {
                        return acc || !_.isNull(_.get(entry, path, "").match(searchValue));
                    } else {
                        return acc || false;
                    }
                }, false);
            });

            this.data.collection = this.createCollection(entries);

            this.buildGrid();
        },

        handleKeyDown: function handleKeyDown(event) {
            if (event.keyCode === Constants.ENTER_KEY) {
                event.preventDefault();
            }
        }

    });

    return new ReconFailuresGridView();
});
