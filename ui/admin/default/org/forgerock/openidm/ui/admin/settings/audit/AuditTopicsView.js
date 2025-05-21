"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/settings/audit/AuditAdminAbstractView", "org/forgerock/openidm/ui/admin/settings/audit/AuditTopicsDialog", "org/forgerock/commons/ui/common/components/ChangesPending"], function ($, _, AuditAdminAbstractView, AuditTopicsDialog, ChangesPending) {

    var AuditTopicsView = AuditAdminAbstractView.extend({
        template: "templates/admin/settings/audit/AuditTopicsTemplate.html",
        element: "#AuditTopicsView",
        noBaseTemplate: true,
        events: {
            "click .editEvent": "editEvent",
            "click .deleteEvent": "deleteEvent",
            "click .addEvent": "addEvent"
        },

        constants: {
            DEFAULT_TOPICS_LIST: ["authentication", "access", "activity", "recon", "sync", "config"],
            DEFAULT_TOPICS: {
                "authentication": {},
                "access": {},
                "activity": {},
                "recon": {},
                "sync": {},
                "config": {}
            },
            CRUDPAQ_ACTIONS: ["action", "create", "delete", "patch", "query", "read", "update"],
            CUSTOM_CRUDPAQ_ACTIONS: ["create", "delete", "update", "link", "unlink", "exception", "ignore"]
        },

        render: function render(args, callback) {
            this.data = {
                topics: []
            };

            this.model = {
                auditData: {},
                events: {},
                EVENT_ACTIONS: {
                    "authentication": [],
                    "access": [],
                    "activity": this.constants.CRUDPAQ_ACTIONS,
                    "custom": this.constants.CRUDPAQ_ACTIONS,
                    "config": this.constants.CRUDPAQ_ACTIONS,
                    "recon": this.constants.CUSTOM_CRUDPAQ_ACTIONS,
                    "sync": this.constants.CUSTOM_CRUDPAQ_ACTIONS
                }
            };

            if (!_.has(args, "model")) {
                this.model.auditData = this.getAuditData();

                if (_.has(this.model.auditData, "eventTopics")) {
                    this.model.topics = _.assignIn(_.cloneDeep(this.constants.DEFAULT_TOPICS), _.cloneDeep(this.model.auditData.eventTopics));
                }
            } else {
                this.model = args.model;
            }

            _.forEach(_.clone(this.model.topics, true), _.bind(function (event, name) {
                event.defaultEvents = _.includes(this.constants.DEFAULT_TOPICS_LIST, name);
                event.name = name;
                this.data.topics.push(event);
            }, this));

            this.parentRender(_.bind(function () {
                if (!_.has(this.model, "changesModule")) {
                    this.model.changesModule = ChangesPending.watchChanges({
                        element: this.$el.find(".audit-events-alert"),
                        undo: true,
                        watchedObj: $.extend({}, this.model.auditData),
                        watchedProperties: ["eventTopics"],
                        undoCallback: _.bind(function (original) {
                            this.model.auditData.eventTopics = original.eventTopics;
                            this.model.topics = {};

                            if (_.has(this.model.auditData, "eventTopics")) {
                                this.model.topics = _.assignIn(_.cloneDeep(this.constants.DEFAULT_TOPICS), _.cloneDeep(this.model.auditData.eventTopics));
                            }

                            this.reRender();
                        }, this)
                    });
                } else {
                    this.model.changesModule.reRender(this.$el.find(".audit-events-alert"));
                    if (args && args.saved) {
                        this.model.changesModule.saveChanges();
                    }
                }

                if (callback) {
                    callback();
                }
            }, this));
        },

        reRender: function reRender() {
            this.model.auditData.eventTopics = this.model.topics;

            this.setProperties(["eventTopics"], this.model.auditData);
            this.model.changesModule.makeChanges(this.model.auditData);
            this.render({ model: this.model });
        },

        addEvent: function addEvent(e) {
            e.preventDefault();
            AuditTopicsDialog.render({
                "event": {},
                "eventName": "",
                "isDefault": false,
                "definedEvents": _.keys(this.model.topics),
                "eventDeclarativeActions": this.model.EVENT_ACTIONS.custom,
                "newEvent": true
            }, _.bind(function (results) {
                this.model.topics[results.eventName] = results.data;
                this.reRender();
            }, this));
        },

        getDialogConfig: function getDialogConfig(eventName, topics, defaultTopicsList, eventActions) {
            var dialogConfig = {
                "event": topics[eventName],
                "eventName": eventName,
                "isDefault": _.includes(defaultTopicsList, eventName),
                "definedEvents": _.keys(topics),
                "newEvent": false
            };

            if (_.includes(defaultTopicsList, eventName) && eventName !== "custom") {
                dialogConfig.eventDeclarativeActions = eventActions[eventName];
                dialogConfig.limitedEdits = true;
            } else {
                dialogConfig.eventDeclarativeActions = eventActions.custom;
            }

            // Triggers only apply to recon and activity events, we can enhance this later if it becomes necessary.
            if (_.includes(["activity", "recon"], eventName)) {
                dialogConfig.triggers = { "recon": eventActions.recon };
            }
            return dialogConfig;
        },

        editEvent: function editEvent(e) {
            e.preventDefault();

            var dialogConfig = this.getDialogConfig($(e.currentTarget).attr("data-name"), this.model.topics, this.constants.DEFAULT_TOPICS_LIST, this.model.EVENT_ACTIONS);

            AuditTopicsDialog.render(dialogConfig, _.bind(function (results) {
                this.model.topics[results.eventName] = results.data;
                this.reRender();
            }, this));
        },

        deleteEvent: function deleteEvent(e) {
            e.preventDefault();
            delete this.model.topics[$(e.currentTarget).attr("data-name")];
            this.reRender();
        }
    });

    return new AuditTopicsView();
});
