"use strict";

/*
 * Copyright 2011-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/commons/ui/common/main/AbstractDelegate", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/openidm/ui/common/delegates/SiteConfigurationDelegate", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/components/Navigation"], function ($, _, AbstractDelegate, conf, commonSiteConfigurationDelegate, ConfigDelegate, eventManager, Constants, Navigation) {

    var SiteConfigurationDelegate = function SiteConfigurationDelegate(url) {
        AbstractDelegate.call(this, url);
        return this;
    },
        currentSelfServiceStates = {};

    SiteConfigurationDelegate.prototype = Object.create(commonSiteConfigurationDelegate);

    SiteConfigurationDelegate.prototype.getConfiguration = function (successCallback) {
        return commonSiteConfigurationDelegate.getConfiguration.call(this).then(function (config) {
            // In the admin context, these are always false.
            config.passwordReset = false;
            config.selfRegistration = false;
            config.forgotUsername = false;
            successCallback(config);
        });
    };

    SiteConfigurationDelegate.prototype.updateConfiguration = function (callback) {
        this.getConfiguration(function (result) {
            conf.globalData = result;

            if (callback) {
                callback();
            }
        });
    };

    SiteConfigurationDelegate.prototype.checkForDifferences = function () {
        var promise = $.Deferred();

        if (conf.loggedUser) {

            ConfigDelegate.readEntity("ui/configuration").then(function (uiConfig) {

                if (_.includes(conf.loggedUser.uiroles, "ui-admin") && Navigation.configuration.links && Navigation.configuration.links.admin && Navigation.configuration.links.admin.urls && Navigation.configuration.links.admin.urls.managed && Navigation.configuration.links.admin.urls.managed.urls && Navigation.configuration.links.admin.urls.managed.urls.length === 0 || !_.isEqual(currentSelfServiceStates, _.pick(uiConfig.configuration, ["passwordReset", "selfRegistration", "forgotUsername"]))) {
                    currentSelfServiceStates = _.pick(uiConfig.configuration, ["passwordReset", "selfRegistration", "forgotUsername"]);

                    eventManager.sendEvent(Constants.EVENT_UPDATE_NAVIGATION, {
                        callback: function callback() {
                            promise.resolve();
                        }
                    });
                } else {
                    promise.resolve();
                }
            });
        } else {
            promise.resolve();
        }

        return promise;
    };

    return new SiteConfigurationDelegate(Constants.host + Constants.context + "/config/ui/configuration");
});
