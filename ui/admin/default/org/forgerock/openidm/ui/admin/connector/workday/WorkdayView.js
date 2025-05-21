"use strict";

/*
 * Copyright 2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/openidm/ui/admin/connector/ConnectorTypeAbstractView"], function ($, _, ConnectorTypeAbstractView) {

    var WorkdayView = ConnectorTypeAbstractView.extend({
        events: {
            "click #includeOrganizations": "toggleExcludes"
        },
        toggleExcludes: function toggleExcludes() {
            if (this.$el.find("#includeOrganizations").is(":checked")) {
                this.$el.find(".excludes-boolean-fields").show();
            } else {
                this.$el.find(".excludes-boolean-fields").hide();
            }
        },
        render: function render(args, callback) {
            var _this = this;

            var callbackOverride = function callbackOverride() {
                _this.toggleExcludes();

                if (callback) {
                    callback();
                }
            };

            ConnectorTypeAbstractView.prototype.render.call(this, args, callbackOverride);
        }
    });

    return new WorkdayView();
});
