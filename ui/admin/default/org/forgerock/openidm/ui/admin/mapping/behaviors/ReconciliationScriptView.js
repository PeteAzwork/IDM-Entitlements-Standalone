"use strict";

/*
 * Copyright 2015-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/openidm/ui/admin/mapping/util/MappingScriptsView"], function ($, _, UIUtils, MappingScriptsView) {
    var ReconciliationScriptView = MappingScriptsView.extend({
        element: "#reconQueryView",
        noBaseTemplate: true,
        events: {
            "click .addScript": "addScript",
            "click .saveScripts": "saveScripts",
            "click .deleteScript": "deleteScript"
        },
        model: {
            scripts: ["result"],
            scriptEditors: {},
            successMessage: "triggeredByReconSaveSuccess"
        },
        data: {
            showDeleteButton: true
        },
        render: function render() {
            this.parentRender(function () {
                this.init();

                //Needs to be out of scope since this dom element isn't in the $el and we need access to the script widget
                $("#reconQueryViewBody").on("shown.bs.collapse", _.bind(function () {
                    this.model.scriptEditors.result.refresh();
                }, this));
            });
        },
        deleteScript: function deleteScript(event) {
            UIUtils.confirmDialog($.t("templates.scriptEditor.deleteMsg"), "danger", _.bind(function () {
                this.saveScripts(event, true);
                this.render();
            }, this));
        }
    });

    return new ReconciliationScriptView();
});
