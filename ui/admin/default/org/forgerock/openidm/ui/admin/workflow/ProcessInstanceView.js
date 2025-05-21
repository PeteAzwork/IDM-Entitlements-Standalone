"use strict";

/*
 * Copyright 2011-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractModel", "org/forgerock/commons/ui/common/components/Messages", "org/forgerock/commons/ui/common/main/AbstractCollection", "backgrid", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/commons/ui/common/util/UIUtils"], function ($, _, AbstractView, eventManager, router, Constants, AbstractModel, messagesManager, AbstractCollection, Backgrid, BackgridUtils, UIUtils) {

    var ProcessInstanceModel = AbstractModel.extend({ url: Constants.context + "/workflow/processinstance" }),
        ProcessDefinitionModel = AbstractModel.extend({ url: Constants.context + "/workflow/processdefinition" }),
        UserModel = AbstractModel.extend({ url: Constants.context + "/managed/user" }),
        TaskInstanceCollection = AbstractCollection.extend({
        mode: "client"
    }),
        ProcessInstanceView = AbstractView.extend({
        template: "templates/admin/workflow/ProcessInstanceViewTemplate.html",

        events: {
            "click #cancelProcessBtn": "cancelProcess"
        },
        cancelProcess: function cancelProcess(e) {
            if (e) {
                e.preventDefault();
            }

            UIUtils.confirmDialog($.t("templates.processInstance.cancelConfirmation"), "danger", _.bind(function () {
                this.model.destroy({
                    success: function success() {
                        messagesManager.messages.addMessage({ "message": $.t("templates.processInstance.cancelProcessSuccess") });
                        eventManager.sendEvent(Constants.ROUTE_REQUEST, { routeName: "processListView" });
                    }
                });
            }, this));
        },
        render: function render(args, callback) {
            var processDefinition = new ProcessDefinitionModel(),
                startedBy = new UserModel();

            this.model = new ProcessInstanceModel();

            this.model.id = args[0];

            this.model.fetch().then(_.bind(function () {
                var fetchArr = [];
                this.data.processInstance = this.model.toJSON();

                if (this.data.processInstance.startUserId) {
                    startedBy.id = this.data.processInstance.openidmObjectId;
                    if (startedBy.id === 'openidm-admin' || startedBy.id === "anonymous") {
                        startedBy.url = Constants.context + "/internal/user";
                    }
                    fetchArr.push(startedBy.fetch());
                }

                processDefinition.id = this.data.processInstance.processDefinitionId;
                fetchArr.push(processDefinition.fetch());

                $.when.apply($, fetchArr).done(_.bind(function () {

                    this.data.processDefinition = processDefinition.toJSON();
                    this.data.startedBy = startedBy.toJSON();

                    if (this.data.processDefinition.processDiagramResourceName) {
                        this.data.showDiagram = true;
                        if (!this.model.get("endTime")) {
                            this.data.diagramUrl = Constants.context + "/workflow/processinstance/" + this.model.id + "?_fields=/diagram&_mimeType=image/png";
                        } else {
                            this.data.diagramUrl = Constants.context + "/workflow/processdefinition/" + this.data.processDefinition._id + "?_fields=/diagram&_mimeType=image/png";
                        }
                    }

                    this.parentRender(_.bind(function () {

                        this.buildTasksGrid();

                        if (callback) {
                            callback();
                        }
                    }, this));
                }, this));
            }, this));
        },
        buildTasksGrid: function buildTasksGrid() {
            var processTasks = new TaskInstanceCollection(_.sortBy(this.model.attributes.tasks, "startTime").reverse()),
                cols = [{
                name: "name",
                label: "Task",
                editable: false,
                cell: "string",
                sortable: false
            }, {
                name: "assignee",
                label: "Assignee",
                editable: false,
                cell: "string",
                sortable: false
            }, {
                name: "dueDate",
                label: "Due",
                editable: false,
                cell: BackgridUtils.DateCell("dueDate"),
                sortable: false
            }, {
                name: "startTime",
                label: "Created",
                editable: false,
                cell: BackgridUtils.DateCell("startTime"),
                sortable: false
            }, {
                name: "endTime",
                label: "Completed",
                editable: false,
                cell: BackgridUtils.DateCell("endTime"),
                sortable: false
            }, {
                name: "",
                cell: BackgridUtils.ButtonCell([{
                    className: "fa fa-pencil grid-icon",
                    callback: function callback() {
                        eventManager.sendEvent(Constants.EVENT_CHANGE_VIEW, { route: router.configuration.routes.taskInstanceView, args: [this.model.id] });
                    }
                }], function () {
                    if (this.model.attributes.endTime) {
                        this.$el.empty();
                    }
                }),
                sortable: false,
                editable: false
            }],
                tasksGrid = new Backgrid.Grid({
                columns: BackgridUtils.addSmallScreenCell(cols),
                collection: processTasks,
                className: "table backgrid"
            });

            this.$el.find("#tasksGrid").append(tasksGrid.render().el);
        }
    });

    return new ProcessInstanceView();
});
