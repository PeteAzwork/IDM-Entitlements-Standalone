"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/settings/audit/AuditAdminAbstractView", "org/forgerock/openidm/ui/admin/settings/audit/AuditEventHandlersDialog", "org/forgerock/openidm/ui/admin/delegates/AuditDelegate", "org/forgerock/commons/ui/common/components/ChangesPending"], function ($, _, AuditAdminAbstractView, AuditEventHandlersDialog, AuditDelegate, ChangesPending) {

    var AuditEventHandlersView = AuditAdminAbstractView.extend({
        template: "templates/admin/settings/audit/AuditEventHandlersTemplate.html",
        element: "#AuditEventHandlersView",
        noBaseTemplate: true,
        events: {
            "change .useForQueries": "changeUseForQueries",
            "click .deleteEventHandler": "deleteEventHandler",
            "click .editEventHandler": "editEventHandler",
            "click .addEventHandler": "addEventHandler"
        },
        model: {},
        data: {},

        render: function render(args, callback) {
            this.data.definedEventHandlers = [];
            this.data.eventHandlers = [];
            this.model.events = [];

            var ONE_HANDLER_MAX_PROP_NAME = "RepositoryAuditEventHandler",
                allowRepo = true,
                eventHandler = {};

            if (args && args.reRender) {
                this.model.auditData = _.cloneDeep(args.auditData);
            } else {
                this.model.auditData = this.getAuditData();
            }

            AuditDelegate.availableHandlers().then(_.bind(function (data) {
                this.model.availableHandlers = data;

                if (_.has(this.model.auditData, "auditServiceConfig") && _.has(this.model.auditData.auditServiceConfig, "handlerForQueries")) {
                    this.model.useForQueries = _.cloneDeep(this.model.auditData.auditServiceConfig.handlerForQueries);
                } else {
                    this.model.useForQueries = "";
                }

                if (_.has(this.model.auditData, "eventHandlers")) {
                    this.model.events = _.cloneDeep(this.model.auditData.eventHandlers);

                    _.forEach(_.cloneDeep(this.model.auditData.eventHandlers), _.bind(function (handler) {

                        eventHandler = _.find(data, { "class": handler.class });
                        handler.isUsableForQueries = eventHandler.isUsableForQueries;

                        // do not allow deleting the handler-for-queries
                        if (handler.config.name === this.model.useForQueries) {
                            handler.useForQueries = true;
                        } else {
                            handler.deletable = true;
                        }

                        if (_.has(handler, "class")) {
                            handler.class = _.last(handler.class.split("."));

                            if (handler.class === ONE_HANDLER_MAX_PROP_NAME) {
                                allowRepo = false;
                            }
                        }

                        if (_.has(handler.config, "topics") && _.isArray(handler.config.topics)) {
                            handler.config.topics = handler.config.topics.join(", ");
                        }
                        this.data.definedEventHandlers.push(handler);
                    }, this));
                }

                if (_.has(this.model.auditData, "auditServiceConfig")) {
                    if (_.has(this.model.auditData.auditServiceConfig, "availableAuditEventHandlers")) {
                        _.forEach(_.cloneDeep(this.model.auditData.auditServiceConfig.availableAuditEventHandlers), _.bind(function (handler) {
                            if (_.last(handler.split(".")) === ONE_HANDLER_MAX_PROP_NAME && allowRepo) {
                                this.data.eventHandlers.push({
                                    display: _.last(handler.split(".")),
                                    value: handler
                                });
                            } else if (_.last(handler.split(".")) !== ONE_HANDLER_MAX_PROP_NAME) {
                                this.data.eventHandlers.push({
                                    display: _.last(handler.split(".")),
                                    value: handler
                                });
                            }
                        }, this));
                    }
                }

                this.parentRender(_.bind(function () {
                    if (!_.has(this.model, "changesModule")) {
                        this.model.changesModule = ChangesPending.watchChanges({
                            element: this.$el.find(".audit-event-handlers-alert"),
                            undo: true,
                            watchedObj: _.cloneDeep(this.model.auditData),
                            watchedProperties: ["auditServiceConfig", "eventHandlers"],
                            undoCallback: _.bind(function (original) {
                                _.forEach(this.model.changesModule.data.watchedProperties, _.bind(function (prop) {
                                    if (_.has(original, prop)) {
                                        this.model.auditData[prop] = original[prop];
                                    } else if (_.has(this.model.auditData, prop)) {
                                        delete this.model.auditData[prop];
                                    }
                                }, this));

                                this.setProperties(["eventHandlers"], this.model.auditData);
                                this.setUseForQueries(this.model.auditData.auditServiceConfig.handlerForQueries);
                                this.reRender();
                            }, this)
                        });
                    } else {
                        this.model.changesModule.reRender(this.$el.find(".audit-event-handlers-alert"));
                        if (args && args.saved) {
                            this.model.changesModule.saveChanges();
                        }
                    }

                    if (callback) {
                        callback();
                    }
                }, this));
            }, this));
        },

        reRender: function reRender() {
            this.render({
                reRender: true,
                auditData: this.model.auditData
            });
            this.setProperties(["eventHandlers"], this.model.auditData);
            this.setUseForQueries(this.model.auditData.auditServiceConfig.handlerForQueries);

            this.model.changesModule.makeChanges(_.clone(this.model.auditData));
        },

        changeUseForQueries: function changeUseForQueries(e) {
            e.preventDefault();
            var eventHandlerName = $(e.currentTarget).attr("data-name");

            if (!_.has(this.model.auditData, "auditServiceConfig")) {
                this.model.auditData.auditServiceConfig = {};
            }

            this.model.auditData.auditServiceConfig.handlerForQueries = eventHandlerName;

            this.reRender();
        },

        deleteEventHandler: function deleteEventHandler(e) {
            e.preventDefault();

            if ($(e.target).closest("button").hasClass("disabled")) {
                return false;
            }

            var index = this.getIndex(this.model.auditData.eventHandlers, $(e.currentTarget).attr("data-name"));
            this.model.auditData.eventHandlers.splice(index, 1);

            this.reRender();
        },

        editEventHandler: function editEventHandler(e) {
            e.preventDefault();
            var eventHandlerName = { "config": { "name": $(e.currentTarget).attr("data-name") } },
                event = _.find(this.model.auditData.eventHandlers, eventHandlerName),
                canDisable = !_.find(this.data.definedEventHandlers, eventHandlerName).useForQueries;

            AuditEventHandlersDialog.render({
                "canDisable": canDisable,
                "eventHandlerType": event.class,
                "eventHandler": _.cloneDeep(event),
                "newEventHandler": false,
                "usedEventHandlerNames": _.map(this.model.auditData.eventHandlers, function (t) {
                    return t.config.name;
                })
            }, _.bind(function (results) {
                var index = this.getIndex(this.model.auditData.eventHandlers, results.eventHandler.config.name);
                this.model.auditData.eventHandlers[index] = results.eventHandler;

                this.reRender();
            }, this));
        },

        getIndex: function getIndex(eventHandlers, name) {
            return _.indexOf(eventHandlers, _.find(eventHandlers, { "config": { "name": name } }));
        },

        addEventHandler: function addEventHandler(e) {
            e.preventDefault();
            var newHandler = this.$el.find("#addAuditModuleSelect").val(),
                found = false,

            // If this is the first event handler then it must be enabled
            canDisable = this.data.eventHandlers.length >= 1;
            if (newHandler !== null) {
                AuditEventHandlersDialog.render({
                    "canDisable": canDisable,
                    "eventHandlerType": newHandler,
                    "eventHandler": {},
                    "newEventHandler": true,
                    "usedEventHandlerNames": _.map(this.model.auditData.eventHandlers, function (t) {
                        return t.config.name;
                    })
                }, _.bind(function (results) {
                    var currentHandlerName = this.model.auditData.auditServiceConfig.handlerForQueries,
                        currentHandler = _.find(this.model.auditData.eventHandlers, { "config": { "name": currentHandlerName } }),
                        currentHandlerType = {};

                    _.forEach(this.model.auditData.eventHandlers, _.bind(function (eventHandler) {
                        if (_.find(this.model.availableHandlers, { "class": eventHandler.class }).isUsableForQueries) {
                            found = true;
                            return false;
                        }
                    }, this));

                    if (_.has(currentHandler, "class")) {
                        currentHandlerType = _.find(this.model.availableHandlers, { "class": currentHandler.class });
                    }

                    // If the current useForQueries property is not set to a valid event handler OR there are no valid event handlers
                    // AND the newly added event handler isUsableForQueries, then set the newly added handler as the handlerForQueries
                    if ((!currentHandlerType.isUsableForQueries || !found) && _.find(this.model.availableHandlers, { "class": results.eventHandler.class }).isUsableForQueries) {
                        this.model.auditData.auditServiceConfig.handlerForQueries = results.eventHandler.config.name;
                    }

                    this.model.auditData.eventHandlers.push(results.eventHandler);

                    this.reRender();
                }, this));
            }
        }
    });

    return new AuditEventHandlersView();
});
