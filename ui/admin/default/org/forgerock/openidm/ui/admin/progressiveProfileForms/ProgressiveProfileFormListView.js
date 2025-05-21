"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "backbone", "handlebars", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "backgrid", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate"], function ($, _, Backbone, handlebars, AdminAbstractView, Backgrid, BackgridUtils, AdminUtils, UIUtils, EventManager, Constants, ConfigDelegate) {
    var ProgressiveProfileListView = AdminAbstractView.extend({
        template: "templates/admin/progressiveProfileForms/ProgressiveProfileFormListViewTemplate.html",
        events: {},
        model: {},
        partials: ["partials/progressiveProfileForms/_formNameDisplay.html"],
        render: function render(args, callback) {
            var _this2 = this;

            this.data.showGrid = false;

            $.when(ConfigDelegate.readEntityAlways("selfservice/profile"), AdminUtils.findPropertiesList(["managed", "user"])).then(function (profileCompletionConfig, propertySchema) {
                if (profileCompletionConfig && profileCompletionConfig.stageConfigs && profileCompletionConfig.stageConfigs.length) {
                    _this2.data.showGrid = true;
                }

                _this2.model.profileCompletionConfig = profileCompletionConfig;
                //property schema is used in the backgrid cell for attributes to display the title for a property
                _this2.model.propertySchema = propertySchema;

                _this2.parentRender(function () {
                    if (_this2.data.showGrid) {
                        _this2.loadGrid();
                    }

                    if (callback) {
                        callback();
                    }
                });
            });
        },
        loadGrid: function loadGrid() {
            var _this4 = this;

            var _this = this,
                cols = [{
                name: "name",
                label: $.t("templates.progressiveProfile.formDisplayName"),
                cell: Backgrid.Cell.extend({
                    render: function render() {
                        var formName = escape(unescape(this.model.get("onConditionTrue").uiConfig.displayName)),
                            html = handlebars.compile("{{> progressiveProfileForms/_formNameDisplay}}")({
                            formName: formName
                        });

                        this.$el.html(html);

                        return this;
                    }
                }),
                sortable: false,
                editable: false
            }, {
                name: "attributes",
                label: $.t("templates.progressiveProfile.attributes"),
                cell: Backgrid.Cell.extend({
                    render: function render() {
                        var onConditionTrue = this.model.get("onConditionTrue"),
                            attributes = _.map(onConditionTrue.attributes, function (attr) {
                            var attrName = attr.name;

                            if (_this.model.propertySchema[attrName]) {
                                attrName = _this.model.propertySchema[attrName].title;
                            }

                            return "<code>" + attrName + "</code>";
                        });

                        this.$el.html(attributes.join(" "));

                        return this;
                    }
                }),
                sortable: false,
                editable: false
            }, {
                name: "condition",
                label: $.t("templates.progressiveProfile.displayCondition"),
                cell: Backgrid.Cell.extend({
                    render: function render() {
                        var condition = this.model.get("condition"),
                            text = "";

                        if (_.isString(condition)) {
                            text = condition;
                        } else if (_.isObject(condition)) {
                            if (condition.type === "queryFilter") {
                                text = condition.filter;
                            } else {
                                text = condition.type;
                            }
                        }

                        this.$el.html("<code>" + text + "</code>");

                        return this;
                    }
                }),
                sortable: false,
                editable: false
            }, {
                label: "",
                cell: BackgridUtils.ButtonCell([{
                    className: "fa fa-times grid-icon col-sm-1 pull-right",
                    callback: function callback() {
                        var _this3 = this;

                        var overrides = {
                            title: $.t("templates.progressiveProfile.deleteForm"),
                            okText: $.t("common.form.confirm")
                        },
                            formName = escape(unescape(this.model.get("onConditionTrue").uiConfig.displayName));

                        UIUtils.confirmDialog($.t("templates.progressiveProfile.confirmFormDelete", { formName: formName }), "danger", function () {
                            _this.model.formsCollection.remove(_this3.model);
                            _this.saveConfig(true);
                        }, overrides);
                    }
                }, {
                    // No callback necessary, the row click will trigger the edit
                    className: "fa fa-pencil grid-icon col-sm-1 pull-right"
                }, {
                    className: "dragToSort fa fa-arrows grid-icon col-sm-1 pull-right"
                }]),
                sortable: false,
                editable: false
            }],
                formsGrid,
                makeSortable;

            this.model.formsCollection = new Backbone.Collection(this.model.profileCompletionConfig.stageConfigs);

            makeSortable = function makeSortable() {
                BackgridUtils.sortable({
                    "containers": [_this4.$el.find("#formsGrid tbody")[0]],
                    "rows": _.cloneDeep(_this4.model.formsCollection.toJSON())
                }, _.bind(function (newOrder) {
                    this.model.formsCollection = new Backbone.Collection(newOrder);
                    this.saveConfig();
                }, _this4));
            };

            formsGrid = new Backgrid.Grid({
                className: "backgrid table table-hover",
                emptyText: $.t("templates.admin.ResourceList.noData"),
                columns: BackgridUtils.addSmallScreenCell(cols),
                collection: this.model.formsCollection,
                row: BackgridUtils.ClickableRow.extend({
                    callback: function callback(e) {
                        var rowIndex = AdminUtils.getClickedRowIndex(e);

                        e.preventDefault();

                        //open form detail view here
                        if (!$(e.target).hasClass("fa-times")) {
                            EventManager.sendEvent(Constants.ROUTE_REQUEST, { routeName: "editProgressiveProfileForm", args: [rowIndex.toString()] });
                        }
                    }
                })
            });

            this.$el.find("#formsGrid").append(formsGrid.render().el);

            makeSortable();
        },
        saveConfig: function saveConfig(removeFromList) {
            var _this5 = this;

            var message = "progressiveProfileFormOrderChanged",
                savePromise;

            if (removeFromList) {
                message = "progressiveProfileFormRemoved";
            }

            this.model.profileCompletionConfig.stageConfigs = this.model.formsCollection.toJSON();

            if (this.model.profileCompletionConfig.stageConfigs.length) {
                savePromise = ConfigDelegate.updateEntity("selfservice/profile", this.model.profileCompletionConfig);
            } else {
                //if there are no stageConfigs remove the whole config
                savePromise = ConfigDelegate.deleteEntity("selfservice/profile");
            }

            savePromise.then(function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, message);
                _this5.render();
            });
        }
    });

    return new ProgressiveProfileListView();
});
