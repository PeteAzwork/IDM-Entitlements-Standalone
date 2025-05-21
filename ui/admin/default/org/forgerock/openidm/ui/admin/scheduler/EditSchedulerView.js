"use strict";

/*
 * Copyright 2016-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "moment", "moment-timezone", "handlebars", "org/forgerock/openidm/ui/admin/scheduler/AbstractSchedulerView", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "org/forgerock/openidm/ui/admin/delegates/ClusterDelegate", "org/forgerock/openidm/ui/admin/util/ClusterUtils", "org/forgerock/openidm/ui/admin/delegates/SchedulerDelegate", "org/forgerock/openidm/ui/admin/util/SchedulerUtils", "org/forgerock/commons/ui/common/util/UIUtils"], function ($, _, moment, momentTimezone, handlebars, AbstractSchedulerView, BootstrapDialogUtils, ClusterDelegate, ClusterUtils, SchedulerDelegate, SchedulerUtils, UIUtils) {
    var EditSchedulerView;

    EditSchedulerView = AbstractSchedulerView.extend({
        template: "templates/admin/scheduler/EditSchedulerViewTemplate.html",
        isNew: false,
        events: _.assignIn({
            "click #nodeDetailsButton": "openNodeDetailDialog"
        }, AbstractSchedulerView.prototype.events),
        render: function render(args) {
            var _this = this;

            this.data.isNew = false;
            this.data.schedulerId = args[0];

            $.when(SchedulerDelegate.specificSchedule(args[0]), SchedulerDelegate.getScheduleConfig(args[0])).then(function (schedule) {
                if (schedule.triggers.length > 0) {
                    _this.data.nodeId = schedule.triggers[0].nodeId;
                }

                if (schedule.invokeContext && schedule.invokeContext.scan) {
                    _this.data.scriptProperty = schedule.invokeContext.scan.taskState.started.split("/")[1] || "";
                }

                schedule = _.set(schedule, "invokeService", _this.serviceType(schedule.invokeService));
                schedule = _.omit(schedule, "triggers", "nextRunDate", "previousRunDate");

                _this.data.schedule = _.cloneDeep(schedule);
                _this.schedule = _.cloneDeep(schedule);
                _this.data.scheduleJSON = JSON.stringify(schedule, null, 4);
                _this.data.sheduleTypeData = SchedulerUtils.getScheduleTypeData(schedule);
                _this.data.schedule.saveToConfig = true;

                //if this schedule is a GUID we know it was created programatically
                //we do not want to be able to switch these schedules to be saved to config
                if (SchedulerUtils.scheduleIdIsGUID(_this.data.schedule._id)) {
                    _this.data.schedule.saveToConfig = false;
                }

                _this.renderForm(args[1], function () {
                    if (_this.$el.find("#toggle-trigger").prop('checked')) {
                        _this.$el.find("#advancedTimeFields").removeClass("hidden");
                    } else {
                        _this.$el.find("#advancedTimeFields").addClass("hidden");
                    }

                    _this.disable(".save-cancel-btn");
                });
            });
        },
        /**
        * This function is called on node row click and opens up a BootstrapDialog which loads node details
        **/
        openNodeDetailDialog: function openNodeDetailDialog(event) {
            var nodeId = $(event.target).closest("a").attr("nodeId");

            event.preventDefault();

            ClusterDelegate.getIndividualNode(nodeId).then(function (node) {
                ClusterUtils.getDetailsForNodes([node]).then(function (nodes) {
                    //since we are passing in only one node we need node[0]
                    UIUtils.preloadPartial("partials/util/_clusterNodeDetail.html").then(function () {
                        var details = $(handlebars.compile("{{> util/_clusterNodeDetail }}")(node));

                        BootstrapDialogUtils.createModal({
                            title: nodes[0].instanceId,
                            message: details,
                            buttons: [{
                                label: $.t('common.form.close'),
                                id: "clusterNodeDetailDialogCloseBtn",
                                action: function action(dialogRef) {
                                    dialogRef.close();
                                }
                            }]
                        }).open();
                    });
                });
            });
        }

    });

    return new EditSchedulerView();
});
