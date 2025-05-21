/*
 * Copyright 2012-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

if (request.method !== "query") {
    throw {
        "code" : 403,
        "message" : "Access denied"
    };
}

(function () {
    var processInstances = {},
        taskDefinitions = {},
        usersWhoCanBeAssignedToTask = {},
        authRoles = context.security.authorization.roles,
        getProcessInstance = function(processInstanceId) {
            var processInstance;
            if (!processInstances[processInstanceId]) {
                processInstance = openidm.read("workflow/processinstance/"+processInstanceId);
                processInstances[processInstanceId] = processInstance;
            }
            return processInstances[processInstanceId];
        },

        getTaskDefinition = function(processDefinitionId, taskDefinitionKey) {
            var taskDefinitionQueryParams,taskDefinition;
            if (!taskDefinitions[processDefinitionId+"|"+taskDefinitionKey]) {
                taskDefinition = openidm.read("workflow/processdefinition/" + processDefinitionId + "/taskdefinition/" + taskDefinitionKey)
                taskDefinitions[processDefinitionId+"|"+taskDefinitionKey] = taskDefinition;
            }
            return taskDefinitions[processDefinitionId+"|"+taskDefinitionKey];
        },
        getUsersWhoCanBeAssignedToTask = function(taskId) {
            var usersWhoCanBeAssignedToTaskQueryParams = {
                    "_queryId": "query-by-task-id",
                    "taskId": taskId
                },
                isTaskManager = false,
                i,
                usersWhoCanBeAssignedToTaskResult = { users : [] };

            if (!usersWhoCanBeAssignedToTask[taskId]) {

                isTaskManager = authRoles.indexOf('internal/role/openidm-tasks-manager') >= 0;

                if(isTaskManager) {
                    usersWhoCanBeAssignedToTaskResult = openidm.query("endpoint/getavailableuserstoassign", usersWhoCanBeAssignedToTaskQueryParams);
                }
                usersWhoCanBeAssignedToTask[taskId] = usersWhoCanBeAssignedToTaskResult.result;
            }
            return usersWhoCanBeAssignedToTask[taskId];
        },

        userName = context.security.authenticationId,
        tasks,
        taskId,
        task,
        userAssignedTasksQueryParams,
        tasksUniqueMap,
        userCandidateTasksQueryParams,
        userCandidateTasks,
        taskDefinition,
        taskInstance,
        processInstance,
        i,
        view = {};

    var pageSize = 50; // default pageSize limit
    if (request.pageSize) {
        pageSize = request.pageSize;
    }
    var pageOffset = 0;
    if (request.pagedResultsOffset) {
        pageOffset = request.pagedResultsOffset;
    }

    if (request.additionalParameters.viewType === 'assignee') {
        userAssignedTasksQueryParams = {
            "_queryId": "filtered-query",
            "assignee": userName,
            "_pageSize": pageSize,
            "_pagedResultsOffset": pageOffset
        };
        tasks = openidm.query("workflow/taskinstance", userAssignedTasksQueryParams).result;
    } else {
        userCandidateTasksQueryParams = {
            "_queryId": "unassignedTaskQuery",
            "_pageSize": pageSize,
            "_pagedResultsOffset": pageOffset
        };

        tasksUniqueMap = {};
        userCandidateTasks =
            openidm.query("workflow/taskinstance", userCandidateTasksQueryParams).result;
        for (i = 0; i < userCandidateTasks.length; i++) {
            tasksUniqueMap[userCandidateTasks[i]._id] = userCandidateTasks[i];
        }

        tasks = [];
        for (taskId in tasksUniqueMap) {
            if (tasksUniqueMap.hasOwnProperty(taskId)) {
                tasks.push(tasksUniqueMap[taskId]);
            }
        }
    }

    //building view

    for (i = 0; i < tasks.length; i++) {
        taskId = tasks[i]._id;
        task = openidm.read("workflow/taskinstance/"+taskId);

        if (!view[task._id]) {
            view[task._id] = {name : task.name, tasks : []};
        }
        view[task._id].tasks.push(task);
    }

    for (taskDefinition in view) {
        if (view.hasOwnProperty(taskDefinition)) {
            for (i = 0; i < view[taskDefinition].tasks.length; i++) {
                taskInstance = view[taskDefinition].tasks[i];
                processInstance = getProcessInstance(taskInstance.processInstanceId);
                view[taskDefinition].tasks[i].businessKey = processInstance.businessKey;
                view[taskDefinition].tasks[i].startTime = processInstance.startTime;
                view[taskDefinition].tasks[i].startUserId = processInstance.startUserId;
                view[taskDefinition].tasks[i].startUserDisplayable = userName;
                view[taskDefinition].tasks[i].processDefinitionId = processInstance.processDefinitionId;
                view[taskDefinition].tasks[i].taskDefinition = getTaskDefinition(taskInstance.processDefinitionId, taskInstance.taskDefinitionKey);
                view[taskDefinition].tasks[i].usersToAssign = getUsersWhoCanBeAssignedToTask(taskInstance._id) || [];
            }
        }
    }

    return [view];

}());
