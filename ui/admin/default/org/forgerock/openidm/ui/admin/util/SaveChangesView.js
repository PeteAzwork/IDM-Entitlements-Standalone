"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["underscore", "org/forgerock/commons/ui/common/main/AbstractView"], function (_, AbstractView) {

    var SaveChangesView = AbstractView.extend({
        template: "templates/admin/util/SaveChangesTemplate.html",
        element: "#jqConfirm",
        noBaseTemplate: true,

        render: function render(args, callback) {
            this.element = "#" + args.id;
            this.data.msg = args.msg;
            this.data.changes = args.changes;
            this.data.emptyText = args.empty;

            if (this.data.changes === null) {
                this.data.noGrid = true;
            }

            _.forEach(this.data.changes, _.bind(function (change, i) {
                if (_.isEmpty(change.values)) {
                    this.data.changes[i].empty = true;
                }
            }, this));

            this.parentRender(function () {
                if (callback) {
                    callback();
                }
            });
        }

    });

    return new SaveChangesView();
});
