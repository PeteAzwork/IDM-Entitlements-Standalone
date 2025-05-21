"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/admin/mapping/association/correlationQuery/CorrelationQueryDialog", "org/forgerock/openidm/ui/admin/util/SaveChangesView", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "org/forgerock/openidm/ui/admin/util/LinkQualifierUtils", "org/forgerock/openidm/ui/admin/util/InlineScriptEditor"], function ($, _, MappingAdminAbstractView, eventManager, constants, CorrelationQueryDialog, SaveChangesView, BootstrapDialogUtils, LinkQualifierUtils, InlineScriptEditor) {

    var AssociationRuleView = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/association/AssociationRuleTemplate.html",
        element: "#correlationQueryView",
        noBaseTemplate: true,
        events: {
            "click #addNewCorrelationQuery": "addEditNewCorrelationQuery",
            "click .edit": "editLinkQualifier",
            "click .trash": "deleteLinkQualifier",
            "change .correlationQueryType": "changeCorrelationQueryType",
            "click .saveCorrelationQuery": "saveQuery",
            "click .resetCorrelationQuery": "resetQuery",
            "click .undo": "undoChange"
        },
        data: {
            noLinkQualifiers: false
        },
        model: {
            changes: [],
            addedLinkQualifiers: [],
            linkQualifiers: []
        },

        render: function render(args) {
            this.model.sync = this.getSyncConfig();
            this.model.mapping = this.getCurrentMapping();
            this.model.mappingName = this.getMappingName();

            this.model.startSync = this.getSyncNow();

            this.model.changes = args.changes || [];
            this.model.linkQualifiers = LinkQualifierUtils.getLinkQualifier(this.model.mappingName) || ["default"];
            this.model.addedLinkQualifiers = _.union(_.pick(this.model.mapping.correlationQuery, "linkQualifier"), _.pick(this.model.changes, "linkQualifier"));

            // Legacy Support
            if (_.has(this.model.mapping, "correlationQuery") && !_.isArray(this.model.mapping.correlationQuery)) {
                this.model.mapping.correlationQuery.linkQualifier = "default";
                this.model.mapping.correlationQuery = [this.model.mapping.correlationQuery];
            }

            this.data.correlationQueries = _.cloneDeep(this.model.mapping.correlationQuery);

            if (_.difference(this.model.linkQualifiers, this.model.addedLinkQualifiers).length === 0) {
                this.data.noLinkQualifiers = true;
            } else {
                this.data.noLinkQualifiers = false;
            }

            // Add the pending changes to the array of correlation queries used for rendering purposes, saved data is not generated from the data object.
            _.forEach(this.model.changes, _.bind(function (query) {
                var linkQualifier = query.linkQualifier,
                    correlationQuery = _.find(this.data.correlationQueries, { "linkQualifier": linkQualifier }),
                    correlationQueryIndex = _.indexOf(this.data.correlationQueries, correlationQuery);

                if (!_.isArray(this.data.correlationQueries)) {
                    this.data.correlationQueries = [];
                }

                switch (query.changes) {
                    case "add":
                        this.data.correlationQueries.push(_.assignIn(query, { "added": true }));
                        break;
                    case "toAdd":
                        this.data.correlationQueries.push(_.assignIn(query, { "toAdd": true }));
                        break;
                    case "edit":
                        this.data.correlationQueries[correlationQueryIndex] = _.assignIn(correlationQuery, { "edited": true });
                        break;
                    case "delete":
                        this.data.correlationQueries[correlationQueryIndex] = _.omit(_.assignIn(correlationQuery, { "deleted": true }), "edited");
                        break;
                }
            }, this));

            _.forEach(this.data.correlationQueries, _.bind(function (query, key) {
                if (this.model.linkQualifiers.indexOf(query.linkQualifier) === -1) {
                    this.data.correlationQueries[key].error = true;
                }
            }, this));

            this.parentRender(function () {
                var scriptData = "";

                if (_.has(this.model.mapping, "correlationQuery") && this.model.mapping.correlationQuery.length > 0 || this.model.changes.length > 0) {
                    this.$el.find(".correlationQueryType").val("queries");

                    if (this.model.mapping.correlationQuery === undefined) {
                        this.model.mapping.correlationQuery = [];
                    }
                } else if (_.has(this.model.mapping, "correlationScript")) {
                    scriptData = this.model.mapping.correlationScript;
                    this.$el.find(".correlationQueryType").val("script");
                } else {
                    this.model.mapping.correlationQuery = [];
                }

                this.correlationScript = InlineScriptEditor.generateScriptEditor({
                    "element": this.$el.find("#correlationScriptContent"),
                    "eventName": "correlationScript",
                    "disableValidation": false,
                    "scriptData": scriptData,
                    "disablePassedVariable": false,
                    "placeHolder": "['test', 'default']",
                    "validationCallback": _.bind(function (valid) {
                        if (this.$el.find(".correlationQueryType").val() === "script") {
                            this.$el.find(".saveCorrelationQuery").prop('disabled', !valid);
                            this.$el.find(".resetCorrelationQuery").prop('disabled', !valid);
                        }
                    }, this)
                }, _.bind(function () {
                    this.changeCorrelationQueryType();
                    this.checkButtons();
                }, this));
            });
        },

        checkButtons: function checkButtons() {
            var showWarning = true;

            if (this.$el.find(".correlationQueryType").val() === "queries") {
                if (this.model.changes.length > 0) {
                    this.$el.find(".correlationQueryChangesMsg").show();
                    showWarning = false;
                } else {
                    this.$el.find(".correlationQueryChangesMsg").hide();
                }
            } else if (this.$el.find(".correlationQueryType").val() === "none") {
                showWarning = false;
                this.$el.find(".correlationQueryChangesMsg").hide();
            } else if (this.$el.find(".correlationQueryType").val() === "script") {
                this.$el.find(".correlationQueryChangesMsg").hide();

                if (!_.isUndefined(this.correlationScript) && this.correlationScript.generateScript()) {
                    showWarning = false;
                }
            }

            this.$el.find(".saveCorrelationQuery").prop('disabled', showWarning);
            this.$el.find(".resetCorrelationQuery").prop('disabled', showWarning);
        },

        undoChange: function undoChange(e) {
            var linkQualifier = $(e.target).closest("tr").find(".linkQualifierLabel").text(),
                changesQuery = _.find(this.model.changes, { "linkQualifier": linkQualifier }),
                changesIndex = _.indexOf(this.model.changes, changesQuery);

            this.model.changes.splice(changesIndex, 1);

            this.reload();
        },

        reload: function reload() {
            this.render({
                changes: this.model.changes
            });
        },

        editLinkQualifier: function editLinkQualifier(e) {
            if (!$(e.target).parent().parent().hasClass("disabled")) {
                var linkQualifier = $(e.target).closest("tr").find(".linkQualifierLabel").text();
                this.addEditNewCorrelationQuery(null, linkQualifier);
            }
        },

        changeCorrelationQueryType: function changeCorrelationQueryType() {
            this.checkButtons();

            if (this.$el.find(".correlationQueryType").val() === "queries") {
                this.$el.find(".correlationQueries").show();
                this.$el.find("#correlationScriptBody").hide();
            } else if (this.$el.find(".correlationQueryType").val() === "script") {
                this.$el.find(".correlationQueries").hide();
                this.$el.find("#correlationScriptBody").show();
            } else {
                this.$el.find(".correlationQueries").hide();
                this.$el.find("#correlationScriptBody").hide();
            }
        },

        deleteLinkQualifier: function deleteLinkQualifier(e) {
            if (!$(e.target).parent().parent().hasClass("disabled")) {
                var linkQualifier = $(e.target).closest("tr").find(".linkQualifierLabel").text(),
                    correlationQuery = _.find(this.model.mapping.correlationQuery, { "linkQualifier": linkQualifier }),
                    correlationQueryIndex = _.indexOf(this.model.mapping.correlationQuery, correlationQuery),
                    changesQuery = _.find(this.model.changes, { "linkQualifier": linkQualifier }),
                    changesIndex = _.indexOf(this.model.changes, changesQuery);

                if (correlationQueryIndex >= 0) {
                    this.model.changes.push(_.assignIn(_.cloneDeep(this.model.mapping.correlationQuery[correlationQueryIndex]), { "changes": "delete" }));
                } else if (changesIndex >= 0) {
                    this.model.changes.splice(changesIndex, 1);
                }

                this.reload();
            }
        },

        addEditNewCorrelationQuery: function addEditNewCorrelationQuery(e, linkQualifier) {
            // There are no more linkQualifiers so we can't add a correlation Query
            if (this.data.noLinkQualifiers && !linkQualifier) {
                return false;
            }

            var correlationQuery = _.find(this.model.mapping.correlationQuery, { "linkQualifier": linkQualifier }),
                added = _.find(this.model.changes, { "linkQualifier": linkQualifier }),
                query = added || correlationQuery;

            CorrelationQueryDialog.render({
                query: _.cloneDeep(query),
                mapping: _.cloneDeep(this.model.mapping),
                mappingName: this.model.mappingName,
                linkQualifiers: this.model.linkQualifiers,
                addedLinkQualifiers: this.model.addedLinkQualifiers,
                linkQualifier: linkQualifier || null,
                edit: _.isString(linkQualifier)

            }, _.bind(function (data) {
                var added = _.find(this.model.changes, { "linkQualifier": data.linkQualifier }),
                    addedIndex = _.indexOf(this.model.changes, added);

                if (!added && _.isString(linkQualifier)) {
                    this.model.changes.push(_.assignIn(data, { "changes": "edit" }));
                } else if (!added) {
                    this.model.changes.push(_.assignIn(data, { "changes": "add" }));
                } else if (added && _.find(this.model.mapping.correlationQuery, { "linkQualifier": data.linkQualifier })) {
                    this.model.changes[addedIndex] = _.assignIn(data, { "changes": "edit" });
                } else if (added) {
                    this.model.changes[addedIndex] = _.assignIn(data, { "changes": "add" });
                }

                this.reload();
            }, this));
        },

        save: function save(callback) {
            var edited, editedIndex, scriptDetails;

            if (this.$el.find(".correlationQueryType").val() === "queries") {
                _.forEach(this.model.changes, _.bind(function (change) {
                    switch (change.changes) {
                        case "add":
                            this.model.mapping.correlationQuery.push(_.omit(change, "deleted", "added", "edited", "changes"));
                            break;

                        case "edit":
                            edited = _.find(this.model.mapping.correlationQuery, { "linkQualifier": change.linkQualifier });
                            editedIndex = _.indexOf(this.model.mapping.correlationQuery, edited);

                            this.model.mapping.correlationQuery[editedIndex] = _.omit(change, "deleted", "added", "edited", "changes");
                            break;

                        case "delete":
                            edited = _.find(this.model.mapping.correlationQuery, { "linkQualifier": change.linkQualifier });
                            editedIndex = _.indexOf(this.model.mapping.correlationQuery, edited);

                            this.model.mapping.correlationQuery.splice(editedIndex, 1);
                            break;
                    }
                }, this));
            }

            if (this.$el.find(".correlationQueryType").val() === "none") {
                if (_.has(this.model.mapping, "correlationQuery")) {
                    delete this.model.mapping.correlationQuery;
                }

                if (_.has(this.model.mapping, "correlationScript")) {
                    delete this.model.mapping.correlationScript;
                }
            } else if ($(".correlationQueryType").val() === "script") {
                scriptDetails = this.correlationScript.generateScript();

                if (_.has(this.model.mapping, "correlationQuery")) {
                    delete this.model.mapping.correlationQuery;
                }

                if (scriptDetails !== null) {
                    this.model.mapping.correlationScript = this.correlationScript.generateScript();
                } else if (this.model.mapping.correlationScript !== undefined) {
                    delete this.model.mapping.correlationScript;
                }
            }

            //update the current mapping in case other views have been saved since this view was rendered
            this.model.mapping = this.refreshMapping({
                correlationScript: this.model.mapping.correlationScript,
                correlationQuery: this.model.mapping.correlationQuery
            });

            this.AbstractMappingSave(this.model.mapping, _.bind(function () {
                eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "correlationQuerySaveSuccess");

                this.model.changes = [];

                this.reload();

                if (callback) {
                    callback();
                }
            }, this));
        },

        resetQuery: function resetQuery() {
            var _this = this;

            BootstrapDialogUtils.createModal({
                title: $.t("templates.correlation.resetTitle"),
                message: $("<div id='dialogDetails'>" + $.t("templates.correlation.resetMsg") + "</div>"),
                buttons: ["cancel", {
                    label: $.t("common.form.reset"),
                    cssClass: "btn-primary",
                    action: function action(dialogRef) {
                        _this.model.changes = [];
                        _this.reload();
                        dialogRef.close();
                    }
                }]
            }).open();
        },

        saveQuery: function saveQuery() {
            var changes = [{ "category": $.t("templates.correlation.added"), values: [] }, { "category": $.t("templates.correlation.edited"), values: [] }, { "category": $.t("templates.correlation.deleted"), values: [] }],
                _this = this;

            _.forEach(this.model.changes, function (change) {
                switch (change.changes) {
                    case "add":
                        changes[0].values.push(change.linkQualifier);
                        break;
                    case "edit":
                        changes[1].values.push(change.linkQualifier);
                        break;
                    case "delete":
                        changes[2].values.push(change.linkQualifier);
                        break;
                }
            });

            _.forEach(changes, function (change) {
                change.values = change.values.join(", ");
            });

            BootstrapDialogUtils.createModal({
                title: $.t("templates.correlation.save"),
                message: $("<div id='dialogDetails'>" + $.t("templates.correlation.resetMsg") + "</div>"),
                onshown: function onshown() {
                    if ($(".correlationQueryType").val() === "none" || $(".correlationQueryType").val() === "script") {
                        changes = null;
                    }

                    SaveChangesView.render({ "id": "dialogDetails", "msg": $.t("templates.correlation.note"), "changes": changes, "empty": $.t("templates.correlation.empty") });
                },
                buttons: ["cancel", {
                    label: $.t("templates.correlation.runReconcile"),
                    cssClass: "btn-primary",
                    action: function action(dialogRef) {
                        _this.save(_.bind(function () {
                            _this.model.startSync();
                            dialogRef.close();
                        }, this));
                    }
                }, {
                    label: $.t("templates.correlation.dontRunReconcile"),
                    cssClass: "btn-primary",
                    action: function action(dialogRef) {
                        _this.save();
                        dialogRef.close();
                    }
                }]
            }).open();
        }
    });

    return new AssociationRuleView();
});
