"use strict";

/*
 * Copyright 2014-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "form2js", "org/forgerock/openidm/ui/admin/managed/AbstractManagedView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/delegates/RepoDelegate", "org/forgerock/openidm/ui/admin/util/ScriptList", "org/forgerock/commons/ui/common/util/UIUtils", "faiconpicker", "bootstrap-tabdrop", "org/forgerock/openidm/ui/admin/managed/schema/SchemaEditorView", "org/forgerock/commons/ui/common/components/ChangesPending", "org/forgerock/openidm/ui/admin/managed/schema/util/SchemaUtils", "org/forgerock/openidm/ui/admin/util/AdminUtils"], function ($, _, form2js, AbstractManagedView, EventManager, validatorsManager, Constants, Router, ConfigDelegate, RepoDelegate, ScriptList, UIUtils, faiconpicker, tabdrop, SchemaEditorView, ChangesPending, SchemaUtils, AdminUtils) {

    var EditManagedView = AbstractManagedView.extend({
        template: "templates/admin/managed/EditManagedTemplate.html",
        events: {
            "click #saveManagedDetails": "saveManagedDetails",
            "submit #managedObjectScriptsForm": "saveManagedScripts",
            "onValidate": "onValidate",
            "click #deleteManaged": "deleteManaged",
            "click .tab-menu li": "changeTabs",
            "click #generalDetails": "makeChanges",
            "keyup input": "makeChanges"
        },
        eventHooks: [],
        propertyHooks: [],
        partials: [],
        model: {
            eventList: ["onCreate", "postCreate", "onRead", "onUpdate", "postUpdate", "onDelete", "postDelete", "onValidate", "onRetrieve", "onStore", "onSync"]
        },

        render: function render(args, callback) {
            var eventKeys;

            this.args = args;
            this.data = {
                selectEvents: [],
                addedEvents: [],
                docHelpUrl: Constants.DOC_URL,
                noSchema: true,
                currentManagedObject: {}
            };

            $.when(ConfigDelegate.readEntity("managed"), RepoDelegate.findRepoConfig()).then(_.bind(function (managedObjects, repoConfig) {
                this.data.managedObjects = managedObjects;
                this.data.repoConfig = repoConfig;

                _.forEach(managedObjects.objects, _.bind(function (managedObject, iterator) {
                    if (managedObject.name === args[0]) {
                        this.data.currentManagedObject = managedObject;
                        this.data.currentManagedObjectIndex = iterator;

                        if (this.data.currentManagedObject.schema) {
                            this.data.noSchema = _.isEmpty(this.data.currentManagedObject.schema.properties);
                        } else {
                            this.data.noSchema = true;
                        }
                    }
                }, this));

                eventKeys = _.chain(this.data.currentManagedObject).keys().without("name", "properties").value();

                //Added events are used for the events that are currently set by the managed object
                this.data.addedEvents = _.intersection(eventKeys, this.model.eventList);

                //Select events are the events currently available for the select
                this.data.selectEvents = _.difference(this.model.eventList, eventKeys);

                this.managedRender(callback);
            }, this));
        },

        managedRender: function managedRender(callback) {
            this.parentRender(_.bind(function () {
                var _this = this;

                validatorsManager.bindValidators(this.$el);
                validatorsManager.validateAllFields(this.$el);

                this.$el.find(".nav-tabs").tabdrop();

                SchemaEditorView.render([this], function () {
                    _this.$el.find('#managedObjectIcon').iconpicker({
                        hideOnSelect: true
                    });

                    _this.model.managedScripts = ScriptList.generateScriptList({
                        element: _this.$el.find("#managedScripts"),
                        label: $.t("templates.managed.addManagedScript"),
                        selectEvents: _this.data.selectEvents,
                        addedEvents: _this.data.addedEvents,
                        currentObject: _this.data.currentManagedObject,
                        hasWorkflow: true,
                        workflowContext: _.pick(SchemaEditorView.model.managedObjectSchema.getValue().properties, "propertyName"),
                        saveCallback: function saveCallback() {
                            _this.saveManagedScripts(false, function () {
                                _this.$el.find('a[href="#managedScriptsContainer"]').tab('show');
                            });
                        }
                    });

                    if (callback) {
                        callback();
                    }
                });

                this.model.changesModule = ChangesPending.watchChanges({
                    element: this.$el.find(".changes-pending-container"),
                    undo: true,
                    watchedObj: _.cloneDeep(this.data.currentManagedObject),
                    undoCallback: function undoCallback() {
                        _this.render(_this.args, function () {
                            _this.$el.find('a[href="#managedDetailsContainer"]').tab('show');
                        });
                    }
                });

                this.makeChanges();

                this.setTabChangeEvent();

                if (this.data.currentTab) {
                    this.$el.find('a[href="' + this.data.currentTab + '"]').tab('show');
                    delete this.data.currentTab;
                }
            }, this));
        },

        saveManagedDetails: function saveManagedDetails(event) {
            var _this2 = this;

            event.preventDefault();

            var data = form2js('managedForm2JS', '.', true),
                nameCheck,
                currentTab = this.data.currentTab;

            nameCheck = this.checkManagedName(data.name, this.data.managedObjects.objects);

            if (!nameCheck || data.name === this.data.currentManagedObject.name) {

                if (_.isUndefined(this.data.currentManagedObject.schema)) {
                    this.data.currentManagedObject.schema = {};
                }

                this.data.currentManagedObject.name = data.name;

                this.$el.find("#managedErrorMessage").hide();

                this.data.currentManagedObject.schema = SchemaEditorView.getManagedSchema();

                this.data.currentManagedObject.schema.icon = this.$el.find("#managedObjectIcon").val();
                this.data.currentManagedObject.schema["mat-icon"] = this.$el.find("#materialDesignIcon").val();
                this.data.currentManagedObject.schema.title = this.$el.find("#managedObjectTitle").val();
                this.data.currentManagedObject.schema.description = this.$el.find("#managedObjectDescription").val();

                this.saveManagedObject(this.data.currentManagedObject, this.data.managedObjects, this.data.nameChange, function () {
                    _this2.$el.find('a[href="' + currentTab + '"]').tab('show');
                });
            } else {
                this.$el.find("#managedErrorMessage .message").html($.t("templates.managed.duplicateNameError"));
                this.$el.find("#managedErrorMessage").show();
                this.$el.find("#saveManagedDetails").prop("disabled", true);
            }
        },
        saveManagedScripts: function saveManagedScripts(event, callback) {
            if (event) {
                event.preventDefault();
            }

            var scriptList = this.model.managedScripts.getScripts();

            _.forEach(this.model.eventList, _.bind(function (val) {
                if (scriptList[val]) {
                    this.data.currentManagedObject[val] = scriptList[val];
                } else {
                    delete this.data.currentManagedObject[val];
                }
            }, this));

            this.saveManagedObject(this.data.currentManagedObject, this.data.managedObjects, false, callback);
        },

        deleteManaged: function deleteManaged(event) {
            event.preventDefault();

            var promises = [];

            UIUtils.confirmDialog($.t("templates.managed.managedDelete"), "danger", _.bind(function () {
                this.data.managedObjects.objects = _.reject(this.data.managedObjects.objects, _.bind(function (managedObject) {
                    return managedObject.name === this.data.currentManagedObject.name;
                }, this));

                this.data.managedObjects.objects = SchemaUtils.removeRelationshipOrphans(this.data.managedObjects.objects, this.data.currentManagedObject.name);

                promises.push(ConfigDelegate.updateEntity("managed", { "objects": this.data.managedObjects.objects }));

                $.when.apply($, promises).then(function () {
                    EventManager.sendEvent(Constants.EVENT_UPDATE_NAVIGATION);
                    EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "deleteManagedSuccess");
                    EventManager.sendEvent(Constants.EVENT_CHANGE_VIEW, { route: Router.configuration.routes.managedListView });
                }, function () {
                    EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "deleteManagedFail");
                });
            }, this));
        },

        changeTabs: function changeTabs(e) {
            if ($(e.currentTarget).hasClass("disabled")) {
                return false;
            }
        },
        validationSuccessful: function validationSuccessful(event) {
            AbstractManagedView.prototype.validationSuccessful(event);
            if (validatorsManager.formValidated(this.$el)) {
                this.$el.find("#saveManagedDetails").prop("disabled", false);
            }
        },
        validationFailed: function validationFailed(event, details) {
            AbstractManagedView.prototype.validationFailed(event, details);
            this.$el.find("#saveManagedDetails").prop("disabled", true);
        },
        /**
        This function is called any time the form is updated. It updates the current config,
        checks with the changes pending module for any differences with the original form,
        toggles the save button on when there are changes, and off when the form is current.
        **/
        makeChanges: function makeChanges() {
            var data = form2js('managedForm2JS', '.', true);

            this.data.nameChange = this.data.currentManagedObject.name !== data.name;
            this.data.currentManagedObject.name = data.name;
            this.data.currentManagedObject.schema.icon = this.$el.find("#managedObjectIcon").val();
            this.data.currentManagedObject.schema.title = data.title;
            this.data.currentManagedObject.schema["mat-icon"] = data.schema && data.schema["mat-icon"] ? data.schema["mat-icon"] : "";
            this.data.currentManagedObject.schema.description = data.description;

            this.model.changesModule.makeChanges(_.clone(this.data.currentManagedObject));
        },
        /**
        * This function sets an event for each bootstrap tab on "show" which looks for any
        * pending form changes in the currently visible tab. If there are changes the the tab
        * change is halted and a dialog is displayed asking the user if he/she would like to discard
        * or save the changes before actually changing tabs.
        *
        * @param {string} tabId - (optional) specific tab on which to set the change event...otherwise the event will be set on all tabs
        **/
        setTabChangeEvent: function setTabChangeEvent(tabId) {
            var _this3 = this;

            var scope = this.$el;

            if (tabId) {
                scope = scope.find("#" + tabId);
            }

            //look for all bootstrap tabs within "scope"
            scope.on('show.bs.tab', 'a[data-toggle="tab"]', function (e) {
                _this3.data.currentTab = e.target.hash;

                //check to see if there are changes pending
                if (_this3.$el.find(".changes-pending-container:visible").length) {
                    //stop processing this tab change
                    e.preventDefault();

                    if (validatorsManager.formValidated(_this3.$el)) {
                        //throw up a confirmation dialog
                        AdminUtils.confirmSaveChanges(_this3, e.target.hash, function () {
                            //once confirmed save the form then continue showing the new tab
                            _this3.saveManagedObject(_this3.data.currentManagedObject, _this3.data.managedObjects, false, function () {
                                _this3.$el.find('a[href="' + e.target.hash + '"]').tab('show');
                            });
                        });
                    } else {
                        AdminUtils.confirmDiscardChanges(_this3, e.target.hash, function () {
                            _this3.$el.find('a[href="' + e.target.hash + '"]').tab('show');
                        });
                    }
                } else if (e.target.hash === "#managedDetailsContainer") {
                    _.delay(function () {
                        _this3.$el.find("#managedObjectName").focus();
                    }, 100);
                }
            });
        }
    });

    return new EditManagedView();
});
