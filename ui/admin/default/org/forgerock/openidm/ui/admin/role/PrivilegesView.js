"use strict";

/*
 * Copyright 2018-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
define(["jquery", "lodash", "handlebars", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/openidm/ui/admin/util/AdminUtils", "backbone", "backgrid", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/openidm/ui/admin/delegates/InternalRoleDelegate", "org/forgerock/commons/ui/common/components/Messages", "org/forgerock/openidm/ui/admin/role/PrivilegesDialog", "org/forgerock/commons/ui/common/util/UIUtils"], function ($, _, Handlebars, AbstractView, AdminUtils, Backbone, Backgrid, BackgridUtils, InternalRoleDelegate, MessagesManager, PrivilegesDialog, UIUtils) {
    var PrivilegesView = AbstractView.extend({
        template: "templates/admin/role/PrivilegesViewTemplate.html",
        noBaseTemplate: true,

        events: {
            "click .add-privileges-btn": "addPrivilege",
            "click .remove-privileges-btn": "removePrivileges"
        },
        partials: ["partials/role/_permissionBadge.html"],

        render: function render(args, callback) {
            this.args = args;
            this.element = args.element;
            this.model = {
                onUpdatePrivileges: args.onUpdatePrivileges,
                role: args.role,
                selectedItems: [],
                privileges: _.isArray(args.role.privileges) ? args.role.privileges : []
            };
            this.data.addPrivilege = $.t("templates.admin.ResourceEdit.addResource", {
                resource: args.schema.properties.privileges.title
            });
            this.data.removePrivilege = $.t("templates.admin.ResourceEdit.removeSelectedResource", {
                resource: args.schema.properties.privileges.title
            });

            this.parentRender(function () {
                this.buildPrivilegesGrid(this.getCols());

                if (callback) {
                    callback();
                }
            });
        },
        getValue: function getValue() {
            return this.model.privileges;
        },
        buildPrivilegesGrid: function buildPrivilegesGrid(cols) {
            var _this2 = this;

            var _this = this,
                privilegesGrid;

            this.model.privilegesCollection = new Backbone.Collection(this.model.privileges);

            privilegesGrid = new Backgrid.Grid({
                className: "backgrid table table-hover",
                emptyText: $.t("templates.admin.ResourceList.noData"),
                columns: BackgridUtils.addSmallScreenCell(cols),
                collection: this.model.privilegesCollection,
                row: BackgridUtils.ClickableRow.extend({
                    callback: function callback(e) {
                        var $target = $(e.target),
                            itemIndex = AdminUtils.getClickedRowIndex(e);

                        if ($target.is("input") || $target.is(".select-row-cell")) {
                            return;
                        }

                        _this.openPrivilegesDialog(this.model.attributes, itemIndex);
                    }
                })
            });

            this.$el.find("#privilegesListGrid").append(privilegesGrid.render().el);

            this.model.privilegesCollection.on("backgrid:selected", function (model, selected) {
                _this2.onRowSelect(model, selected);
            });
        },
        getCols: function getCols() {
            return [{
                name: "",
                cell: "select-row",
                headerCell: "select-all",
                sortable: false,
                editable: false
            }, {
                "name": "name",
                "label": $.t("templates.admin.RoleEdit.privilege"),
                "cell": "string",
                "sortable": false,
                "editable": false
            }, {
                "name": "permissions",
                "label": $.t("templates.admin.RoleEdit.permissions"),
                "cell": Backgrid.Cell.extend({
                    render: function render() {
                        var html = _.map(this.model.attributes.permissions, function (permission) {
                            return Handlebars.compile("{{> role/_permissionBadge}}")({
                                "permission": permission.toLowerCase()
                            });
                        });

                        this.$el.html(html);

                        return this;
                    }
                }),
                "sortable": false,
                "editable": false,
                "sortType": "toggle"
            }];
        },
        addPrivilege: function addPrivilege() {
            this.openPrivilegesDialog();
        },
        openPrivilegesDialog: function openPrivilegesDialog(privilegeValue, privilegeIndex) {
            var opts = {
                property: this.args.schema.properties.privilege,
                propertyValue: privilegeValue,
                schema: this.args.schema,
                updatePrivilege: _.bind(this.updatePrivilege, this),
                privilegeIndex: privilegeIndex
            };

            new PrivilegesDialog().render(opts);
        },
        onRowSelect: function onRowSelect(model, selected) {
            if (selected && !_.includes(this.model.selectedItems, model.attributes)) {
                this.model.selectedItems.push(model.attributes);
            } else {
                this.model.selectedItems = _.without(this.model.selectedItems, model.attributes);
            }

            this.toggleActions();
        },
        toggleActions: function toggleActions() {
            if (this.model.selectedItems.length === 0) {
                this.$el.find('.remove-privileges-btn').prop('disabled', true);
            } else {
                this.$el.find('.remove-privileges-btn').prop('disabled', false);
            }
        },
        updatePrivilege: function updatePrivilege(privilege, privilegesIndex) {
            var _this3 = this;

            var newPrivilege = _.isUndefined(privilegesIndex);

            if (newPrivilege) {
                this.model.privileges.push(privilege);
            } else {
                this.model.privileges[privilegesIndex] = privilege;
            }

            return this.patchPrivileges(this.model.privileges, function () {
                MessagesManager.messages.addMessage({
                    "message": $.t("templates.admin.ResourceEdit.editSuccess", {
                        objectTitle: _this3.args.schema.properties.privileges.title
                    })
                });
            }).fail(function () {
                // if we fail on a new privilege we need to remove it from this.model.privileges and start again
                if (newPrivilege) {
                    _this3.model.privileges.pop();
                }
            });
        },
        removePrivileges: function removePrivileges(e) {
            var _this4 = this;

            if (e) {
                e.preventDefault();
            }

            var confirmText = $.t("templates.admin.ResourceEdit.confirmDeleteSelectedSpecific", {
                "type": this.args.schema.properties.privileges.title
            });

            UIUtils.confirmDialog(confirmText, "danger", function () {
                _.forEach(_this4.model.selectedItems, function (selectedItem) {
                    _this4.model.privileges = _.remove(_this4.model.privileges, function (privilege) {
                        return !_.isEqual(privilege, selectedItem);
                    });
                });

                _this4.patchPrivileges(_this4.model.privileges, function () {
                    MessagesManager.messages.addMessage({
                        "message": $.t("templates.admin.ResourceEdit.deleteSelectedSuccess")
                    });
                });
            });
        },
        patchPrivileges: function patchPrivileges(privileges, callback) {
            var _this = this,
                patchDefinition = [{ "operation": "replace", "field": "/privileges", "value": privileges }];

            return InternalRoleDelegate.patchEntity({ id: this.model.role._id, rev: this.model.role._rev }, patchDefinition, callback).then(function () {
                _this.model.onUpdatePrivileges();
            });
        }
    });

    return PrivilegesView;
});
