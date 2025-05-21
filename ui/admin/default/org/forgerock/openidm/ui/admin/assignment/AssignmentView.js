"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/assignment/AddAssignmentView", "org/forgerock/openidm/ui/admin/assignment/EditAssignmentView"], function ($, _, AdminAbstractView, AddAssignmentView, EditAssignmentView) {
    var AssignmentView = AdminAbstractView.extend({
        template: "templates/common/EmptyTemplate.html",

        render: function render(args, callback) {
            this.parentRender(_.bind(function () {
                this.$el.append('<div id="assignmentHolder"></div>');

                if (args.length === 2) {
                    AddAssignmentView.render(args);
                } else {
                    EditAssignmentView.render(args);
                }

                if (callback) {
                    callback();
                }
            }, this));
        }
    });

    return new AssignmentView();
});
