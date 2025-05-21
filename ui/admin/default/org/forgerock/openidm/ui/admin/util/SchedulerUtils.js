"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash"], function ($, _) {
    var obj = {};

    /**
     * Determines type of scheduler job and puts together an object
     * with info including "type", "display" (version used for display purposes),
     * "meta" (meta-data about the specific type of object),
     * and "metaSource" (the job.invokeContext property being used to get the meta property)
     *
     * @param {object} schedule
     * @returns {object} - an object representing schedule type data example:
     * {
     *     "type": "recon",
     *     "display": "Reconciliation",
     *     "meta": "managedUser_systemLdapAccounts",
     *     "metaSource": "mapping"
     * }
     */
    obj.getScheduleTypeData = function (schedule) {
        var scheduleTypeData = {},
            invokeContext = schedule.invokeContext,
            action = invokeContext.action,
            script = invokeContext.script,
            maxMetaLength = 45,
            metaData,
            clusteredReconInfo;

        if (action && action === "liveSync") {
            metaData = invokeContext.source;
            scheduleTypeData = {
                type: "liveSync",
                display: $.t("templates.scheduler.liveSync"),
                meta: metaData,
                metaSource: "source"
            };
        } else if (action && action === "reconcile") {
            var display = $.t("templates.scheduler.reconciliation"),
                type = "recon";

            metaData = invokeContext.mapping;

            if (schedule._id.indexOf("clustered_recon-") === 0) {
                clusteredReconInfo = this.parseClusteredReconJobId(schedule._id);
                display = $.t("templates.scheduler.clustered") + " " + display + " - " + $.t("dashboard.clusterStatusWidget." + clusteredReconInfo.phase);
                type = "clustered-recon";
            }

            scheduleTypeData = {
                type: type,
                display: display,
                meta: metaData,
                metaSource: "mapping"
            };
        } else if (_.has(schedule.invokeContext, "task")) {
            if (invokeContext.scan) {
                metaData = invokeContext.scan.object;
            }

            scheduleTypeData = {
                type: "taskScanner",
                display: $.t("templates.scheduler.taskScanner"),
                meta: metaData,
                metaSource: "scan.object"
            };
        } else if (script && script.source && script.source.indexOf("roles/onSync-roles") > -1) {
            if (script.globals && script.globals.object) {
                metaData = script.globals.object.name;
            }

            scheduleTypeData = {
                type: "temporalConstraintsOnRole",
                display: $.t("templates.scheduler.temporalConstraintsOnRole"),
                meta: metaData,
                metaSource: "script.globals.object.name"
            };
        } else if (script && script.source && script.source.indexOf("triggerSyncCheck") > -1) {
            if (script.globals) {
                metaData = script.globals.userId;
            }

            scheduleTypeData = {
                type: "temporalConstraintsOnGrant",
                display: $.t("templates.scheduler.temporalConstraintsOnGrant"),
                meta: metaData,
                metaSource: "script.globals.userId"
            };
        } else if (script) {
            scheduleTypeData = {
                type: "genericScript",
                display: $.t("templates.scheduler.script")
            };

            if (script.source) {
                scheduleTypeData.meta = script.source;
                scheduleTypeData.metaSource = "script.source";
            }

            if (script.file) {
                scheduleTypeData.meta = script.file;
                scheduleTypeData.metaSource = "script.file";
            }
        }

        //if this schedule's _id is not a GUID then it acts as the "name" to display or
        //if meta is empty or undefined we need to handle this situation so the UI does not stop working
        if (!obj.scheduleIdIsGUID(schedule._id) || !scheduleTypeData.meta) {
            scheduleTypeData.meta = schedule._id;
        }

        //make sure the meta data is truncated for display purposes
        //script type meta could be a very long string
        if (scheduleTypeData.meta.length > maxMetaLength) {
            scheduleTypeData.meta = scheduleTypeData.meta.substring(0, maxMetaLength) + "...";
        }

        //set the hasSchedule flag
        scheduleTypeData.hasSchedule = schedule.schedule ? true : false;

        return scheduleTypeData;
    };
    /**
     * This function takes a scheduleId that looks like this =>
     * "clustered_recon-1d0f3e19-e999-4d96-a8fb-54e2486552c2-105717-sourcePage-AG91PXBlb3BsZQB1aWQ9Ymh2dW8ubXlpYQ==:0"
     * and parses it into a representative object.
     *
     * @returns {object} - {phase: "sourcePage", reconId: "1d0f3e19-e999-4d96-a8fb-54e2486552c2-105717", pagingCookie: "AG91PXBlb3BsZQB1aWQ9Ymh2dW8ubXlpYQ==:0"}
     **/
    obj.parseClusteredReconJobId = function (scheduleId) {
        var idArray = scheduleId.split("-"),
            //["clustered_recon", "1d0f3e19", "e999", "4d96", "a8fb", "54e2486552c2", "105717", "sourcePage", "AG91PXBlb3BsZQB1aWQ9Ymh2dW8ubXlpYQ==:0"]
        reconId,
            phase,
            pagingCookie;

        //get rid of the last item if it is a paging Cookie
        if (idArray.length === 9) {
            pagingCookie = idArray.pop();
        }

        //phase is the last item
        phase = idArray.pop();
        //skip the first element which is "clustered_recon"
        //the rest of the elements comprise the reconId
        reconId = idArray.slice(1).join("-");

        return {
            phase: phase,
            reconId: reconId,
            pagingCookie: pagingCookie
        };
    };
    /**
     * This function checks to see if a scheduleId is a GUID
     *
     * @returns {boolean}
     **/
    obj.scheduleIdIsGUID = function (scheduleId) {
        //if the scheduleId contains a "-" then we are assuming it is a GUID
        //because the UI does not allow special chars in schedule id's on create
        return scheduleId.indexOf("-") > -1;
    };

    /**
     * This function takes a liveSync schedule string and returns the seconds portion
     *
     * @param scheduleString {string}
     * @returns {string}
     **/
    obj.getSecondsFromLiveSyncScheduleString = function (scheduleString) {
        return scheduleString.split(" ")[0].split("/")[1]; //"*/1 * * * * ?" => "1"
    };

    return obj;
});
