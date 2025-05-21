"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/admin/util/SchedulerUtils"], function ($, _, MappingAdminAbstractView, eventManager, constants, SchedulerUtils) {

    var ScheduleView = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/scheduling/LiveSyncTemplate.html",
        element: "#liveSyncView",
        noBaseTemplate: true,
        events: {
            "click .saveLiveSync": "saveLiveSync"
        },
        model: {
            mapping: {},
            sync: {}
        },

        render: function render(args, callback) {
            var seconds = "",
                foundLiveSync = false;

            this.model.mapping = _.omit(this.getCurrentMapping(), "recon");
            this.model.sync = this.getSyncConfig();

            if (this.model.mapping.source.indexOf("system/") === 0) {
                this.data.connectorId = this.model.mapping.source.split("/")[1]; //system/ldap/account;
            }

            this.parentRender(_.bind(function () {
                this.$el.find(".noLiveSyncMessage").hide();
                this.$el.find(".systemObjectMessage").hide();

                if (this.model.mapping.hasOwnProperty("enableSync")) {
                    this.$el.find(".liveSyncEnabled").prop('checked', this.model.mapping.enableSync);
                } else {
                    this.$el.find(".liveSyncEnabled").prop('checked', true);
                }

                if (args.schedule && args.schedule.enabled) {
                    var schedule = args.schedule;

                    // There is a liveSync Scheduler and it is enabled and the source matches the source of the mapping
                    if (schedule.invokeService.indexOf("provisioner") >= 0 && schedule.enabled && schedule.invokeContext.source === this.model.mapping.source) {
                        seconds = SchedulerUtils.getSecondsFromLiveSyncScheduleString(schedule.schedule);

                        this.$el.find(".noLiveSyncMessage").hide();
                        this.$el.find(".systemObjectMessage").show();
                        this.$el.find(".managedSourceMessage").hide();
                        this.$el.find(".liveSyncSeconds").text(seconds);

                        foundLiveSync = true;

                        // This is a recon schedule
                    } else if (schedule.invokeService.indexOf("sync") >= 0) {

                        // The mapping is of a managed object
                        if (this.model.mapping.source.indexOf("managed/") >= 0) {
                            this.$el.find(".noLiveSyncMessage").hide();
                            this.$el.find(".systemObjectMessage").hide();
                            this.$el.find(".managedSourceMessage").show();
                        } else if (!foundLiveSync) {
                            this.$el.find(".noLiveSyncMessage").show();
                            this.$el.find(".liveSyncEnabledContainer").hide();
                            this.$el.find(".systemObjectMessage").hide();
                            this.$el.find(".managedSourceMessage").hide();
                        }
                    }
                } else if (this.model.mapping.source.indexOf("managed/") >= 0) {
                    this.$el.find(".noLiveSyncMessage").hide();
                    this.$el.find(".systemObjectMessage").hide();
                    this.$el.find(".managedSourceMessage").show();
                } else {
                    this.$el.find(".noLiveSyncMessage").show();
                    this.$el.find(".liveSyncEnabledContainer").hide();
                    this.$el.find(".systemObjectMessage").hide();
                    this.$el.find(".managedSourceMessage").hide();
                }

                this.$el.find(".schedule-input-body").show();

                if (callback) {
                    callback();
                }
            }, this));
        },

        saveLiveSync: function saveLiveSync() {
            this.model.mapping.enableSync = this.$el.find(".liveSyncEnabled").prop("checked");

            this.AbstractMappingSave(this.model.mapping, _.bind(function () {
                eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "syncLiveSyncSaveSuccess");
            }, this));
        }
    });

    return new ScheduleView();
});
