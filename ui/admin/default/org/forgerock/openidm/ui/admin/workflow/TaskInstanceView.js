"use strict";

/*
 * Copyright 2011-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["handlebars", "jquery", "lodash", "org/forgerock/commons/ui/common/main/AbstractModel", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/admin/util/WorkflowUtils"], function (handlebars, $, _, AbstractModel, AbstractView, Constants, WorkflowUtils) {
    var TaskModel = AbstractModel.extend({ url: Constants.context + "/workflow/taskinstance" }),
        ProcessModel = AbstractModel.extend({ url: Constants.context + "/workflow/processdefinition" }),
        UserModel = AbstractModel.extend({ url: Constants.context + "/managed/user" }),
        TaskInstanceView = AbstractView.extend({
        template: "templates/admin/workflow/TaskInstanceViewTemplate.html",
        events: {
            "click .assignTask": "showCandidateUserSelection"
        },
        render: function render(args, callback) {
            var process = new ProcessModel(),
                assignee = new UserModel();

            this.data = {
                showForm: false,
                canAssign: false
            };

            this.model = new TaskModel();

            this.model.id = args[0];

            this.model.fetch().then(_.bind(function () {
                var _this = this;

                var fetchArr = [];

                this.data.task = this.model.toJSON();

                if (this.data.task.assignee) {
                    assignee.id = this.data.task.openidmAssigneeId;
                    fetchArr.push(assignee.fetch());
                }

                process.id = this.data.task.processDefinitionId;
                fetchArr.push(process.fetch());

                $.when.apply($, fetchArr).done(function () {
                    //                        var formTemplate = _.filter(this.data.task.formProperties, function(p) { return _.has(p,"_formGenerationTemplate"); });
                    //
                    //                        this.data.process = process.toJSON();
                    _this.data.assignee = assignee.toJSON();

                    //                        if (formTemplate.length) {
                    //                            this.data.showForm = true;
                    //
                    //                            this.data.taskForm = handlebars.compile(formTemplate[0]._formGenerationTemplate)(this.data.task);
                    //                        }
                    //
                    //                        if (!this.data.showForm && this.data.process.formGenerationTemplate) {
                    //                            this.data.showForm = true;
                    //
                    //                            this.data.taskForm = handlebars.compile(this.data.process.formGenerationTemplate)(this.data.task);
                    //                        }

                    // when we refactored End User UI to use vue.js we lost the ability to render workflow
                    // task forms in the backbone/handlebars UI, so the following simply sends key/value
                    // task variables to be rendered in a generic form
                    _this.data.showForm = true;
                    var formVars = _.omit(_this.data.task.variables, ["decisionOptions", "startUserFromRepo", "startUserId", "openidmObjectId"]);
                    _this.data.taskForm = formVars;

                    _this.parentRender(function () {

                        //                            if (this.data.showForm) {
                        //                                this.populateTaskForm();
                        //                            }

                        if (callback) {
                            callback();
                        }
                    });
                });
            }, this));
        },
        showCandidateUserSelection: function showCandidateUserSelection(event) {
            if (event) {
                event.preventDefault();
            }

            WorkflowUtils.showCandidateUserSelection(this);
        },
        populateTaskForm: function populateTaskForm() {
            var _this2 = this;

            /*
             * sometimes form input fields have no replacement tokens like:
             *    <input type="text" value="" name="userName"/>
             * in this case form values will not be filled in when doing handlebars.compile(html)(data)
             *
             * if there are replacement tokens like:
             *    <input type="text" value="{{variables.userName}}" name="userName"/>
             * it will work fine
             *
             * this loop is a fail safe so all forms are filled in with the task's variable values
             */
            _.forEach(_.keys(this.data.task.variables), function (key) {
                _this2.$el.find("[name=" + key + "]").val(_this2.data.task.variables[key]);
            });

            this.$el.find("#taskForm :input").prop("disabled", true);

            this.$el.find("#taskForm .error").hide();
        }
    });

    return new TaskInstanceView();
});
