"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["underscore", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/openidm/ui/admin/mapping/association/DataAssociationManagementView", "org/forgerock/openidm/ui/admin/mapping/association/IndividualRecordValidationView", "org/forgerock/openidm/ui/admin/mapping/association/ReconciliationQueryFiltersView", "org/forgerock/openidm/ui/admin/mapping/association/AssociationRuleView"], function (_, MappingAdminAbstractView, DataAssociationManagementView, IndividualRecordValidationView, ReconciliationQueryFiltersView, AssociationRuleView) {

    var AssociationView = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/AssociationTemplate.html",
        element: "#mappingContent",
        noBaseTemplate: true,

        render: function render(args, callback) {
            var mapping = this.getCurrentMapping();

            this.data.hideObjectFilters = true;
            _.forEach(IndividualRecordValidationView.model.scripts, _.bind(function (script) {
                if (_.has(IndividualRecordValidationView.model, "mapping")) {
                    if (_.has(IndividualRecordValidationView.model.mapping, script)) {
                        this.data.hideObjectFilters = false;
                    }
                } else if (_.has(mapping, script)) {
                    this.data.hideObjectFilters = false;
                }
            }, this));

            this.data.hideReconQueries = !mapping.sourceQuery && !mapping.targetQuery;

            this.parentRender(_.bind(function () {
                DataAssociationManagementView.render();
                ReconciliationQueryFiltersView.render();
                IndividualRecordValidationView.render();
                AssociationRuleView.render({});

                if (callback) {
                    callback();
                }
            }, this));
        }
    });

    return new AssociationView();
});
