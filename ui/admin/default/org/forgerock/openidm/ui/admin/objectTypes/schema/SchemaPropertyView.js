"use strict";

/*
 * Copyright 2017-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "form2js", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/components/ChangesPending", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/openidm/ui/admin/objectTypes/util/SchemaUtils"], function ($, _, form2js, AdminAbstractView, UIUtils, ConfigDelegate, ChangesPending, EventManager, Constants, Router, AdminUtils, SchemaUtils) {

    var SchemaPropertyView = AdminAbstractView.extend({
        template: "templates/admin/objectTypes/schema/SchemaPropertyViewTemplate.html",
        events: {
            "change input,textarea,select": "makeChanges",
            "change .secureHash_selection": "makeChanges",
            "keyup input": "makeChanges",
            "click .savePropertyDetails": "saveProperty",
            "click #deleteProperty": "deleteProperty"
        },
        data: {},
        model: {},
        partials: ["partials/form/_tagSelectize.html"],
        /**
        * @param {array} args - args[0] = objectType name, args[1] = slash separated list representing property path
        * @param {function} callback - a function to be executed after load
        */
        render: function render(args, callback) {
            var _this = this;

            var partialPromise = UIUtils.preloadPartial("partials/managed/schema/_propertyBreadcrumbLink.html");

            this.args = args;

            //set this.data and this.model every time this view is rendered so always start with a clean slate
            this.data = {
                objectProperties: this.data.objectProperties,
                currentTab: this.data.currentTab,
                nativeTypes: SchemaUtils.nativeTypes,
                idmTypes: SchemaUtils.idmTypes,
                flags: ["MULTIVALUED", "NOT_RETURNED_BY_DEFAULT", "NOT_READABLE", "NOT_UPDATEABLE", "NOT_CREATABLE"]
            };
            /*
                args[0] comes in looking like this => "provisioner.openicf_ldap"
                splitDetails turns it into this => ["provisioner.openicf", "ldap"]
            */
            var splitDetails = args[0].match(/(.*?)_(.*)/).splice(1);

            this.data.fullConnectorName = args[0];
            this.data.systemType = splitDetails[0];
            this.data.connectorId = splitDetails[1];
            this.data.objectTypeName = args[1];

            this.propertyArgs = args[2].split("/");
            this.data.propertyName = this.propertyArgs[0];
            this.args = args;

            //Get current connector details
            $.when(ConfigDelegate.readEntity(this.data.systemType + "/" + this.data.connectorId), partialPromise).then(function (connectorConfig) {
                _this.model.connectorConfig = _.cloneDeep(connectorConfig);

                _this.data.objectType = connectorConfig.objectTypes[_this.data.objectTypeName];

                _this.data.property = _this.data.objectType.properties[_this.data.propertyName];

                //check to see if there is actually a property
                if (_this.data.property === "INVALID") {
                    _this.data.invalidProperty = true;
                }

                _this.setTypeSpecificElements();

                _this.parentRender(function () {
                    _this.setupChangesPending();

                    if (_this.data.currentTab) {
                        _this.$el.find('a[href="' + _this.data.currentTab + '"]').tab('show');
                    }

                    _this.$el.find(".array-selection").selectize({
                        delimiter: ",",
                        persist: false,
                        create: function create(input) {
                            return {
                                value: input,
                                text: input
                            };
                        }
                    });

                    if (callback) {
                        callback();
                    }
                });
            });
        },
        setupChangesPending: function setupChangesPending() {
            var _this2 = this;

            var watchedObj = _.cloneDeep(this.getCurrentFormValue(this.data.property));
            this.model.changesModule = ChangesPending.watchChanges({
                element: this.$el.find(".changes-pending-container"),
                undo: true,
                watchedObj: watchedObj,
                watchedProperties: _.keys(watchedObj),
                undoCallback: function undoCallback() {
                    _this2.render(_this2.args, _.noop, true);
                }
            });
        },
        getCurrentFormValue: function getCurrentFormValue(currentProperty) {
            var formVal = form2js("propertyDetailsForm", ".", false);

            return _.assignIn(currentProperty, formVal);
        },
        setTypeSpecificElements: function setTypeSpecificElements() {
            this.loadTypeSpecificElements = false;

            switch (this.data.property.type) {
                case "object":
                    //this.loadTypeSpecificElements = this.loadPropertiesGrid;
                    this.data.headerIcon = "fa-cube";
                    break;
                case "array":
                    //this.loadTypeSpecificElements = this.loadArrayTypeView;
                    this.data.headerIcon = "fa-list";
                    break;
                case "string":
                    this.data.headerIcon = "fa-font";
                    break;
                case "boolean":
                    this.data.headerIcon = "fa-toggle-on";
                    break;
                case "number":
                    this.data.headerIcon = "fa-hashtag";
                    break;
            }
        },
        /**
        This function is called any time the form is updated. It updates the current config,
        checks with the changes pending module for any differences with the original form,
        toggles the save button on when there are changes, and off when the form is current.
        **/
        makeChanges: function makeChanges() {
            this.data.property = this.getCurrentFormValue(this.data.property);

            this.model.changesModule.makeChanges(_.clone(this.data.property));

            this.$el.find(".btn-save").prop("disabled", !this.model.changesModule.isChanged());
        },
        saveProperty: function saveProperty(e, callback) {
            var _this3 = this;

            if (e) {
                e.preventDefault();
            }

            this.makeChanges();

            this.model.connectorConfig.objectTypes[this.data.objectTypeName].properties[this.data.propertyName] = this.getCurrentFormValue(this.data.property);

            ConfigDelegate.updateEntity(this.data.systemType + "/" + this.data.connectorId, this.model.connectorConfig).then(function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "objectTypeSaved");
                _this3.render(_this3.args, _.noop, true);

                if (callback) {
                    callback();
                }
            });
        },
        deleteProperty: function deleteProperty(e) {
            if (e) {
                e.preventDefault();
            }

            UIUtils.confirmDialog($.t("templates.managed.schemaEditor.confirmPropertyDelete", { propName: this.data.propertyName }), "danger", _.bind(function () {
                var _this4 = this;

                delete this.model.connectorConfig.objectTypes[this.data.objectTypeName].properties[this.data.propertyName];

                ConfigDelegate.updateEntity(this.data.systemType + "/" + this.data.connectorId, this.model.connectorConfig).then(function () {
                    EventManager.sendEvent(Constants.EVENT_CHANGE_VIEW, { route: Router.configuration.routes.editObjectTypeView, args: [_this4.data.systemType + "_" + _this4.data.connectorId, _this4.data.objectTypeName] });
                });
            }, this));
        }
    });

    return new SchemaPropertyView();
});
