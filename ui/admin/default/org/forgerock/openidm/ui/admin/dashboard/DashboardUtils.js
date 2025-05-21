"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["handlebars", "jquery", "lodash", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/ValidatorsManager"], function (Handlebars, $, _, AdminAbstractView, BootstrapDialogUtils, Configuration, Constants, ValidatorsManager) {

    var obj = {};

    /**
     * Given dashboards and an index, the dashboard at that index will be removed.  If that was a default dashboard a new one
     * at the first index will be automatically assigned the default status.  The dashboard marked as default will
     * returned as the dashboard for viewing.
     *
     * @param dashboards
     * @param index
     * @return {{dashboards: *, index: *}}
     */
    obj.deleteDashboard = function (dashboards, index) {
        var wasDefault = dashboards[index].isDefault;
        dashboards.splice(index, 1);

        if (dashboards.length > 0 && wasDefault) {
            dashboards[0].isDefault = true;
        }

        return {
            dashboards: dashboards,
            index: _.findIndex(dashboards, { "isDefault": true })

        };
    };

    obj.setDefaultDashboard = function (dashboards, index) {
        _.forEach(dashboards, _.bind(function (dashboard) {
            dashboard.isDefault = false;
        }, this));

        dashboards[index].isDefault = true;

        return dashboards;
    };

    obj.renameDashboard = function (dashboards, index, callback) {

        this.dialog = BootstrapDialogUtils.createModal({
            title: $.t("dashboard.renameTitle"),
            size: "size-normal",
            message: $(Handlebars.compile("{{> dashboard/_RenameDashboard}}")({ "existingDashboards": _.pickBy(dashboards, "name") })),
            onshown: _.bind(function (dialogRef) {
                this.setElement("#RenameDashboardDialog");
                dialogRef.$modalBody.find(":text")[0].focus();
                ValidatorsManager.bindValidators(dialogRef.$modal.find("#RenameDashboardDialog form"));
                ValidatorsManager.validateAllFields(dialogRef.$modal.find("#RenameDashboardDialog form"));
            }, this),
            onhidden: _.bind(function () {
                this.setElement("#content");
            }, this),
            buttons: ["close", {
                label: $.t("common.form.save"),
                cssClass: "btn-primary",
                id: "SaveNewName",
                action: _.bind(function (dialogRef) {
                    dashboards[index].name = dialogRef.$modal.find("#DashboardName").val();
                    dialogRef.close();
                    callback(dashboards);
                }, this)
            }]
        }).open();
    };

    /**
     Override validation to allow dialog to enable/disable Save correctly
     */
    obj.validationSuccessful = function (event) {
        AdminAbstractView.prototype.validationSuccessful(event);

        this.$el.closest(".modal-content").find("#SaveNewName").prop('disabled', false);
    };

    obj.validationFailed = function (event, details) {
        AdminAbstractView.prototype.validationFailed(event, details);

        this.$el.closest(".modal-content").find("#SaveNewName").prop('disabled', true);
    };

    return obj;
});
