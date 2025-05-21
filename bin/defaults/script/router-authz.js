/*
 * Copyright 2011-2024 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/*
 * This script is called from the router "onRequest" trigger, to enforce a central
 * set of authorization rules.
 *
 * This default implemention simply restricts requests via HTTP to users that are assigned
 * an "openidm-admin" role, and optionally to those that authenticate with TLS mutual
 * authentication (assigned an "openidm-cert" role).
 */

/*jslint regexp:false sub:true */
/*global httpAccessConfig */

var _ = require("lib/lodash");

function matchesResourceIdPattern(id, pattern) {
    if (pattern === "*") {
        // Accept all patterns
        return true;
    } else if (id === pattern) {
        // pattern matches exactly
        return true;
    } else if (pattern.indexOf("/*", pattern.length - 2) !== -1) {
        // Ends with "/*" or "/"
        // See if parent pattern matches
        var parentResource = pattern.substring(0, pattern.length - 1);
        if (id && (id.length >= parentResource.length && id.substring(0, parentResource.length) === parentResource)) {
            return true;
        }
    }
    return false;
}

function containsIgnoreCase(a, o) {
    var i, str1, str2;
    if (typeof (a) !== 'undefined' && a !== null) {
        for (i = 0; i <= a.length; i++) {
            str1 = o;
            str2 = a[i];
            if (typeof (o) !== 'undefined' && o !== null) {
                str1 = o.toLowerCase();
            }
            if (typeof (a[i]) !== 'undefined' && a[i] !== null) {
                str2 = a[i].toLowerCase();
            }
            if (str1 === str2) {
                return true;
            }
        }
    }
    return false;
}

function containsItems(items, configItems) {
    var i;
    if ((typeof configItems === "string" && configItems === '*') ||
        (typeof configItems === "object" && configItems.length === 1 && configItems[0] === '*')) {
        return true;
    }

    for (i = 0; i < items.length; i++) {
        if (containsIgnoreCase(configItems, items[i])) {
            return true;
        }
    }
    return false;
}

function containsItem(item, configItems) {
    if ((typeof configItems === "string" && configItems === '*') ||
        (typeof configItems === "object" && configItems.length === 1 && configItems[0] === '*')) {
        return true;
    }
    return containsIgnoreCase(configItems.split(','), item);
}

function contains(a, o) {
    var i;
    if (typeof (a) !== 'undefined' && a !== null) {
        for (i = 0; i <= a.length; i++) {
            if (a[i] === o) {
                return true;
            }
        }
    }
    return false;
}

function isMyTask() {
    var taskInstanceId = request.resourcePath.split("/")[2],
        taskInstance = openidm.read("workflow/taskinstance/" + taskInstanceId);
    if (!taskInstance) {
        throw {
            "code" : 404,
            "message" : "Task Not Found"
        };
    }
    return taskInstance.assignee === context.security.authenticationId;
}
function join(arr, delim) {
    var returnStr = "", i = 0;
    for (i = 0; i < arr.length; i++) {
        returnStr = returnStr + arr[i] + delim;
    }
    return returnStr.replace(new RegExp(delim + "$"), '');
}

function isUserCandidateForTask(taskInstanceId) {

    var userCandidateTasksQueryParams = {
        "_queryId": "filtered-query",
        "taskCandidateUser": context.security.authenticationId
    },
        userCandidateTasks = openidm.query("workflow/taskinstance", userCandidateTasksQueryParams).result,
        userGroupCandidateTasksQueryParams,
        userGroupCandidateTasks,
        i, roles, role;

    for (i = 0; i < userCandidateTasks.length; i++) {
        if (taskInstanceId === userCandidateTasks[i]._id) {
            return true;
        }
    }

    roles = "";
    for (i = 0; i < context.security.authorization.roles.length; i++) {
        role = context.security.authorization.roles[i];
        if (i === 0) {
            roles = role;
        } else {
            roles = roles + "," + role;
        }
    }

    userGroupCandidateTasksQueryParams = {
        "_queryId": "filtered-query",
        "taskCandidateGroup": ((typeof roles === "string") ? roles : join(roles, ","))
    };
    userGroupCandidateTasks = openidm.query("workflow/taskinstance", userGroupCandidateTasksQueryParams).result;
    for (i = 0; i < userGroupCandidateTasks.length; i++) {
        if (taskInstanceId === userGroupCandidateTasks[i]._id) {
            return true;
        }
    }

    return false;
}

function canUpdateTask() {
    var taskInstanceId = request.resourcePath.split("/")[2];
    return isMyTask() || isUserCandidateForTask(taskInstanceId);
}

function isProcessOnUsersList(processFilter) {
    var processesForUser = openidm.read("endpoint/getprocessesforuser").processes,
        isProcessOneOfUserProcesses = false,
        processForUser,
        i;

    for (i = 0; i < processesForUser.length; i++) {
        processForUser = processesForUser[i];
        if (processFilter(processForUser)) {
            isProcessOneOfUserProcesses = true;
        }
    }

    return isProcessOneOfUserProcesses;
}

function isAllowedToStartProcess() {
    var processDefinitionId = request.content._processDefinitionId;
    var key = request.content._key;
    return isProcessOnUsersList(function (process) {
        return (process._id === processDefinitionId) || (process.key === key);
    });
}

function isOneOfMyWorkflows() {
    var processDefinitionId = request.resourcePath.split("/")[2];
    return isProcessOnUsersList(function (process) { return (process._id === processDefinitionId); });
}

function isQueryOneOf(allowedQueries) {
    if (
        allowedQueries[request.resourcePath] &&
        contains(allowedQueries[request.resourcePath], request.queryId)
    ) {
        return true;
    }

    return false;
}

/**
 * This function is deprecated in favor of checkIfAnyFeatureEnabled, but will remain to maintain compatibility
 * with customer access.js customizations and/or upgraded IDM instances.
 */
function checkIfUIIsEnabled(param) {
    var ui_config = openidm.read("config/ui/configuration"),
        returnVal = false;
    return (ui_config && ui_config.configuration && ui_config.configuration[param]);
}

/**
 * Checks if one or more features are enabled and returns true if at least one is.
 * The param argument can be a single string or an array of strings, where the string
 * is a feature name (case-sensitive). Supported values:
 *
 * - kba
 * - email
 * - workflow
 * - identityProviders
 * - passwordReset
 * - registration
 * - retrieveUsername
 * - endpoint
 *
 * See org.forgerock.openidm.core.FeatureNameConstants for definitive list of constants.
 */
function checkIfAnyFeatureEnabled(param) {
    let serviceNames = Array.isArray(param) ? param : [param || ""];
    let query = _.map(serviceNames, s => 'name eq "' + s + '"').join(' or ');
    let features = openidm.query("info/features", { "_queryFilter": query }).result;
    return _.filter(features, { enabled: true }).length > 0;
}

function checkIfProgressiveProfileIsEnabled() {
    var progressiveProfileConfig = openidm.read("config/selfservice/profile");

    return (progressiveProfileConfig && progressiveProfileConfig.stageConfigs && progressiveProfileConfig.stageConfigs.length > 0);
}

function ownDataOnly() {
    var userId = context.security.authorization.id,
        component = context.security.authorization.component;

    // in the case of a literal read on themselves
    return (request.resourcePath === component + "/" + userId);

}

function ownRelationship() {
    var userId = context.security.authorization.id,
        component = context.security.authorization.component,
        splitRequestPath = request.resourcePath.split("/"),
        requestId = _.last(splitRequestPath),
        requestResource = _.dropRight(splitRequestPath, 1).join("/"),
        queryFilter = "(firstResourceId eq '" + userId + "' and firstResourceCollection eq '" + component +
          "' and secondResourceId eq '" + requestId + "' and secondResourceCollection eq '" + requestResource +
          "') or (firstResourceId eq '" + requestId + "' and firstResourceCollection eq '" + requestResource +
          "' and secondResourceId eq '" + userId + "' and secondResourceCollection eq '" + component + "')",
        relationship = openidm.query("repo/relationships", { "_queryFilter": queryFilter, "_pageSize": 1 });

    return relationship.resultCount === 1;
}

function ownRelationshipProperty(relationshipProperty, isCollection) {
    var authenticatedId = context.security.authorization.id,
        authenticatedResource = context.security.authorization.component,
        requestId = _.last(request.resourcePath.split("/")),
        referencePath = authenticatedResource + "/" + authenticatedId + "/" + relationshipProperty;
        // If relationship is a collection, then query the reference belonging to the authenticated resource
        if (isCollection) {
            var referenceQuery = openidm.query(referencePath, { "_queryFilter": "_refResourceId eq \"" + requestId + "\"", "_pageSize": 1 });
            return referenceQuery.resultCount === 1;
        }
        // Else read the singleton reference belonging to the authenticated resource
        var referenceRead = openidm.read(referencePath);
        return referenceRead !== null && referenceRead["_refResourceId"] === requestId;
}

function ownRelationshipCollection(allowedRelationshipCollectionProperties) {
    var userId = context.security.authorization.id,
        component = context.security.authorization.component,
        userPath = component + "/" + userId,
        /*
            A valid path for a query on a relationship endpoint will
            contain 4 parts delimited by "/".
            ex: managed/user/bjensen/idps
        */
        validPathPartLength = 4,
        // Split the resourcePath into an array on "/".
        resourcePathArray = request.resourcePath.split("/");
    /*
        Testing to see
        if resourcePathArray (['managed','user','bjensen','idps']) length is 4
        and userPath (managed/user/bjensen) is at the 0 position of the resourcePath string
        and the last part of the resourcePathArray is contained in the allowedRelationshipCollectionProperties array
    */
    return resourcePathArray.length === validPathPartLength &&
        request.resourcePath.indexOf(userPath) === 0 &&
        _.indexOf(allowedRelationshipCollectionProperties, _.last(resourcePathArray)) > -1;
}

function ownIDP() {
    var identityProviders = openidm.read("identityProviders"),
        resource = request.resourcePath.split("/")[1],
        idps = _.map(_.toArray(identityProviders.providers), function (idp) { return idp.provider; });

    return _.indexOf(idps, resource) > -1 && ownRelationshipProperty('idps', true);
}

/**
 * Profile endpoints are registered in the form "profile/{resourceCollection}/{id}/{resourceName}".
 * The resourceCollection for standalone IDM and ForgeOps deployments is generally "managed/user".
 * The resourceCollection in the Advanced Identity Cloud deployment is either "managed/alpha_user" or
 * "managed/bravo_user". In general, the number of resource path elements in this resource path fragment
 * is not known, however it is expected to target an object (user) resource collection.
 *
 * The supported resourceNames at the time of this writing are
 * <ul>
 *     <li>createDate</li>
 *     <li>loginCount</li>
 *     <li>profileCompleteness</li>
 *     <li>termsAccepted</li>
 *     <li>applications</li>
 * </ul>
 *
 * We match the {resourceCollection} to the component field of the security context and the {id}
 * to the authorization id in the security context to assert that the request is being made for a
 * profile resource belonging to the calling user.
 *
 * @returns {boolean}
 */
function isMyProfile() {
    let pathElements = request.resourcePath.split("/");
    if (pathElements[0] !== "profile") {
        // not requesting profile endpoint in the first place
        return false;
    }

    // The first path element is "profile". Because we don't want to hard-code/assume that the
    // resource collection is managed/user or always two path elements, we'll parse from the end.
    // Most of the profile endpoints end in a single resource name meaning we can establish the
    // resource collection and id from the end:
    //
    // profile / {resourceCollection} / {resourceId} / {resourceName}
    // 0         1      ....            length - 2     length -1
    //
    // but a read on the "applications" resource name has an extra path element at the end for the application id
    //
    // profile / {resourceCollection} / {resourceId} / applications / {applicationId}
    // 0         1      ....            length - 3     length - 2     length -1
    //
    // so use this to determine where the [user] resourceId starts and thus, where the resourceCollection ends
    let resourceIdIndex = (request.method === "read" && request.resourcePath.indexOf("applications") !== -1)
        ? pathElements.length - 3
        : pathElements.length - 2;

    let id = pathElements[resourceIdIndex];
    let resourceCollection = pathElements.slice(1, resourceIdIndex).join("/");
    return resourceCollection === context.security.authorization.component
            && id === context.security.authorization.id;
}

/**
 * Look through the whole patchOperation set and return false if any
 * field in the set refers to something other than those provided in the argument
 * @param {Array} allowedFields - The list of fields which the patch operations are allowed to target
 * @returns {Boolean}
 */
function restrictPatchToFields(allowedFields) {
    var patchOps;

    if (request.method === "patch") {
        patchOps = request.patchOperations;
    } else if (request.method === "action" && request.action === "patch") {
        patchOps = request.content;
    } else {
        return false;
    }

    return _.reduce(patchOps, function (result, patchOp) {
        // removes leading slashses from jsonpointer field specifications,
        // and only considers the first path item in the jsonpointer path
        var simpleField = patchOp.field.replace(/^\//, '').split("/")[0];
        return result && (_.indexOf(allowedFields, simpleField) !== -1);
    }, true);
}

/**
    Returns a list of fields which have been changed as part of this current request
*/

function getChangedValues() {
    var currentObject,
        JsonPatch = org.forgerock.json.JsonPatch,
        JsonValue = org.forgerock.json.JsonValue,
        simplePatchField = function (field) {
            return field.replace(/^\//, '').split("/")[0];
        };

    if (request.method === "create") {
        // all supplied fields are considered "changed" during a create
        return _.keys(request.content);
    } else if (request.method === "update") {
        // during an update, it is necessary to actually compare each object
        // to see if the field has changed
        currentObject = openidm.read(request.resourcePath);
        return _.filter(_.keys(request.content), function (propertyName) {
            return JsonPatch.diff(
                JsonValue(request.content[propertyName]),
                JsonValue(currentObject[propertyName])
            ).asList().size() !== 0;
        });
    } else if (request.method === "patch") {
        // every field that is supplied as a patch operation is considered "changed"
        return _.map(request.patchOperations, function (patchOp) {
            return simplePatchField(patchOp.field);
        });
    } else if (request.method === "action" && request.action === "patch") {
        return _.map(request.content, function (patchOp) {
            return simplePatchField(patchOp.field);
        });
    } else {
        return [];
    }
}

/**
 * Given a managed object name and the global request details, look up the
 * schema for the object and ensure that each of the changed properties in
 * the request are marked as "userEditable" : true.
 * @param {string} objectName - the name of the managed object (ex: "user")
 * @param {Array} exceptions - an array of properties within the object that
 *                             are excepted from this check
 * @returns {Boolean}
 */
function onlyEditableManagedObjectProperties(objectName, exceptions) {
    var managedConfig = openidm.read("config/managed"),
        managedObjectConfig = _.findWhere(managedConfig.objects, { "name": objectName });

    if (!managedObjectConfig || !managedObjectConfig.schema || !managedObjectConfig.schema.properties) {
        return false;
    }

    return _.reduce(getChangedValues(), function (result, propertyName) {
        return result &&
            ((
                _.isObject(managedObjectConfig.schema.properties[propertyName]) &&
                managedObjectConfig.schema.properties[propertyName].userEditable === true
            )
            || _.indexOf(exceptions, propertyName) > -1);
    }, true);

}



function reauthIfProtectedAttributeChange() {
    if (_.any(getChangedValues(), function (attribute) {
        return _.indexOf(context.security.authorization.protectedAttributeList, attribute) !== -1;
    })) {
        // expect a 403 error to be thrown if this call is unsuccessful
        openidm.action("authentication", "reauthenticate", {}, {});
    }

    return true;
}

/* DEPRECATED FUNCTION */
function managedUserRestrictedToAllowedProperties(allowedPropertiesList) {
    var i = 0, requestedRoles = [], params = {}, currentUser = {}, operations,
        getTopLevelProp = function (prop) {
            // removes a leading slash and only returns the first part of a string before a possible subsequent slash
            return prop.replace(/^\//, '').match(/^[^\/]+/)[0];
        };

    if (!request.resourcePath.match(/^managed\/user/)) {
        return true;
    }

    // we could accept a csv list or an array of properties for the allowedPropertiesList arg.
    if (typeof allowedPropertiesList === "string") {
        allowedPropertiesList = allowedPropertiesList.split(',');
    }

    if (request.method === "patch" || (request.method === "action" && request.action === "patch")) {
        if (request.method === "action") {
            operations = request.content;
        } else if (!request.patchOperations) {
            return true;
        } else {
            operations = request.patchOperations
        }
        // check each of the fields they are attempting to patch and make sure they are approved
        for (i in operations) {
            if ((operations[i].field && !containsIgnoreCase(allowedPropertiesList, getTopLevelProp(operations[i].field)))) {
                return false;
            }
        }
    } else if (request.method === "update") {
        if (!request.content) {
            return true;
        }
        currentUser = openidm.read(request.resourcePath);
        if (!currentUser) { // this would be odd, but just in case
            return false;
        }
        for (i in request.content) {
            // if the new value does not match the current value, then they must be updating it
            // if the field they are attempting to update isn't allowed for them, then reject request.
            if (!_.isEqual(currentUser[i], request.content[i]) && !containsIgnoreCase(allowedPropertiesList, i)) {
                return false;
            }
        }
    } else if (request.method === "create") {
        if (!request.content) {
            return true;
        }
        for (i in request.content) {
            // they should only be providing parameters that they are allowed to define
            if (!containsIgnoreCase(allowedPropertiesList, i)) {
                return false;
            }
        }
    }

    return true;
}

// NOTE: This function is deprecated, but remains to prevent breaking existing access.js configurations
function disallowQueryExpression() {
    return !request.queryExpression;
}

function disallowCommandAction() {
    return request.method !== "action" || request.action !== "command";
}

//////// Do not alter functions below here as part of your authz configuration

function passesAccessConfig(id, roles, method, action) {
    var i, j, config, pattern, excluded, ex;

    for (i = 0; i < httpAccessConfig.configs.length; i++) {
        config = httpAccessConfig.configs[i];
        pattern = config.pattern;
        // Check resource ID
        if (matchesResourceIdPattern(id, pattern)) {

            // Check excludePatterns
            ex = false;
            if (typeof (config.excludePatterns) !== 'undefined' && config.excludePatterns !== null) {
                excluded = config.excludePatterns.split(',');
                for (j = 0; j < excluded.length; j++) {
                    if (matchesResourceIdPattern(id, excluded[j])) {
                        ex = true;
                        break;
                    }
                }
            }
            if (!ex) {
                var configRoles = config.roles.split(','), configRole;
                // Prepend "internal/role/", if needed, for backwards compatibility
                for (j = 0; j < configRoles.length; j++) {
                    configRole = configRoles[j];
                    if (configRole !== "*" && configRole.indexOf("/") === -1) {
                        configRoles[j] = "internal/role/" + configRole;
                    }
                }
                // Check roles
                if (containsItems(roles, configRoles)) {
                    // Check method
                    if (typeof method === 'undefined' || containsItem(method, config.methods)) {
                        // Check action
                        if (action === 'undefined' || action === "" || containsItem(action, config.actions)) {
                            if (typeof (config.customAuthz) !== 'undefined' && config.customAuthz !== null) {
                                if (eval(config.customAuthz)) {
                                    return true;
                                }
                            } else {
                                return true;
                            }
                        }
                    }
                }
            }
        }
    }
    return false;
}

function isSelfServiceRequest() {
    return (context.selfservice != null);
}

function isAJAXRequest() {
    var headers = context.http.headers;

    // one of these custom headers must be present for all HTTP-based requests, to prevent CSRF attacks

    // X-Requested-With is common from AJAX libraries such as jQuery
    if (typeof (headers["X-Requested-With"]) !== "undefined" ||
        typeof (headers["x-requested-with"]) !== "undefined" ||

        // Basic auth headers are acceptible for convenience from cURL commands;
        // We don't return the request header to prompt the browser to provide basic auth headers,
        // so it will only be present if someone explicitly provides them, as in a cURL request.
        typeof (headers["Authorization"]) !== "undefined" ||
        typeof (headers["authorization"]) !== "undefined" ||

        // The custom authn headers for OpenIDM
        typeof (headers["X-OpenIDM-Username"]) !== "undefined" ||
        typeof (headers["x-openidm-username"]) !== "undefined") {

        if ((headers["X-Requested-With"] || "").toLowerCase().startsWith("shockwaveflash")) {
            // prevent CSRF from Flash
            throw {
                    "code": 403,
                    "message": "Access denied"
            };
        }
        return true;
    }
    throw {
        "code": 403,
        "message": "Access denied"
    };
}

function allow() {
    var roles,
        action;

    roles = context.security.authorization.roles;
    action = "";
    if (request.action) {
        action = request.action;
    }

    // We only need to block non-AJAX requests when the action is not "read"
    if (context.http !== undefined && request.method !== "read" && !isAJAXRequest()) {
        return false;
    }

    logger.debug("Access Check for HTTP request for resource id: {}, role: {}, method: {}, action: {}", request.resourcePath, roles, request.method, action);

    return passesAccessConfig(request.resourcePath, roles, request.method, action);
}

function allowRequest(requestOverride) {
    if (typeof requestOverride !== "undefined") {
        request = requestOverride;
    }

    return allow();
}

// attempt to read access from config
var access_config = openidm.read("config/access");
if (access_config !== null) {
    var httpAccessConfig = access_config;
} else {
    try {
        // Load the access configuration script (httpAccessConfig obj) as a file
        load(identityServer.getProjectLocation() + "/script/access.js");
    } catch (e) {
        // Access configuration un-available, all access request will be denied
        var httpAccessConfig = {"configs" : []}
    }
}

(function () {
    exports.allowRequest = allowRequest;
    exports.testAccess = function () {
        if (!allow()) {
            throw {
                "code": 403,
                "message": "Access denied",
                "detail": {
                    // tell DelegatedAdminFilter to evaluate privileges
                    "evaluatePrivileges": true
                }
            };
        } else {
            logger.debug("Request allowed");
        }
    }
}());
