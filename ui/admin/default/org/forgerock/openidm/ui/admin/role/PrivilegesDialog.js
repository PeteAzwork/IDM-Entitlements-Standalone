"use strict";

/*
 * Copyright 2018-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "handlebars", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "org/forgerock/openidm/ui/common/util/ResourceCollectionUtils", "org/forgerock/openidm/ui/common/delegates/ResourceDelegate", "org/forgerock/openidm/ui/common/resource/util/ResourceQueryFilterEditor", "org/forgerock/commons/ui/common/components/Messages"], function ($, _, Handlebars, AbstractView, conf, eventManager, constants, uiUtils, BootstrapDialogUtils, ResourceCollectionUtils, ResourceDelegate, ResourceQueryFilterEditor, MessagesManager) {
    var PrivilegesDialog = AbstractView.extend({
        template: "templates/admin/role/PrivilegesDialogTemplate.html",
        el: "#dialogs",
        data: {},
        model: {},
        render: function render(opts, onLoadCallback) {
            var _this2 = this;

            var _this = this,
                title = $.t("templates.admin.RoleEdit.addPrivilege"),
                saveButtonText = $.t("common.form.add");

            this.onLoadCallback = onLoadCallback;
            this.model.updatePrivilege = opts.updatePrivilege;
            this.model.privilegeIndex = opts.privilegeIndex;

            this.currentDialog = $('<div id="privilegesDialog"></div>');

            this.data.property = opts.property;
            this.data.newPrivilege = true;
            this.data.propertyValue = {};
            this.data.permissionTypes = ["view", "create", "update", "delete"];

            if (opts.propertyValue && opts.propertyValue !== "" && opts.propertyValue !== "null") {
                this.data.propertyValue = opts.propertyValue;
                this.propertyValuePath = ResourceCollectionUtils.getPropertyValuePath(this.data.propertyValue);
                title = $.t("templates.admin.RoleEdit.privilege") + ": " + opts.propertyValue.name;
                saveButtonText = $.t("common.form.save");
                this.data.newPrivilege = false;
            }

            this.data.originalPropertyValue = _.cloneDeep(this.data.propertyValue);

            $('#dialogs').append(this.currentDialog);

            ResourceCollectionUtils.getAllAvailableResourceCollections().then(function (allResourceCollections) {
                //remove system objects from the list of resources available
                allResourceCollections = _.reject(allResourceCollections, function (rc) {
                    return rc.path.split("/")[0] === "system";
                });

                _this2.model.allAvailableResourceCollections = allResourceCollections;

                _this2.dialog = BootstrapDialogUtils.createModal({
                    title: title,
                    message: _this2.currentDialog,
                    cssClass: "objecttype-windows",
                    onshown: _.bind(function (dialogRef) {
                        this.model.dialogRef = dialogRef;
                        this.loadTemplate();
                    }, _this),
                    buttons: [{
                        label: $.t('common.form.close'),
                        id: "privilegesDialogCloseBtn",
                        action: function action(dialogRef) {
                            dialogRef.close();
                        }
                    }, {
                        label: saveButtonText,
                        cssClass: "btn-primary",
                        id: "privilegesDialogSaveBtn",
                        action: function action(dialogRef) {
                            if (_this.currentDialog.find("#selectPrivilegePath").val()) {
                                _this.savePrivilege().then(function (saved) {
                                    if (saved !== false) {
                                        dialogRef.close();
                                    }
                                });
                            }
                        }
                    }]
                }).open();
            });
        },
        loadTemplate: function loadTemplate() {
            var _this3 = this;

            uiUtils.renderTemplate(this.template, this.currentDialog, _.assignIn({}, conf.globalData, this.data), function () {
                var path = "";

                if (_this3.data.propertyValue) {
                    path = _this3.data.propertyValue.path;
                    _this3.setPermissions();
                }

                _this3.setupPathField(path, true);
            }, "replace");
        },
        renderEditor: function renderEditor(path, filter) {
            var _this4 = this;

            var editor = new ResourceQueryFilterEditor();

            editor.loadSourceProps = function () {
                return ResourceDelegate.getSchema(editor.args.resource.split("/")).then(function (resourceSchema) {
                    // Now that we have the object's schema we can build the attributes grid
                    _this4.buildAttributesGrid(resourceSchema);
                    return _.keys(resourceSchema.properties).sort();
                });
            };

            editor.render({
                "queryFilter": filter,
                "element": "#filterFormContainer",
                "resource": path
            });

            return editor;
        },
        setupPathField: function setupPathField(typePath, onLoad) {
            var _this5 = this;

            var autocompleteField = this.currentDialog.find("#selectPrivilegePath"),
                pathToLabel = function pathToLabel(path) {
                var pathArr = path.split("/"),
                    resourceCollection = _.find(_this5.model.allAvailableResourceCollections, function (availableResource) {
                    return availableResource.path === pathArr[0] + "/" + pathArr[1];
                });

                return resourceCollection.label;
            },
                opts = {
                valueField: 'path',
                searchField: 'label',
                create: false,
                preload: true,
                placeholder: $.t("templates.admin.RoleEdit.pathPlaceholder"),
                render: {
                    item: function item(_item) {
                        return "<div>" + _item.label + "</div>";
                    },
                    option: function option(item) {
                        return "<div>" + item.label + "</div>";
                    }
                },
                load: function load(query, callback) {
                    var resourceCollections = [];

                    _.map(_this5.model.allAvailableResourceCollections, function (resourceCollection) {
                        resourceCollections.push({
                            path: resourceCollection.path,
                            label: resourceCollection.label
                        });
                    });

                    callback(resourceCollections);
                },
                onChange: function onChange(path) {
                    var filter = "";

                    if (onLoad) {
                        onLoad = false;
                        if (_this5.data.propertyValue && _this5.data.propertyValue.filter) {
                            filter = _this5.data.propertyValue.filter;
                        }
                    }
                    _this5.model.dialogRef.$modal.find("#privilegeForm").show();
                    _this5.queryEditor = _this5.renderEditor(path, filter);
                }
            };

            autocompleteField.selectize(opts);

            if (typePath && typePath.length) {
                autocompleteField[0].selectize.addOption({ path: typePath, label: pathToLabel(typePath) });
                autocompleteField[0].selectize.setValue(typePath);
            }

            if (this.onLoadCallback) {
                this.onLoadCallback();
            }
        },
        setPermissions: function setPermissions() {
            var _this6 = this;

            _.forEach(this.data.permissionTypes, function (permission) {
                if (_this6.data.newPrivilege && permission === "view" || _.includes(_this6.data.propertyValue.permissions, permission.toUpperCase())) {
                    _this6.currentDialog.find("#" + permission + "Checkbox").prop("checked", true);
                }
            });
        },
        buildAttributesGrid: function buildAttributesGrid(schema) {
            var _this7 = this;

            this.currentDialog.find("#attributesGridContainer").empty();
            uiUtils.preloadPartial("partials/role/_attributesGrid.html").then(function () {
                var attributesGrid = void 0;
                // grab all the userEditable or viewable string, boolean, or number properties
                _this7.model.availableAttributes = _.pickBy(schema.properties, function (prop, key) {
                    return !key.startsWith("_");
                });

                _this7.data.attributes = [];
                /*
                    Loop over the order and build an array of attribute objects and add propName and permmissions
                    to each object for display purposes (aka setting form field ids and dropdown values).
                */
                if (_this7.data.newPrivilege || _this7.data.propertyValue.accessFlags && _this7.data.propertyValue.accessFlags.length > 0) {
                    /*
                        this is a new privilege or accessFlags exists so set the values accordingly
                    */
                    _.forEach(schema.order, function (propName) {
                        var attr = _this7.model.availableAttributes[propName];
                        if (attr) {
                            var hasTitle = attr.title && attr.title.length > 0,
                                hasDescription = attr.description && attr.description.length > 0;
                            var accessFlag = _.find(_this7.data.propertyValue.accessFlags, { attribute: propName });

                            attr.propName = propName;
                            /*
                                "read" is the default setting for a new privilege and "none" is for an attribute
                                that does not exist in the accessFlags array.
                            */
                            attr.permissions = _this7.data.newPrivilege ? "read" : "none";

                            if (accessFlag) {
                                attr.permissions = accessFlag.readOnly ? "read" : "readWrite";
                            }

                            if (!hasTitle && hasDescription) {
                                attr.title = attr.description;
                            }

                            _this7.data.attributes.push(attr);
                        }
                    });
                } else {
                    /*
                        accessFlags is either an empty array or it does not exist. In this case set all accessFlags to readWrite.
                    */
                    _.forEach(schema.order, function (propName) {
                        var attr = _this7.model.availableAttributes[propName];
                        if (attr) {
                            attr.propName = propName;

                            attr.permissions = "readWrite";

                            _this7.data.attributes.push(attr);
                        }
                    });
                }

                // if there are no attributes hide the attributes section
                if (_this7.data.attributes.length) {
                    attributesGrid = Handlebars.compile("{{> role/_attributesGrid}}")({ attributes: _this7.data.attributes });

                    _this7.currentDialog.find("#attributesGridContainer").append(attributesGrid);
                    _this7.currentDialog.find(".selectize-me").selectize();
                    _this7.currentDialog.find("#attibutesPermissionsContainer").show();
                } else {
                    _this7.currentDialog.find("#attibutesPermissionsContainer").hide();
                }
            });
        },
        savePrivilege: function savePrivilege() {
            var formVal = this.getPrivilegeValue();
            // if there is no queryFilter remove it
            if (!formVal.filter || formVal.filter.length === 0) {
                delete formVal.filter;
            }
            // if accessFlags is an empty array do not save instead throw up a warning
            if (formVal.accessFlags && formVal.accessFlags.length === 0) {
                MessagesManager.messages.addMessage({ "type": "error", "message": $.t("templates.admin.RoleEdit.mustHaveOneAttributeWithRead") });
                return $.Deferred().resolve(false);
            } else {
                // update the role with this privilege
                return this.model.updatePrivilege(formVal, this.model.privilegeIndex);
            }
        },
        getPrivilegeValue: function getPrivilegeValue() {
            var _this8 = this;

            var el = this.currentDialog,
                permissions = [],
                accessFlags = [];

            _.forEach(this.data.permissionTypes, function (permission) {
                if (_this8.currentDialog.find("#" + permission + "Checkbox").prop("checked")) {
                    permissions.push(permission.toUpperCase());
                }
            });

            _.forEach(this.data.attributes, function (attr) {
                var val = _this8.currentDialog.find("#" + attr.propName + "Select").val(),
                    accessFlag = {
                    attribute: attr.propName,
                    readOnly: val === 'read' ? true : false
                };

                if (val !== "none") {
                    accessFlags.push(accessFlag);
                }
            });

            return {
                name: el.find("#privilegeName").val(),
                path: el.find("#selectPrivilegePath").val(),
                permissions: permissions,
                accessFlags: accessFlags,
                actions: this.data.propertyValue.actions || [],
                filter: this.queryEditor.getFilterString() || null
            };
        }
    });

    return PrivilegesDialog;
});
