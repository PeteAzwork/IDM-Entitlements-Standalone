/*
 * Copyright 2016-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

(function () {
    if(request.method === "action") {
        var oAuthConfig,
            connectorLocation;

        if (request.action === "getAuthZCode") {
            connectorLocation = request.content.connectorLocation.replace("_", "/");

            oAuthConfig = openidm.read("config/" + connectorLocation);
            if (oAuthConfig) {
                let clientSecret = oAuthConfig.configurationProperties.clientSecret;

                if (typeof clientSecret === "object" && clientSecret !== null) {
                    request.content.body += "&client_secret=" + openidm.decrypt(clientSecret);
                } else if (typeof clientSecret === "string" && clientSecret.length) {
                    // Match ESVs and extract property name. Eg: &{my.environment.property}
                    let secretName = clientSecret.match(/^&{(.+)}/)[1];
                    request.content.body += "&client_secret=" + identityServer.getProperty(secretName);
                } else {
                    request.content.body += "&client_secret=" + clientSecret;
                }
            }
        }

        request.content["contentType"] = "application/x-www-form-urlencoded";

        return openidm.action("external/rest", "call", request.content);
    } else {
        throw {
            "code" : 400,
            "message" : "Bad request only support _action methods getAuthZCode"
        };
    }
}());
