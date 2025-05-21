"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "backbone", "org/forgerock/openidm/ui/admin/managed/AbstractManagedView", "org/forgerock/openidm/ui/admin/util/AdminUtils", "backgrid", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/openidm/ui/admin/managed/schema/EditPolicyDialog"], function ($, _, Backbone, AbstractManagedView, AdminUtils, Backgrid, BackgridUtils, UIUtils, EditPolicyDialog) {
    var PolicyView = AbstractManagedView.extend({
        template: "templates/admin/managed/schema/PolicyViewTemplate.html",
        element: "#policyContainer",
        noBaseTemplate: true,
        model: {},
        events: {
            "click #addNewPolicy": "addNewPolicy"
        },
        partials: ["partials/managed/schema/_policyParamNewRow.html", "partials/managed/schema/_policyParamEditableRow.html"],

        render: function render(args, callback) {
            var _this = this;

            this.parent = args[0];
            this.data.policies = this.parent.data.property.policies || [];

            this.parentRender(function () {
                _this.setupPoliciesGrid();

                if (callback) {
                    callback();
                }
            });
        },
        /**
         *
         */
        setupPoliciesGrid: function setupPoliciesGrid() {
            var _this2 = this;

            var self = this,
                listElement = this.$el.find(".policyList"),
                cols = [{
                name: "policyId",
                label: $.t("templates.managed.schemaEditor.policies"),
                cell: "string",
                sortable: false,
                editable: false
            }, {
                name: "params",
                label: $.t("templates.managed.schemaEditor.parameters"),
                cell: Backgrid.Cell.extend({
                    render: function render() {
                        var params = this.model.get("params");

                        this.$el.html(_.keys(params).join(","));

                        return this;
                    }
                }),
                sortable: false,
                editable: false
            }, {
                label: "",
                cell: BackgridUtils.ButtonCell([{
                    className: "fa fa-times grid-icon col-sm-1 pull-right",
                    callback: function callback(e) {
                        var itemIndex = AdminUtils.getClickedRowIndex(e);
                        e.preventDefault();

                        UIUtils.confirmDialog($.t("templates.managed.schemaEditor.confirmPolicyDelete", { policyId: this.model.get("policyId") }), "danger", function () {
                            self.parent.data.property.policies.splice(itemIndex, 1);
                            self.saveProperty();
                        });
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
                policiesGrid,
                makeSortable = function makeSortable() {
                BackgridUtils.sortable({
                    "containers": [listElement.find("tbody")[0]],
                    "rows": _.cloneDeep(_this2.data.policies)
                }, function (newOrder) {
                    _this2.parent.data.property.policies = newOrder;
                    _this2.saveProperty();
                });
            };

            //empty the existing
            listElement.empty();

            this.model.policiesCollection = new Backbone.Collection(this.data.policies);

            policiesGrid = new Backgrid.Grid({
                className: "table backgrid table-hover",
                emptyText: $.t("templates.admin.ResourceList.noData"),
                columns: BackgridUtils.addSmallScreenCell(cols),
                collection: this.model.policiesCollection,
                row: BackgridUtils.ClickableRow.extend({
                    callback: function callback(e) {
                        var itemIndex = AdminUtils.getClickedRowIndex(e);

                        e.preventDefault();

                        //open policyDialog here
                        if (!$(e.target).hasClass("fa-times")) {
                            self.openEditPolicyDialog(this.model.toJSON(), itemIndex);
                        }
                    }
                })
            });

            listElement.append(policiesGrid.render().el);

            makeSortable();
        },
        addNewPolicy: function addNewPolicy(e) {
            e.preventDefault();

            this.openEditPolicyDialog();
        },
        openEditPolicyDialog: function openEditPolicyDialog(policy, index) {
            var _this3 = this;

            var args = {
                savePolicy: function savePolicy(editedPolicy) {
                    if (!_.isArray(_this3.parent.data.property.policies)) {
                        _this3.parent.data.property.policies = [];
                    }
                    _this3.parent.data.property.policies.push(editedPolicy);
                    _this3.saveProperty();
                }
            };

            if (policy) {
                args = {
                    policy: policy,
                    savePolicy: function savePolicy(editedPolicy) {
                        _this3.parent.data.property.policies[index] = editedPolicy;
                        _this3.saveProperty();
                    }
                };
            }

            EditPolicyDialog.render(args);
        },
        saveProperty: function saveProperty() {
            var _this4 = this;

            this.parent.saveProperty(false, function () {
                _this4.parent.$el.find('a[href="#policyContainer"]').tab('show');
            });
        }

    });

    return new PolicyView();
});
