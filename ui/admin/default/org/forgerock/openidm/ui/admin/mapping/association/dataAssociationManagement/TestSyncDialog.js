"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/openidm/ui/common/delegates/SearchDelegate", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/openidm/ui/admin/mapping/behaviors/SingleRecordReconciliationGridView", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils"], function ($, _, MappingAdminAbstractView, searchDelegate, conf, SingleRecordReconciliationGridView, uiUtils, BootstrapDialogUtils) {

    var TestSyncDialog = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/association/dataAssociationManagement/TestSyncDialogTemplate.html",
        data: {},
        element: "#dialogs",
        events: {},

        render: function render(args, callback) {
            var _this = this;
            this.dialogContent = $('<div id="testSyncDialog"></div>');
            this.setElement(this.dialogContent);
            $('#dialogs').append(this.dialogContent);

            this.currentDialog = BootstrapDialogUtils.createModal({
                title: $.t("templates.sync.testSync.title"),
                message: this.dialogContent,
                onshown: _.bind(function () {
                    uiUtils.renderTemplate(this.template, this.$el, _.assignIn({}, conf.globalData, this.data), _.bind(function () {
                        SingleRecordReconciliationGridView.render(args);
                    }, this), "replace");
                }, _this),
                buttons: [{
                    label: $.t("common.form.cancel"),
                    action: function action(dialogRef) {
                        if (callback) {
                            callback(false);
                        }

                        delete conf.globalData.testSyncSource;
                        dialogRef.close();
                    }
                }]
            });

            this.currentDialog.realize();
            this.currentDialog.open();
        }
    });

    return new TestSyncDialog();
});
