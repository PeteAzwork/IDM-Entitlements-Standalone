"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["lodash", "jquery", "handlebars", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/email/EmailProviderConfigView", "org/forgerock/openidm/ui/admin/email/EmailTemplatesListView", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "bootstrap-tabdrop"], function (_, $, Handlebars, AdminAbstractView, EmailProviderConfigView, EmailTemplatesListView, Router, Constants, EventManager) {

    var EmailSettingsView = AdminAbstractView.extend({
        template: "templates/admin/email/EmailSettingsTemplate.html",
        events: {
            "click a[data-toggle=tab]": "updateRoute"
        },

        render: function render(args, callback) {
            this.data.tabName = args[0] || "provider";

            this.parentRender(_.bind(function () {
                EmailProviderConfigView.render({}, _.noop);
                EmailTemplatesListView.render({}, _.noop);
                if (callback) {
                    callback();
                }
            }, this));
        },

        updateRoute: function updateRoute(e) {
            if (e) {
                e.preventDefault();
            }

            if ($(e.currentTarget).parent().hasClass("disabled")) {
                return false;
            } else {
                var route = $(e.currentTarget).attr("data-route");
                EventManager.sendEvent(Constants.ROUTE_REQUEST, {
                    routeName: "emailSettingsView",
                    args: [route],
                    trigger: true
                });
            }
        }
    });

    Handlebars.registerHelper('sw', function (val, val2, options) {
        if (val.indexOf(val2) === 0) {
            return options.fn(this);
        } else {
            return options.inverse(this);
        }
    });

    return new EmailSettingsView();
});
