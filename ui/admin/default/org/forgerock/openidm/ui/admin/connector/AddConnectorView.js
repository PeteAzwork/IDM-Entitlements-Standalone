"use strict";

/*
 * Copyright 2014-2022 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "form2js", "org/forgerock/openidm/ui/admin/connector/AbstractConnectorView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate"], function ($, _, form2js, AbstractConnectorView, eventManager, validatorsManager, constants, ConnectorDelegate, router, ConfigDelegate) {

    var AddEditConnectorView = AbstractConnectorView.extend({
        template: "templates/admin/connector/AddConnectorTemplate.html",
        events: {
            "change #connectorType": "loadConnectorTemplate",
            "onValidate": "onValidate",
            "keypress #connectorForm": "enterHandler"
        },
        data: {},
        connectorTypeRef: null,
        connectorList: null,
        oAuthConnector: false,

        render: function render(args, callback) {
            this.data = {};
            this.data.docHelpUrl = constants.DOC_URL;
            this.data.versionDisplay = {};
            this.data.currentMainVersion = null;
            this.oAuthConnector = false;
            this.connectorTypeRef = null;
            this.connectorList = null;
            this.name = null;

            ConnectorDelegate.availableConnectors().then(_.bind(function (connectors) {
                this.data.connectors = connectors.connectorRef;

                //Build Connector type selection
                this.data.versionDisplay = this.buildConnectorTypes(this.data.connectors);

                this.data.versionDisplay = this.filterConnectorTypes(this.data.versionDisplay);

                this.data.editState = false;
                this.data.connectorName = "";

                this.parentRender(_.bind(function () {
                    validatorsManager.bindValidators(this.$el);

                    this.loadConnectorTemplate(callback);
                }, this));
            }, this));
        },

        enterHandler: function enterHandler(event) {
            if (event.keyCode === constants.ENTER_KEY && this.$el.find("#submitConnector").is(":enabled")) {
                this.$el.find("#submitConnector").trigger("click");
            }
        },

        buildConnectorTypes: function buildConnectorTypes(connectors) {
            return _.chain(connectors).groupBy(function (connectorRef) {
                return connectorRef.displayName;
            }).toPairs().sortBy(function (connectorRef) {
                return connectorRef[0];
            }).map(function (connectorRef) {
                connectorRef[1].displayName = connectorRef[0];

                return {
                    "groupName": connectorRef[0],
                    "versions": connectorRef[1]
                };
            }).value();
        },

        filterConnectorTypes: function filterConnectorTypes(connectorVersions) {
            return _.filter(connectorVersions, function (version) {
                var bundleName = version.versions[0].bundleName,
                    excludes = ["org.forgerock.openicf.connectors.ssh-connector", "org.forgerock.openicf.connectors.groovy-connector", "org.forgerock.openicf.connectors.scriptedrest-connector", "org.forgerock.openicf.connectors.scriptedsql-connector"];
                return !_.includes(excludes, bundleName);
            });
        },

        getProvisioner: function getProvisioner() {
            var connectorData = {},
                connDetails = this.connectorTypeRef.data.connectorDefaults,
                mergedResult = {},
                tempArrayObject,
                tempKeys,
                arrayComponents = $(".connector-array-component");

            if (this.connectorTypeRef.getGenericState()) {
                connectorData.configurationProperties = this.connectorTypeRef.getGenericConnector();
                connectorData.enabled = this.$el.find("#connectorEnabled").prop("checked");
            } else {
                connectorData = form2js("connectorForm", ".", true);
            }

            delete connectorData.connectorType;

            $.extend(true, mergedResult, connDetails, connectorData);

            //Added logic to ensure array parts correctly add and delete what is set
            _.forEach(arrayComponents, function (component) {
                tempArrayObject = form2js($(component).prop("id"), ".", true);
                tempKeys = _.keys(tempArrayObject.configurationProperties);

                if (tempKeys.length) {
                    mergedResult.configurationProperties[tempKeys[0]] = tempArrayObject.configurationProperties[tempKeys[0]];
                }
            });

            mergedResult.connectorRef.connectorHostRef = this.$el.find("#connectorHostRef").val();

            if (this.connectorTypeRef.addConnectorSave) {
                mergedResult.configurationProperties = this.connectorTypeRef.addConnectorSave(mergedResult.configurationProperties);
            }

            return mergedResult;
        },

        connectorFormSubmit: function connectorFormSubmit(event) {
            event.preventDefault();
            var mergedResult = this.getProvisioner(),
                urlName = this.$el.find("#connectorName").val();

            //Checks for connector specific save function to do any additional changes to data
            if (this.connectorTypeRef.connectorCreate) {
                mergedResult = this.connectorTypeRef.connectorCreate(mergedResult);
            }

            ConnectorDelegate.deleteCurrentConnectorsCache();
            ConnectorDelegate.testConnector(mergedResult).then(_.bind(function (testResult) {
                var DELAY = 1500;

                eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "connectorSaved");

                if (!mergedResult.objectTypes) {
                    mergedResult.objectTypes = testResult.objectTypes;
                }

                ConfigDelegate.createEntity(this.data.systemType + "/" + urlName, mergedResult).then(_.bind(function (newConnector) {
                    var _this = this;

                    _.delay(function () {
                        eventManager.sendEvent(constants.EVENT_CHANGE_VIEW, {
                            route: router.configuration.routes.connectorDataView,
                            args: [_this.data.systemType + "_" + urlName, _.keys(newConnector.objectTypes)[0]]
                        });
                    }, DELAY);
                }, this));
            }, this), _.bind(function (result) {
                eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "connectorTestFailed");

                this.showError(result);
            }, this));
        }
    });

    return new AddEditConnectorView();
});
