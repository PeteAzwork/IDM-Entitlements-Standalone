"use strict";

/*
 * Copyright 2014-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["lodash", "jquery", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate"], function (_, $, Constants, AbstractDelegate, ConfigDelegate) {

    var obj = new AbstractDelegate(Constants.host + Constants.context + "/scheduler/job"),
        removeNonScheduleProperties = function removeNonScheduleProperties(schedule) {
        var mutatedSchedule = _.cloneDeep(schedule);

        //remove extraneous properties from schedule
        delete mutatedSchedule.saveToConfig;
        delete mutatedSchedule._id;

        return mutatedSchedule;
    };

    obj.availableSchedules = function () {
        return obj.serviceCall({
            url: "?_queryFilter=true&_fields=_id",
            type: "GET"
        });
    };

    obj.availableLiveSyncSchedulesForMapping = function (mapping) {
        //we need recon types that match this mapping and livesync types that match the source of the mapping
        return obj.serviceCall({
            url: '?_queryFilter=/invokeContext/action eq "liveSync" and /invokeContext/source eq "' + mapping.source + '"',
            type: "GET"
        });
    };

    obj.specificSchedule = function (scheduleId, suppressErrors) {
        var options = {
            url: "/" + scheduleId,
            type: "GET"
        };

        if (suppressErrors) {
            options.errorsHandlers = {
                "notFound": {
                    status: "404"
                }
            };
        }

        return obj.serviceCall(options).then(function (resp) {
            return resp;
        });
    };

    obj.saveJob = function (schedule) {
        //if there is no _id do a create
        if (schedule._id) {
            return obj.serviceCall({
                url: "/" + schedule._id,
                type: "PUT",
                data: JSON.stringify(schedule)
            });
        } else {
            return obj.serviceCall({
                url: "?_action=create",
                type: "POST",
                data: JSON.stringify(schedule)
            });
        }
    };

    obj.deleteJob = function (scheduleId) {
        return obj.serviceCall({
            url: "/" + scheduleId,
            type: "DELETE"
        });
    };

    obj.getScheduleConfig = function (scheduleId) {
        return ConfigDelegate.readEntityAlways("schedule/" + scheduleId).then(function (schedule) {
            return schedule;
        });
    };

    obj.updateScheduleConfig = function (schedule) {
        var promise = $.Deferred(),
            mutatedSchedule = removeNonScheduleProperties(schedule);

        ConfigDelegate.updateEntity("schedule/" + schedule._id, mutatedSchedule).then(function (response) {
            //need to delay the response here to make sure the config changes have gone through
            //before trying subsequent reads on scheduler/job
            _.delay(function () {
                promise.resolve(response);
            }, 1000);
        });

        return promise;
    };

    obj.addScheduleConfig = function (schedule) {
        var promise = $.Deferred(),
            mutatedSchedule = removeNonScheduleProperties(schedule);

        ConfigDelegate.createEntity("schedule/" + schedule._id, mutatedSchedule).then(function (response) {
            // this response is a schedule config read and the _id contains the text "schedule/"
            // we need to remove that so the returned schedule's _id is the _id of the actual schedule object
            response._id = response._id.replace("schedule/", "");

            //need to delay the response here to make sure the config changes have gone through
            //before trying subsequent reads on scheduler/job
            _.delay(function () {
                promise.resolve(response);
            }, 1000);
        });

        return promise;
    };

    obj.deleteScheduleConfig = function (scheduleId) {
        return ConfigDelegate.deleteEntity("schedule/" + scheduleId);
    };

    obj.saveSchedule = function (scheduleId, schedule) {
        return obj.getScheduleConfig(scheduleId).then(function (scheduleConfig) {
            if (!schedule.saveToConfig) {
                // This schedule was created programmatically
                // We do not want to save to config
                return obj.saveJob(schedule);
            } else if (!scheduleConfig) {
                // This was previously saved as a job
                // Update to save as config and remove the job
                return obj.deleteJob(schedule._id).then(function () {
                    return obj.addScheduleConfig(schedule);
                });
            } else {
                return obj.updateScheduleConfig(schedule);
            }
        });
    };

    obj.deleteSchedule = function (scheduleId) {
        return obj.getScheduleConfig(scheduleId).then(function (scheduleConfig) {
            if (scheduleConfig) {
                return obj.deleteScheduleConfig(scheduleId);
            } else {
                return obj.deleteJob(scheduleId);
            }
        });
    };

    obj.addSchedule = function (schedule) {
        return obj.addScheduleConfig(schedule);
    };

    obj.pauseJobs = function () {
        return obj.serviceCall({
            url: "?_action=pauseJobs",
            type: "POST"
        });
    };

    obj.resumeJobs = function () {
        return obj.serviceCall({
            url: "?_action=resumeJobs",
            type: "POST"
        });
    };

    obj.listCurrentlyExecutingJobs = function () {
        return obj.serviceCall({
            url: "?_action=listCurrentlyExecutingJobs",
            type: "POST"
        });
    };

    obj.getReconSchedulesByMappingName = function (mappingName) {
        return obj.serviceCall({
            url: "?_queryFilter=invokeContext/action/ eq 'reconcile' and invokeContext/mapping/ eq '" + mappingName + "'",
            type: "GET"
        }).then(function (response) {
            return response.result;
        });
    };

    obj.getLiveSyncSchedulesByConnectorName = function (connectorName) {
        return obj.serviceCall({
            url: "?_queryFilter=invokeContext/action/ eq 'liveSync'",
            type: "GET"
        }).then(function (response) {
            return _.filter(response.result, function (sched) {
                if (sched.invokeContext.source && sched.type === "cron") {
                    return sched.invokeContext.source.split("/")[1] === connectorName;
                } else {
                    return false;
                }
            });
        });
    };
    /**
    * @returns {promise} - an array of scheduler jobs that are currently running on all cluster nodes
    **/
    obj.getSchedulerTriggersForAllNodes = function () {
        return obj.serviceCall({
            url: "?_queryFilter=persisted eq true and triggers/0/nodeId pr and triggers/0/state gt 0",
            type: "GET",
            suppressSpinner: true
        }).then(function (response) {
            return response.result;
        }, function () {
            return;
        });
    };

    obj.validate = function (cronString) {
        return obj.serviceCall({
            url: "?_action=validateQuartzCronExpression",
            type: "POST",
            data: JSON.stringify({ "cronExpression": cronString })
        });
    };

    return obj;
});
