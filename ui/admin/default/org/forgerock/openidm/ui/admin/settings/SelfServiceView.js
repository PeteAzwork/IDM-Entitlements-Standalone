"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["lodash", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/main/ValidatorsManager"], function (_, AdminAbstractView, ConfigDelegate, Constants, EventManager, ValidatorsManager) {

    var SelfServiceView = AdminAbstractView.extend({
        template: "templates/admin/settings/SelfServiceTemplate.html",
        element: "#selfServiceContainer",
        noBaseTemplate: true,
        events: {
            "click #saveSelfServiceURL": "saveSelfServiceURL",
            "keydown": "enterHandler"
        },
        model: {
            uiContextObject: {}
        },
        data: {
            selfServiceURL: ""
        },

        render: function render() {
            var _this = this;

            this.data.docHelpUrl = Constants.DOC_URL;

            ConfigDelegate.readEntity("ui.context/enduser").then(function (data) {
                _this.model.uiContextObject = data;
                _this.data.selfServiceURL = data.urlContextRoot;

                _this.parentRender(function () {
                    ValidatorsManager.bindValidators(_this.$el.find("#systemConfigForm"));
                    ValidatorsManager.validateAllFields(_this.$el.find("#systemConfigForm"));

                    _this.$el.find("#selfServiceURL").focus();
                });
            });
        },

        saveSelfServiceURL: function saveSelfServiceURL(event) {
            event.preventDefault();

            this.model.uiContextObject.urlContextRoot = this.$el.find("#selfServiceURL").val();

            ConfigDelegate.updateEntity("ui.context/enduser", this.model.uiContextObject).then(function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "selfServiceSaveSuccess");
            });
        },
        enterHandler: function enterHandler(event) {
            if (event.keyCode === Constants.ENTER_KEY) {
                this.$el.find("#saveSelfServiceURL").trigger("click");
            }
        }
    });

    return new SelfServiceView();
});
