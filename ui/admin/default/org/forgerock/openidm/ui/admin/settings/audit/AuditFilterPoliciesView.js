"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/openidm/ui/admin/settings/audit/AuditAdminAbstractView", "org/forgerock/openidm/ui/admin/settings/audit/AuditFilterPoliciesDialog", "org/forgerock/commons/ui/common/components/ChangesPending", "selectize"], function ($, _, AuditAdminAbstractView, AuditFilterPoliciesDialog, ChangesPending) {

    var AuditFilterPoliciesView = AuditAdminAbstractView.extend({
        template: "templates/admin/settings/audit/AuditFilterPoliciesTemplate.html",
        element: "#AuditFilterPoliciesView",
        noBaseTemplate: true,
        events: {
            "click .add-filter": "addFilter",
            "click .edit-filter": "editFilter",
            "click .delete-filter": "deleteFilterEvent"
        },

        render: function render(args, callback) {
            this.data = {};
            this.model = {
                filterPolicies: {},
                caseInsensitiveFields: [],
                caseInsensitiveFieldsSelect: null
            };

            if (!_.has(args, "model")) {
                this.model.auditData = this.getAuditData();

                if (_.has(this.model.auditData, "auditServiceConfig")) {
                    if (_.has(this.model.auditData.auditServiceConfig, "filterPolicies")) {
                        _.assignIn(this.model.filterPolicies, this.model.auditData.auditServiceConfig.filterPolicies);
                    }
                    if (_.has(this.model.auditData.auditServiceConfig, "caseInsensitiveFields")) {
                        _.assignIn(this.model.caseInsensitiveFields, this.model.auditData.auditServiceConfig.caseInsensitiveFields);
                    }
                }
            } else {
                this.model = args.model;
            }

            this.data.filters = this.formatData(this.model.filterPolicies);
            this.data.caseInsensitiveFields = this.model.caseInsensitiveFields;

            this.parentRender(_.bind(function () {
                var _this = this;

                this.model.caseInsensitiveFieldsSelect = this.$el.find("#caseInsensitiveFields");

                this.model.caseInsensitiveFieldsSelect.selectize({
                    delimiter: ',',
                    persist: false,
                    onChange: function onChange(value) {
                        if (value.length > 0) {
                            _this.model.caseInsensitiveFields = value.split(",");
                        } else {
                            _this.model.caseInsensitiveFields = [];
                        }

                        _this.reRender();
                    },
                    create: true
                });

                if (!_.has(this.model, "changesModule")) {
                    this.model.changesModule = ChangesPending.watchChanges({
                        element: this.$el.find(".audit-filter-alert"),
                        undo: true,
                        watchedObj: _.cloneDeep(this.model.auditData.auditServiceConfig),
                        watchedProperties: ["filterPolicies", "caseInsensitiveFields"],
                        undoCallback: _.bind(function (original) {
                            this.model.filterPolicies = original.filterPolicies;
                            this.model.caseInsensitiveFields = original.caseInsensitiveFields;
                            this.reRender();
                        }, this)
                    });
                } else {
                    this.model.changesModule.reRender(this.$el.find(".audit-filter-alert"));
                    if (args && args.saved) {
                        this.model.changesModule.saveChanges();
                    }
                }

                if (callback) {
                    callback();
                }
            }, this));
        },

        /**
         * Sets the filters to the global config and checks for changes, then rerenders.
         */
        reRender: function reRender() {
            this.setFilterPolicies(this.model.filterPolicies);
            this.setCaseInsensitiveFields(this.model.caseInsensitiveFields);
            this.model.changesModule.makeChanges({
                "filterPolicies": this.model.filterPolicies,
                "caseInsensitiveFields": this.model.caseInsensitiveFields
            });
            this.render({ model: this.model });
        },

        /**
         *  Converts the Audit.json format for filters into a flat array renderable by Handlebars
         *
         *   FROM:
         *   "filterPolicies" : {
         *       "field" : {
         *           "excludeIf" : [ ],
         *           "includeIf" : [
         *               "/access/filter/field"
         *           ]
         *       },
         *       "value" : {
         *           "excludeIf" : [
         *               "/access/filter/value"
         *           ],
         *           "includeIf" : [ ]
         *       }
         *   }
         *
         *   TO:
         *   [
         *      {"type": "Field", "typeLiteral": "field", "includeExclude": "Include", "includeExcludeLiteral": "includeIf", "location": "/access/filter/field"},
         *      {"type": "Value", "typeLiteral": "value", "includeExclude": "Exclude", "includeExcludeLiteral": "excludeIf", "location": "/access/filter/value"}
         *   ]
         */
        formatData: function formatData(filterPolicies) {
            var filters = [],
                tempLocation;

            function addFilter(type, includeExclude) {
                _.forEach(filterPolicies[type][includeExclude], function (location) {
                    tempLocation = location.split("/");

                    filters.push({
                        "type": $.t("templates.audit.filterPolicies." + type),
                        "typeLiteral": type,
                        "includeExclude": $.t("templates.audit.filterPolicies." + includeExclude),
                        "includeExcludeLiteral": includeExclude,
                        "topic": tempLocation[1] || "",
                        "location": tempLocation.splice(2).join("/") || location
                    });
                });
            }

            if (_.has(filterPolicies, "field")) {
                if (_.has(filterPolicies.field, "excludeIf")) {
                    _.bind(addFilter, this)("field", "excludeIf");
                }

                if (_.has(filterPolicies.field, "includeIf")) {
                    _.bind(addFilter, this)("field", "includeIf");
                }
            }

            if (_.has(filterPolicies, "value")) {
                if (_.has(filterPolicies.value, "excludeIf")) {
                    _.bind(addFilter, this)("value", "excludeIf");
                }

                if (_.has(filterPolicies.value, "includeIf")) {
                    _.bind(addFilter, this)("value", "includeIf");
                }
            }

            return filters;
        },

        /**
         * On click the selected row is identified and the location corresponding to that row is spliced out.
         * @param e
         */
        deleteFilterEvent: function deleteFilterEvent(e) {
            e.preventDefault();

            var selectedEl = $(e.currentTarget).closest(".filter")[0],
                allFilterEls = this.$el.find(".filters .filter");

            this.model.filterPolicies = this.deleteFilter(selectedEl, allFilterEls, this.data.filters, this.model.filterPolicies);

            this.reRender();
        },

        /**
         * Given a set of ui elements, finds which element was selected.  Using the location within the set of ui elements
         * the location within the ui formatted filters will be found.  Finally, when the ui formatted filter is found
         * it is then possible to delete the entry from the backend formatted  filter policies.
         *
         * @param selectedEl
         * @param allFilterEls
         * @param uiFormattedFilters
         * @param filterPolicies
         * @returns {*}
         */
        deleteFilter: function deleteFilter(selectedEl, allFilterEls, uiFormattedFilters, filterPolicies) {
            var selectedFilter = {},
                filterLocation;

            _.forEach(allFilterEls, function (row, index) {
                if (row === selectedEl) {
                    selectedFilter = uiFormattedFilters[index];
                }
            });

            filterLocation = filterPolicies[selectedFilter.typeLiteral][selectedFilter.includeExcludeLiteral].indexOf("/" + selectedFilter.topic + "/" + selectedFilter.location);
            filterPolicies[selectedFilter.typeLiteral][selectedFilter.includeExcludeLiteral].splice(filterLocation, 1);

            return filterPolicies;
        },

        /**
         * Opens an editor preloaded with the existing configuration of the selected filter.
         * Upon submiting the dialog the old filter is removed and the new one is added.
         * @param e
         */
        editFilter: function editFilter(e) {
            e.preventDefault();

            var selected = $(e.currentTarget).closest(".filter")[0],
                selectedFilter = {},
                filterLocation;

            _.forEach(this.$el.find(".filters .filter"), _.bind(function (row, index) {
                if (row === selected) {
                    selectedFilter = this.data.filters[index];
                }
            }, this));

            AuditFilterPoliciesDialog.render({
                "newFilter": false,
                "filter": selectedFilter,
                "saveCallback": _.bind(function (type, includeExclude, location) {
                    filterLocation = this.model.filterPolicies[selectedFilter.typeLiteral][selectedFilter.includeExcludeLiteral].indexOf("/" + selectedFilter.topic + "/" + selectedFilter.location);
                    _.bind(this.saveFilter, this)(type, includeExclude, location, filterLocation);
                }, this)
            }, _.noop);
        },

        saveFilter: function saveFilter(type, includeExclude, location, filterLocation) {
            if (_.has(this.model.filterPolicies, type)) {
                if (_.has(this.model.filterPolicies[type], includeExclude)) {
                    if (_.isNumber(filterLocation) && filterLocation >= 0) {
                        this.model.filterPolicies[type][includeExclude].splice(filterLocation, 1, location);
                    } else {
                        this.model.filterPolicies[type][includeExclude].push(location);
                    }
                } else {
                    this.model.filterPolicies[type][includeExclude] = [location];
                }
            } else {
                this.model.filterPolicies[type] = {};
                this.model.filterPolicies[type][includeExclude] = [location];
            }

            this.reRender();
        },

        /**
         * Creates a new filter and pushes it to the appropriate array
         */
        addFilter: function addFilter(e) {
            e.preventDefault();

            AuditFilterPoliciesDialog.render({
                "newFilter": true,
                "saveCallback": _.bind(function (type, includeExclude, location) {
                    this.saveFilter(type, includeExclude, location);
                }, this)
            }, _.noop);
        }
    });

    return new AuditFilterPoliciesView();
});
