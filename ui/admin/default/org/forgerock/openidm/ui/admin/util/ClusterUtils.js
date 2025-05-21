"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/delegates/ClusterDelegate", "org/forgerock/openidm/ui/admin/delegates/SchedulerDelegate", "org/forgerock/openidm/ui/admin/util/SchedulerUtils", "moment"], function ($, _, ClusterDelegate, SchedulerDelegate, SchedulerUtils, moment) {
    var obj = {};

    obj.getClusterData = function () {
        var _this = this;

        //get the info for all the nodes in the cluster
        return ClusterDelegate.getNodes().then(function (cluster) {
            return _this.getDetailsForNodes(cluster.result);
        });
    };
    /**
     * This function takes a list of nodes, looks for any jobs that may be running
     * on any of those nodes, matches nodes with jobs, and returns an array of node objects
     * with a "runningJobs" array attached
     *
     * @param {array} clusterNodes - an array of node objects to gather details on
     * @returns {promise}
     **/
    obj.getDetailsForNodes = function (clusterNodes) {
        //get all the scheduler/job triggers that have been picked up by any of these nodes
        //and return an array of node objects with info about any currently running jobs on that node
        return SchedulerDelegate.getSchedulerTriggersForAllNodes().then(function (jobs) {
            //loop over each clusterNode
            return _.map(clusterNodes, function (node) {
                var runningJobs = [];
                //loop over all jobs, match up the ones for this node,
                //and add them to the runningJobs array
                _.forEach(jobs, function (job) {
                    if (job.triggers[0] && job.triggers[0].nodeId === node.instanceId) {
                        runningJobs.push({
                            job: job,
                            link: "scheduler/edit/" + job._id + "/",
                            typeData: SchedulerUtils.getScheduleTypeData(job)
                        });
                    }
                });
                //convert startup, shutdown and detectedDown into readable dates
                node.startup = moment(node.startup).format('MMMM Do YYYY, h:mm:ss a');
                if (node.shutdown) {
                    node.shutdown = moment(node.shutdown).format('MMMM Do YYYY, h:mm:ss a');
                }

                if (_.has(node, "recovery.detectedDown")) {
                    node.recovery.detectedDown = moment(node.recovery.detectedDown).format('MMMM Do YYYY, h:mm:ss a');
                }
                //add the runningJobs and jobCount to the node object
                return _.assignIn(node, {
                    runningJobs: runningJobs,
                    jobCount: runningJobs.length
                });
            });
        });
    };

    return obj;
});
