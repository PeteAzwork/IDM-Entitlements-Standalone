"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/mapping/behaviors/PoliciesDialogView", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils"], function ($, _, MappingAdminAbstractView, conf, constants, eventManager, ConfigDelegate, PoliciesDialogView, BootstrapDialogUtils) {

    var PoliciesView = MappingAdminAbstractView.extend({
        element: "#policyPattern",
        noBaseTemplate: true,
        template: "templates/admin/mapping/behaviors/PoliciesTemplate.html",
        events: {
            "change #policyPatterns": "setPattern",
            "click .savePolicy": "save",
            "click .reset": "reset",
            "click .add-policy": "addPolicy",
            "click .delete-policy": "deletePolicy",
            "click .edit-policy": "editPolicy"
        },
        data: {},
        model: {
            successMessage: "triggeredBySituationSaveSuccess",
            currentPattern: "",
            lookup: {
                "SOURCE_MISSING": "Source Missing",
                "ALL_GONE": "All Gone",
                "SOURCE_IGNORED": "Source Ignored",
                "UNQUALIFIED": "Unqualified",
                "AMBIGUOUS": "Ambiguous",
                "FOUND_ALREADY_LINKED": "Found Already Linked",
                "CONFIRMED": "Confirmed",
                "UNASSIGNED": "Unassigned",
                "LINK_ONLY": "Link Only",
                "TARGET_IGNORED": "Target Ignored",
                "MISSING": "Missing",
                "ABSENT": "Absent",
                "FOUND": "Found",
                "IGNORE": "Ignore",
                "DELETE": "Delete",
                "LINK": "Link",
                "UNLINK": "Unlink",
                "EXCEPTION": "Exception",
                "REPORT": "Report",
                "NOREPORT": "No Report",
                "ASYNC": "Async",
                "CREATE": "Create",
                "UPDATE": "Update"

            },
            sync: {},
            mapping: {},
            mappingName: {},
            saveCallback: {},
            allPatterns: [],
            baseSituations: {}
        },

        render: function render(args, callback) {
            this.data = {
                star: "&#9733;",
                hollowStar: "&#9734;",
                policies: [],
                docHelpUrl: constants.DOC_URL,
                patternNames: [],
                situations: [],
                changes: false
            };

            this.model.sync = this.getSyncConfig();
            this.model.mapping = this.getCurrentMapping();
            this.model.mappingName = this.getMappingName();
            this.model.saveCallback = args.saveCallback;
            this.model.renderedPolicies = args.policies || _.cloneDeep(this.model.mapping.policies) || [];

            if (args.changes) {
                this.data.changes = true;
            }

            this.getPatterns().then(_.bind(function () {
                var policyChanges = this.setPolicies(this.model.renderedPolicies, this.model.allPatterns, this.model.lookup, this.model.baseSituations);
                this.data.policies = policyChanges.transformedPolicies;
                this.model.currentPattern = policyChanges.matchedPattern;

                this.parentRender(function () {
                    if (callback) {
                        callback();
                    }

                    this.$el.find(".note").popover({
                        content: function content() {
                            return $(this).attr("data-title");
                        },
                        placement: 'top',
                        container: 'body',
                        html: 'true',
                        title: ''
                    });

                    this.$el.find("#policyPatterns").val(this.model.currentPattern);
                    this.$el.find("#patternDescription").text(this.model.allPatterns[this.model.currentPattern].description);
                });
            }, this));
        },

        /**
         * Takes an array of properties, detects if that new properties list differes from the saved version and rerenders the ui with these new values.
         */
        reRender: function reRender(newPolicies) {
            var changes = true,
                policyChanges;

            policyChanges = this.detectChanges(this.model.mapping.policies, newPolicies, this.model.baseSituations, this.model.lookup);

            if (_.isEqual(policyChanges.newPoliciesFilledIn, policyChanges.systemPoliciesList)) {
                changes = false;
            }

            this.render({
                "saveCallback": this.model.saveCallback,
                "policies": policyChanges.newPolicies,
                "changes": changes
            });
            this.delegateEvents();
        },

        /**
         *
         * @param policies - Array of policies
         * @param newPolicies - Array of new policies
         * @param baseSituations - Array of base situations
         * @param lookup - Object use for looking up translation changes
         * @returns {{newPoliciesFilledIn: Array of filled in policies, systemPoliciesList: Array of system policies, newPolicies: Array of new polciies}}
         */
        detectChanges: function detectChanges(policies, newPolicies, baseSituations, lookup) {
            var newPoliciesFilledIn = [],
                newPoliciesList = [],
                systemPoliciesList = [],
                systemPolicies = {},
                temp;

            _.forEach(policies, function (policy) {
                if (_.isArray(systemPolicies[policy.situation])) {
                    systemPolicies[policy.situation].push(policy);
                } else {
                    systemPolicies[policy.situation] = [policy];
                }
            });

            _.forEach(newPolicies, function (policy) {
                if (_.isArray(newPoliciesList[policy.situation])) {
                    newPoliciesList[policy.situation].push(policy);
                } else {
                    newPoliciesList[policy.situation] = [policy];
                }
            });

            // Order the properties and fill in any empty situation
            _.forEach(baseSituations, function (policy, situationName) {
                if (_.isArray(systemPolicies[situationName])) {
                    _.forEach(systemPolicies[situationName], function (situation) {
                        temp = _.pick(situation, "action", "situation", "condition", "postAction");
                        if (!_.has(temp, "condition")) {
                            temp.condition = null;
                        }

                        if (!_.has(temp, "postAction")) {
                            temp.postAction = null;
                        }
                        systemPoliciesList = systemPoliciesList.concat(temp);
                    });
                } else {
                    temp = _.pick(policy, "action", "situation", "condition", "postAction");
                    temp.situation = _.invert(lookup)[temp.situation];
                    systemPoliciesList = systemPoliciesList.concat(temp);
                }

                if (_.isArray(newPoliciesList[situationName])) {
                    _.forEach(newPoliciesList[situationName], function (situation) {
                        temp = _.pick(situation, "action", "situation", "condition", "postAction");
                        if (!_.has(temp, "condition")) {
                            temp.condition = null;
                        }

                        if (!_.has(temp, "postAction")) {
                            temp.postAction = null;
                        }
                        newPoliciesFilledIn = newPoliciesFilledIn.concat(temp);
                    });
                } else {
                    temp = _.pick(policy, "action", "situation", "condition", "postAction");
                    temp.situation = _.invert(lookup)[temp.situation];
                    newPoliciesFilledIn = newPoliciesFilledIn.concat(temp);
                }
            });

            return {
                "newPoliciesFilledIn": newPoliciesFilledIn,
                "systemPoliciesList": systemPoliciesList,
                "newPolicies": newPolicies
            };
        },

        /**
         * Retrieves the list of patterns and creates an array of the default situations in order.
         * All policy sets are configured from this base set of situations.
         */
        getPatterns: function getPatterns() {
            return $.getJSON("templates/admin/mapping/behaviors/PolicyPatterns.json", _.bind(function (patterns) {
                this.model.allPatterns = patterns;

                _.forEach(patterns, _.bind(function (pattern, name) {
                    this.data.patternNames.push(name);
                }, this));

                // Gets a copy of a the default action policies and formats it for rendering
                _.forEach(this.model.allPatterns["Default Actions"].policies, _.bind(function (policy) {
                    this.model.baseSituations[policy.situation] = {
                        "severity": "",
                        "situation": this.model.lookup[policy.situation],
                        "action": policy.action,
                        "displayAction": this.model.lookup[policy.action],
                        "defaultActionStar": true,
                        "defaultActionHollow": false,
                        "emphasize": false,
                        "condition": null,
                        "displayCondition": "",
                        "postAction": null,
                        "displayPostAction": "",
                        "note": $.t(policy.note),
                        "disabled": true,
                        "options": policy.options
                    };

                    this.data.situations.push({
                        "value": policy.situation,
                        "readable": this.model.lookup[policy.situation]
                    });

                    switch (policy.color) {
                        case "red":
                            this.model.baseSituations[policy.situation].severity = "failure-display";
                            break;
                        case "yellow":
                            this.model.baseSituations[policy.situation].severity = "warning-display";
                            break;
                        case "green":
                            this.model.baseSituations[policy.situation].severity = "success-display";
                            break;
                    }
                }, this));
            }, this));
        },

        /**
         * Take an array of policies and formats them for handlebar template rendering.
         * Some logic is applied to change how information if displayed.
         *
         * Order, note, severity are all decided by the baseSituations defined in the getPatterns function.
         *
         * This transformed array is returned
         *
         * @param policies
         */
        setPolicies: function setPolicies(policies, patterns, lookup, baseSituations) {
            var action = "",
                condition = "",
                postAction = "",
                tempPolicies = [],
                currentPolicy = [],
                currentPattern = [],
                defaultActionStar = true,
                defaultActionHollow = false,
                emphasize = false,
                patternFound = false,
                policySorter = function policySorter(policy) {
                return policy.situation;
            },
                transformedPolicies = [],
                matchedPattern;

            if (policies.length === 0) {
                policies = patterns["Default Actions"].policies;
            }

            _.forEach(policies, function (policy) {
                action = "";
                condition = "";
                postAction = "";
                defaultActionStar = true;
                defaultActionHollow = false;
                emphasize = false;

                _.forEach(lookup.situations, function (val, key) {
                    if (val === policy.situation) {
                        policy.situation = key;
                    }
                });

                if (_.isObject(policy.action) && _.has(policy.action, "file") && policy.action.file === "workflow/triggerWorkflowFromSync.js") {

                    if (_.has(policy.action, "globals") && _.has(policy.action.globals, "workflowReadable")) {
                        action = policy.action.globals.workflowReadable;
                    } else {
                        action = $.t("templates.situationalPolicies.workflow");
                    }

                    defaultActionStar = false;
                    emphasize = true;
                } else if (_.isObject(policy.action) && _.has(policy.action, "type")) {
                    action = policy.action.type;
                    defaultActionStar = false;
                    emphasize = true;
                } else if (_.isString(policy.action)) {
                    action = lookup[policy.action] || policy.action;

                    if (_.indexOf(baseSituations[policy.situation].options, policy.action) >= 0) {
                        defaultActionHollow = true;
                        defaultActionStar = false;
                    } else if (baseSituations[policy.situation].action !== policy.action) {
                        defaultActionStar = false;
                    }
                }

                if (_.isObject(policy.condition) && _.has(policy.condition, "type")) {
                    condition = "(" + policy.condition.type + ")";
                } else if (_.isString(policy.condition) && policy.condition.length > 0) {
                    condition = "(" + policy.condition + ")";
                }

                if (_.isObject(policy.postAction) && _.has(policy.postAction, "type")) {
                    postAction = "(" + policy.postAction.type + ")";
                }

                if (!_.isArray(tempPolicies[policy.situation])) {
                    tempPolicies[policy.situation] = [];
                }
                tempPolicies[policy.situation].push({
                    "severity": baseSituations[policy.situation].severity,
                    "situation": lookup[policy.situation],
                    "action": policy.action,
                    "displayAction": action,
                    "defaultActionStar": defaultActionStar,
                    "defaultActionHollow": defaultActionHollow,
                    "emphasize": emphasize,
                    "condition": policy.condition,
                    "displayCondition": condition,
                    "postAction": policy.postAction,
                    "displayPostAction": postAction,
                    "note": baseSituations[policy.situation].note,
                    "disabled": true
                });
            });

            // Order the properties and fill in any empty situation
            _.forEach(baseSituations, function (policy, situationName) {
                if (_.isArray(tempPolicies[situationName])) {
                    if (tempPolicies[situationName].length > 1) {
                        _.forEach(tempPolicies[situationName], function (policy, index) {
                            tempPolicies[situationName][index].disabled = false;
                        });
                    }
                    transformedPolicies = transformedPolicies.concat(tempPolicies[situationName]);
                } else {
                    transformedPolicies = transformedPolicies.concat(policy);
                }
            });

            _.forEach(patterns, function (pattern, name) {
                currentPattern = _.chain(pattern.policies).map(function (policy) {
                    return _.pick(policy, "action", "situation");
                }).sortBy(policySorter).value();

                currentPolicy = _.chain(policies).map(function (policy) {
                    return _.pick(policy, "action", "situation");
                }).sortBy(policySorter).value();

                if (_.isEqual(currentPattern, currentPolicy)) {
                    patternFound = true;
                    matchedPattern = name;
                }
            });

            if (!patternFound) {
                matchedPattern = "Custom";
            }

            return {
                "transformedPolicies": transformedPolicies,
                "matchedPattern": matchedPattern
            };
        },

        /**
         * When the select box for policy patterns changes the ui is re-rendered to reflect the new policies
         */
        setPattern: function setPattern(e) {
            var btns = [{
                label: $.t("common.form.cancel"),
                action: _.bind(function (dialogRef) {
                    this.reRender(this.model.renderedPolicies);
                    dialogRef.close();
                }, this)
            }, {
                label: $.t("common.form.continue"),
                cssClass: "btn-primary",
                action: _.bind(function (dialogRef) {
                    if (e.target.value !== "Custom") {
                        this.reRender(this.model.allPatterns[e.target.value].policies);
                        this.model.currentPattern = e.target.value;
                    }
                    dialogRef.close();
                }, this)
            }];

            if (this.data.changes) {
                this.setElement($('<div id="ConfirmPatternChange"></div>'));
                $('#dialogs').append(this.model.currentDialog);
                BootstrapDialogUtils.createModal({
                    title: $.t("templates.situationalPolicies.confirmChange"),
                    message: $("<div id='dialogDetails'>" + $.t("templates.situationalPolicies.confirmChangeMsg") + "</div>"),
                    buttons: btns
                }).open();
            } else if (e.target.value !== "Custom") {
                this.reRender(this.model.allPatterns[e.target.value].policies);
            }
        },

        deletePolicy: function deletePolicy(event) {
            event.preventDefault();

            var newPolicies = this.getDeleteUpdatedPolicies(this.data.policies, this.$el.find("#situationalPolicies table .event-hook"), event.currentTarget, this.model.lookup);

            this.reRender(newPolicies);
        },

        getDeleteUpdatedPolicies: function getDeleteUpdatedPolicies(policies, allEventHooks, clickedButton, lookup) {
            _.forEach(allEventHooks.find(".delete-policy"), function (deleteButton, deletedIndex) {
                if (deleteButton === clickedButton && !$(clickedButton).hasClass("disabled")) {
                    var deletedEventHook = allEventHooks.find(".delete-policy").eq(deletedIndex).closest(".event-hook")[0];

                    _.forEach(policies, function (policy, index) {
                        policies[index] = _.pick(policy, "action", "situation", "condition", "postAction");
                        policies[index].situation = _.invert(lookup)[policies[index].situation];
                    });

                    policies.splice(allEventHooks.index(deletedEventHook), 1);
                }
            });

            return policies;
        },

        addPolicy: function addPolicy(e) {
            e.preventDefault();

            PoliciesDialogView.render({
                "mappingName": this.model.mappingName,
                "mapProps": this.model.mapping.properties,
                "situation": this.$el.find(".situation-list").val(),
                "edit": false,
                "policy": null,
                "basePolicy": this.model.baseSituations[this.$el.find(".situation-list").val()],
                "lookup": this.model.lookup,
                "saveCallback": _.bind(function (newPolicy) {
                    var _this2 = this;

                    _.forEach(this.data.policies, function (policy) {
                        policy.situation = _.invert(_this2.model.lookup)[policy.situation];
                    });

                    this.data.policies.push(newPolicy);

                    this.reRender(this.data.policies);
                }, this)
            });
        },

        editPolicy: function editPolicy(event) {
            event.preventDefault();

            _.forEach(this.$el.find("#situationalPolicies table .event-hook .edit-policy"), _.bind(function (editButton, index) {
                if (editButton === event.currentTarget) {
                    PoliciesDialogView.render({
                        "mappingName": this.model.mappingName,
                        "mapProps": this.model.mapping.properties,
                        "situation": _.invert(this.model.lookup)[this.data.policies[index].situation],
                        "edit": true,
                        "policy": this.data.policies[index],
                        "basePolicy": this.model.baseSituations[_.invert(this.model.lookup)[this.data.policies[index].situation]],
                        "lookup": this.model.lookup,
                        "saveCallback": _.bind(function (policy) {
                            _.forEach(this.data.policies, _.bind(function (policy, index) {
                                this.data.policies[index] = _.pick(policy, "action", "situation", "condition", "postAction");
                                this.data.policies[index].situation = _.invert(this.model.lookup)[this.data.policies[index].situation];
                            }, this));

                            this.data.policies[index] = policy;

                            this.reRender(this.data.policies);
                        }, this)
                    });
                }
            }, this));
        },

        reset: function reset() {
            this.reRender(this.model.mapping.policies);
        },

        save: function save() {
            var policies = [],
                _this = this;

            _.forEach(this.model.renderedPolicies, function (policy) {
                policy = _.pick(policy, "action", "situation", "postAction", "condition");

                if (!policy.condition) {
                    delete policy.condition;
                }

                if (!policy.postAction) {
                    delete policy.postAction;
                }

                policies.push(policy);
            });

            this.model.mapping.policies = policies;

            //Warning message is above the scope of policies
            if (this.$el.find("#policyPatterns").val() !== "Read-only") {
                this.$el.trigger("hideReadOnly");
            } else {
                this.$el.trigger("showReadOnly");
            }

            this.AbstractMappingSave(this.model.mapping, _.bind(function () {
                eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "syncPolicySaveSuccess");
                _this.model.saveCallback();
            }, this));
        }
    });

    return new PoliciesView();
});
