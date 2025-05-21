"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/selfservice/GenericSelfServiceStageView", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils"], function ($, _, AdminAbstractView, GenericSelfServiceStageView, BootstrapDialogUtils) {

    var SelfServiceStageDialogView = AdminAbstractView.extend({
        element: "#dialogs",
        noBaseTemplate: true,
        model: {},
        render: function render(args) {
            var _this = this;

            var view,
                viewPromise = $.Deferred(),
                archievedData = _.clone(args.data);

            require(["org/forgerock/openidm/ui/admin/selfservice/" + args.type], function (result) {
                viewPromise.resolve(result);
            }, function () {
                viewPromise.reject(GenericSelfServiceStageView);
            });

            $.when(viewPromise).always(function (foundView) {
                view = foundView;
                var currentDialog = $('<div id="SelfServiceStageDialog"></div>');
                _this.setElement(currentDialog);
                $("#dialogs").append(currentDialog);

                _this.parentRender(function () {
                    _this.dialog = BootstrapDialogUtils.createModal({
                        title: $.t("templates.selfservice.user." + args.title + "Title"),
                        message: '<div id="SelfServiceStageDialog"></div>',
                        onshown: function onshown(dialogRef) {
                            view.render(args, dialogRef);
                        },
                        buttons: ["cancel", {
                            label: $.t("common.form.save"),
                            cssClass: "btn-primary",
                            id: "saveUserConfig",
                            action: function action(dialogRef) {
                                if (this.hasClass("disabled")) {
                                    return false;
                                } else if (this.hasClass("confirmChangeToMinimumAnswersToDefine")) {
                                    view.confirmChangeToMinimumAnswersToDefine();
                                    return false;
                                } else {
                                    args.saveCallback(view.getData(), archievedData);
                                    dialogRef.close();
                                }
                            }
                        }]
                    }).open();
                });
            });
        }
    });

    return new SelfServiceStageDialogView();
});
