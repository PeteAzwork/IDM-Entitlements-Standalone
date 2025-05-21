"use strict";

/*
 * Copyright 2014-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["underscore", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/openidm/ui/admin/mapping/scheduling/SchedulerView"], function (_, MappingAdminAbstractView, SchedulerView) {

    var ScheduleView = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/ScheduleTemplate.html",
        element: "#mappingContent",
        noBaseTemplate: true,

        render: function render(args, callback) {
            this.parentRender(_.bind(function () {
                SchedulerView.render();

                if (callback) {
                    callback();
                }
            }, this));
        }
    });

    return new ScheduleView();
});
