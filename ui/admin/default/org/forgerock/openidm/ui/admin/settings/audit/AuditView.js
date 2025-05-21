"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/settings/audit/AuditAdminAbstractView", "org/forgerock/openidm/ui/admin/settings/audit/AuditEventHandlersView", "org/forgerock/openidm/ui/admin/settings/audit/AuditTopicsView", "org/forgerock/openidm/ui/admin/settings/audit/AuditFilterPoliciesView", "org/forgerock/openidm/ui/admin/settings/audit/ExceptionFormatterView", "org/forgerock/commons/ui/common/util/Constants"], function ($, _, AuditAdminAbstractView, AuditEventHandlersView, AuditTopicsView, AuditFilterPoliciesView, ExceptionFormatterView, constants) {

    var AuditView = AuditAdminAbstractView.extend({
        template: "templates/admin/settings/audit/AuditTemplate.html",
        element: "#auditContainer",
        noBaseTemplate: true,
        events: {
            "click #submitAudit": "save"
        },

        render: function render() {
            this.data.docHelpUrl = constants.DOC_URL;

            this.retrieveAuditData(_.bind(function () {
                this.parentRender(function () {
                    AuditEventHandlersView.render();
                    AuditTopicsView.render();
                    AuditFilterPoliciesView.render();
                    ExceptionFormatterView.render();
                });
            }, this));
        },

        save: function save(e) {
            e.preventDefault();
            this.saveAudit();
            AuditEventHandlersView.render({ "saved": true });
            AuditTopicsView.render({ "saved": true });
            AuditFilterPoliciesView.render({ "saved": true });
            ExceptionFormatterView.render({ "saved": true });
        }
    });

    return new AuditView();
});
