"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/authentication/AuthenticationAbstractView", "org/forgerock/openidm/ui/admin/authentication/SessionModuleView", "org/forgerock/openidm/ui/admin/authentication/AuthenticationModuleView"], function ($, _, AuthenticationAbstractView, SessionModuleView, AuthenticationModuleView) {

    var AuthenticationView = AuthenticationAbstractView.extend({
        template: "templates/admin/authentication/AuthenticationTemplate.html",
        noBaseTemplate: false,
        element: "#content",
        events: {
            "show.bs.tab #sessionTab a[data-toggle='tab']": "renderSession",
            "show.bs.tab #modulesTab a[data-toggle='tab']": "renderModules"
        },
        data: {},
        model: {},

        render: function render(args, callback) {
            this.retrieveAuthenticationData(_.bind(function () {
                this.parentRender(function () {
                    AuthenticationModuleView.render();

                    if (callback) {
                        callback();
                    }
                });
            }, this));
        },
        renderSession: function renderSession() {
            SessionModuleView.render();
        },
        renderModules: function renderModules() {
            AuthenticationModuleView.render();
        },

        save: function save(e) {
            e.preventDefault();

            this.saveAuthentication().then(function () {
                SessionModuleView.render();
            });
        }
    });

    return new AuthenticationView();
});
