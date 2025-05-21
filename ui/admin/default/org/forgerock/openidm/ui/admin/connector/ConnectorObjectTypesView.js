"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
define(["jquery", "lodash", "handlebars", "org/forgerock/openidm/ui/admin/connector/AbstractConnectorView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate", "org/forgerock/openidm/ui/admin/connector/ConnectorSyncView", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/commons/ui/common/util/UIUtils"], function ($, _, Handlebars, AbstractConnectorView, ConfigDelegate, ConnectorDelegate, ConnectorSyncView, constants, eventManager, router, UIUtils) {
    var ConnectorObjectTypeView = AbstractConnectorView.extend({
        template: "templates/admin/connector/ConnectorObjectTypesTemplate.html",
        element: "#connectorObjectTypesTab",
        events: {
            "click .edit-objectType": "editObjectType",
            "click .delete-objectType": "deleteObjectType",
            "click #addObjectType": "addObjectType"
        },
        partials: ["partials/connector/_objectTypes.html"],
        data: {},
        model: {},

        render: function render(args, callback) {
            this.data = args.data;
            this.model.connectorDetails = args.model.connectorDetails;

            this.parentRender(function () {
                if (callback) {
                    callback();
                }
            });
        },

        sortAvailableObjectTypes: function sortAvailableObjectTypes(connectorObjectTypes) {
            var transformed = {};

            //sort the object keys and created a new object with the sorted keys
            _.forEach(_.keys(connectorObjectTypes).sort(), function (ot) {
                transformed[ot] = connectorObjectTypes[ot];
            });

            return transformed;
        },

        //Saves the object type tab
        objectTypeFormSubmit: function objectTypeFormSubmit(message, objectTypeName) {
            var _this = this;

            if (!this.userDefinedObjectTypes) {
                this.userDefinedObjectTypes = this.data.objectTypes;
            }

            this.model.connectorDetails = this.getConnectorConfig();
            this.model.connectorDetails.objectTypes = this.userDefinedObjectTypes;

            ConfigDelegate.updateEntity(this.data.systemType + "/" + this.data.connectorId, this.model.connectorDetails).then(function () {
                var DELAY = 1000;

                _this.previousObjectType = _this.userDefinedObjectTypes;
                eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, message);

                _this.warningMessageCheck();

                _this.updateActionDropdown(_this.previousObjectType);
                _this.setConnectorConfig(_this.model.connectorDetails);

                //have to put this delay here because there is a lag between saving the connector
                //and when it is actually available to be read
                _.delay(function () {
                    eventManager.sendEvent(constants.EVENT_CHANGE_VIEW, { route: router.configuration.routes["connectorDataView"], args: [_this.data.systemType + "_" + _this.data.connectorId, objectTypeName] });
                }, DELAY);
            });
        },

        //When adding a new object type
        addObjectType: function addObjectType(event) {
            var newObjectTypeName = this.$el.find("#availableObjectTypes option:selected").val();

            if (event) {
                event.preventDefault();
            }

            //check to make sure there is a selected new object and there is not already an objectType by the newObjectTypeName
            if (newObjectTypeName && newObjectTypeName.length && !this.data.objectTypes[newObjectTypeName]) {
                this.data.objectTypes[newObjectTypeName] = this.data.availableObjectTypes[newObjectTypeName];
                this.renderObjectTypes(this.data.objectTypes);
                this.objectTypeFormSubmit("objectTypeAdded", newObjectTypeName);
            } else if (newObjectTypeName === undefined) {
                eventManager.sendEvent(constants.EVENT_CHANGE_VIEW, { route: router.configuration.routes.addObjectTypeView, args: [this.data.systemType + "_" + this.data.connectorId] });
            }
        },

        //When clicking the pencil for an object type
        editObjectType: function editObjectType(event) {
            var objectTypeName = $(event.target).parents("tr").attr("data-objectType");

            eventManager.sendEvent(constants.EVENT_CHANGE_VIEW, { route: router.configuration.routes.editObjectTypeView, args: [this.data.systemType + "_" + this.data.connectorId, objectTypeName] });
        },

        //When clicking the delete icon for an object type
        deleteObjectType: function deleteObjectType(event) {
            var _this2 = this;

            UIUtils.confirmDialog($.t("templates.connector.objectTypes.deleteObjectTypeConfirmation"), "danger", function () {
                var objectTypeName = $(event.target).parents("tr").attr("data-objectType");

                if (!_this2.userDefinedObjectTypes) {
                    _this2.userDefinedObjectTypes = _this2.data.objectTypes;
                }

                delete _this2.userDefinedObjectTypes[objectTypeName];

                _this2.renderObjectTypes(_this2.userDefinedObjectTypes);
                _this2.objectTypeFormSubmit("objectTypeDeleted");
            });
        },

        //After saving or deleting an object type re-renders the action list so it is in sync with the available data pieces
        updateActionDropdown: function updateActionDropdown(objectTypes) {
            this.$el.find(".dropdown-menu .data-link").remove();

            _.forEach(objectTypes, _.bind(function (object, key) {
                this.$el.find(".dropdown-menu .divider").before('<li class="data-link">' + '<a href="#resource/system/' + this.data.connectorId + '/' + key + '/list/"><i class="fa fa-database"> Data (' + key + ')</i></a>' + '</li>');
            }, this));
        },

        //Renders the object type table
        renderObjectTypes: function renderObjectTypes(newObjectTypes) {
            this.userDefinedObjectTypes = newObjectTypes;

            $("#connectorObjectTypesTab table tbody").empty();

            _.forEach(this.userDefinedObjectTypes, function (object, key) {
                $("#connectorObjectTypesTab table tbody").append(Handlebars.compile("{{> connector/_objectTypes}}")({ key: key }));
            });
        }
    });

    return new ConnectorObjectTypeView();
});
