"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/common/delegates/ResourceDelegate", "org/forgerock/commons/ui/common/main/AbstractModel", "org/forgerock/commons/ui/common/main/AbstractCollection", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/commons/ui/common/main/Router", "backgrid"], function ($, _, AdminAbstractView, ResourceDelegate, AbstractModel, AbstractCollection, eventManager, Constants, BackgridUtils, router, Backgrid) {
    var ProcessHistoryView = AdminAbstractView.extend({
        template: "templates/admin/workflow/ProcessHistoryViewTemplate.html",
        events: {
            "change #processHistoryFilterType": "filterType"
        },
        model: {
            userFilter: "anyone",
            processTypeFilter: "all"
        },
        element: "#processHistory",
        render: function render(args, callback) {
            this.data.processDefinitions = args[0];

            this.parentRender(_.bind(function () {
                var _this = this;

                var processGrid,
                    ProcessModel = AbstractModel.extend({ "url": Constants.context + "/workflow/processinstance/history" }),
                    Process = AbstractCollection.extend({ model: ProcessModel });

                this.model.processes = new Process();

                this.model.processes.on('backgrid:sort', function (model) {
                    var cid = model.cid,
                        filtered = model.collection.filter(function (model) {
                        return model.cid !== cid;
                    });

                    _.forEach(filtered, function (model) {
                        model.set('direction', null);
                    });
                });

                this.model.processes.url = Constants.context + "/workflow/processinstance/history?_queryId=filtered-query&finished=true";
                this.model.processes.state.pageSize = null;
                this.model.processes.state.sortKey = "-startTime";

                processGrid = new Backgrid.Grid({
                    className: "table backgrid",
                    emptyText: $.t("templates.workflows.processes.noCompletedProcesses"),
                    columns: BackgridUtils.addSmallScreenCell([{
                        name: "processDefinitionResourceName",
                        label: $.t("templates.workflows.processes.processInstance"),
                        cell: Backgrid.Cell.extend({
                            render: function render() {
                                this.$el.html('<a href="#workflow/processinstance/' + this.model.id + '">' + this.model.get("processDefinitionResourceName") + '<small class="text-muted"> (' + this.model.id + ')</small></a>');

                                this.delegateEvents();
                                return this;
                            }
                        }),
                        sortable: false,
                        editable: false
                    }, {
                        name: "startUserId",
                        label: $.t("templates.workflows.processes.startedBy"),
                        cell: "string",
                        sortable: false,
                        editable: false
                    }, {
                        name: "startTime",
                        label: $.t("templates.workflows.processes.created"),
                        cell: BackgridUtils.DateCell("startTime"),
                        sortable: true,
                        editable: false,
                        sortType: "toggle"
                    }, {
                        name: "endTime",
                        label: "COMPLETED",
                        cell: BackgridUtils.DateCell("endTime"),
                        sortable: true,
                        editable: false,
                        sortType: "toggle"
                    }, {
                        name: "",
                        cell: BackgridUtils.ButtonCell([{
                            className: "fa fa-eye grid-icon",
                            callback: function callback() {
                                eventManager.sendEvent(Constants.EVENT_CHANGE_VIEW, { route: router.configuration.routes.processInstanceView, args: [this.model.id] });
                            }
                        }]),
                        sortable: false,
                        editable: false
                    }]),
                    collection: this.model.processes
                });

                this.$el.find("#processHistoryGridHolder").append(processGrid.render().el);

                this.model.processes.getFirstPage();

                this.$el.find("#processHistoryAssignedTo").selectize({
                    valueField: '_id',
                    labelField: 'userName',
                    searchField: ["userName", "givenName", "sn"],
                    create: false,
                    preload: true,
                    onChange: function onChange(value) {
                        var selectedObject = _this.$el.find("#processHistoryAssignedTo")[0].selectize.options[value];

                        if (selectedObject._id === "anyone") {
                            _this.model.userFilter = "anyone";
                        } else {
                            _this.model.userFilter = selectedObject.userName;
                        }

                        _this.reloadGrid();
                    },
                    render: {
                        item: function item(_item, escape) {
                            var userName = _item.userName.length > 0 ? ' (' + escape(_item.userName) + ')' : "",
                                displayName = _item.displayName ? _item.displayName : _item.givenName + " " + _item.sn;

                            return '<div>' + '<span class="user-title">' + '<span class="user-fullname">' + escape(displayName) + userName + '</span>' + '</span>' + '</div>';
                        },
                        option: function option(item, escape) {
                            var userName = item.userName.length > 0 ? ' (' + escape(item.userName) + ')' : "",
                                displayName = item.displayName ? item.displayName : item.givenName + " " + item.sn;

                            return '<div>' + '<span class="user-title">' + '<span class="user-fullname">' + escape(displayName) + userName + '</span>' + '</span>' + '</div>';
                        }
                    },
                    load: _.bind(function (query, callback) {
                        var queryFilter;

                        if (!query.length) {
                            queryFilter = "userName sw \"\" &_pageSize=10";
                        } else {
                            queryFilter = "givenName sw \"" + query + "\" or sn sw \"" + query + "\" or userName sw \"" + query + "\"";
                        }

                        ResourceDelegate.searchResource(queryFilter, "managed/user").then(function (search) {
                            callback(search.result);
                        }, function () {
                            callback();
                        });
                    }, this)
                });

                this.$el.find("#processHistoryAssignedTo")[0].selectize.addOption({
                    _id: "anyone",
                    userName: "Anyone",
                    givenName: "Anyone",
                    sn: ""
                });

                this.$el.find("#processHistoryAssignedTo")[0].selectize.setValue("anyone", true);

                if (callback) {
                    callback();
                }
            }, this));
        },

        filterType: function filterType(event) {
            this.model.processTypeFilter = $(event.target).val();

            this.reloadGrid();
        },

        reloadGrid: function reloadGrid() {
            var filterString = "_queryId=filtered-query&finished=true";

            if (this.model.userFilter !== "anyone") {
                filterString = filterString + "&startUserId=" + this.model.userFilter;

                if (this.model.processTypeFilter !== "all") {
                    filterString = filterString + "&processDefinitionKey=" + this.model.processTypeFilter;
                }
            } else if (this.model.processTypeFilter !== "all") {
                filterString = filterString + "&processDefinitionKey=" + this.model.processTypeFilter;
            }

            this.model.processes.url = Constants.context + "/workflow/processinstance/history?" + filterString;

            this.model.processes.getFirstPage();
        }
    });

    return new ProcessHistoryView();
});
