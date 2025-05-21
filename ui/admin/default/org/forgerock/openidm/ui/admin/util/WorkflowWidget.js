"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/openidm/ui/admin/delegates/WorkflowDelegate", "org/forgerock/commons/ui/common/main/ValidatorsManager"], function ($, _, AbstractView, WorkflowDelegate, ValidatorsManager) {

    var workflowInstance = {},
        WorkflowWidget = AbstractView.extend({
        template: "templates/admin/util/WorkflowWidgetTemplate.html",
        noBaseTemplate: true,
        events: {
            "change #workflowList": "changeSchema"
        },
        model: {
            changeCallback: _.noop(),
            key: "",
            params: {}
        },

        /**
         * @param args
         *   {
         *       params: {
         *           name1: "value1",
         *           name2: "script2"
         *       },
         *       sync: boolean,
         *       key: string,
         *       changeCallback: function(){},
         *       element: $.el,
         *       context: {}
         *   }
         *
         * @param callback
         */
        render: function render(args, callback) {
            var selected = false;
            this.model.callback = callback;

            function myParentRender() {
                this.parentRender(_.bind(function () {
                    if (selected !== false) {
                        _.forEach(selected.params, _.bind(function (param, id) {
                            this.$el.find("#" + id).find("textarea").val(param);
                        }, this));

                        this.$el.find("#workflowList").val(selected._id);
                    }

                    ValidatorsManager.bindValidators(this.$el);
                    ValidatorsManager.validateAllFields(this.$el);

                    if (callback) {
                        callback(this.getValid());
                    }
                }, this));
            }

            this.data = {
                workflows: [],
                sync: false,
                selectedWorkflow: {},
                context: ""
            };

            this.element = args.element;

            if (args.changeCallback) {
                this.model.changeCallback = args.changeCallback;
            }

            if (args.key) {
                this.model.key = args.key;
            }

            if (args.context && !_.isString(args.context)) {
                this.data.context = JSON.stringify(args.context, null, '\t');
            } else {
                this.data.context = args.context;
            }

            if (args.params) {
                this.model.params = args.params;
            }

            if (args.sync) {
                this.data.sync = args.sync;
            }

            if (args.workflows) {
                this.data.workflows = args.workflows;
                selected = _.find(this.data.workflows, { "key": this.model.key });
                this.getWorkflowSchema(selected).then(_.bind(function (properties) {
                    this.data.properties = properties;
                    _.bind(myParentRender, this)();
                }, this));
            } else {
                this.getWorkflowList(this.model.key, this.model.params).then(_.bind(function (workflows) {
                    if (workflows.workflowList.length > 0) {
                        selected = workflows.selectedWorkflow || workflows.workflowList[0];
                        this.data.workflows = workflows.workflowList;
                        this.getWorkflowSchema(selected).then(_.bind(function (properties) {
                            this.data.properties = properties;
                            _.bind(myParentRender, this)();
                        }, this));
                    } else {
                        this.data.properties = [];
                        this.data.workflows = [];
                        _.bind(myParentRender, this)();
                    }
                }, this));
            }
        },

        /**
         * Gets a list of all workflows and all necessary properties
         *
         * @param selectedKey
         * @param params
         * @returns {array}
         *      "workflowList": A list of workflow objects
         *      "selectedWorkflow": The selected workflow object
         *
         */
        getWorkflowList: function getWorkflowList(selectedKey, params) {
            var workflowList = [],
                promise = $.Deferred(),
                selectedWorkflow = null;

            WorkflowDelegate.availableWorkflows().then(_.bind(function (workflowData) {

                _.forEach(workflowData.result, function (workflow) {
                    workflowList.push({
                        "key": workflow.key,
                        "name": workflow.name,
                        "_id": workflow._id
                    });

                    if (workflow.key === selectedKey) {
                        selectedWorkflow = _.clone(_.last(workflowList));
                        selectedWorkflow.params = params;
                    }
                });

                promise.resolve({
                    "workflowList": workflowList,
                    "selectedWorkflow": selectedWorkflow
                });
            }, this));

            return promise;
        },

        /**
         * Gets a detailed list of properties for a given workflow.
         *
         * @param workflow
         * @returns workflowProperties {array}
         */
        getWorkflowSchema: function getWorkflowSchema(workflow) {
            var promise = $.Deferred(),
                workflowProperties = [];

            WorkflowDelegate.workflowFormProperties(workflow._id).then(_.bind(function (result) {

                if (_.has(result, "startFormHandler") && _.has(result.startFormHandler, "formPropertyHandlers")) {

                    _.forEach(result.startFormHandler.formPropertyHandlers, function (property) {
                        if (property.id[0] !== "_") {
                            workflowProperties.push({
                                "id": property.id,
                                "name": property.name,
                                "required": property.required,
                                "type": property.type.name
                            });
                        }
                    });
                }

                promise.resolve(workflowProperties);
            }, this));

            return promise;
        },

        isValid: function isValid() {
            return $(".workflow-body textarea[data-validator]").length === 0 || ValidatorsManager.formValidated(this.$el);
        },

        changeSchema: function changeSchema() {
            this.render({
                "params": {},
                "sync": this.data.sync,
                "key": _.find(this.data.workflows, { "_id": this.$el.find("#workflowList").val() }).key,
                "changeCallback": this.model.changeCallback,
                "workflows": this.data.workflows,
                "element": this.element,
                "context": this.data.context
            }, this.model.callback);

            if (this.model.changeCallback) {
                this.model.changeCallback();
            }
        },

        getConfiguration: function getConfiguration() {
            var config = _.find(this.data.workflows, { "_id": this.$el.find("#workflowList").val() }),
                properties = {},
                file = "workflow/triggerWorkflowGeneric.js";

            if (this.data.sync) {
                file = "workflow/triggerWorkflowFromSync.js";
            }
            _.forEach(this.$el.find(".workflowProperty"), function (property) {
                properties[property.id] = $(property).find("textarea").val();
            });

            return {
                "type": "text/javascript",
                "file": file,
                "globals": {
                    "workflowReadable": config.name,
                    "workflowName": config.key,
                    "params": properties
                }
            };
        },

        getValid: function getValid() {
            return this.data.workflows.length > 0;
        }
    });

    workflowInstance.generateWorkflowWidget = function (loadingObject, callback) {
        var widget = {};
        $.extend(true, widget, new WorkflowWidget());
        widget.render(loadingObject, callback);
        return widget;
    };

    return workflowInstance;
});
