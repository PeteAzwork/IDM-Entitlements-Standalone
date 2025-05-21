"use strict";

/*
 * Copyright 2014-2022 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/connector/oauth/AbstractOAuthView", "org/forgerock/openidm/ui/admin/delegates/ExternalAccessDelegate", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate"], function ($, _, AbstractOAuthView, ExternalAccessDelegate, router, ConfigDelegate, eventManager, constants, ConnectorDelegate) {

    var GoogleTypeView = AbstractOAuthView.extend({
        getScopes: function getScopes() {
            var googleScope = "https://www.googleapis.com/auth/admin.directory.group%20" + "https://www.googleapis.com/auth/admin.directory.group.member%20" + "https://www.googleapis.com/auth/admin.directory.orgunit%20" + "https://www.googleapis.com/auth/admin.directory.user%20" + "https://www.googleapis.com/auth/admin.directory.user.alias%20" + "https://www.googleapis.com/auth/admin.directory.rolemanagement%20" + "https://www.googleapis.com/auth/apps.groups.settings%20" + "https://www.googleapis.com/auth/apps.licensing";

            return googleScope;
        },
        data: {
            "callbackURL": window.location.protocol + "//" + window.location.host + (window.location.pathname.indexOf("index.html") > -1 ? window.location.pathname.replace("index.html", "oauth.html") : window.location.pathname + "oauth.html")
        },
        getAuthUrl: function getAuthUrl() {
            return $("#OAuthurl").val();
        },

        getToken: function getToken(mergedResult, oAuthCode) {

            return ExternalAccessDelegate.getToken(mergedResult.configurationProperties.clientId, oAuthCode, window.location.protocol + "//" + window.location.host + (window.location.pathname.indexOf("index.html") > -1 ? window.location.pathname.replace("index.html", "oauth.html") : window.location.pathname + "oauth.html"), "https://accounts.google.com/o/oauth2/token", mergedResult._id.replace("/", "_"));
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

    return new GoogleTypeView();
});
