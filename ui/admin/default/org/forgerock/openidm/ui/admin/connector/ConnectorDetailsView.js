"use strict";

/*
 * Copyright 2017-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
define(["jquery", "lodash", "form2js", "org/forgerock/openidm/ui/admin/connector/AbstractConnectorView", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate", "org/forgerock/openidm/ui/admin/connector/ConnectorRegistry", "org/forgerock/openidm/ui/admin/util/ConnectorUtils", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/ObjectUtil", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/commons/ui/common/main/ValidatorsManager"], function ($, _, form2js, AbstractConnectorView, constants, ConfigDelegate, ConnectorDelegate, ConnectorRegistry, connectorUtils, eventManager, ObjectUtil, router, validatorsManager) {
    var ConnectorDetailsView = AbstractConnectorView.extend({
        template: "templates/admin/connector/ConnectorDetailsTemplate.html",
        element: "#connectorDetailsTab",
        events: {
            "keypress #connectorForm :input": "connectorFlowCheck",
            "paste #connectorForm :input": "connectorFlowCheck",
            "change #connectorForm :input": "connectorChangesCheck"
        },
        data: {},
        model: {},

        render: function render(args, callback) {
            var _this = this;

            this.model.connectorDetails = args.model.connectorDetails;
            this.data = args.data;

            this.parentRender(function () {
                //Get connector template
                ConnectorRegistry.getConnectorModule(_this.data.connectorTypeName + "_" + _this.data.currentMainVersion).then(function (connectorTypeRef) {
                    _this.connectorTypeRef = connectorTypeRef;

                    //Determine if the template is OAuth
                    if (_this.connectorTypeRef.oAuthConnector) {
                        _this.oAuthConnector = true;
                    } else {
                        _this.oAuthConnector = false;
                    }

                    //Render the connector template / details
                    _this.connectorTypeRef.render({ "connectorType": _this.data.connectorTypeName + "_" + _this.data.currentMainVersion,
                        "animate": true,
                        "connectorDefaults": _this.model.connectorDetails,
                        "editState": _this.data.editState,
                        "systemType": _this.data.systemType }, function () {
                        validatorsManager.validateAllFields(_this.$el);

                        //Set the current newest version incase there is a range
                        _this.connectorTypeRef.data.connectorDefaults.connectorRef.bundleVersion = _this.model.connectorDetails.connectorRef.bundleVersion;
                        _this.setSubmitFlow();

                        _this.model.originalForm = _this.cleanseObject(form2js('connectorForm', '.', false));

                        _.set(_this.model.originalForm, 'connectorRef.connectorHostRef', $("#connectorHostRef").val());

                        // form2js won't pull values from these disabled fields
                        if (_.has(_this.model.originalForm.configurationProperties, "accountSearchFilter")) {
                            _this.model.originalForm.configurationProperties.accountSearchFilter = _this.$el.find('#accountSearchFilter').val();
                            _this.model.originalForm.configurationProperties.groupSearchFilter = _this.$el.find('#groupSearchFilter').val();
                        }

                        _this.$el.find(".nav-tabs").tabdrop();
                        $("#connectorWarningMessage .message .connector-pending").remove();
                        _this.warningMessageCheck();

                        // if enabled is a string we know it's an esv
                        if (typeof _this.model.connectorDetails.enabled === "string") {
                            _.delay(function () {
                                $(".changes-pending-container").hide();
                                $("#connectorWarningMessage").hide();
                            }, 500);
                        }

                        if (callback) {
                            callback();
                        }
                    });
                });
            });
        },

        //Saves the connector tab
        connectorFormSubmit: function connectorFormSubmit(event) {
            var _this2 = this;

            event.preventDefault();
            // Look for disabled fields (which are always esv replacements). Add a custom attribute so they
            // can be found again after the form is submitted and remove the disabled property so the patch
            // request does not contain the disabled fields. The reason for this is because form2js ignores
            // disabled fields and causes the patch to remove the fields which have been disabled.
            this.$el.find("input:disabled").attr("data-esv-replacement", true).prop("disabled", false);

            var updatedForm = this.cleanseObject(form2js('connectorForm', '.', false)),
                patch;

            // form2js won't pull values from these disabled fields
            if (_.has(this.model.originalForm.configurationProperties, "accountSearchFilter")) {
                updatedForm.configurationProperties.accountSearchFilter = this.$el.find('#accountSearchFilter').val();
                updatedForm.configurationProperties.groupSearchFilter = this.$el.find('#groupSearchFilter').val();
            }

            // retain $base64 and $crypto values when they are not changed in the form
            if (_.isObject(this.model.connectorDetails.configurationProperties.credentials) && _.isNull(updatedForm.configurationProperties.credentials)) {
                updatedForm.configurationProperties.credentials = this.model.connectorDetails.configurationProperties.credentials;
            }

            // retain $int value when it is not changed in the form
            if (_.isObject(this.model.connectorDetails.configurationProperties.port) && _.isNull(updatedForm.configurationProperties.port)) {
                updatedForm.configurationProperties.port = this.model.connectorDetails.configurationProperties.port;
            }

            _.set(updatedForm, 'connectorRef.connectorHostRef', $("#connectorHostRef").val());

            // if enabled is a string we know it's an esv
            if (typeof this.model.connectorDetails.enabled === "string") {
                delete this.model.originalForm.enabled;
                delete updatedForm.enabled;
            }

            patch = this.generateConnectorPatch(this.model.originalForm, updatedForm, this.connectorTypeRef.connectorSaved, this.connectorTypeRef);

            this.data.enabled = updatedForm.enabled;

            ConfigDelegate.patchEntity({ "id": this.data.systemType + "/" + this.data.connectorId }, patch).then(function (preTestResult) {
                $("#connectorWarningMessage .message .connector-pending .connector-pending").remove();
                _this2.connectorTest(ConnectorDelegate.testConnector(preTestResult), preTestResult, updatedForm);
                // Re-disable esv replacement input fields.
                _this2.$el.find("[data-esv-replacement]").prop("disabled", true);
            });
        },
        /**
         * This function is required for OAuth connectors. This should be removed in the future when we have time to refactor the oAuth connectors to utilize patch.
         *
         * @returns Returns a connctor object resulting from the original connector object and the form2js results from the connector form
         */
        getProvisioner: function getProvisioner() {
            var connectorData = form2js('connectorForm', '.', false),
                connDetails = this.getConnectorConfig(),
                mergedResult = {};

            delete connectorData.connectorType;

            connectorData.objectTypes = {};

            $.extend(true, mergedResult, connDetails, connectorData);

            mergedResult.objectTypes = this.userDefinedObjectTypes || this.data.objectTypes;

            // Default value for clientSecret in the form is "", prevents saved clientSecret from being overridden
            if (mergedResult.configurationProperties.clientSecret.length === 0 && connDetails.configurationProperties.clientSecret !== null) {
                mergedResult.configurationProperties.clientSecret = connDetails.configurationProperties.clientSecret;
            }

            mergedResult.connectorRef.connectorHostRef = this.$el.find("#connectorHostRef").val();

            return mergedResult;
        },
        /**
         *
         * @param oldForm - The form2js of the form when originally loaded or saved
         * @param currentForm - The current form2js form
         * @returns {*} A patch object for the first connector patch
         *
         * Generates the connector patch object and makes a call to any custom logic per connector needs
         */
        generateConnectorPatch: function generateConnectorPatch(oldForm, currentForm, connectorSpecificChangesEvent, connector) {
            var patch = ObjectUtil.generatePatchSet(currentForm, oldForm);

            if (connectorSpecificChangesEvent) {
                patch = connectorSpecificChangesEvent.call(this, patch, this.getConnectorConfig(), connector);
            }

            return patch;
        },

        connectorFlowCheck: function connectorFlowCheck() {
            if (this.oAuthConnector) {
                this.setSubmitFlow();
            }
        },

        /**
         *
         * @param testPromise - A promise directed at the testing service in IDM
         * @param preTestResult - The json object of the pre test connector config
         * @param updatedForm - The current form2js object updated
         *
         * Tests the current connector configuration
         */
        connectorTest: function connectorTest(testPromise, preTestResult, updatedForm) {
            var _this3 = this;

            testPromise.then(function (testResults) {
                _this3.connectorPass(preTestResult, updatedForm, testResults);
            }, function (failMessage) {
                _this3.connectorFail(preTestResult, updatedForm, failMessage);
            });
        },
        /**
         *
         * @param preTestResult - The json object of the pre test connector config
         * @param updatedForm - The current form2js object updated
         *
         * This function fires as a result of a test passing this will set the enable back to true (if originally enabled)
         * and update the configuration
         */
        connectorPass: function connectorPass(preTestResult, updatedForm, testResults) {
            var _this4 = this;

            if (updatedForm.enabled) {
                ConfigDelegate.patchEntity({ "id": this.data.systemType + "/" + this.data.connectorId }, [{
                    field: "/enabled",
                    operation: "replace",
                    value: true
                }]).then(function () {
                    _this4.updateSuccessfulConfig(preTestResult, updatedForm, testResults);
                });
            } else {
                this.updateSuccessfulConfig(preTestResult, updatedForm, testResults);
            }

            ConnectorDelegate.deleteCurrentConnectorsCache();
        },
        /**
         *
         * @param preTestResult - The json object of the pre test connector config
         * @param updatedForm - The current form2js object updated
         * @param failMessage - This is the failure message the UI will use to display
         *
         *  This function fires as a result of a test failing this will keep the enabled state false
         *  and display a proper error message in the UI
         */
        connectorFail: function connectorFail(preTestResult, updatedForm, failMessage) {
            eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "connectorTestFailed");

            this.model.originalForm = updatedForm;
            this.model.connectorDetails = preTestResult;

            this.$el.find("#connectorEnabled").prop('checked', false);

            this.showError(failMessage);

            ConnectorDelegate.deleteCurrentConnectorsCache();
        },
        /**
         *
         * @param updatedForm - Newly gathered form2js object
         * @param connectorConfig - Connector configuration object
         *
         * Called when the connector has been successfully updated resulting in a UI clean up and in memory configuration update
         */
        updateSuccessfulConfig: function updateSuccessfulConfig(connectorConfig, updatedForm, testResults) {
            eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "connectorSaved");

            this.model.originalForm = updatedForm;

            this.setConnectorConfig(connectorConfig);

            eventManager.sendEvent(constants.EVENT_REFRESH_CONNECTOR_OBJECT_TYPES, {
                hasAvailableObjectTypes: _.keys(testResults.objectTypes).length > 0,
                objectTypes: testResults.objectTypes,
                connectorConfig: connectorConfig
            });

            $("#connectorWarningMessage .message .connector-version").remove();
            $("#connectorWarningMessage .message .connector-pending").remove();
            this.warningMessageCheck();
            $("#connectorErrorMessage").hide();
        },

        connectorChangesCheck: function connectorChangesCheck() {
            if ($("#connectorWarningMessage .message .connector-pending").length === 0) {
                $("#connectorWarningMessage .message").append('<div class="pending-changes connector-pending">' + $.t("templates.connector.pendingConnectorChanges") + '</div>');
                $("#connectorWarningMessage").show();
            }
        }
    });

    return new ConnectorDetailsView();
});
