"use strict";

/*
 * Copyright 2014-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "handlebars", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/admin/util/Scheduler", "org/forgerock/openidm/ui/admin/delegates/SchedulerDelegate", "org/forgerock/openidm/ui/admin/scheduler/SchedulerListView"], function ($, _, handlebars, ConfigDelegate, constants, eventManager, MappingAdminAbstractView, Router, Scheduler, SchedulerDelegate, SchedulerListView) {

    var ScheduleView = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/scheduling/SchedulerTemplate.html",
        element: "#schedulerView",
        noBaseTemplate: true,
        events: {
            "click #addNew": "addReconciliation"
        },
        model: {
            mapping: {}
        },
        partials: ["partials/scheduler/_ScheduleTypeDisplay.html"],

        render: function render(args, callback) {
            var _this = this;

            this.parentRender(function () {
                _this.model.mapping = _.omit(_this.getCurrentMapping(), "recon");

                SchedulerListView.buildGrid(_this.model.mapping.name).then(function (schedules) {
                    var noGrid = _this.$el.find("#schedulerGrid .empty");

                    if (schedules.result.length > 0 && !noGrid.length) {
                        _this.$el.find("#addNew").hide();
                        _this.$el.find(".schedule-input-body").show();
                    } else {
                        _this.$el.find("#scheduleList").hide();
                        _this.$el.find(".schedule-input-body").show();
                    }

                    if (callback) {
                        callback();
                    }
                });
            });
        },

        reconDeleted: function reconDeleted(id, name, element) {
            element.parent().find("#addNew").show();
            element.remove();
        },

        addReconciliation: function addReconciliation() {
            this.$el.find("#addNew").hide();
            eventManager.sendEvent(constants.ROUTE_REQUEST, { routeName: "addSchedulerView", args: [Router.getURIFragment()] });
        }
    });

    return new ScheduleView();
});
