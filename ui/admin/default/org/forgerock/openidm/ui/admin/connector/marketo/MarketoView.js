"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/connector/ConnectorTypeAbstractView"], function ($, _, ConnectorTypeAbstractView) {

    var MarketoView = ConnectorTypeAbstractView.extend({
        connectorSaved: function connectorSaved(patchs, connectorDetails) {

            _.forEach(patchs, function (patch) {
                if (patch.field === "/configurationProperties/clientId" || patch.field === "/configurationProperties/clientSecret") {
                    patch.value = patch.value.trim();
                }
            });

            patchs.push({
                "operation": "replace",
                "field": "/configurationProperties/scriptRoots",
                "value": ["jar:file:connectors/marketo-connector-" + connectorDetails.connectorRef.bundleVersion + ".jar!/script/marketo/"]
            }, {
                "operation": "replace",
                "field": "/configurationProperties/createScriptFileName",
                "value": "CreateMarketo.groovy"
            }, {
                "operation": "replace",
                "field": "/configurationProperties/deleteScriptFileName",
                "value": "DeleteMarketo.groovy"
            }, {
                "operation": "replace",
                "field": "/configurationProperties/schemaScriptFileName",
                "value": "SchemaMarketo.groovy"
            }, {
                "operation": "replace",
                "field": "/configurationProperties/searchScriptFileName",
                "value": "SearchMarketo.groovy"
            }, {
                "operation": "replace",
                "field": "/configurationProperties/testScriptFileName",
                "value": "TestMarketo.groovy"
            }, {
                "operation": "replace",
                "field": "/configurationProperties/updateScriptFileName",
                "value": "UpdateMarketo.groovy"
            }, {
                "operation": "replace",
                "field": "/configurationProperties/reloadScriptOnExecution",
                "value": false
            });

            return patchs;
        },
        connectorCreate: function connectorCreate(details) {
            if (_.isNull(details.configurationProperties.scriptRoots)) {
                details.configurationProperties.scriptRoots = ["jar:file:connectors/marketo-connector-" + details.connectorRef.bundleVersion + ".jar!/script/marketo/"];
            }

            if (_.isNull(details.configurationProperties.clientSecret) && _.isObject(details.configurationProperties.clientSecret)) {
                details.configurationProperties.clientSecret = details.configurationProperties.clientSecret;
            }

            details.configurationProperties.clientId = details.configurationProperties.clientId.trim();
            details.configurationProperties.clientSecret = details.configurationProperties.clientSecret.trim();

            details.configurationProperties.createScriptFileName = "CreateMarketo.groovy";
            details.configurationProperties.deleteScriptFileName = "DeleteMarketo.groovy";
            details.configurationProperties.schemaScriptFileName = "SchemaMarketo.groovy";
            details.configurationProperties.searchScriptFileName = "SearchMarketo.groovy";
            details.configurationProperties.testScriptFileName = "TestMarketo.groovy";
            details.configurationProperties.updateScriptFileName = "UpdateMarketo.groovy";
            details.configurationProperties.reloadScriptOnExecution = false;

            return details;
        }
    });

    return new MarketoView();
});
