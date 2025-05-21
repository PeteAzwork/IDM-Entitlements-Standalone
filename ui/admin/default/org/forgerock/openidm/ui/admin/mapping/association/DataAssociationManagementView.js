"use strict";

/*
 * Copyright 2015-2022 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/openidm/ui/admin/delegates/ReconDelegate", "org/forgerock/commons/ui/common/util/DateUtil", "org/forgerock/openidm/ui/admin/delegates/SyncDelegate", "org/forgerock/openidm/ui/admin/mapping/util/MappingUtils", "org/forgerock/openidm/ui/admin/mapping/association/dataAssociationManagement/ChangeAssociationDialog", "org/forgerock/openidm/ui/admin/mapping/association/dataAssociationManagement/TestSyncDialog", "backbone.paginator", "backgrid", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/commons/ui/common/main/AbstractCollection", "org/forgerock/commons/ui/common/main/ServiceInvoker", "org/forgerock/commons/ui/common/components/Messages", "org/forgerock/commons/ui/common/util/Constants", "backgrid-paginator", "backgrid-selectall"], function ($, _, MappingAdminAbstractView, conf, reconDelegate, dateUtil, syncDelegate, mappingUtils, changeAssociationDialog, TestSyncDialog, BackbonePaginator, Backgrid, BackgridUtils, AbstractCollection, ServiceInvoker, Messages, Constants) {

    var DataAssociationManagementView = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/association/DataAssociationManagementTemplate.html",
        element: "#analysisView",
        noBaseTemplate: true,
        events: {
            "change #situationSelection": "changeSituationView",
            "click #doSyncButton": "syncNow",
            "click #changeAssociation": "changeAssociation",
            "click #singleRecordSync": "singleRecordSync"
        },
        data: {},
        model: {},

        render: function render(args, callback) {
            var _this2 = this;

            this.data.recon = this.getRecon();
            this.mapping = this.getCurrentMapping();
            this.mappingSync = this.getSyncNow();
            this.data.numRepresentativeProps = this.getNumRepresentativeProps();
            this.data.sourceProps = _.map(this.mapping.properties, "source").slice(0, this.data.numRepresentativeProps);
            this.data.targetProps = _.map(this.mapping.properties, "target").slice(0, this.data.numRepresentativeProps);
            this.data.hideSingleRecordReconButton = mappingUtils.readOnlySituationalPolicy(this.mapping.policies);
            this.data.reconAvailable = false;
            // this.model.pageCookie = null;

            // Has recon data
            if (this.data.recon !== null) {
                reconDelegate.getReconAssocList("/reconId eq \"" + this.data.recon._id + "\"").then(_.bind(function (reconCheck) {
                    // Has recon data, but doesn't have recon association to match
                    if (reconCheck.result.length === 0) {
                        _this2.parentRender(_.bind(function () {
                            if (callback) {
                                callback();
                            }
                        }));
                    } else {
                        // Has recon data and appropriate association data
                        _this2.data.reconAvailable = true;

                        _this2.parentRender(_.bind(function () {
                            this.renderReconResults(null, callback);

                            if (callback) {
                                callback();
                            }
                        }, _this2));
                    }
                }));
            } else {
                // Does not have recon data
                this.parentRender(_.bind(function () {
                    if (callback) {
                        callback();
                    }
                }, this));
            }
        },

        syncNow: function syncNow(e) {
            e.preventDefault();
            $(e.target).closest("button").prop('disabled', true);
            this.mappingSync(e);
        },

        singleRecordSync: function singleRecordSync(e) {
            e.preventDefault();

            TestSyncDialog.render({
                recon: this.data.recon._id,
                sourceObjectId: this.data.selectedRow.attributes.sourceObjectId
            });
        },

        changeAssociation: function changeAssociation(e) {
            var args,
                selectedRow = this.getSelectedRow(),
                sourceObj = selectedRow.get("source"),
                targetObj = selectedRow.get("target");

            e.preventDefault();

            args = {
                selectedLinkQualifier: selectedRow.get("linkQualifier"),
                sourceObj: sourceObj,
                sourceObjRep: _.pick(sourceObj, this.data.sourceProps),
                targetObj: targetObj,
                targetObjRep: _.pick(targetObj, this.data.targetProps),
                targetProps: $.extend({}, this.data.targetProps),
                ambiguousTargetObjectIds: selectedRow.get("ambiguousTargetObjectIds") || [],
                recon: $.extend({}, this.data.recon),
                linkQualifiers: this.mapping.linkQualifiers,
                reloadAnalysisGrid: _.bind(function () {
                    this.renderReconResults(this.$el.find("#situationSelection").val().split(","), null);
                }, this)
            };

            changeAssociationDialog.render(args);
        },

        getSelectedRow: function getSelectedRow() {
            return this.data.selectedRow;
        },

        renderReconResults: function renderReconResults(selectedSituation, callback) {
            var recon = this.data.recon,
                renderGrid = _.bind(function () {
                var situations = selectedSituation || $("#situationSelection", this.$el).val().split(",");

                this.buildAnalysisGrid(situations);
            }, this);

            this.data.reconAvailable = true;
            this.data.allSituations = _.keys(this.data.recon.situationSummary).join(",");
            this.data.situationList = _.map(_.toPairs(this.data.recon.situationSummary), function (item) {
                return { key: item[0], value: item[1] };
            });

            if (recon.started) {
                this.data.last_started = dateUtil.formatDate(recon.started, "MMMM dd, yyyy HH:mm");
            }

            this.parentRender(_.bind(function () {
                if (selectedSituation) {
                    $("#situationSelection", this.$el).val(selectedSituation.join(","));
                }
                renderGrid($("#analysisGridContainer"), callback);
            }, this));
        },

        changeSituationView: function changeSituationView(e) {
            e.preventDefault();
            this.renderReconResults($(e.target).val().split(","));
        },
        getCols: function getCols() {
            var _this = this;

            return [{
                "name": "sourceObjectDisplay",
                "label": $.t("templates.mapping.source"),
                "sortable": false,
                "editable": false,
                "headerCell": BackgridUtils.FilterHeaderCell,
                "cell": Backgrid.Cell.extend({
                    render: function render() {
                        var sourceObject = this.model.get("source"),
                            translatedObject,
                            txt;

                        if (sourceObject) {
                            translatedObject = sourceObject;
                            txt = mappingUtils.buildObjectRepresentation(translatedObject, _this.data.sourceProps);
                        } else {
                            txt = "Not Found";
                        }

                        this.$el.html(txt);

                        this.delegateEvents();

                        return this;
                    }
                })
            }, {
                "name": "linkQualifier",
                "label": $.t("templates.mapping.linkQualifier"),
                "sortable": false,
                "editable": false,
                "cell": "string"
            }, {
                "name": "targetObjectDisplay",
                "label": $.t("templates.mapping.target"),
                "sortable": false,
                "editable": false,
                "headerCell": BackgridUtils.FilterHeaderCell,
                "cell": Backgrid.Cell.extend({
                    render: function render() {
                        var targetObject = this.model.get("target"),
                            ambiguousTargetObjectIds = this.model.get("ambiguousTargetObjectIds"),
                            txt;

                        if (targetObject) {
                            txt = mappingUtils.buildObjectRepresentation(targetObject, _this.data.targetProps);
                        } else if (ambiguousTargetObjectIds && ambiguousTargetObjectIds.length) {
                            txt = $.t("templates.correlation.multipleMatchesFound");
                        } else {
                            txt = $.t("templates.correlation.notFound");
                        }

                        this.$el.html(txt);

                        this.delegateEvents();

                        return this;
                    }
                })
            }];
        },
        buildQueryFilter: function buildQueryFilter(situations) {
            var queryFilter = '';

            if (situations) {
                queryFilter += this.buildINClause(situations, '/situation');
            } else {
                queryFilter = 'true';
            }

            return queryFilter;
        },
        buildINClause: function buildINClause(array, fieldName) {
            var inClause = '';

            inClause += _.map(array, function (val) {
                return fieldName + ' eq "' + val + '"';
            }).join(" OR ");

            return inClause;
        },

        buildAnalysisGrid: function buildAnalysisGrid(situations) {
            var RECORDOFFSET = 10;

            var _this = this,
                cols = this.getCols(),
                grid_id = "#analysisGrid",
                pager_id = grid_id + '-paginator',
                ReconCollection = AbstractCollection.extend({
                url: Constants.context + ("/recon/assoc/" + this.data.recon._id + "/entry"),
                queryParams: {
                    _queryFilter: _this.buildQueryFilter(situations),
                    queryMissingSide: true,
                    _pageSize: 10,
                    _pagedResultsOffset: 0
                },
                sync: function sync(method, collection, options) {
                    var params = [],
                        pageOffset = options.data['page'] * RECORDOFFSET,
                        changedOptions = _.cloneDeep(options.data);

                    delete changedOptions['per_page'];

                    // Build source query filter for searching source side
                    if (changedOptions['sourceObjectDisplay'] !== undefined) {
                        changedOptions["sourceQueryFilter"] = _.map(_this.data.sourceProps, function (prop) {
                            return prop + " co \"" + changedOptions['sourceObjectDisplay'] + "\"";
                        }).join(" OR ");
                    }

                    // Build target query filter for searching target side
                    if (changedOptions['targetObjectDisplay'] !== undefined) {
                        changedOptions["targetQueryFilter"] = _.map(_this.data.targetProps, function (prop) {
                            return prop + " co \"" + changedOptions['targetObjectDisplay'] + "\"";
                        }).join(" OR ");
                    }

                    // Remove pointless filters
                    delete changedOptions['sourceObjectDisplay'];
                    delete changedOptions['targetObjectDisplay'];

                    // If any filter is applied remove queryMissingSide
                    if (changedOptions['sourceQueryFilter'] !== undefined || changedOptions['targetQueryFilter'] !== undefined) {
                        delete changedOptions['queryMissingSide'];

                        if (changedOptions['targetQueryFilter'] === undefined) {
                            changedOptions['targetQueryFilter'] = true;
                        }

                        if (changedOptions['sourceQueryFilter'] === undefined) {
                            changedOptions['sourceQueryFilter'] = true;
                        }
                    }

                    /*
                    if(_this.model.pageCookie !== null) {
                        changedOptions['_pagedResultsCookie'] = _this.model.pageCookie;
                    }
                    */

                    _.forIn(changedOptions, function (val, key) {
                        if (key === '_pagedResultsOffset') {
                            params.push(key + "=" + pageOffset);
                        } else {
                            params.push(key + "=" + val);
                        }
                    });

                    options.data = params.join("&");
                    options.processData = false;
                    // suppress default failure events because we are handling any errors below in options.error
                    options.suppressEvents = true;

                    options.error = function (response) {
                        if (response.responseJSON && response.responseJSON.code === 404) {
                            // recon association data for this specific recon is not available
                            // do nothing and fail gracefully here
                        } else {
                            Messages.addMessage({
                                type: Messages.TYPE_DANGER,
                                response: response
                            });
                        }
                    };

                    return ServiceInvoker.restCall(options).then(function () {
                        _this.$el.find(".actionButton").prop('disabled', true);
                    });
                },
                parseState: function parseState(resp, queryParams, state) {
                    var recordCount = (state.currentPage + 1) * RECORDOFFSET;

                    if (resp.pagedResultsCookie !== null) {
                        recordCount += 1;
                    }

                    return { totalRecords: recordCount };
                }
                /**
                parseRecords: function (resp) {
                    if (resp.pagedResultsCookie !== null) {
                        _this.model.pageCookie = resp.pagedResultsCookie;
                    }
                     return resp.result;
                }
                 getFirstPage: function () {
                    _this.model.pageCookie = null;
                    return BackbonePaginator.prototype.getFirstPage.apply(this, arguments);
                }
                */
            }),
                reconGrid,
                paginator;

            this.model.recons = new ReconCollection();

            reconGrid = new Backgrid.Grid({
                className: "backgrid table table-hover",
                emptyText: $.t("templates.admin.ResourceList.noData"),
                columns: BackgridUtils.addSmallScreenCell(cols),
                collection: _this.model.recons,
                row: BackgridUtils.ClickableRow.extend({
                    callback: function callback() {
                        var disableButton = !this.model.get("source");

                        _this.$el.find(".actionButton").prop('disabled', disableButton);
                        _this.$el.find(".selected").removeClass("selected");
                        this.$el.addClass("selected");
                        _this.data.selectedRow = this.model;
                    }
                })
            });

            paginator = new Backgrid.Extension.Paginator({
                collection: this.model.recons,
                windowSize: 0,
                isFastForward: true,
                controls: {
                    rewind: {
                        label: " ",
                        title: $.t("templates.backgrid.first")
                    },
                    back: {
                        label: " ",
                        title: $.t("templates.backgrid.previous")
                    },
                    forward: {
                        label: " ",
                        title: $.t("templates.backgrid.next")
                    },
                    fastForward: {
                        label: " ",
                        title: $.t("templates.backgrid.last")
                    }
                }
            });

            this.$el.find(grid_id).append(reconGrid.render().el);
            this.$el.find(pager_id).append(paginator.render().el);
            this.model.recons.getFirstPage();
        }
    });

    return new DataAssociationManagementView();
});
