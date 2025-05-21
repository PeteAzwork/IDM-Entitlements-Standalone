"use strict";

/*
 * Copyright 2015-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "handlebars", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate", "org/forgerock/commons/ui/common/util/ModuleLoader", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/openidm/ui/common/util/HandlebarHelperUtils"], function ($, _, Handlebars, ConfigDelegate, ConnectorDelegate, ModuleLoader, UIUtils) {
    var obj = {};

    /**
     * Retrieves a list of connectors and managed objects and creates an array of resources
     *
     * @returns {promise} promise - resolves with an array of strings
     */
    obj.getAvailableResourceEndpoints = function () {
        var connectorPromise = ConnectorDelegate.currentConnectors(),
            managedPromise = ConfigDelegate.readEntity("managed"),
            resources = [];

        return $.when(connectorPromise, managedPromise).then(_.bind(function (connectors, managedObjects) {
            _.forEach(managedObjects.objects, _.bind(function (managed) {
                resources.push("managed/" + managed.name);
            }, this));

            _.forEach(connectors, _.bind(function (connector) {
                _.forEach(connector.objectTypes, _.bind(function (ot) {
                    if (ot !== "__ALL__") {
                        resources.push("system/" + connector.name + "/" + ot);
                    }
                }, this));
            }, this));

            return resources;
        }, this));
    };

    /**
     * @param name
     * @returns {string}
     *
     * This function takes in a word and capitalizes the first letter
     */
    obj.capitalizeName = function (name) {
        return name.charAt(0).toUpperCase() + name.substr(1);
    };

    obj.findPropertiesList = function (type, required) {
        var connectorUrl,
            properties,
            propertiesPromise = $.Deferred();

        if (type[0] === "system") {
            ConnectorDelegate.currentConnectors().then(_.bind(function (connectors) {
                connectorUrl = _.find(connectors, function (connector) {
                    return connector.name === type[1];
                }, this);

                if (connectorUrl && connectorUrl.config && connectorUrl.config.length > 0) {
                    connectorUrl = connectorUrl.config.split("/");

                    ConfigDelegate.readEntity(connectorUrl[1] + "/" + connectorUrl[2]).then(_.bind(function (config) {
                        if (required) {
                            properties = _.pickBy(config.objectTypes[type[2]].properties, function (property) {
                                return property.required === true;
                            });
                        } else {
                            properties = config.objectTypes[type[2]].properties;
                        }

                        propertiesPromise.resolve(properties, config);
                    }, this));
                } else {
                    propertiesPromise.resolve([]);
                }
            }, this));
        } else if (type[0] === "managed") {
            ConfigDelegate.readEntity("managed").then(_.bind(function (managed) {
                properties = _.find(managed.objects, function (managedObject) {
                    return managedObject.name === type[1];
                });

                if (properties.schema && properties.schema.properties) {
                    if (required) {

                        properties = _.pickBy(properties.schema.properties, function (value, key) {
                            var found = false;

                            _.forEach(properties.schema.required, function (field) {
                                if (field === key) {
                                    found = true;
                                }
                            });

                            return found;
                        });

                        propertiesPromise.resolve(properties);
                    } else {
                        propertiesPromise.resolve(properties.schema.properties);
                    }
                } else {
                    propertiesPromise.resolve([]);
                }
            }, this));
        } else {
            propertiesPromise.resolve([]);
        }

        return propertiesPromise;
    };

    /**
     * @param {string} message The text provided in the main body of the dialog
     * @param {Function} confirmCallback Fired when the delete button is clicked
     *
     * @example
     *  AdminUtils.confirmDeleteDialog($.t("templates.admin.ResourceEdit.confirmDelete"), _.bind(function() {
     *      //Useful stuff here
     *  }, this));
     */
    obj.confirmDeleteDialog = function (message, confirmCallback) {
        ModuleLoader.load("bootstrap-dialog").then(function (BootstrapDialog) {
            var btnType = "btn-danger";

            BootstrapDialog.show({
                title: $.t('common.form.confirm') + " " + $.t('common.form.delete'),
                closeByBackdrop: false,
                type: "type-danger",
                message: message,
                id: "frConfirmationDialog",
                buttons: [{
                    label: $.t('common.form.cancel'),
                    id: "frConfirmationDialogBtnClose",
                    action: function action(dialog) {
                        dialog.close();
                    }
                }, {
                    label: $.t('common.form.delete'),
                    cssClass: btnType,
                    id: "frConfirmationDialogBtnDelete",
                    action: function action(dialog) {
                        if (confirmCallback) {
                            confirmCallback();
                        }
                        dialog.close();
                    }
                }]
            });
        });
    };

    /**
     * @param availableProps {array} - array of a resource's availableProps objects from findPropertiesList
     * @param existingFields {array} - properties to be filtered out
     * @returns {array}
     *
     * This function filters out the all props that are named "_id", are not of type string,
     * are encrypted, or are already existing in the current list of availableProps
     */
    obj.filteredPropertiesList = function (availableProps, existingFields) {
        return _.chain(availableProps).omit(function (prop, key) {
            return prop.type !== "string" || key === "_id" || _.has(prop, "encryption") || _.includes(existingFields, key);
        }).keys().sortBy().value();
    };
    /**
     * This function attempts to load a partial file from partials/extensionDirectory
     * with the same name as partialName. If the partial exists it returns a promise
     * resolving with a string representing the name of the partial to be used in the
     * form template or false if no partial exists.
     *
     * @param extensionDirectory {string}
     * @param partialName {string}
     * @returns promise
     **/
    obj.loadExtensionPartial = function (extensionDirectory, partialName) {
        var promise = $.Deferred(),
            path = "partials/" + extensionDirectory + "/" + partialName + ".html";

        $.ajax({
            url: path,
            success: function success(data) {
                Handlebars.registerPartial(partialName, Handlebars.compile(data));
                promise.resolve(partialName);
            },
            error: function error() {
                promise.resolve(false);
            }
        });

        return promise;
    };

    /**
     * This function takes in a table row click event and returns the index of the clicked row
     *
     * @param {object} event - a click event
     * @returns {number} - the index of the clicked table row
     */
    obj.getClickedRowIndex = function (e) {
        var index;

        _.forEach($(e.currentTarget).closest("table tbody").find("tr"), function (tr, i) {
            if (tr === $(e.currentTarget).closest("tr")[0]) {
                index = i;
            }
        });

        return index;
    };
    /**
     * @param {object} view the view where the tabs exist
     * @param {string} newTab a string representing a hash address to the anchor of the new tab to be viewed
     * @param {Function} confirmCallback Fired when the "Save Changes" button is clicked
     */
    obj.confirmSaveChanges = function (view, newTab, confirmCallback, cancelCallback) {
        var overrides = {
            title: $.t("common.form.save") + "?",
            okText: $.t("common.form.save"),
            cancelText: $.t("templates.admin.ResourceEdit.discard"),
            cancelCallback: function cancelCallback() {
                view.render(view.args, function () {
                    view.$el.find('a[href="' + newTab + '"]').tab('show');
                });
            }
        };

        if (cancelCallback) {
            overrides.cancelCallback = cancelCallback;
        }

        UIUtils.confirmDialog($.t("templates.admin.ResourceEdit.saveChangesMessage"), "danger", confirmCallback, overrides);
    };

    /**
     * @param {object} view the view where the tabs exist
     * @param {string} newTab a string representing a hash address to the anchor of the new tab to be viewed
     */
    obj.confirmDiscardChanges = function (view, newTab) {
        var overrides = {
            title: $.t("templates.admin.ResourceEdit.discard") + "?",
            okText: $.t("common.form.cancel"),
            cancelText: $.t("templates.admin.ResourceEdit.discard"),
            cancelCallback: function cancelCallback() {
                view.render(view.args, function () {
                    view.$el.find('a[href="' + newTab + '"]').tab('show');
                });
            }
        };

        UIUtils.confirmDialog($.t("templates.admin.ResourceEdit.discardChangesMessage"), "danger", $.noop(), overrides);
    };

    /**
    * @description A handlebars helper checking the inequality of two provided parameters, if
    *      the parameters are equal and there is an else block, the else block will be rendered.
    *
    * @example:
    *
    * {{#unlessEquals "testParam" "differentParam"}}
    *      <span>not equal block</span>
    * {{else}}
    *      <span>equal block</span>
    * {{/unlessEquals}}
    */
    Handlebars.registerHelper('unlessEquals', function (val, val2, options) {
        if (val !== val2) {
            return options.fn(this);
        } else {
            return options.inverse(this);
        }
    });

    return obj;
});
