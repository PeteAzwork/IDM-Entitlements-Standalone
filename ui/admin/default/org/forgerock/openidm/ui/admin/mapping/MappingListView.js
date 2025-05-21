"use strict";

/*
 * Copyright 2014-2022 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "handlebars", "backbone", "org/forgerock/openidm/ui/admin/delegates/ReconDelegate", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate", "org/forgerock/openidm/ui/admin/delegates/SyncDelegate", "org/forgerock/openidm/ui/admin/mapping/util/MappingUtils", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/util/ConnectorUtils", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/util/DateUtil", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/commons/ui/common/util/AutoScroll", "org/forgerock/openidm/ui/admin/mapping/util/ReconConfirmationDialog", "backgrid", "dragula"], function ($, _, handlebars, Backbone, reconDelegate, connectorDelegate, syncDelegate, mappingUtils, AdminAbstractView, connectorUtils, configDelegate, eventManager, constants, dateUtil, UIUtils, BackgridUtils, AutoScroll, ReconConfirmationDialog, Backgrid, dragula) {

    var MappingListView = AdminAbstractView.extend({
        template: "templates/admin/mapping/MappingListTemplate.html",
        events: {
            "click #addMapping": "addMapping",
            "click .delete-button": "deleteMapping",
            "click .mapping-config-body": "mappingDetail",
            "click .toggle-view-btn": "toggleButtonChange",
            "keyup .filter-input": "filterMappings",
            "paste .filter-input": "filterMappings",
            "click .sync-now": "syncNow",
            "click .stop-sync": "stopSync"
        },
        model: {},
        partials: ["partials/mapping/list/_sourceTargetGridCellDisplay.html", "partials/mapping/list/_emptyConnectorGridCell.html", "partials/mapping/list/_syncStatusCellDisplay.html", "partials/mapping/list/_actionCellDisplay.html", "partials/mapping/list/_linkName.html"],
        mappingDetail: function mappingDetail(e) {
            var button = $(e.target).closest("button");
            if (!button.hasClass("card-button")) {
                e.preventDefault();

                eventManager.sendEvent(constants.ROUTE_REQUEST, { routeName: "propertiesView", args: [$(e.target).closest(".mapping-config-body").attr("mapping")] });
            }
        },

        toggleButtonChange: function toggleButtonChange(event) {
            var target = $(event.target);

            if (target.hasClass("fa")) {
                target = target.parents(".btn");
            }

            this.$el.find(".toggle-view-btn").toggleClass("active", false);
            target.toggleClass("active", true);
        },
        render: function render(args, callback) {
            var _this2 = this;

            var syncConfig = syncDelegate.mappingDetails(),
                managedPromise = configDelegate.readEntity("managed"),
                mappingDetails = [],
                connectorStatusPromise = connectorDelegate.currentConnectors();

            $.when(syncConfig, managedPromise, connectorStatusPromise).then(function (sync, managedDetails, connectorStatus) {
                _this2.data.mappingConfig = sync.mappings;
                _this2.data.docHelpUrl = constants.DOC_URL;
                _this2.model.managedDetails = managedDetails;

                _this2.cleanConfig = _.chain(sync.mappings).map(function (m) {
                    return _.clone(_.omit(m, "recon"));
                }).value();

                _.forEach(_this2.data.mappingConfig, _.bind(function (sync) {
                    sync.targetType = this.syncType(sync.target);
                    sync.sourceType = this.syncType(sync.source);

                    mappingDetails.push(connectorUtils.getMappingDetails(sync.sourceType, sync.targetType, connectorStatus));
                }, _this2));

                $.when.apply($, mappingDetails).then(_.bind(function () {
                    var results = arguments,
                        Mappings = Backbone.Collection,
                        RenderRow,
                        _this = this;

                    this.model.mappingCollection = new Mappings();

                    _.forEach(results, _.bind(function (mappingInfo, index) {
                        this.data.mappingConfig[index].targetIcon = mappingInfo.targetIcon.iconClass;
                        this.data.mappingConfig[index].sourceIcon = mappingInfo.sourceIcon.iconClass;

                        this.data.mappingConfig[index].targetConnector = mappingInfo.targetConnector;
                        this.data.mappingConfig[index].sourceConnector = mappingInfo.sourceConnector;

                        if (!this.data.mappingConfig[index].sourceConnector) {
                            this.data.mappingConfig[index].sourceConnector = {};
                        }

                        if (!this.data.mappingConfig[index].targetConnector) {
                            this.data.mappingConfig[index].targetConnector = {};
                        }

                        this.data.mappingConfig[index].sourceConnector = this.setCardState(this.data.mappingConfig[index].sourceConnector, this.data.mappingConfig[index].sourceType, this.data.mappingConfig[index].source, this.model.managedDetails);
                        this.data.mappingConfig[index].targetConnector = this.setCardState(this.data.mappingConfig[index].targetConnector, this.data.mappingConfig[index].targetType, this.data.mappingConfig[index].target, this.model.managedDetails);

                        this.model.mappingCollection.add(this.data.mappingConfig[index]);
                    }, this));

                    RenderRow = Backgrid.Row.extend({
                        render: function render() {
                            RenderRow.__super__.render.apply(this, arguments);

                            this.$el.attr('data-mapping-title', this.model.attributes.name);

                            return this;
                        }
                    });

                    this.parentRender(_.bind(function () {
                        var start,
                            dragDropInstance = dragula([$(".mapping-card-list")[0]]);

                        dragDropInstance.on("drag", _.bind(function (el) {
                            start = _.indexOf($(".mapping-card-list-item"), el);
                            AutoScroll.startDrag();
                        }, this));

                        dragDropInstance.on("dragend", _.bind(function (el) {
                            var _this3 = this;

                            var tempRemoved,
                                stop = _.indexOf($(".mapping-card-list-item"), el);

                            AutoScroll.endDrag();

                            if (start !== stop) {
                                tempRemoved = this.cleanConfig.splice(start, 1);
                                this.cleanConfig.splice(stop, 0, tempRemoved[0]);

                                //update grid
                                _.forEach(this.cleanConfig, function (obj) {
                                    var row = _this3.$el.find("#mappingGrid [data-mapping-title=" + obj.name + "]");

                                    row.remove();
                                    _this3.$el.find("#mappingGrid tbody").append(row);
                                });

                                configDelegate.updateEntity("sync", { "mappings": this.cleanConfig }).then(_.bind(function () {
                                    eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "mappingSaveSuccess");
                                }, this));
                            }
                        }, this));

                        this.model.mappingGrid = new Backgrid.Grid({
                            className: "table backgrid",
                            emptyText: $.t("templates.mapping.noResourceTitle"),
                            row: RenderRow,
                            columns: BackgridUtils.addSmallScreenCell([{
                                name: "name",
                                label: "name",
                                sortable: false,
                                editable: false,
                                cell: Backgrid.Cell.extend({
                                    className: "col-sm-3",
                                    render: function render() {
                                        var display = handlebars.compile("{{> mapping/list/_linkName}}")({
                                            name: this.model.attributes.name
                                        });

                                        this.$el.html(display);

                                        return this;
                                    }
                                })
                            }, {
                                name: "source",
                                sortable: false,
                                editable: false,
                                cell: Backgrid.Cell.extend({
                                    className: "col-sm-2",
                                    render: function render() {
                                        var display;
                                        if (this.model.attributes.sourceType === "managed" || this.model.attributes.sourceConnector.connectorRef) {
                                            display = handlebars.compile("{{> mapping/list/_sourceTargetGridCellDisplay}}")({
                                                linkUrl: this.model.attributes.sourceConnector.url,
                                                icon: this.model.attributes.sourceIcon,
                                                displayName: this.model.attributes.sourceConnector.displayName
                                            });
                                        } else {
                                            display = handlebars.compile("{{> mapping/list/_emptyConnectorGridCell}}")({
                                                displayName: this.model.attributes.sourceConnector.displayName
                                            });
                                        }
                                        this.$el.html(display);

                                        return this;
                                    }
                                })
                            }, {
                                name: "target",
                                sortable: false,
                                editable: false,
                                cell: Backgrid.Cell.extend({
                                    className: "col-sm-2",
                                    render: function render() {
                                        var display;
                                        if (this.model.attributes.targetType === "managed" || this.model.attributes.targetConnector.connectorRef) {
                                            display = handlebars.compile("{{> mapping/list/_sourceTargetGridCellDisplay}}")({
                                                linkUrl: this.model.attributes.targetConnector.url,
                                                icon: this.model.attributes.targetIcon,
                                                displayName: this.model.attributes.targetConnector.displayName
                                            });
                                        } else {
                                            display = handlebars.compile("{{> mapping/list/_emptyConnectorGridCell}}")({
                                                displayName: this.model.attributes.targetConnector.displayName
                                            });
                                        }
                                        this.$el.html(display);

                                        return this;
                                    }
                                })
                            }, {
                                name: "status",
                                sortable: false,
                                editable: false,
                                cell: Backgrid.Cell.extend({
                                    render: function render() {
                                        var display = handlebars.compile("{{> mapping/list/_syncStatusCellDisplay}}")({ name: this.model.attributes.name });

                                        this.$el.html(display);

                                        return this;
                                    }
                                })
                            }, {
                                name: "",
                                sortable: false,
                                editable: false,
                                cell: Backgrid.Cell.extend({
                                    render: function render() {
                                        var display = handlebars.compile("{{> mapping/list/_actionCellDisplay}}")({ name: this.model.attributes.name }),
                                            actions = _this.$el.find("[mapping='" + this.model.attributes.name + "'] .dropdown-menu").clone();

                                        display = $(display).append(actions);

                                        this.$el.html(display);

                                        return this;
                                    }
                                })
                            }]),
                            collection: this.model.mappingCollection
                        });
                        this.$el.find("#mappingGrid").append(this.model.mappingGrid.render().el);

                        this.showSyncStatus(true);
                        this.makeSortable();

                        if (callback) {
                            callback();
                        }
                    }, this));
                }, _this2));
            });
        },

        makeSortable: function makeSortable() {
            var _this4 = this;

            BackgridUtils.sortable({
                "containers": [this.$el.find("#mappingGrid tbody")[0]],
                "rows": _.cloneDeep(this.cleanConfig)
            }, function (newOrder) {
                _.forEach(newOrder, function (obj) {
                    var mapping = _this4.$el.find("#mappingConfigHolder [mapping=" + obj.name + "]"),
                        parent = _this4.$el.find("#mappingConfigHolder");

                    obj = _.omit(obj, "recon");
                    mapping.remove();
                    parent.append(mapping);
                });

                _this4.cleanConfig = newOrder;
                configDelegate.updateEntity("sync", { "mappings": _this4.cleanConfig }).then(function () {
                    eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "mappingSaveSuccess");
                    _this4.render(null, function () {
                        _this4.$el.find(".fa-list").click();
                    });
                });
            });
        },

        syncType: function syncType(type) {
            var tempType = type.split("/");

            if (tempType[0] === "managed") {
                type = "managed";
            } else if (tempType[0] === "internal") {
                type = "internal";
            } else {
                type = tempType[1];
            }

            return type;
        },
        /**
         * This function is to detect what state a resource is in before generating a card. If it is determined to be missing it will display
         * properly letting the user know that resource is no longer available.
         *
         * @param resource - Details about the connector or managed object
         * @param type - A string of managed or connector
         * @param location - Path to managed object or connector (managed/roles or system/ldap/account)
         * @param managedDetails - Array of current available managed objects
         * @returns {*} returns the config state for the card display
         */
        setCardState: function setCardState(resource, type, location, managedDetails) {
            var cleanName, managedName, managedCheck;

            if (!_.isEmpty(resource)) {
                resource.displayName = $.t("templates.connector." + connectorUtils.cleanConnectorName(resource.connectorRef.connectorName));

                cleanName = resource.config.split("/");
                cleanName = cleanName[1] + "_" + cleanName[2];

                resource.url = "#connectors/edit/" + cleanName + "/";
            } else if (type === "managed") {
                managedName = location.split("/")[1];

                _.forEach(managedDetails.objects, function (managedObject) {
                    if (managedObject.name === managedName) {
                        managedCheck = true;
                    }
                });

                resource.displayName = $.t("templates.managed.managedObjectType");

                if (managedCheck) {
                    resource.url = "#managed/edit/" + location.split("/")[1] + "/";
                } else {
                    resource.isMissing = true;
                }
            } else if (type === "internal") {
                resource.displayName = $.t("templates.internal.internalObjectType");
                resource.url = "#";
            } else {
                resource.displayName = type;
                resource.isMissing = true;
            }

            return resource;
        },
        deleteMapping: function deleteMapping(event) {
            var gridContainer = $(event.target).parents(".mapping-card-list-item"),
                listContainer,
                mappingIndex = 0;

            if (gridContainer.length > 0) {
                _.forEach(this.$el.find(".backgrid tbody tr"), function (row, index) {
                    if ($(row).attr("data-mapping-title") === gridContainer.find(".mapping-config-body").attr("mapping")) {
                        listContainer = $(row);
                        mappingIndex = index;
                    }
                });
            } else {
                listContainer = $(event.currentTarget).parents("tr");

                _.forEach(this.$el.find(".mapping-config-body"), function (card, index) {
                    if ($(card).attr("mapping") === listContainer.attr("data-mapping-title")) {
                        gridContainer = $(card).parents(".mapping-card-list-item");
                        mappingIndex = index;
                    }
                });
            }

            mappingUtils.confirmDeleteMapping(this.cleanConfig[mappingIndex].name, this.cleanConfig, _.bind(function () {
                eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "mappingDeleted");

                this.cleanConfig.splice(mappingIndex, 1);

                gridContainer.remove();
                listContainer.remove();

                if (this.$el.find(".backgrid tbody tr").length === 0) {
                    this.$el.find(".fr-resource-list .tab-content").hide();
                    this.$el.find(".page-toolbar").hide();
                    this.$el.find(".no-resource").show();
                }
            }, this));
        },
        showSyncStatus: function showSyncStatus(isOnPageLoad) {
            _.forEach(this.data.mappingConfig, _.bind(function (mapping) {
                var el = this.$el.find("." + mapping.name + "_syncStatus"),
                    icon = this.$el.find("." + mapping.name + "_syncStatus_icon"),
                    recon = mapping.recon,
                    parent = el.parent(),
                    text,
                    type,
                    total,
                    processed;

                if (recon) {
                    if (recon.state === "CANCELED") {
                        text = $.t("templates.mapping.lastSyncCanceled");
                        type = "DANGER";
                    } else if (recon.state === "FAILED") {
                        text = $.t("templates.mapping.lastSyncFailed");
                        type = "DANGER";
                    } else if (recon.state === "ACTIVE") {
                        text = $.t("templates.mapping.inProgress") + ": ";

                        if (recon.progress.source.existing.total !== "?" && (recon.stage === "ACTIVE_RECONCILING_SOURCE" || recon.stage === "ACTIVE_RECONCILING_SOURCE_PAGE")) {
                            processed = parseInt(recon.progress.source.existing.processed, 10);
                            total = parseInt(recon.progress.source.existing.total, 10);
                        } else if (recon.progress.target.existing.total !== "?" && (recon.stage === "ACTIVE_RECONCILING_TARGET" || recon.stage === "ACTIVE_RECONCILING_TARGET_PAGE")) {
                            total = parseInt(recon.progress.target.existing.total, 10);
                            processed = parseInt(recon.progress.target.existing.processed, 10);
                        } else {
                            total = 0;
                            processed = 0;
                        }

                        if (total !== 0 && processed !== 0) {
                            text += recon.stageDescription + " - <span class='bold-message'>" + processed + "/" + total + "</span>";
                        } else {
                            text += recon.stageDescription;
                        }

                        type = "SUCCESS";

                        if (isOnPageLoad) {
                            this.updateReconStatus(mapping.name, recon._id);
                        }
                    } else {
                        text = $.t("templates.mapping.lastSynced") + " " + dateUtil.formatDate(mapping.recon.ended, "MMMM dd, yyyy HH:mm");
                        type = "SUCCESS";
                    }
                } else {
                    text = $.t("templates.mapping.notYetSynced");
                    type = "DANGER";
                }

                if (mapping.sourceConnector.isMissing && mapping.targetConnector.isMissing) {
                    text = $.t("templates.mapping.missingBoth");
                    type = "DANGER";
                } else if (mapping.sourceConnector.isMissing) {
                    text = $.t("templates.mapping.missingSourceConnector");
                    type = "DANGER";
                } else if (mapping.targetConnector.isMissing) {
                    text = $.t("templates.mapping.missingTargetConnector");
                    type = "DANGER";
                }

                parent.removeClass("text-success text-danger text-muted");
                icon.removeClass("fa-exclamation-circle fa-check-circle fa-question-circle");

                if (type === "DANGER") {
                    parent.addClass("text-danger");
                    icon.addClass("fa-exclamation-circle");
                } else if (type === "SUCCESS") {
                    parent.addClass("text-success");
                    icon.addClass("fa-check-circle");
                }

                el.html(text);
            }, this));
        },

        filterMappings: function filterMappings(event) {
            var search = $(event.target).val().toLowerCase();

            if (search.length > 0) {
                _.forEach(this.$el.find(".mapping-config-body"), _.bind(function (card) {
                    if ($(card).attr("mapping").toLowerCase().indexOf(search) > -1) {
                        $(card).fadeIn();
                    } else {
                        $(card).fadeOut();
                    }
                }, this));

                _.forEach(this.$el.find(".backgrid tbody tr"), _.bind(function (row) {
                    if ($(row).attr("data-mapping-title").toLowerCase().indexOf(search) > -1) {
                        $(row).fadeIn();
                    } else {
                        $(row).fadeOut();
                    }
                }, this));
            } else {
                this.$el.find(".mapping-config-body").fadeIn();
                this.$el.find(".backgrid tbody tr").fadeIn();
            }
        },
        /**
         * This function sets the recon for the associated mapping in this.data.mappingConfig
         * (based on mappingName) to the newly updated recon. It then fires off showSyncStatus()
         * to reload recon status information
         *
         * @param mappingName {string} - name of the mapping to find in this.data.mappingConfig
         * @param recon {object} - recon object
         */
        updateMappingRecon: function updateMappingRecon(mappingName, recon) {
            var mapping = _.find(this.data.mappingConfig, function (map) {
                return map.name === mappingName;
            });
            mapping.recon = recon;
            this.showSyncStatus();
        },
        /**
         * This function disables/enables hides/shows the "Reconcile Now"
         * and "Stop Reconciliation" buttons for an individual mapping
         *
         * @param mappingName {string}
         * @param reconInProgress {boolean}
         */
        toggleReconButtons: function toggleReconButtons(mappingName, reconInProgress) {
            var syncNowButton = this.$el.find(".sync-now[mappingName=" + mappingName + "]"),
                stopSyncButton = this.$el.find(".stop-sync[mappingName=" + mappingName + "]");

            if (reconInProgress) {
                //disable/hide the syncNowButton
                syncNowButton.hide();
                syncNowButton.prop("disabled", true);
                //enable/show the stopSyncButton
                stopSyncButton.show();
                stopSyncButton.prop("disabled", false);
            } else {
                //recon is complete enable/show the syncNowButton
                syncNowButton.show();
                syncNowButton.prop("disabled", false);
                //and disable/hide the stopSyncButton
                stopSyncButton.hide();
                stopSyncButton.prop("disabled", true);
            }
        },
        /**
         * This function finds the appropriate mapping name based on the click event,
         * toggles the correct buttons, and triggers a recon base on mappingName
         * which updates the recon status on the mapping card every 2 seconds until it is complete
         *
         * @param e {object} - event object
         */
        syncNow: function syncNow(e) {
            var _this5 = this;

            var mappingName = $(e.target).closest(".sync-now").attr("mappingName"),
                doRecon = function doRecon(persistAssociations) {
                _this5.toggleReconButtons(mappingName, true);

                //trigger the recon
                reconDelegate.triggerRecon(mappingName, true, function (runningRecon) {
                    _this5.updateMappingRecon(mappingName, runningRecon);
                }, 5000, persistAssociations).then(function (completedRecon) {
                    _this5.toggleReconButtons(mappingName);
                    _this5.updateMappingRecon(mappingName, completedRecon);
                });
            };

            e.preventDefault();

            ReconConfirmationDialog.render({ mappingName: mappingName, doRecon: doRecon });
        },
        /**
         * This function is called on page load when a recon is already active.
         * It calls waitForAll on and individual recon and updates the recon status
         * on the mapping card every 2 seconds until it is complete
         *
         * @param mappingName {string} - name of the mapping to find in this.data.mappingConfig
         * @param runningReconId {string} - uuid for the active recon
         */
        updateReconStatus: function updateReconStatus(mappingName, runningReconId) {
            var _this6 = this;

            this.toggleReconButtons(mappingName, true);

            reconDelegate.waitForAll([runningReconId], true, function (runningRecon) {
                _this6.updateMappingRecon(mappingName, runningRecon);
            }, 2000).then(function (completedRecon) {
                _this6.toggleReconButtons(mappingName);
                _this6.updateMappingRecon(mappingName, completedRecon[0]);
            });
        },
        /**
         * This function finds the appropriate mapping name based on the click event,
         * stops a recon based on mappingName, toggles the correct buttons,
         * and updates the recon status on the mapping card
         *
         * @param e {object} - event object
         */
        stopSync: function stopSync(e) {
            var _this7 = this;

            var mappingName = $(e.target).closest(".stop-sync").attr("mappingName"),
                mapping = _.find(this.data.mappingConfig, function (map) {
                return map.name === mappingName;
            });

            e.preventDefault();

            reconDelegate.stopRecon(mapping.recon._id, true).then(function (canceledRecon) {
                _this7.toggleReconButtons(mappingName);
                _this7.updateMappingRecon(mappingName, canceledRecon);
            });
        }
    });

    return new MappingListView();
});
