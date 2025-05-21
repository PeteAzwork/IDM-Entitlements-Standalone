"use strict";

/*
 * Copyright 2011-2024 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "handlebars", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/util/CookieHelper", "org/forgerock/commons/ui/common/util/UIUtils", "backgrid", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/openidm/ui/common/delegates/ResourceDelegate", "org/forgerock/openidm/ui/common/delegates/SearchDelegate", "org/forgerock/commons/ui/common/components/Messages", "org/forgerock/commons/ui/common/main/AbstractModel", "org/forgerock/commons/ui/common/main/AbstractCollection", "org/forgerock/openidm/ui/common/resource/ResourceCollection", "org/forgerock/openidm/ui/common/resource/util/ResourceQueryFilterEditor", "backgrid-paginator", "backgrid-selectall"], function ($, _, Handlebars, AbstractView, eventManager, conf, constants, cookieHelper, uiUtils, Backgrid, BackgridUtils, resourceDelegate, SearchDelegate, messagesManager, AbstractModel, AbstractCollection, ResourceCollection, ResourceQueryFilterEditor) {
    var ListResourceView = AbstractView.extend({
        template: "templates/admin/resource/ListResourceViewTemplate.html",
        model: {},
        events: {
            "click #reloadGridBtn": "reloadGrid",
            "click #clearFiltersBtn": "clearFilters",
            "click #deleteSelected": "deleteSelected",
            "click #basicFilterButton": "showBasicFilter",
            "click #advancedFilterButton": "showAdvanceFilter",
            "click #doAdvancedFilter": "doAdvancedFilter"
        },

        select: function select(event) {
            event.stopPropagation();
        },

        reloadGrid: function reloadGrid(event) {
            var _this2 = this;

            if (event) {
                event.preventDefault();
            }
            this.model.resources.getFirstPage().then(function (resources) {
                if (resources.result.length === 0) {
                    _this2.render(_this2.data.args);
                }
            });
        },

        clearFilters: function clearFilters(event) {
            if (event) {
                event.preventDefault();
            }
            this.data.args.doReload = true;
            this.render(this.data.args);
            this.$el.find('#clearFiltersBtn').prop('disabled', true);
        },
        getURL: function getURL(queryFilter) {
            var url = constants.context + "/" + this.data.objectType + "/" + this.data.objectName;

            if (queryFilter) {
                url += "?_queryFilter=" + queryFilter;
            }
            return url;
        },
        getCols: function getCols() {
            var prom = $.Deferred(),
                setCols,
                selectCol = {
                name: "",
                cell: "select-row",
                headerCell: "select-all",
                sortable: false,
                editable: false
            };

            $.when(resourceDelegate.getSchema(this.data.args)).then(_.bind(function (schema) {
                var cols = [],
                    unorderedCols = [];

                this.schema = schema;

                if (schema !== "invalidObject") {
                    this.data.validObject = true;
                    if (schema) {
                        this.data.pageTitle = this.data.objectName;
                        if (schema.title && !this.data.isSystemResource) {
                            this.data.pageTitle = schema.title;
                        }

                        setCols = _.bind(function (properties, parentProp) {
                            _.forEach(properties, _.bind(function (col, colName) {
                                if (col.type === "object") {
                                    setCols(col.properties, colName);
                                } else if (col.searchable || this.data.isSystemResource) {
                                    //if _id is in the schema properties and is searchable add it
                                    if (colName === "_id") {
                                        unorderedCols.push({
                                            "name": "_id",
                                            "key": true,
                                            "label": col.title || colName,
                                            "headerCell": BackgridUtils.FilterHeaderCell,
                                            "cell": "string",
                                            "sortable": true,
                                            "editable": false,
                                            "sortType": "toggle"
                                        });
                                    } else {
                                        if (parentProp) {
                                            colName = parentProp + "/" + colName;
                                        }

                                        unorderedCols.push({
                                            "name": colName,
                                            "label": col.title || colName,
                                            "headerCell": BackgridUtils.FilterHeaderCell,
                                            "cell": col.type === 'boolean' ? Backgrid.BooleanCell : BackgridUtils.escapedStringCell(colName),
                                            "sortable": !this.data.queryThreshold,
                                            "editable": false,
                                            "sortType": "toggle"
                                        });
                                    }
                                }
                            }, this));
                        }, this);

                        setCols(schema.properties);

                        _.forEach(schema.order, function (prop) {
                            var col = _.find(unorderedCols, { name: prop });

                            if (col) {
                                cols.push(col);
                            }
                        });

                        _.forEach(_.difference(unorderedCols, cols), function (col) {
                            cols.push(col);
                        });

                        if (_.has(this.data, "overrides.customColumns")) {
                            _.forEach(this.data.overrides.customColumns, function (col) {
                                cols.push(col);
                            });
                        }

                        cols.unshift(selectCol);

                        if (cols.length === 1) {
                            prom.resolve(unorderedCols);
                        } else {
                            prom.resolve(cols);
                        }
                    } else {
                        this.data.pageTitle = this.data.objectName;
                        $.get(this.getURL() + '?_queryFilter=true&_pageSize=1').then(function (qry) {
                            if (qry.result[0]) {
                                _.forEach(_.keys(qry.result[0]), function (col) {
                                    if (col !== "_id") {
                                        cols.push({
                                            "name": col,
                                            "label": col,
                                            "headerCell": BackgridUtils.FilterHeaderCell,
                                            "cell": "string",
                                            "sortable": true,
                                            "editable": false,
                                            "sortType": "toggle"
                                        });
                                    }
                                });
                            }

                            cols.unshift(selectCol);

                            prom.resolve(cols);
                        });
                    }
                } else {
                    this.data.validObject = false;
                    prom.resolve(cols);
                }
            }, this));
            return prom;
        },
        objectNameClean: function objectNameClean() {
            return this.data.objectName.replace("/", "_");
        },
        toggleDeleteSelected: function toggleDeleteSelected() {
            if (this.data.selectedItems.length === 0) {
                this.$el.find('#deleteSelected').prop('disabled', true);
            } else {
                this.$el.find('#deleteSelected').prop('disabled', false);
            }
        },
        deleteSelected: function deleteSelected(e) {
            e.preventDefault();

            uiUtils.confirmDialog($.t("templates.admin.ResourceEdit.confirmDeleteSelected"), "danger", _.bind(function () {
                var promArr = [];

                _.forEach(this.data.selectedItems, _.bind(function (objectId) {
                    promArr.push(resourceDelegate.deleteResource(this.data.serviceUrl, objectId, null));
                }, this));

                $.when.apply($, promArr).then(_.bind(function (proms) {
                    this.reloadGrid();
                    messagesManager.messages.addMessage({ "message": $.t("templates.admin.ResourceEdit.deleteSelectedSuccess") });

                    this.data.selectedItems = [];
                }, this));
            }, this));
        },

        render: function render(args, callback) {
            var _this3 = this;

            this.data.args = args;
            this.data.resourcePath = args[0] + "/" + args[1];
            this.data.objectType = args[0];
            this.data.objectName = args[1];
            this.data.grid_id = args[0] + "ViewTable";
            this.grid_id_selector = "#" + this.data.grid_id;
            this.data.isSystemResource = false;
            this.data.hideTitle = false;
            this.data.serviceUrl = resourceDelegate.getServiceUrl(args);
            this.data.selectedItems = [];
            this.element = "#content";

            SearchDelegate.getQueryThreshold(this.data.resourcePath).then(function (queryThreshold) {
                _this3.data.queryThreshold = queryThreshold;

                if (_this3.data.objectType === "system") {
                    _this3.data.isSystemResource = true;
                    _this3.data.hideTitle = true;
                    _this3.data.objectName = args[1] + "/" + args[2];
                    _this3.data.resourcePath = args[0] + "/" + args[1] + "/" + args[2];
                    _this3.data.systemType = args[3];
                    _this3.element = _this3.systemObjectElement;
                } else if (_.has(_this3.data, "overrides")) {
                    if (_.has(_this3.data.overrides, "hideTitle")) {
                        _this3.data.hideTitle = _this3.data.overrides.hideTitle;
                    }

                    if (_.has(_this3.data.overrides, "element")) {
                        _this3.element = _this3.data.overrides.element;
                    }

                    if (_.has(_this3.data.overrides, "noBaseTemplate")) {
                        _this3.noBaseTemplate = _this3.data.overrides.noBaseTemplate;
                    }

                    if (_.has(_this3.data.overrides, "customColumns")) {
                        _this3.noBaseTemplate = _this3.data.overrides.customColumns;
                    }
                }

                if (_.has(conf.globalData, "platformSettings.managedObjectsSettings." + _this3.data.objectName + ".minimumUIFilterLength")) {
                    _this3.data.queryThreshold = conf.globalData.platformSettings.managedObjectsSettings[_this3.data.objectName].minimumUIFilterLength;
                }

                _this3.data.addLinkHref = "#resource/" + _this3.data.resourcePath + "/add/";

                _this3.getCols().then(_.bind(function (cols) {
                    this.gridColumns = cols;

                    this.parentRender(function () {

                        this.buildResourceListGrid(cols, "true");
                        this.queryFilterEditor = this.renderAdvanceQueryFilter();

                        if (this.data.showAdvanceFilter && args.doReload) {
                            this.showAdvanceFilter();
                        } else {
                            this.showBasicFilter();
                        }

                        if (callback) {
                            callback();
                        }
                    });
                }, _this3));
            });
        },
        buildResourceListGrid: function buildResourceListGrid(cols, queryFilter) {
            var _this4 = this;

            var _this = this,
                grid_id = this.grid_id_selector,
                url = this.getURL(queryFilter),
                pager_id = grid_id + '-paginator',
                ResourceModel = AbstractModel.extend({ "url": url }),
                resourceGrid,
                paginator,
                state,
                defaultSystemResourceSortKey;

            if (this.data.isSystemResource) {
                _.map(this.schema.properties, function (val, key) {
                    if (!defaultSystemResourceSortKey && val.type === "string") {
                        defaultSystemResourceSortKey = key;
                    }
                });

                if (!defaultSystemResourceSortKey) {
                    defaultSystemResourceSortKey = cols[2].name;
                }
            }

            if (cols.length !== 0) {
                if (defaultSystemResourceSortKey) {
                    state = BackgridUtils.getState(defaultSystemResourceSortKey);
                } else if (this.data.queryThreshold && queryFilter === 'true') {
                    // no _sortKeys in this situation
                    state = BackgridUtils.getState();
                } else {
                    state = BackgridUtils.getState(cols[1].name);
                }
            } else {
                state = null;
            }

            this.model.resources = new ResourceCollection([], {
                url: url,
                state: state,
                _queryFilter: queryFilter || 'true',
                isSystemResource: this.data.isSystemResource
            });

            resourceGrid = new Backgrid.Grid({
                className: "backgrid table table-hover",
                emptyText: $.t("templates.admin.ResourceList.noData"),
                columns: BackgridUtils.addSmallScreenCell(cols),
                collection: _this.model.resources,
                row: BackgridUtils.ClickableRow.extend({
                    callback: function callback(e) {
                        var $target = $(e.target),
                            args = _this.data.args;

                        if ($target.is("input") || $target.is(".select-row-cell")) {
                            return;
                        }

                        if (this.model.id) {
                            if (!_this.data.isSystemResource) {
                                args.push(this.model.id);
                                eventManager.sendEvent(constants.ROUTE_REQUEST, { routeName: "adminEditManagedObjectView", args: args });
                            } else {
                                // for audit - get actual audit eventId
                                args[3] = args[1] === "auditdb" ? this.model.attributes.eventId : this.model.id;
                                args.push(_this.data.systemType);
                                eventManager.sendEvent(constants.ROUTE_REQUEST, { routeName: "adminEditSystemObjectView", args: args });
                            }
                        }
                    }
                })
            });

            paginator = new Backgrid.Extension.Paginator({
                collection: this.model.resources,
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

            this.$el.find(grid_id).append(resourceGrid.render().el);
            this.$el.find(pager_id).append(paginator.render().el);

            this.bindDefaultHandlers();

            this.model.resources.getFirstPage();

            //  Binds an event listener to resourceCollection that removes 'FastForward' button from paginator (since it doesn't work)
            //  and disables the 'Forward' button once you reach a page with no more resources
            this.model.resources.on("sync", function (collection) {
                _.find(paginator.handles, function (handle) {
                    return handle.isFastForward;
                }).$el.remove();

                if (_.isEmpty(collection.models) || collection.length < collection.state.pageSize) {
                    _.find(paginator.handles, function (handle) {
                        return handle.isForward;
                    }).$el.toggleClass("disabled", true);
                } else {
                    _.find(paginator.handles, function (handle) {
                        return handle.isForward;
                    }).$el.toggleClass("disabled", false);
                }

                if (_this4.data.queryThreshold) {
                    var searchForms = _this4.$el.find(".filter-header-cell form"),
                        queryThreshold = _this4.data.queryThreshold;

                    searchForms.each(function () {
                        $(this).bind("keypress", function (e) {
                            var enterKeyCode = 13;
                            if (e.keyCode === enterKeyCode && queryThreshold && e.target.value.length && e.target.value.length < queryThreshold) {
                                return false;
                            }
                        });
                    });
                }
            });
        },
        onRowSelect: function onRowSelect(model, selected) {
            if (selected) {
                if (!_.includes(this.data.selectedItems, model.id)) {
                    this.data.selectedItems.push(model.id);
                }
            } else {
                this.data.selectedItems = _.without(this.data.selectedItems, model.id);
            }
            this.toggleDeleteSelected();
        },

        bindDefaultHandlers: function bindDefaultHandlers() {
            var _this = this;

            this.model.resources.on("backgrid:selected", _.bind(function (model, selected) {
                this.onRowSelect(model, selected);
            }, this));

            this.model.resources.on("backgrid:sort", BackgridUtils.doubleSortFix);

            this.model.resources.on("sync", function (collection) {
                var hasFilters = false;
                _.forEach(collection.state.filters, function (filter) {
                    if (filter.value.length) {
                        hasFilters = true;
                    }
                });

                if (hasFilters || _this.queryFilterEditor.getFilterString()) {
                    _this.$el.find('#clearFiltersBtn').prop('disabled', false);
                } else {
                    _this.$el.find('#clearFiltersBtn').prop('disabled', true);
                }
            });
        },
        showAdvanceFilter: function showAdvanceFilter(e) {
            if (e) {
                e.preventDefault();
            }
            this.$el.find("#advancedFilterButton").hide();
            this.$el.find("#basicFilterButton").show();
            this.$el.find("#advancedQueryFilterContainer").show();
            this.$el.find(".filter-header-cell input").hide();

            if (this.queryFilterEditor.getFilterString()) {
                this.$el.find('#clearFiltersBtn').prop('disabled', false);
            }

            this.data.showAdvanceFilter = true;
        },
        showBasicFilter: function showBasicFilter(e) {
            if (e) {
                e.preventDefault();
            }
            this.$el.find("#advancedFilterButton").show();
            this.$el.find("#basicFilterButton").hide();
            this.$el.find("#advancedQueryFilterContainer").hide();
            this.$el.find(".filter-header-cell input").show();

            this.data.showAdvanceFilter = false;
        },
        renderAdvanceQueryFilter: function renderAdvanceQueryFilter(clearFilter) {
            var _this5 = this;

            var editor = new ResourceQueryFilterEditor();

            editor.render({
                "queryFilter": "",
                "element": "#advancedQueryFilter",
                "resource": this.data.resourcePath,
                "onChange": function onChange() {
                    if (editor.getFilterString()) {
                        _this5.$el.find("#doAdvancedFilter").prop("disabled", false);
                        _this5.$el.find('#clearFiltersBtn').prop('disabled', false);
                    } else {
                        _this5.$el.find("#doAdvancedFilter").prop("disabled", true);
                        _this5.$el.find('#clearFiltersBtn').prop('disabled', true);
                    }
                }
            });

            return editor;
        },
        doAdvancedFilter: function doAdvancedFilter() {
            this.$el.find(this.grid_id_selector).empty();
            this.$el.find(this.grid_id_selector + "-paginator").empty();
            this.buildResourceListGrid(this.gridColumns, this.queryFilterEditor.getFilterString());
            this.showAdvanceFilter();
        }
    });

    return new ListResourceView();
});
