"use strict";

/*
 * Copyright 2014-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/openidm/ui/admin/util/InlineScriptEditor", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils"], function ($, _, AbstractView, InlineScriptEditor, BootstrapDialogUtils) {
    var ScriptDialog = AbstractView.extend({
        element: "#dialogs",
        events: {},
        data: {},

        render: function render(args, callback) {
            var _this = this;

            this.currentDialog = $('<div id="scriptManagerDialogForm"></div>');

            $('#dialogs').append(this.currentDialog);

            this.setElement(this.currentDialog);

            BootstrapDialogUtils.createModal({
                title: args.scriptDialogTitle || "Script Manager",
                message: this.currentDialog,
                cssClass: "script-large-dialog",
                onshown: function onshown() {
                    args.element = _this.$el;
                    if (!args.disableValidation) {
                        args.validationCallback = _.bind(function (result) {
                            if (result) {
                                $("#scriptDialogOkay").prop("disabled", false);
                            } else {
                                $("#scriptDialogOkay").prop("disabled", true);
                            }
                        }, _this);
                    }

                    _this.scriptEditor = InlineScriptEditor.generateScriptEditor(args, _.bind(function () {
                        if (callback) {
                            callback();
                        }
                    }, _this));
                },
                buttons: [{
                    label: $.t("common.form.cancel"),
                    id: "scriptDialogCancel",
                    action: function action(dialogRef) {
                        dialogRef.close();
                    }
                }, {
                    label: $.t('common.form.save'),
                    id: "scriptDialogOkay",
                    cssClass: "btn-primary",
                    hotkey: null,
                    action: _.bind(function (dialogRef) {
                        if (args.saveCallback) {
                            args.saveCallback(this.generateScript());
                        }

                        dialogRef.close();
                    }, _this)
                }]
            }).open();
        },

        getInlineEditor: function getInlineEditor() {
            return this.scriptEditor.getInlineEditor();
        },

        generateScript: function generateScript() {
            return this.scriptEditor.generateScript();
        }
    });

    return new ScriptDialog();
});
