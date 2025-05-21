"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
define(["jquery", "lodash", "form2js", "org/forgerock/openidm/ui/admin/connector/AbstractConnectorView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager"], function ($, _, form2js, AbstractConnectorView, ConfigDelegate, constants, eventManager) {
    var ConnectorAdvancedView = AbstractConnectorView.extend({
        template: "templates/admin/connector/ConnectorAdvancedTemplate.html",
        element: "#connectorAdvancedTab",
        events: {
            "click #updateAdvanced": "advancedFormSubmit",
            "change #advancedForm :input": "advancedChangesCheck",
            "keydown": "enterHandler"
        },
        data: {},

        render: function render(args, callback) {
            var _this = this;

            this.data = args.data;
            this.model = args.model;

            //make sure the this.data is in line with the most up to date info from connectorDetails
            this.data.operationTimeout = this.model.connectorDetails.operationTimeout;
            this.data.poolConfigOption = this.model.connectorDetails.poolConfigOption;
            this.data.resultsHandlerConfig = this.model.connectorDetails.resultsHandlerConfig;

            this.parentRender(function () {
                _this.$el.find(":text")[0].focus();

                if (callback) {
                    callback();
                }
            });
        },

        advancedFormSubmit: function advancedFormSubmit(event) {
            var _this2 = this;

            event.preventDefault();

            var advancedData = this.cleanseObject(form2js('advancedForm', '.', false)),
                mergedResults = this.advancedDetailsGenerate(this.model.connectorDetails, advancedData);

            ConfigDelegate.updateEntity(this.data.systemType + "/" + this.data.connectorId, mergedResults).then(function () {
                _this2.setConnectorConfig(mergedResults);

                eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "advancedSaved");

                $("#connectorWarningMessage .message .advanced-pending").remove();

                _this2.warningMessageCheck();
            });
        },

        advancedDetailsGenerate: function advancedDetailsGenerate(oldAdvanced, newAdvanced) {
            var mergedResults = {},
                tempNumber,
                defaultOperationTimeout = -1,
                defaultPoolConfigOption = 10;

            $.extend(true, mergedResults, oldAdvanced, newAdvanced);

            //Need to convert all strings to numbers also some safety check to prevent bad values
            _.forEach(mergedResults.operationTimeout, function (value, key) {
                tempNumber = parseInt(value, 10);

                if (!_.isNaN(tempNumber)) {
                    mergedResults.operationTimeout[key] = parseInt(value, 10);
                } else {
                    mergedResults.operationTimeout[key] = defaultOperationTimeout;
                }
            });

            _.forEach(mergedResults.poolConfigOption, function (value, key) {
                tempNumber = parseInt(value, 10);

                if (!_.isNaN(tempNumber)) {
                    mergedResults.poolConfigOption[key] = parseInt(value, 10);
                } else {
                    mergedResults.poolConfigOption[key] = defaultPoolConfigOption;
                }
            });

            return mergedResults;
        },

        advancedChangesCheck: function advancedChangesCheck() {
            if ($("#connectorWarningMessage .message .advanced-pending").length === 0) {
                $("#connectorWarningMessage .message").append('<div class="pending-changes advanced-pending">' + $.t("templates.connector.advanced.pendingAdvancedChanges") + '</div>');
                $("#connectorWarningMessage").show();
            }
        },

        enterHandler: function enterHandler(event) {
            if (event.keyCode === constants.ENTER_KEY) {
                this.$el.find("#updateAdvanced").trigger("click");
            }
        }
    });

    return new ConnectorAdvancedView();
});
