/*
 * Copyright 2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */


/**
 * Function to assign privileges to org admins/owners on the basis of a user's adminOfOrg and ownerOfOrg relationship.
 */
(function () {
    const orgIdPlaceholder = "__org_id_placeholder__";

    exports.assignPrivilegesToUser = function(resource, security, properties, subjectMapping, existingPrivileges, privilegesDefinition, privilegeAssignmentDefinition, augmentYield) {
        let returnMap = isDefinedAndNotNull(augmentYield) ? augmentYield : {};
        if (isUndefinedOrNull(privilegesDefinition) || isUndefinedOrNull(privilegeAssignmentDefinition)) {
            return returnMap;
        }
        let privilegeConfig = readConfig(privilegesDefinition,
                "Privilege definition " + privilegesDefinition + " config is missing or empty."),
            privileges = privilegeConfig.privileges,
            privilegeAssignmentConfig = readConfig(privilegeAssignmentDefinition,
                "Organization privilege assignment " + privilegeAssignmentDefinition + " config is missing or empty."),
            privilegeAssignments = privilegeAssignmentConfig.privilegeAssignments,
            resourceId = security.authorization.id,
            resourceCollection = security.authorization.component,
            localResource = readResourceIfNecessary(resource, resourceId, resourceCollection, properties, subjectMapping);

        let calculatedPrivileges = privilegeAssignments.map(privilegeAssignment => {
            let refIds = refIdsInRelationship(localResource, privilegeAssignment.relationshipField);
            if (isNonEmptyArray(refIds)) {
                return aggregatePrivileges(
                    privilegeAssignment.privileges.map(privilegeName =>
                        privileges.find(privilege =>
                            privilege.name === privilegeName)),
                    refIds);
            } else {
                return [];
            }
        }).reduce((pre, cur) => pre.concat(cur));

        // propagate any passed-in privileges
        returnMap.privileges = isNonEmptyArray(existingPrivileges)
            ? calculatedPrivileges.concat(existingPrivileges)
            : calculatedPrivileges;
        return returnMap;
    };

    function readConfig(configObject, message) {
        let config = "config";
        let path = configObject.startsWith("/")
            ? config.concat(configObject)
            : config.concat("/", configObject);
        let privileges = openidm.read(path);
        if (isUndefinedOrNull(privileges)) {
            throw {
                "code" : 404,
                "message" : message
            };
        }
        return privileges;
    }

    function readResourceIfNecessary(resource, resourceId, resourceCollection, properties, subjectMapping) {
        if ((resource === null) && isDefinedAndNotNull(resourceId) && isDefinedAndNotNull(resourceCollection)) {
            let additionalUserFields = parseAdditionalUserFields(properties, subjectMapping);
            let path = resourceCollection.endsWith("/") ? resourceCollection.concat(resourceId) : resourceCollection.concat("/", resourceId);
            let managedUser = openidm.read(path, null, [].concat("*", additionalUserFields));

            if (isDefinedAndNotNull(managedUser) && isDefinedAndNotNull(managedUser.accountStatus) && (managedUser.accountStatus !== "active")) {
                throw {
                    "code" : 401,
                    "message" : "Access denied, user inactive"
                };
            }
            return managedUser;
        }
        return resource;
    }

    /*
    This augment script will be called from both a traditional CAF context, and from the rsFilter context.
    In each, the additionalUserFields property is referenced by traversing a different sequence of keys. This
    function encapsulates this traversal.
    */
    function parseAdditionalUserFields(properties, subjectMapping) {
        if (isDefinedAndNotNull(subjectMapping)) {
            return subjectMapping.additionalUserFields;
        } else if (isDefinedAndNotNull(properties)) {
            if (isDefinedAndNotNull(properties.propertyMapping)) {
                if (isDefinedAndNotNull(properties.propertyMapping.additionalUserFields)) {
                    return properties.propertyMapping.additionalUserFields;
                } else {
                    logger.debug("In calculating org privileges, propertyMapping did not define additionalUserFields. " +
                        "This means that org privileges will likely not be calculated correctly. The propertyMapping: {}",
                        JSON.stringify(properties.propertyMapping));
                }
            } else {
                logger.debug("In calculating org privileges, the propertyMapping was not defined, " +
                    "so additionalUserFields are not specified. This means that org privileges will likely not be " +
                    "calculated correctly.");
            }
        } else {
            logger.debug("In calculating org privileges, authentication properties were not defined, so " +
                "additionalUserFields are not specified. This means that org privileges will likely not be calculated correctly.");
        }
        return [];
    }

    function isDefinedAndNotNull(field) {
        return (typeof field !== 'undefined') && (field !== null);
    }

    function isUndefinedOrNull(field) {
        return !isDefinedAndNotNull(field);
    }

    function refIdsInRelationship(resource, relationshipField) {
        if (isDefinedAndNotNull(resource) && isNonEmptyArray(resource[relationshipField])) {
            return resource[relationshipField].map(edge => edge["_refResourceId"]);
        } else {
            return [];
        }
    }

    function isNonEmptyArray(field) {
        return Array.isArray(field) && field.length
    }

    function aggregatePrivileges(privilegesArray, orgIds) {
        return privilegesArray.map(privilege => {
            if (isDefinedAndNotNull(privilege.filter) && privilege.filter.includes(orgIdPlaceholder)) {
                return privilegesForOrgIds(privilege, orgIds);
            } else {
                return [ privilege ];
            }
        }).reduce((pre, cur) => pre.concat(cur));
    }

    function privilegesForOrgIds(privilege, orgIds) {
        return orgIds.map(orgId => {
            let clonedPrivilege = clonePrivilege(privilege);
            clonedPrivilege.filter = replaceAllOrgIdPlaceholderInstances(clonedPrivilege.filter, orgId);
            return clonedPrivilege;
        });
    }

    // replaceAll not present in our javascript version
    function replaceAllOrgIdPlaceholderInstances(filter, orgId) {
        let localFilter = filter;
        while (localFilter.includes(orgIdPlaceholder)) {
            localFilter = localFilter.replace(orgIdPlaceholder, orgId);
        }
        return localFilter;
    }

    function clonePrivilege(privilege) {
        let privilegeClone = {};
        Object.keys(privilege).forEach(function (k) {
            privilegeClone[k] = privilege[k];
        });
        return privilegeClone;
    }

    // expose the method to mock openidm only if this global is not bound, which will only be the case during
    // the unit-test
    if (typeof(openidm) === 'undefined') {
        exports.mockOpenidm = function (mockopenidm) {
            openidm = mockopenidm;
        };
    }
}());
