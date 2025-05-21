"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "handlebars", "backbone", "backgrid", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/openidm/ui/admin/delegates/ReconDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/openidm/ui/common/util/BackgridUtils"], function ($, _, Handlebars, Backbone, Backgrid, MappingAdminAbstractView, reconDelegate, constants, eventManager, BackgridUtils) {
    var SingleRecordReconciliationGridView = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/behaviors/SingleRecordReconciliationGridTemplate.html",
        data: {},
        element: "#testSyncGrid",
        noBaseTemplate: true,
        events: {
            "click #syncUser": "syncNow"
        },
        partials: ["partials/mapping/behaviors/_SingleRecordReconGridCellPartial.html"],

        syncNow: function syncNow() {
            reconDelegate.triggerReconById(this.data.mapping.name, this.data.sourceObjectId, this.data.recon).then(_.bind(function () {
                this.loadData();
                eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "singleRecordReconSuccess");
            }, this));
        },

        render: function render(args) {
            this.data.recon = args.recon;
            this.data.sourceObjectId = args.sourceObjectId;
            this.data.sync = this.getSyncConfig();
            this.data.mapping = this.getCurrentMapping();
            this.data.mappingName = this.getMappingName();

            this.data.showChangedPropertyMessage = false;
            this.loadData();
        },

        loadData: function loadData(sourceObject) {
            var doLoad = _.bind(function () {
                this.parentRender(_.bind(function () {
                    this.loadGrid();
                    this.$el.find(".changed").popover({
                        placement: 'top',
                        container: 'body',
                        html: 'true',
                        title: ''
                    });
                }, this));
            }, this);

            if (sourceObject) {
                this.data.sourceObjectId = sourceObject._id;
            }

            if (this.data.mapping.properties.length) {
                this.$el.parent().find(".sampleSourceAction").show();

                reconDelegate.getReconAssocDetails(this.data.recon, "/sourceObjectId eq \"" + this.data.sourceObjectId + "\"", true, true).then(_.bind(function (reconAssoc) {
                    if (reconAssoc.result.length) {
                        this.data.sampleSource_txt = reconAssoc.result[0].source[this.data.mapping.properties[0].source];
                        this.data.sampleSource_txt_secondary = reconAssoc.result[0].source[this.data.mapping.properties[1].source];

                        this.data.propMap = _.map($.extend({}, true, this.data.mapping.properties), _.bind(function (p) {
                            var targetBefore = "",
                                targetValue,
                                changed = false;

                            if (reconAssoc.result[0].target && reconAssoc.result[0].target[p.target]) {
                                targetValue = reconAssoc.result[0].target[p.target];
                            } else {
                                targetValue = "";
                            }

                            return {
                                source: p.source,
                                sourceValue: reconAssoc.result[0].source[p.source],
                                target: p.target,
                                targetValue: targetValue,
                                targetBefore: targetBefore,
                                changed: changed
                            };
                        }, this));

                        this.data.showSampleSource = true;
                    } else {
                        this.data.showSampleSource = false;
                        this.$el.parent().find(".sampleSourceAction").hide();
                    }
                    doLoad();
                }, this));
            } else {
                this.data.showSampleSource = false;
                this.$el.parent().find(".sampleSourceAction").hide();
                doLoad();
            }
        },
        loadGrid: function loadGrid() {
            var propertiesCollection = new Backbone.Collection(),
                cols = [{
                name: "source",
                sortable: false,
                editable: false,
                cell: Backgrid.Cell.extend({
                    render: function render() {
                        var attributes = this.model.attributes,
                            locals = {
                            title: attributes.source,
                            isSource: true,
                            textMuted: attributes.sourceValue
                        };

                        this.$el.html(Handlebars.compile("{{> mapping/behaviors/_SingleRecordReconGridCellPartial}}")({ "locals": locals }));

                        return this;
                    }
                })
            }, {
                name: "target",
                sortable: false,
                editable: false,
                cell: Backgrid.Cell.extend({
                    render: function render() {
                        var attributes = this.model.attributes,
                            locals = {
                            title: attributes.target,
                            textMuted: attributes.targetValue,
                            changed: attributes.changed,
                            previousValue: attributes.targetBefore
                        };

                        this.$el.html(Handlebars.compile("{{> mapping/behaviors/_SingleRecordReconGridCellPartial}}")({ "locals": locals }));

                        return this;
                    }
                })
            }],
                propertiesGrid;

            _.forEach(this.data.propMap, function (prop) {
                propertiesCollection.add(prop);
            });

            propertiesGrid = new Backgrid.Grid({
                columns: BackgridUtils.addSmallScreenCell(cols),
                collection: propertiesCollection,
                className: "table backgrid"
            });

            this.$el.find("#singleRecordReconGrid").append(propertiesGrid.render().el);
        }
    });

    return new SingleRecordReconciliationGridView();
});
