"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/openidm/ui/common/delegates/SearchDelegate", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/openidm/ui/admin/mapping/util/MappingUtils", "org/forgerock/openidm/ui/admin/mapping/behaviors/SingleRecordReconciliationGridView"], function ($, _, MappingAdminAbstractView, searchDelegate, conf, mappingUtils, SingleRecordReconciliationGridView) {

    var SingleRecordReconciliationView = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/behaviors/SingleRecordReconciliationTemplate.html",
        data: {},
        element: "#testSyncView",
        noBaseTemplate: true,
        events: {
            "click #refreshSourceRecord": "refreshSourceRecord",
            "click #removeSourceRecord": "removeSourceRecord"
        },
        refreshSourceRecord: function refreshSourceRecord(e) {
            e.preventDefault();

            if (conf.globalData.testSyncSource) {
                searchDelegate.searchResults(this.data.mapping.source, ["_id"], conf.globalData.testSyncSource._id, "eq").then(_.bind(function (qry) {
                    conf.globalData.testSyncSource = qry[0];
                    this.data.showChangedPropertyMessage = false;
                    SingleRecordReconciliationGridView.loadData();
                }, this));
            }
        },
        removeSourceRecord: function removeSourceRecord(e) {
            if (e) {
                e.preventDefault();
            }
            if (conf.globalData.testSyncSource) {
                delete conf.globalData.testSyncSource;
                this.data.showChangedPropertyMessage = false;
                this.data.showSampleSource = false;
                $("#findSampleSource", this.$el).val("");
                SingleRecordReconciliationGridView.loadData();
                this.render(this.args);
            }
        },
        render: function render(args, callback) {
            this.args = args;
            this.data.recon = args.recon;
            this.data.mapping = this.getCurrentMapping();

            this.parentRender(_.bind(function () {
                if (this.data.recon) {
                    this.setupSearch();
                    SingleRecordReconciliationGridView.render({
                        recon: this.data.recon._id,
                        sourceObjectId: ""
                    });
                } else {
                    this.$el.closest("#singleRecordRecon").hide();
                }
            }, this));

            if (callback) {
                callback();
            }
        },

        setupSearch: function setupSearch() {
            var autocompleteProps = _.map(this.data.mapping.properties, "source").slice(0, this.getNumRepresentativeProps());

            autocompleteProps = _.filter(autocompleteProps, function (prop) {
                return prop.length > 0;
            });

            mappingUtils.setupSampleSearch($("#findSampleSource", this.$el), this.data.mapping, autocompleteProps, _.bind(function (item) {
                if (this.data.propMap) {
                    this.data.showChangedPropertyMessage = false;
                    delete this.data.propMap;
                }

                if (this.$el.find("#findSampleSource").val().length) {
                    SingleRecordReconciliationGridView.loadData(item);
                } else {
                    this.removeSourceRecord();
                }
            }, this));
        }
    });

    return new SingleRecordReconciliationView();
});
