"use strict";

/*
 * Copyright 2018-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "backbone", "backgrid", "handlebars", "moment", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/commons/ui/common/components/ChangesPending", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/commons/ui/common/main/ValidatorsManager"], function ($, _, Backbone, Backgrid, handlebars, moment, AdminAbstractView, BackgridUtils, ChangesPending, ConfigDelegate, Constants, EventManager, Router, ValidatorsManager) {
    var SettingsView = AdminAbstractView.extend({
        template: "templates/admin/termsAndConditions/SettingsTemplate.html",
        partials: ["partials/termsAndConditions/grid/_dropDownCellPartial.html", "partials/termsAndConditions/grid/_versionCellPartial.html"],
        events: {
            "click input[name='requireReacceptance']": "toggleRequireReacceptance",
            "click .make-active": "makeActive",
            "click .btn-save": "saveSettings",
            "keyup .settings-input": "updateSettings"
        },

        render: function render(args, callback) {
            var _this2 = this;

            var termsPromise = ConfigDelegate.readEntityAlways("selfservice.terms"),
                regPromise = ConfigDelegate.readEntityAlways("selfservice/registration"),
                tacPromise = ConfigDelegate.readEntityAlways("selfservice/termsAndConditions");

            this.data = { versions: new Backbone.Collection() };
            this.model = {};

            $.when(termsPromise, regPromise, tacPromise).then(function (tosConfig, regConfig, tacConfig) {
                _this2.data.registrationEnabled = !_.isUndefined(regConfig) && !_.isUndefined(_.find(regConfig.stageConfigs, function (stage) {
                    return stage.name === "termsAndConditions";
                }));

                _this2.model.tacConfig = tacConfig;
                _this2.data.requireReacceptance = !_.isUndefined(tacConfig);

                // Set config data to be consumed by the template
                if (!_.isUndefined(tosConfig)) {
                    _this2.model.tosConfig = tosConfig;
                    _this2.data.enabled = true;
                    _this2.data.versions = new Backbone.Collection(_.cloneDeep(tosConfig.versions));
                    _this2.data.uiConfig = tosConfig.uiConfig;
                    _this2.model.origUiConfig = _.cloneDeep(tosConfig.uiConfig);
                } else {
                    _this2.data.enabled = false;
                }

                _this2.parentRender(function () {

                    if (_this2.data.versions.length) {
                        _this2.loadGrid();

                        var watchedObj = _this2.getWatchedObj();

                        _this2.model.changesModule = ChangesPending.watchChanges({
                            element: _this2.$el.find(".changes-pending-container"),
                            undo: false,
                            watchedObj: watchedObj
                        });
                    }

                    ValidatorsManager.bindValidators(_this2.$el.find("form"));

                    if (callback) {
                        callback();
                    }
                });
            });
        },

        /**
         * Compose the final watched object from uiConfig and requireReacceptance flag
         * because the form writes to two different configs
         */
        getWatchedObj: function getWatchedObj() {
            return _.merge({}, {
                uiConfig: this.data.uiConfig,
                requireReacceptance: this.data.requireReacceptance
            });
        },

        makeActive: function makeActive(event) {
            var _this3 = this;

            var cid = $(event.target).data("key"),
                config = _.cloneDeep(this.model.tosConfig);

            event.preventDefault();

            config.active = this.data.versions.get(cid).get("version");
            ConfigDelegate.updateEntity("selfservice.terms", config).then(function () {
                _this3.model.tosConfig = config;
                _this3.loadGrid();
            });
        },

        loadGrid: function loadGrid() {
            var _this = this,
                cols = [{
                name: "version",
                label: $.t("templates.selfservice.termsAndConditions.version"),
                cell: Backgrid.Cell.extend({
                    render: function render() {
                        var html = handlebars.compile("{{> termsAndConditions/grid/_versionCellPartial}}")({ version: this.model.get("version") });

                        this.$el.html(html);

                        return this;
                    }
                }),
                sortable: true,
                editable: false
            }, {
                name: "created",
                label: $.t("templates.selfservice.termsAndConditions.createDateLabel"),
                cell: Backgrid.Cell.extend({
                    className: "v-align-middle",
                    render: function render() {
                        this.$el.html("<span class=\"text-muted v-align-middle\">" + moment(this.model.get("createDate")).format("MM/DD/YY [at] h:mm a") + "</span>");

                        return this;
                    }
                }),
                sortable: true,
                editable: false
            }, {
                name: "active",
                label: $.t("templates.selfservice.termsAndConditions.activeLabel"),
                cell: Backgrid.Cell.extend({
                    className: "is-active v-align-middle",
                    render: function render() {
                        if (_this.model.tosConfig.active === this.model.get("version")) {
                            this.$el.html("<span class=\"text-success\"><i class=\"fa fa-check-circle\"></i> Active</span>");
                            this.model.attributes["active"] = true;
                        } else {
                            this.model.attributes["active"] = false;
                        }

                        return this;
                    }
                }),
                sortable: false,
                editable: false
            }, {
                name: "makeActive",
                label: "",
                cell: Backgrid.Cell.extend({
                    className: "button-right-align overflow-visible",
                    render: function render() {
                        var data = {
                            cid: this.model.cid,
                            version: this.model.getVersion,
                            active: this.model.get("active") || false
                        },
                            html = "";

                        if (this.model.collection.length > 1) {
                            html = handlebars.compile("{{> termsAndConditions/grid/_dropDownCellPartial}}")(data);
                        }

                        this.$el.html(html);

                        return this;
                    }
                }),
                sortable: false,
                editable: false
            }],
                versionsGrid;

            this.$el.find("#versionsGrid").empty();

            versionsGrid = new Backgrid.Grid({
                className: "backgrid table table-hover",
                emptyText: $.t("templates.admin.ResourceList.noData"),
                columns: BackgridUtils.addSmallScreenCell(cols),
                collection: this.data.versions,
                row: BackgridUtils.ClickableRow.extend({
                    callback: function callback(event) {
                        event.preventDefault();

                        var target = $(event.target);

                        if (!target.hasClass("dropdown-icon") && !target.hasClass("dropdown-toggle") && !target.hasClass("make-active")) {
                            EventManager.sendEvent(Constants.EVENT_CHANGE_VIEW, {
                                route: Router.configuration.routes.viewTermsAndConditionsVersion,
                                args: [this.model.get("version")]
                            });
                        }
                    }
                })
            });

            this.$el.find("#versionsGrid").append(versionsGrid.render().el);
        },

        updateSettings: function updateSettings(event) {
            var name = event.target.name,
                value = event.target.value;

            _.set(this.model.tosConfig, name, value);

            this.checkChanges();

            if (event.keyCode === Constants.ENTER_KEY) {
                this.saveSettings(event);
            }
        },

        checkChanges: function checkChanges() {
            this.model.changesModule.makeChanges(this.getWatchedObj());

            if (this.model.changesModule.isChanged() && ValidatorsManager.formValidated(this.$el.find("form"))) {
                this.$el.find(".btn-save").prop("disabled", false);
            } else {
                this.$el.find(".btn-save").prop("disabled", true);
            }
        },

        saveSettings: function saveSettings(event) {
            var _this4 = this;

            var tacConfig = {
                "stageConfigs": [{
                    "name": "conditionaluser",
                    "identityServiceUrl": "managed/user",
                    "condition": {
                        "type": "terms"
                    },
                    "evaluateConditionOnField": "user",
                    "onConditionTrue": {
                        "name": "termsAndConditions"
                    }
                }, {
                    "name": "patchObject",
                    "identityServiceUrl": "managed/user"
                }]
            };

            event.preventDefault();

            if (ValidatorsManager.formValidated(this.$el.find("form")) && this.model.changesModule.isChanged()) {

                // update the terms config with the current uiConfig
                if (!_.isEqual(this.model.origUiConfig, this.model.tosConfig.uiConfig)) {
                    ConfigDelegate.updateEntity("selfservice.terms", this.model.tosConfig).then(function () {
                        EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "termsAndConditionsSaveSuccess");
                        _this4.render(null, function () {
                            _this4.$el.find("a[aria-controls='settingsTab']").tab("show");
                        });
                    });
                }

                if (this.data.requireReacceptance && _.isUndefined(this.model.tacConfig)) {

                    // If the checkbox is toggled on and the config doesn't already exist, create it.
                    ConfigDelegate.createEntity("selfservice/termsAndConditions", tacConfig).then(function () {

                        EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "termsAndConditionsSaveSuccess");
                        _this4.render(null, function () {
                            _this4.$el.find("a[aria-controls='settingsTab']").tab("show");
                        });
                    });
                } else if (!this.data.requireReacceptance && !_.isUndefined(this.model.tacConfig)) {
                    // Want to explicitly check here that both the checkbox is toggled off and the config alread exists

                    ConfigDelegate.deleteEntity("selfservice/termsAndConditions").then(function () {
                        _this4.render(null, function () {
                            _this4.$el.find("a[aria-controls='settingsTab']").tab("show");
                        });
                    });
                }
            }
        },

        toggleRequireReacceptance: function toggleRequireReacceptance(event) {
            this.data.requireReacceptance = event.target.checked;

            this.checkChanges();
        }
    });

    return new SettingsView();
});
