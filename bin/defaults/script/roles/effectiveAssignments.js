/*
 * Copyright 2014-2019 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/**
 * Calculates the effective assignments, based on the effective roles.
 */

/*global object */

var effectiveAssignments = [],
    effectiveRoles = object[effectiveRolesPropName];

logger.debug("Invoked effectiveAssignments script on property {}", propertyName);

// Allow for configuration in virtual attribute config, but default
if (effectiveRolesPropName === undefined) {
    var effectiveRolesPropName = "effectiveRoles";
}

logger.trace("Configured effectiveRolesPropName: {}", effectiveRolesPropName);

var assignmentMap = {};
if (effectiveRoles != null)  {
    for (var i = 0; i < effectiveRoles.length; i++) {
        var roleId = effectiveRoles[i];

        // Only try to retrieve role details for role ids in URL format
        if (roleId !== null && roleId._ref !== null && roleId._ref.indexOf("managed/role") != -1) {
            var roleRelationship =  openidm.read(roleId._ref, null, [ "assignments" ]);
            logger.debug("Role relationship read: {}", roleRelationship);

            if (roleRelationship != null) {
                for (var assignmentName in roleRelationship.assignments) {
                    var assignmentRelationship = roleRelationship.assignments[assignmentName];
                    var assignment = openidm.read(assignmentRelationship._ref, null);
                    if (assignment !== null) {
                        assignmentMap[assignmentRelationship._ref] = assignment;
                    }
                }
            } else {
                logger.debug("No role details could be read from: {}", roleId._ref);
            }
        } else {
            logger.debug("Role does not point to a resource, will not try to retrieve assignment details for {}", roleId);
        }
    }
}

// Add all assignments to the effectiveAssignments array
for (var assignment in assignmentMap) {
    effectiveAssignments.push(assignmentMap[assignment]);
    logger.trace("effectiveAssignment: {}", assignmentMap[assignment]);
}

logger.debug("Calculated effectiveAssignments: {}", effectiveAssignments);

effectiveAssignments;

