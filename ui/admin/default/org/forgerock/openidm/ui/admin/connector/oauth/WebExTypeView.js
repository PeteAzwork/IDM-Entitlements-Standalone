"use strict";

/*
 * Copyright 2024 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/connector/oauth/AbstractOAuthView", "org/forgerock/openidm/ui/admin/delegates/ExternalAccessDelegate", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate"], function ($, _, AbstractOAuthView, ExternalAccessDelegate, router, ConfigDelegate, eventManager, constants, ConnectorDelegate) {

    var WebExTypeView = AbstractOAuthView.extend({
        data: {
            "callbackURL": window.location.protocol + "//" + window.location.host + (window.location.pathname.indexOf("index.html") > -1 ? window.location.pathname.replace("index.html", "oauth.html") : window.location.pathname + "oauth.html")
        },
        getScopes: function getScopes() {
            var webexScope = "spark-admin%3Apeople_write%20" + "spark-admin%3Apeople_read%20" + "spark-admin%3Alicenses_read%20" + "spark-admin%3Aroles_read%20" + "identity%3Agroups_rw%20" + "identity%3Agroups_read%20";
            return webexScope;
        },

        getAuthUrl: function getAuthUrl() {
            return $("#OAuthurl").val();
        },

        getToken: function getToken(mergedResult, oAuthCode) {

            return ExternalAccessDelegate.getToken(mergedResult.configurationProperties.clientId, oAuthCode, window.location.protocol + "//" + window.location.host + (window.location.pathname.indexOf("index.html") > -1 ? window.location.pathname.replace("index.html", "oauth.html") : window.location.pathname + "oauth.html"), mergedResult.configurationProperties.tokenEndpoint, mergedResult._id.replace("/", "_"));
        },

        setToken: function setToken(refeshDetails, connectorDetails, connectorLocation) {
            connectorDetails.configurationProperties.refreshToken = refeshDetails.refresh_token;

            ConnectorDelegate.testConnector(connectorDetails).then(_.bind(function (testResult) {
                connectorDetails.objectTypes = testResult.objectTypes;
                connectorDetails.enabled = true;

                ConfigDelegate.updateEntity(connectorLocation, connectorDetails).then(_.bind(function () {
                    _.delay(function () {
                        eventManager.sendEvent(constants.EVENT_CHANGE_VIEW, { route: router.configuration.routes.connectorListView });
                    }, 1500);
                }, this));
            }, this));
        }
    });

    return new WebExTypeView();
});
