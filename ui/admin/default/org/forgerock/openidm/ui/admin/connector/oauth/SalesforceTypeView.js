"use strict";

/*
 * Copyright 2014-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/connector/oauth/AbstractOAuthView", "org/forgerock/openidm/ui/admin/delegates/ExternalAccessDelegate", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate", "org/forgerock/commons/ui/common/main/ValidatorsManager"], function ($, _, AbstractOAuthView, ExternalAccessDelegate, router, ConfigDelegate, eventManager, constants, ConnectorDelegate, ValidatorsManager) {

    var SalesforceTypeView = AbstractOAuthView.extend({
        events: {
            "change .url-radio": "changeUrl",
            "change .grantType-radio": "changeGrantType",
            "click .add-btn": "addField",
            "click .remove-btn": "removeField"
        },
        data: {
            "callbackURL": window.location.protocol + "//" + window.location.host + (window.location.pathname.indexOf("index.html") > -1 ? window.location.pathname.replace("index.html", "oauth.html") : window.location.pathname + "oauth.html"),
            "urlTypes": [{
                "name": "Production",
                "value": "https://login.salesforce.com/services/oauth2/token",
                "id": "productionRadio",
                "readonly": true,
                "selected": false
            }, {
                "name": "Sandbox",
                "value": "https://test.salesforce.com/services/oauth2/token",
                "id": "sandboxRadio",
                "readonly": true,
                "selected": false
            }, {
                "name": "Custom",
                "value": "https://[custom domain name]/services/oauth2/token",
                "id": "customRadio",
                "readonly": false,
                "selected": false
            }],
            "grantTypes": [{
                "name": "Refresh Token",
                "value": "refresh_token",
                "id": "grantTypeRefreshToken",
                "selected": false
            }, {
                "name": "Client Credentials",
                "value": "client_credentials",
                "id": "grantTypeClientCredentials",
                "selected": false
            }]
        },
        getScopes: function getScopes() {
            var salesforceScope = "id%20api%20refresh_token";

            return salesforceScope;
        },

        getAuthUrl: function getAuthUrl() {
            var url = this.$el.find("#OAuthurl").val().replace("/token", "/authorize");

            return url;
        },

        getToken: function getToken(mergedResult, oAuthCode) {
            return ExternalAccessDelegate.getToken(mergedResult.configurationProperties.clientId, oAuthCode, window.location.protocol + "//" + window.location.host + (window.location.pathname.indexOf("index.html") > -1 ? window.location.pathname.replace("index.html", "oauth.html") : window.location.pathname + "oauth.html"), mergedResult.configurationProperties.loginUrl, mergedResult._id.replace("/", "_"));
        },

        setToken: function setToken(refeshDetails, connectorDetails, connectorLocation) {
            if (refeshDetails.refresh_token !== undefined) {
                connectorDetails.configurationProperties.refreshToken = refeshDetails.refresh_token;
                connectorDetails.enabled = true;
            } else {
                connectorDetails.configurationProperties.refreshToken = null;
                connectorDetails.enabled = false;
            }

            connectorDetails.configurationProperties.instanceUrl = refeshDetails.instance_url;

            if (connectorDetails.configurationProperties.instanceUrl) {
                ConnectorDelegate.testConnector(connectorDetails).then(_.bind(function (testResult) {
                    connectorDetails.objectTypes = testResult.objectTypes;

                    ConfigDelegate.updateEntity(connectorLocation, connectorDetails).then(_.bind(function () {
                        _.delay(function () {
                            eventManager.sendEvent(constants.EVENT_CHANGE_VIEW, { route: router.configuration.routes.connectorListView });
                        }, 1500);
                    }, this));
                }, this));
            } else {
                eventManager.sendEvent(constants.EVENT_CHANGE_VIEW, { route: router.configuration.routes.connectorListView });
            }
        },

        cleanResult: function cleanResult(mergedResult) {
            delete mergedResult.urlRadio;

            return mergedResult;
        },

        connectorSpecificChanges: function connectorSpecificChanges(connectorDetails) {
            this.data.urlTypes.forEach(function (entry) {
                return entry.selected = false;
            });
            this.data.grantTypes.forEach(function (entry) {
                return entry.selected = false;
            });

            if (this.data.urlTypes[0].value === connectorDetails.configurationProperties.loginUrl) {
                this.data.urlTypes[0].selected = true;
            } else if (this.data.urlTypes[1].value === connectorDetails.configurationProperties.loginUrl) {
                this.data.urlTypes[1].selected = true;
            } else {
                this.data.urlTypes[2].selected = true;
            }

            if (this.data.grantTypes[0].value === connectorDetails.configurationProperties.grantType) {
                this.data.grantTypes[0].selected = true;
            } else {
                this.data.grantTypes[1].selected = true;
            }
        },

        connectorSpecificValidation: function connectorSpecificValidation() {
            if (this.data.connectorDefaults.configurationProperties.loginUrl && this.data.connectorDefaults.configurationProperties.loginUrl === this.$el.find("#OAuthurl").val()) {
                return false;
            } else {
                return true;
            }
        },

        changeGrantType: function changeGrantType(event) {
            var id = $(event.target).prop("id");
            if (id === "grantTypeRefreshToken") {
                $("#instanceUrlHolder").removeClass("in");
                this.swapGrantTypes();
            } else {
                $("#instanceUrlHolder").addClass("in");
                this.swapGrantTypes();
            }
        },

        swapGrantTypes: function swapGrantTypes() {
            this.data.grantTypes[0].selected = !this.data.grantTypes[0].selected;
            this.data.grantTypes[1].selected = !this.data.grantTypes[1].selected;
        },

        changeUrl: function changeUrl(event) {
            var radio = event.target,
                id = $(event.target).prop("id");

            if (id === "productionRadio" || id === "sandboxRadio") {
                $("#OAuthurl").prop('readonly', true);
            } else {
                $("#OAuthurl").prop('readonly', false);
            }

            $("#OAuthurl").val($(radio).val());
        },
        addField: function addField(event) {
            event.preventDefault();

            var clickedEle = event.target,
                field_type,
                field;

            if ($(clickedEle).not("button")) {
                clickedEle = $(clickedEle).closest("button");
            }

            field_type = $(clickedEle).attr('field_type');
            field = $(clickedEle).parent().next().clone();
            field.find('input[type=text]').val('');

            $('#' + field_type + 'Wrapper').append(field);
            $('#' + field_type + 'Wrapper').find('.input-group-addon').show();

            ValidatorsManager.bindValidators(this.$el.find('#' + field_type + 'Wrapper'));

            $(field).find("input").trigger("validate");
        },

        removeField: function removeField(event) {
            event.preventDefault();

            var clickedEle = event.target,
                field_type;

            if ($(clickedEle).not("button")) {
                clickedEle = $(clickedEle).closest("button");
            }

            field_type = $(clickedEle).attr('field_type');

            if ($('#' + field_type + 'Wrapper').find('.field').size() > 1) {
                $(clickedEle).parents(".form-group").remove();
            }

            if ($('#' + field_type + 'Wrapper').find('.field').size() === 1) {
                $('#' + field_type + 'Wrapper').find('.input-group-addon').hide();
            }

            ValidatorsManager.bindValidators(this.$el.find('#' + field_type + 'Wrapper'));
            $('#' + field_type + 'Wrapper').find(':text').trigger("validate");
        }
    });

    return new SalesforceTypeView();
});
