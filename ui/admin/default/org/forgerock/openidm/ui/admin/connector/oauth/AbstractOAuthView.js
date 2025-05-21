"use strict";

/*
 * Copyright 2014-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["underscore", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate"], function (_, AbstractView, validatorsManager, ConfigDelegate) {
    var AbstractOAuthView = AbstractView.extend({
        element: "#connectorDetails",
        noBaseTemplate: true,
        oAuthConnector: true,

        buildReturnUrl: function buildReturnUrl(id, name) {
            var urlBack = window.location.protocol + "//" + window.location.host + (window.location.pathname.indexOf("index.html") > -1 ? window.location.pathname.replace("index.html", "oauth.html") : window.location.pathname + "oauth.html"),
                builtUrl = this.getAuthUrl() + "?scope=" + this.getScopes() + "&state=" + this.data.systemType + "_" + name + "&redirect_uri=" + urlBack + "&response_type=code" + "&client_id=" + id + "&approval_prompt=force" + "&access_type=offline" + "&token_uri=" + this.$el.find("#OAuthTokenUrl").val();

            return builtUrl;
        },

        submitOAuth: function submitOAuth(mergedResult, editConnector, connectorId) {
            var name = connectorId,
                id,
                url;

            mergedResult = this.cleanSpacing(mergedResult);

            id = mergedResult.configurationProperties.clientId;
            url = this.buildReturnUrl(id, name);

            if (this.cleanResult) {
                mergedResult = this.cleanResult(mergedResult);
            }

            ConfigDelegate[editConnector ? "updateEntity" : "createEntity"](this.data.systemType + "/" + name, mergedResult).then(_.bind(function () {
                _.delay(function () {
                    window.location = url;
                }, 1500);
            }, this));
        },

        render: function render(args, callback) {
            this.template = "templates/admin/connector/oauth/" + args.connectorType + ".html";

            this.data.connectorDefaults = args.connectorDefaults;
            this.data.editState = args.editState;
            this.data.systemType = args.systemType;

            if (this.connectorSpecificChanges) {
                this.connectorSpecificChanges(this.data.connectorDefaults);
            }

            this.parentRender(_.bind(function () {

                validatorsManager.bindValidators(this.$el);

                if (callback) {
                    callback();
                }
            }, this));
        },
        //This function returns false for all OAuth
        //For now all OAuth will not function with a generic JSON Editor
        //This may change in the future, but to prevent any issues with Google and Salesforce
        //This check is needed to match the existing functionality in other connectors
        getGenericState: function getGenericState() {
            return false;
        },

        cleanSpacing: function cleanSpacing(mergedResult) {
            if (mergedResult.configurationProperties.clientId) {
                mergedResult.configurationProperties.clientId = mergedResult.configurationProperties.clientId.trim();
            }

            if (mergedResult.configurationProperties.clientSecret && _.isString(mergedResult.configurationProperties.clientSecret)) {
                mergedResult.configurationProperties.clientSecret = mergedResult.configurationProperties.clientSecret.trim();
            }

            return mergedResult;
        }
    });

    return AbstractOAuthView;
});
