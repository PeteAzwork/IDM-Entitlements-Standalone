"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["underscore", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/delegates/SchedulerDelegate", "org/forgerock/openidm/ui/admin/util/Scheduler", "org/forgerock/openidm/ui/admin/mapping/behaviors/PoliciesView", "org/forgerock/openidm/ui/admin/mapping/behaviors/SituationalEventScriptsView", "org/forgerock/openidm/ui/admin/mapping/behaviors/ReconciliationScriptView", "org/forgerock/openidm/ui/admin/mapping/behaviors/SingleRecordReconciliationView", "org/forgerock/openidm/ui/admin/mapping/util/MappingUtils"], function (_, MappingAdminAbstractView, eventManager, constants, ConfigDelegate, SchedulerDelegate, Scheduler, PoliciesView, SituationalEventScriptsView, ReconciliationScriptView, SingleRecordReconciliationView, mappingUtils) {

    var BehaviorsView = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/BehaviorsTemplate.html",
        element: "#mappingContent",
        noBaseTemplate: true,
        mapping: null,

        render: function render(args, callback) {
            this.data.docHelpUrl = constants.DOC_URL;
            this.model = {
                args: args,
                callback: callback
            };
            this.mapping = this.getCurrentMapping();

            this.data.mappingName = this.getMappingName();
            this.data.hideSituational = true;
            this.data.hideRecon = true;
            this.data.hideSingleRecordRecon = mappingUtils.readOnlySituationalPolicy(this.mapping.policies);
            this.data.borderHide = false;

            if (this.data.hideSingleRecordRecon || !this.getRecon()) {
                this.data.borderHide = true;
            }

            _.forEach(SituationalEventScriptsView.model.scripts, _.bind(function (script) {
                if (_.has(SituationalEventScriptsView.model, "mapping")) {
                    if (_.has(SituationalEventScriptsView.model.mapping, script)) {
                        this.data.hideSituational = false;
                    }
                } else if (_.has(this.mapping, script)) {
                    this.data.hideSituational = false;
                }
            }, this));

            _.forEach(ReconciliationScriptView.model.scripts, _.bind(function (script) {
                if (_.has(ReconciliationScriptView.model, "mapping")) {
                    if (_.has(ReconciliationScriptView.model.mapping, script)) {
                        this.data.hideRecon = false;
                    }
                } else if (_.has(this.mapping, script)) {
                    this.data.hideRecon = false;
                }
            }, this));

            this.parentRender(_.bind(function () {
                PoliciesView.render({
                    saveCallback: _.bind(function () {
                        this.render(this.model.args, this.model.callback);
                    }, this)
                });
                SituationalEventScriptsView.render();
                ReconciliationScriptView.render();
                SingleRecordReconciliationView.render({ recon: this.getRecon() });

                if (callback) {
                    callback();
                }
            }, this));
        }
    });

    return new BehaviorsView();
});
