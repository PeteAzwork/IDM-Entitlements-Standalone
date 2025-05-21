"use strict";

/*
 * Copyright 2018-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/main/Router"], function ($, _, AdminAbstractView, ConfigDelegate, Constants, EventManager, Router) {
    var VersionView = AdminAbstractView.extend({
        template: "templates/admin/termsAndConditions/VersionTemplate.html",
        events: {
            "click #makeActive": "makeActive",
            "click #deleteVersion": "deleteVersion"
        },

        deleteVersion: function deleteVersion(event) {
            var _this = this;

            event.preventDefault();

            _.remove(this.model.terms.versions, function (n) {
                return n.version === _this.data.version;
            });

            ConfigDelegate.updateEntity("selfservice.terms", this.model.terms).then(function () {
                EventManager.sendEvent(Constants.EVENT_CHANGE_VIEW, { route: Router.configuration.routes.termsAndConditions });
            });
        },

        makeActive: function makeActive() {
            var _this2 = this;

            this.model.terms.active = this.data.version;
            ConfigDelegate.updateEntity("selfservice.terms", this.model.terms).then(function () {
                _this2.data.active = true;
                _this2.parentRender();
            });
        },

        render: function render(args, callback) {
            var _this3 = this;

            this.model = {};
            this.data.version = _.first(args);

            ConfigDelegate.readEntityAlways("selfservice.terms").then(function (terms) {
                var translation = "";

                _this3.model.terms = terms;
                _this3.data.active = _this3.data.version === terms.active;
                _this3.data.versionConfig = _.find(terms.versions, function (n) {
                    return n.version === _this3.data.version;
                });

                _this3.data.translations = _.keys(_this3.data.versionConfig.termsTranslations).map(function (k) {
                    translation = _this3.data.versionConfig.termsTranslations[k];

                    return { locale: k, value: translation };
                });
                _this3.parentRender(function () {

                    if (callback) {
                        callback();
                    }
                });
            });
        }
    });

    return new VersionView();
});
