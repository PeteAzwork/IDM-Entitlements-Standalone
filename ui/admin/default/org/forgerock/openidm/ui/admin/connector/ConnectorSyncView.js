"use strict";

/*
 * Copyright 2017-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
define(["jquery", "lodash", "form2js", "org/forgerock/openidm/ui/admin/connector/AbstractConnectorView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/openidm/ui/admin/util/InlineScriptEditor"], function ($, _, form2js, AbstractConnectorView, ConfigDelegate, constants, eventManager, InlineScriptEditor) {
    var ConnectorSyncView = AbstractConnectorView.extend({
        template: "templates/admin/connector/ConnectorSyncTemplate.html",
        element: "#connectorSyncTab",
        events: {
            "click #updateSync": "syncFormSubmit",
            "change .maxRetries": "pendingSyncChangesCheck",
            "change .retryOptions": "retryOptionChanged",
            "change .postRetryAction": "postRetryActionChange"
        },
        partials: [],
        model: {},
        data: {},
        script: {},

        render: function render(args, callback) {
            var _this = this;

            this.model.connectorDetails = args.model.connectorDetails;
            this.data = args.data;
            this.postActionBlockScript = null;

            this.parentRender(function () {
                // no syncFailureHandler property is the same as maxRetries: -1
                if (!_this.model.connectorDetails.syncFailureHandler) {
                    _this.$el.find(".retryOptions").val("-1").change();
                    $("#connectorWarningMessage .message .sync-pending").remove();
                    _this.warningMessageCheck();
                } else {
                    if (_.has(_this.model.connectorDetails.syncFailureHandler, "maxRetries")) {
                        switch (_this.model.connectorDetails.syncFailureHandler.maxRetries) {
                            case 0:
                                _this.$el.find(".retryOptions").val("0").change();
                                break;
                            case -1:
                                _this.$el.find(".retryOptions").val("-1").change();
                                break;
                            default:
                                _this.$el.find(".retryOptions").val("*").change();
                                _this.$el.find(".maxRetries").val(_this.model.connectorDetails.syncFailureHandler.maxRetries);
                                break;
                        }
                        $("#connectorWarningMessage .message .sync-pending").remove();
                        _this.warningMessageCheck();
                    }

                    if (_.has(_this.model.connectorDetails.syncFailureHandler.postRetryAction, "script")) {
                        _this.$el.find(".postRetryAction").val("script");
                        _this.script = _this.model.connectorDetails.syncFailureHandler.postRetryAction.script;
                    } else {
                        _this.$el.find(".postRetryAction").val(_this.model.connectorDetails.syncFailureHandler.postRetryAction);
                    }
                }

                // add the script element
                _this.postActionBlockScript = InlineScriptEditor.generateScriptEditor({
                    "element": _this.$el.find(".postActionBlock .script"),
                    "eventName": "",
                    "deleteElement": false,
                    "scriptData": _this.script
                });

                if (!_.isEmpty(_this.script)) {
                    _this.$el.find(".postActionBlock .script").show();
                }

                if (callback) {
                    callback();
                }
            });
        },

        //Saves the sync tab
        syncFormSubmit: function syncFormSubmit() {
            var _this2 = this;

            var syncData = this.cleanseObject(form2js('syncForm', '.', false)),
                connectorDetails = this.getConnectorConfig(),
                syncFailureHandler = {};

            if (syncData.syncFailureHandler.maxRetries) {
                switch (syncData.syncFailureHandler.maxRetries) {
                    case "-1":
                        delete connectorDetails.syncFailureHandler;
                        break;
                    default:
                        syncFailureHandler.maxRetries = parseInt(syncData.syncFailureHandler.maxRetries, 10);
                        syncFailureHandler.postRetryAction = syncData.syncFailureHandler.postRetryAction;
                        if (syncFailureHandler.postRetryAction === "script") {
                            syncFailureHandler.postRetryAction = { "script": this.postActionBlockScript.generateScript() };
                        }
                        connectorDetails.syncFailureHandler = syncFailureHandler;
                        break;
                }
            }

            ConfigDelegate.updateEntity(this.data.systemType + "/" + this.data.connectorId, connectorDetails).then(function () {
                eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "liveSyncSaved");

                _this2.setConnectorConfig(connectorDetails);
                $("#connectorWarningMessage .message .connector-pending .sync-pending").remove();

                $("#connectorWarningMessage .message .sync-pending").remove();
                _this2.warningMessageCheck();
            });
        },

        retryOptionChanged: function retryOptionChanged() {
            switch (this.$el.find(".retryOptions").val()) {
                case "0":
                    this.$el.find(".maxRetries").val("0");
                    this.$el.find(".maxRetriesBlock").hide();
                    this.$el.find(".postActionBlock").show();
                    break;
                case "-1":
                    this.$el.find(".maxRetries").val("-1");
                    this.$el.find(".maxRetriesBlock").hide();
                    this.$el.find(".postActionBlock").hide();
                    break;
                case "*":
                    this.$el.find(".maxRetries").val("5");
                    this.$el.find(".maxRetriesBlock").show();
                    this.$el.find(".postActionBlock").show();
                    break;
            }

            this.pendingSyncChangesCheck();
        },

        postRetryActionChange: function postRetryActionChange() {
            if (this.$el.find(".postRetryAction").val() === "script") {
                this.$el.find(".postActionBlock .script").show();
            } else {
                this.$el.find(".postActionBlock .script").hide();
            }

            this.pendingSyncChangesCheck();
        },

        pendingSyncChangesCheck: function pendingSyncChangesCheck() {
            if ($("#connectorWarningMessage .message .sync-pending").length === 0) {
                $("#connectorWarningMessage .message").append('<div class="pending-changes sync-pending">' + $.t("templates.connector.pendingSync") + '</div>');
                $("#connectorWarningMessage").show();
            }
        }
    });

    return new ConnectorSyncView();
});
