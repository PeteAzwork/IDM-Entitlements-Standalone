"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["lodash", "moment", "moment-timezone", "org/forgerock/openidm/ui/admin/scheduler/AbstractSchedulerView", "org/forgerock/commons/ui/common/main/ValidatorsManager"], function (_, moment, momentTimezone, AbstractSchedulerView, validatorsManager) {
    var AddSchedulerView;

    AddSchedulerView = AbstractSchedulerView.extend({
        template: "templates/admin/scheduler/AddSchedulerViewTemplate.html",
        isNew: true,
        render: function render(args, callback) {
            var _this = this;

            this.data.isNew = true;
            this.data.schedule = {
                "isCron": false,
                "repeatInterval": null,
                "repeatCount": null,
                "enabled": false,
                "persisted": true,
                "type": "simple",
                "misfirePolicy": "fireAndProceed",
                "invokeService": "sync",
                "invokeLogLevel": "info",
                "timeZone": null,
                "startTime": null,
                "endTime": null,
                "concurrentExecution": false,
                "invokeContext": {
                    "action": "reconcile"
                }
            };

            if (this.data.scriptProperty) {
                delete this.data.scriptProperty;
            }

            this.schedule = _.cloneDeep(this.data.schedule);
            _.bindAll(this);

            this.renderForm(args[0], function () {
                validatorsManager.bindValidators(_this.$el.find("#scheduleIdContainer"));
                validatorsManager.validateAllFields(_this.$el.find("#scheduleIdContainer"));
                _this.$el.find("#submitSchedule").attr("disabled", true);
                _this.$el.find("#schedule-_id").focus();
            });

            if (callback) {
                callback();
            }
        },
        validationSuccessful: function validationSuccessful(event) {
            AbstractSchedulerView.prototype.validationSuccessful(event);

            this.$el.find("#submitSchedule").attr("disabled", false);
        },

        validationFailed: function validationFailed(event, details) {
            AbstractSchedulerView.prototype.validationFailed(event, details);

            this.$el.find("#submitSchedule").attr("disabled", true);
        },

        resetSchedule: _.noop
    });

    return new AddSchedulerView();
});
