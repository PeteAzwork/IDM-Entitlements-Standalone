"use strict";

/*
 * Copyright 2014-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "form2js", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate"], function ($, _, form2js, AbstractView, EventManager, validatorsManager, Constants, Router, ConfigDelegate) {

    var AddObjectTypeView = AbstractView.extend({
        template: "templates/admin/objectTypes/AddObjectTypeTemplate.html",
        events: {
            "click #saveObjectType": "saveObjectType",
            "onValidate": "onValidate"
        },
        partials: [],
        model: {},

        render: function render(args, callback) {
            var _this = this;

            var splitDetails = args[0].match(/(.*?)_(.*)/).splice(1);

            this.data.systemType = splitDetails[0];
            this.data.connectorId = splitDetails[1];
            this.args = args;

            //Get current connector details
            ConfigDelegate.readEntity(this.data.systemType + "/" + this.data.connectorId).then(function (connectorConfig) {
                _this.model.connectorConfig = _.cloneDeep(connectorConfig);

                _this.data.objectType = {
                    "$schema": "http://json-schema.org/draft-04/schema",
                    "type": "object",
                    "properties": {}
                };

                _this.parentRender(function () {
                    validatorsManager.bindValidators(_this.$el);
                    validatorsManager.validateAllFields(_this.$el);
                    if (callback) {
                        callback();
                    }
                });
            });
        },

        saveObjectType: function saveObjectType(e, callback) {
            var _this2 = this;

            var data = form2js('detailsForm', '.', true);

            this.data.objectType.id = data.objectTypeId;
            this.data.objectType.nativeType = data.nativeType;

            this.model.connectorConfig.objectTypes[data.name] = this.data.objectType;

            if (e) {
                e.preventDefault();
            }

            ConfigDelegate.updateEntity(this.data.systemType + "/" + this.data.connectorId, this.model.connectorConfig).then(function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "objectTypeAdded");
                EventManager.sendEvent(Constants.EVENT_CHANGE_VIEW, { route: Router.configuration.routes.editObjectTypeView, args: [_this2.data.systemType + "_" + _this2.data.connectorId, data.name] });

                if (callback) {
                    callback();
                }
            });
        }
    });

    return new AddObjectTypeView();
});
