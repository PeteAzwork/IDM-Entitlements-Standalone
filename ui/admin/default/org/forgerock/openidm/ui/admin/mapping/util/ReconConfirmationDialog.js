"use strict";

/*
 * Copyright 2022 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "handlebars", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils"], function ($, _, handlebars, AbstractView, UIUtils, BootstrapDialogUtils) {
    var ReconConfirmationDialog = AbstractView.extend({
        el: "#dialogs",
        events: {},
        render: function render(params) {
            var _this = this;

            UIUtils.preloadPartial("partials/mapping/util/_reconConfirmationDialog.html").then(function () {
                _this.currentDialog = BootstrapDialogUtils.createModal({
                    title: $.t("templates.mapping.reconcileMapping", { "mappingName": encodeURI(params.mappingName) }),
                    message: $(handlebars.compile("{{> mapping/util/_reconConfirmationDialog }}")({ mapping: params.mapping })),
                    buttons: [{
                        label: $.t('common.form.cancel'),
                        id: "reconConfirmationDialogCancelBtn",
                        action: function action(dialogRef) {
                            dialogRef.close();
                        }
                    }, {
                        label: "Continue Reconciliation",
                        id: "reconConfirmationDialogSubmitBtn",
                        action: function action(dialogRef) {
                            var persistAssociations = dialogRef.$modal.find("#persistAssociationsToggle").is(":checked");
                            params.doRecon(persistAssociations);
                            dialogRef.close();
                        }
                    }]
                });

                _this.currentDialog.realize();
                _this.currentDialog.open();
            });
        }
    });

    return new ReconConfirmationDialog();
});
