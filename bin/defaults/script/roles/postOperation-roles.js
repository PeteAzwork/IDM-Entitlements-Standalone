/*
 * Copyright 2016-2019 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/**
 * Note: this script is no longer used by the IDM code-base. Temporal constraint enforcement on roles has been moved
 * into java as part of OPENIDM-14093. To engage the java-based functionality, add '"isTemporalConstraint" : true' to
 * the property in the role object which defines the temporal constraint value limiting role applicability.
 * Script maintained in IDM code-base for backwards-compatibility.
 * 
 * Processes post create/updated/delete logic for roles.
 *
 * Globals: request, context, oldObject, newObject, resourceName
 */

/**
 * Manages schedules associated with temporalConstraints on roles that have been created, updated, or deleted.
 */
(function () {
    exports.manageTemporalConstraints = function (resourceName) {
        manageTemporalConstraintJobsForRoles();
    };
}());

function  manageTemporalConstraintJobsForRoles() {
    switch (request.method) {
    case "create":
        if (hasConstraints(newObject)) {
            createJobsForRoleConstraints(newObject.temporalConstraints);
        }
        break;
    case "patch":
    case "update":
        if (hasConstraints(newObject) && !hasConstraints(oldObject)) {
            createJobsForRoleConstraints(newObject.temporalConstraints);
        } else if (!hasConstraints(newObject) && hasConstraints(oldObject)) {
            deleteJobsForRoleConstraints(oldObject.temporalConstraints);
        } else if (hasConstraints(newObject) && hasConstraints(oldObject)) {
            var index = 0,
            oldConstraints = oldObject.temporalConstraints,
            newConstraints = newObject.temporalConstraints;
            while (index < oldConstraints.length || index < newConstraints.length) {
                var oldConstraint = index < oldConstraints.length
                ? oldConstraints[index]
                : null,
                newConstraint = index < newConstraints.length
                ? newConstraints[index]
                : null;
                if (JSON.stringify(oldConstraint) !== JSON.stringify(newConstraint)) {
                    if (oldConstraint !== null) {
                        deleteJobsForRoleConstraint(index);
                    }
                    if (newConstraint !== null) {
                        createJobForRoleConstraint(newConstraint, index);
                    }
                }
                index++;
            }
        }
        break;
    case "delete":
        if (hasConstraints(oldObject)) {
            deleteJobsForRoleConstraints(oldObject.temporalConstraints);
        }
        break;
    }
};

/**
 * Creates new scheduled jobs that will fire when the time window of temporal constraints on a role start and end.
 *
 * @param constraint an array of objects representing temporal constraints.
 */
function createJobsForRoleConstraints(constraints) {
    for (index in constraints) {
        createJobForRoleConstraint(constraints[index], index);
    }
};

/**
 * Creates new scheduled jobs that will fire when the time window of the temporal constraint on a role starts and ends.
 *
 * @param constraint an array of objects representing temporal constraints.
 */
function createJobForRoleConstraint(constraint, index) {
    createJobsForConstraint(
            constraint,
            resourceName.toString().replace('/', '-') + "-temporalConstraint-" + index + "-start",
            resourceName.toString().replace('/', '-') + "-temporalConstraint-" + index + "-end",
            {
                "type" : "text/javascript",
                "source" : "require('roles/onSync-roles').syncUsersOfRoles(resourceName, object, object, null);",
                "globals" : {
                    "object" : newObject,
                    "resourceName" : resourceName.toString()
                }
            });
}

/**
 * Deletes all scheduled jobs for all temporal constraints on a role.
 *
 * @param constraint an array of objects representing temporal constraints.
 */
function deleteJobsForRoleConstraints(constraints) {
    for (index in constraints) {
        deleteJobsForRoleConstraint(index);
    }
};

/**
 * Deletes all scheduled jobs for a temporal constraints on a role.
 *
 * @param constraint an array of objects representing temporal constraints.
 */
function deleteJobsForRoleConstraint(index) {
    deleteJobsForConstraint(
            resourceName.toString().replace('/', '-') + "-temporalConstraint-" + index + "-start",
            resourceName.toString().replace('/', '-') + "-temporalConstraint-" + index + "-end",
            index);
};

/**
 * Creates new scheduled jobs that will fire when the time window of the temporal constraint starts and ends.
 *
 * @param constraint an object representing a temporal constraint.
 * @param index the index of the constraint in the array of constraints defined in the role.
 */
function createJobsForConstraint(constraint, startJobId, endJobId, script) {
    logger.debug("creating new jobs for: " + constraint);
    var dateUtil = org.forgerock.openidm.util.DateUtil.getDateUtil(),
        startDate = dateUtil.getStartOfInterval(constraint.duration),
        endDate = dateUtil.getEndOfInterval(constraint.duration),
        startExpression = dateUtil.getSchedulerExpression(startDate.plusSeconds(1)),
        endExpression = dateUtil.getSchedulerExpression(endDate.plusSeconds(1));

    var startJob = {
            "type" : "cron",
            "schedule" : startExpression,
            "misfirePolicy" : "doNothing",
            "persisted" : true,
            "invokeService" : "script",
            "invokeContext" : {
                "script" : script
            }
        },
        endJob = {
            "type" : "cron",
            "schedule" : endExpression,
            "misfirePolicy" : "doNothing",
            "persisted" : true,
            "invokeService" : "script",
            "invokeContext" : {
                "script" : script
            }
        };

    if (dateUtil.isAfterNow(startDate)) {
        logger.debug("create startJob: " + startJobId);
        try {
            openidm.create("scheduler/job", startJobId, startJob);
        } catch (e) {
            logger.error("Error while attempting to create start schedule for temporal constraint on resource "
                + resourceName + " with id of: " + startJobId);
        }
    } else {
        logger.debug("Not creating start job, is in the past");
    }
    if (dateUtil.isAfterNow(endDate)) {
        logger.debug("create endJob: " + endJobId);
        try {
            openidm.create("scheduler/job", endJobId, endJob);
        } catch (e) {
            logger.error("Error while attempting to create end schedule for temporal constraint on resource "
                + resourceName + " with id of: " + endJobId);
        }
    } else {
        logger.debug("Not creating end job, is in the past");
    }
    return true;
};

/**
 * Deletes all scheduled jobs for this temporal constraint.
 *
 * @param constraint an object representing a temporal constraint
 */
function deleteJobsForConstraint(startJobId, endJobId, index) {
    try {
        logger.debug("delete startJob: " + resourceName);
        openidm.delete("scheduler/job/" + startJobId, null);
    } catch (e) {
        if (e.javaException.getCode() !== 404) {
            logger.error("Error while attempting to delete start schedule for temporal constraint on resource "
                + resourceName + " with id of: " + startJobId);
        } else {
            //only at debug as removing a temporal constraint which has passed should fail, as trigger has already fired.
            logger.debug("Error while attempting to delete start schedule for temporal constraint on resource "
                + resourceName + " with id of: " + startJobId);
        }
    }
    try {
        logger.debug("delete endJob:   " + resourceName);
        openidm.delete("scheduler/job/" + endJobId, null);
    } catch (e) {
        if (e.javaException.getCode() !== 404) {
            logger.error("Error while attempting to delete end schedule for temporal constraint on resource "
                + resourceName + " with id of: " + endJobId);
        } else {
            //only at debug as removing a temporal constraint which has passed should fail, as trigger has already fired.
            logger.debug("Error while attempting to delete end schedule for temporal constraint on resource "
                + resourceName + " with id of: " + endJobId);
        }
    }
};

/**
 * Returns true if the object's temporalConstraints is defined and not null, false otherwise.
 *
 * @param object a object.
 * @returns true if the object's temporalConstraints is defined and not null, false otherwise.
 */
function hasConstraints(object) {
    return (object.temporalConstraints !== undefined && object.temporalConstraints !== null);
};

/**
 * Returns true if the supplied list is defined, not null, and not empty.
 *
 * @param list a list.
 * @returns true if the supplied list is defined, not null, and not empty.
 */
function isNonEmptyList(list) {
    if (list !== undefined && list !== null && list.length > 0) {
        return true;
    }
    return false;
}
