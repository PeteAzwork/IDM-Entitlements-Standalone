"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/*
 * Copyright 2011-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "handlebars", "org/forgerock/openidm/ui/common/delegates/SearchDelegate", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/common/delegates/ResourceDelegate", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/commons/ui/common/util/Constants", "selectize", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/openidm/ui/admin/delegates/SchedulerDelegate"], function ($, _, Handlebars, searchDelegate, configDelegate, resourceDelegate, UIUtils, router, Constants, selectize, AdminUtils, schedulerDelegate) {

    var obj = {};

    obj.buildObjectRepresentation = function (objToRep, props) {
        var propVals = [];

        _.forEach(props, _.bind(function (prop, i) {
            var objRepEl = $("<span>"),
                wrapper = $("<div>");
            if (objToRep[prop]) {
                objRepEl.text(_.escape(objToRep[prop])).attr("title", prop);
            }
            if (i === 0) {
                objRepEl.addClass("objectRepresentationHeader");
            } else {
                objRepEl.addClass("objectRepresentation");
            }
            wrapper.append(objRepEl);
            propVals.push(wrapper.html());
        }, this));

        return propVals.join("<br/>");
    };

    obj.setupSampleSearch = function (el, mapping, autocompleteProps, selectSuccessCallback) {
        var selectedItem;

        el.selectize({
            valueField: autocompleteProps[0],
            searchField: autocompleteProps,
            maxOptions: 10,
            create: false,
            onChange: function onChange() {
                selectSuccessCallback(selectedItem);
            },
            render: {
                option: function option(item, selectizeEscape) {
                    var fields = _.pick(item, autocompleteProps),
                        element = $('<div class="fr-search-option"></div>'),
                        counter = 0;

                    _.forIn(fields, _.bind(function (value) {
                        if (counter === 0) {
                            $(element).append('<div class="fr-search-primary">' + selectizeEscape(value) + '</div>');
                        } else {
                            $(element).append('<div class="fr-search-secondary text-muted">' + selectizeEscape(value) + '</div>');
                        }

                        counter++;
                    }, this));

                    return element.prop('outerHTML');
                },
                item: function item(_item, escape) {
                    selectedItem = _item;
                    return "<div>" + escape(_item[autocompleteProps[0]]) + "</div>";
                }
            },
            load: function load(query, callback) {
                if (!query.length || query.length < 2 || !autocompleteProps.length) {
                    return callback();
                }

                searchDelegate.searchResults(mapping.source, autocompleteProps, query).then(function (response) {
                    if (response) {
                        callback([response]);
                    } else {
                        callback();
                    }
                });
            }
        });
    };

    obj.readOnlySituationalPolicy = function (policies) {
        return _.reduce(policies, function (memo, val) {
            return memo && val.action === "ASYNC";
        }, true);
    };
    /**
    * This function gathers child info about a mapping then pops up a confirmDialog
    * with a list of any associated managed/assignments or scheduledTasks to be
    * deleted if the process is continued.
    *
    * @param mappingName {string}
    * @param syncMappings {object} - the current state of sync.json mappings property
    * @param successCallback {function} - action to take after the delete process has been completed
    */
    obj.confirmDeleteMapping = function (mappingName, syncConfig, successCallback) {
        obj.getMappingChildren(mappingName).then(_.bind(function (mappingChildren) {
            var dialogText = $("<div>").append($.t("templates.mapping.confirmDeleteMapping", { "mappingName": mappingName, "mappingChildren": mappingChildren.display }));

            AdminUtils.confirmDeleteDialog(dialogText, _.bind(function () {
                obj.deleteMapping(mappingName, mappingChildren, syncConfig).then(function () {
                    successCallback();
                });
            }, this));
        }, this));
    };
    /**
    * This function deletes a mapping and it's child data
    *
    * @param mappingName {string}
    * @param mappingChildren {array}
    * @param syncConfigMappings {object} - current sync.json mappings array
    */
    obj.deleteMapping = function (mappingName, mappingChildren, syncConfigMappings) {
        var newSyncConfigMappings = _.filter(syncConfigMappings, _.bind(function (mapping) {
            /*
                if there are other mappings with this mapping set as the "links"
                property remove the "links" property of those mappings
                essentially disassociating them with the mapping being deleted
            */
            if (mapping.links && mapping.links === mappingName) {
                delete mapping.links;
            }
            return mapping.name !== mappingName;
        }, this));

        return obj.deleteMappingChildren(mappingName, mappingChildren).then(function () {
            return configDelegate.updateEntity("sync", { "mappings": newSyncConfigMappings });
        });
    };
    /**
    * This function searches through config/managed, grabs each object with a name ending in the string 'assignment',
    * searches, each 'assignment' object for assigments who's mapping name matches the mappingName passed in, and returns
    * an array of groupedAssignments (assignments grouped by objectName);
    * [
    *     {
    *         "objectName": "assignment",
    *         "title": "Alpha Assignment",
    *         "items": [
    *             {
    *                 "_id": "0dd1d8f2-c99e-41c6-bc2c-d5f5395feba3",
    *                 "_rev": "00000000b94066d0",
    *                 "name": "test",
    *                 "description": "testy",
    *                 "mapping": "managedUser_systemMycsv__ACCOUNT__"
    *             },
    *             {
    *                 "_id": "3841318b-677c-4c65-a0ae-38e48a0e3293",
    *                 "_rev": "00000000dae76566",
    *                 "name": "test2",
    *                 "description": "tester",
    *                 "mapping": "managedUser_systemMycsv__ACCOUNT__"
    *             }
    *         ]
    *     },
    *     {
    *         "objectName": "bravoassignment",
    *         "title": "Bravo Assignemt",
    *         "items": [
    *             {
    *                 "_id": "b16ddd5e-e691-4c5c-98f5-08dd9435b11e",
    *                 "_rev": "000000000acc61fe",
    *                 "name": "bravo_test",
    *                 "description": "braaaavoo_testy",
    *                 "mapping": "managedUser_systemMycsv__ACCOUNT__"
    *             }
    *         ]
    *     }
    * ]
    *
    * @param mappingName {string}
    * @returns {array}
    */
    obj.getAllAssignments = function (mappingName) {
        // look in config/managed and gather all objects that end with "assignment"
        return configDelegate.readEntityAlways('managed').then(function (managedConfig) {
            var assignmentObjects = _.filter(managedConfig.objects, function (managedObject) {
                return _.endsWith(managedObject.name, "assignment");
            }),
                promises = [];

            _.forEach(assignmentObjects, function (assignmentObject) {
                promises.push(resourceDelegate.searchResource(encodeURIComponent('mapping eq "' + mappingName + '"'), "managed/" + assignmentObject.name));
            });

            return $.when.apply($, promises).then(function () {
                var groupedAssignments = [];

                // combine the results of each promise
                _.forEach(arguments, function (response, i) {
                    if (assignmentObjects[i]) {
                        groupedAssignments.push({
                            objectName: assignmentObjects[i].name,
                            title: assignmentObjects[i].schema.title || assignmentObjects[i].name,
                            items: response.result
                        });
                    }
                });

                return groupedAssignments;
            });
        });
    };
    /**
    * This function takes a mappingName, finds all managed/assigments and scheduled tasks
    * associated with that mapping, builds a display list of these items to be used in a
    * confirmDialog, and returns an object :
    *   {
    *       scheduledTasks : resultsOfScheduledTasksQuery
    *       assigments : resultsOfAssignmentsQuery
    *       display : htmlStringListingAssignmentsAndScheduledTasks
    *   }
    *
    * @param mappingName {string}
    * @returns {object}
    */
    obj.getMappingChildren = function (mappingName) {
        var scheduleQuery = schedulerDelegate.getReconSchedulesByMappingName(mappingName),
            assignmentQuery = obj.getAllAssignments(mappingName),
            scheduledTasksPartialPromise = UIUtils.preloadPartial("partials/mapping/_mappingScheduledTasks.html"),
            mappingAssignmentsPartialPromise = UIUtils.preloadPartial("partials/mapping/_mappingAssignments.html");

        return $.when(scheduleQuery, assignmentQuery, scheduledTasksPartialPromise, mappingAssignmentsPartialPromise).then(function (scheduledTasks, assignments) {
            var mappingChildren = {
                scheduledTasks: scheduledTasks,
                assignments: assignments,
                display: ""
            };

            mappingChildren.display += "<div class='well'>";
            mappingChildren.display += Handlebars.compile("{{> mapping/_mappingScheduledTasks}}")({ scheduledTasks: mappingChildren.scheduledTasks });
            mappingChildren.display += Handlebars.compile("{{> mapping/_mappingAssignments}}")({ assignments: mappingChildren.assignments });
            mappingChildren.display += "</div>";

            return mappingChildren;
        });
    };
    /**
    * This function deletes a mapping's managed/assignments, scheduledTasks, and links
    *
    * @param mappingName {string}
    * @param mappingChildren {object}
    * @returns {promise}
    */
    obj.deleteMappingChildren = function (mappingName, mappingChildren) {
        var promise,
            scheduledTasksPromise = function scheduledTasksPromise(schedule) {
            return schedulerDelegate.deleteSchedule(schedule._id);
        },
            assignmentsPromise = function assignmentsPromise(assignment, objectName) {
            return resourceDelegate.deleteResource(Constants.context + "/managed/" + objectName, assignment._id);
        },
            concatPromise = function concatPromise(action) {
            if (!promise) {
                //no promise exists so create it
                promise = action();
            } else {
                //promise exists now "concat" a new "then" onto the original promise
                promise = promise.then(function () {
                    return action();
                });
            }
        };

        //delete this mapping's scheduleTasks
        _.forEach(mappingChildren.scheduledTasks, function (schedule) {
            concatPromise(function () {
                return scheduledTasksPromise(schedule);
            });
        });
        //delete this mapping's assignments
        _.forEach(mappingChildren.assignments, function (assignmentGroup) {
            _.forEach(assignmentGroup.items, function (assignment) {
                concatPromise(function () {
                    return assignmentsPromise(assignment, assignmentGroup.objectName);
                });
            });
        });
        //delete this mapping's links
        concatPromise(function () {
            return resourceDelegate.serviceCall({
                "type": "POST",
                "serviceUrl": Constants.context + "/repo/link",
                "url": "?_action=command&commandId=delete-mapping-links&mapping=" + mappingName
            });
        });

        return promise;
    };

    /**
     * This function is called from AttributesGridView.addRequiredProperties(). It looks at the target object to
     * make sure it is an LDAP connector. Then adds precanned configurations to the "cn" and "dn" properties
     *
     * @param mappingProperties {array} - an array of mapping property objects
     * @param target {object} - the definition including schema of the target object of the mapping being edited
     * @param source {object} - the definition including schema of the souce object of the mapping being edited
     * @returns mappingProperies {array} - the array of mapping property objects after having "cn" and "dn" adjusted to precanned configurations
     */
    obj.handleRequiredLdapMappingProperties = function (mappingProperties, target, source) {
        var targetIsSystemObject = target.fullName.split("/")[0] === "system";

        if (targetIsSystemObject) {
            //check to see if this is an ldap connector
            if (target.config.connectorRef.bundleName === "org.forgerock.openicf.connectors.ldap-connector") {
                //get cn and dn and make sure they are empty other than the "target" property
                var _map = ["cn", "dn"].map(function (target) {
                    return _.find(mappingProperties, function (p) {
                        return p.target === target && !p.transform;
                    });
                }),
                    _map2 = _slicedToArray(_map, 2),
                    cn = _map2[0],
                    dn = _map2[1],
                    hasGiveNameAndSN = source.schema.givenName && source.schema.sn,
                    hasUserName = source.schema.userName;

                if (cn && hasGiveNameAndSN) {
                    cn.transform = {
                        type: "text/javascript",
                        source: "source.givenName + ' ' + source.sn"
                    };
                    cn.source = "";
                }

                if (dn && hasUserName) {
                    var accountUserNameAttributes = target.config.configurationProperties.accountUserNameAttributes,
                        baseContexts = target.config.configurationProperties.baseContexts;

                    dn.source = "userName";

                    if (accountUserNameAttributes && accountUserNameAttributes[0] && baseContexts && baseContexts[0]) {
                        dn.transform = {
                            type: "text/javascript",
                            source: "\"" + accountUserNameAttributes[0] + "=\" + source + \"," + baseContexts[0] + "\""
                        };
                    }
                }
            }
        }

        return mappingProperties;
    };

    return obj;
});
