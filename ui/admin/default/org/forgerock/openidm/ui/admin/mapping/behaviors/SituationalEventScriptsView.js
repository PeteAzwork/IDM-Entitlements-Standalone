"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["org/forgerock/openidm/ui/admin/mapping/util/MappingScriptsView"], function (MappingScriptsView) {
    var SituationalEventScriptsView = MappingScriptsView.extend({
        element: "#situationalQueries",
        noBaseTemplate: true,
        events: {
            "click .addScript": "addScript",
            "click .saveScripts": "saveScripts"
        },
        model: {
            scripts: ["onCreate", "onUpdate", "onDelete", "onLink", "onUnlink"],
            scriptEditors: {},
            successMessage: "triggeredBySituationSaveSuccess"
        },

        render: function render() {
            this.parentRender(function () {
                this.init();
            });
        }
    });

    return new SituationalEventScriptsView();
});
