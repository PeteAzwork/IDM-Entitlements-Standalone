"use strict";

/*
 * Copyright 2014-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate"], function (Constants, AbstractDelegate) {

    var obj = new AbstractDelegate(Constants.host + Constants.context + "/endpoint/oauthproxy");

    obj.getToken = function (id, authCode, redirectUri, tokenUrl, connectorLocation) {
        var googleDetails = "grant_type=authorization_code&code=" + authCode + "&client_id=" + id + "&redirect_uri=" + redirectUri,
            restDetails = {
            "url": tokenUrl,
            "method": "POST",
            "body": googleDetails,
            "contentType": "application/x-www-form-urlencoded",
            "connectorLocation": connectorLocation
        };

        return obj.serviceCall({
            url: "?_action=getAuthZCode",
            type: "POST",
            data: JSON.stringify(restDetails)
        });
    };

    /**
     * Uses the external/rest endpoint to make outbound rest calls to arbitrary services
     * @param {string} url the full url to request
     * @param {string} method http verb; one of POST/GET/PUT/etc...
     * @param {string} body raw content to include with the request
     * @param {Object} headers map of headerName : headerValue
     */
    obj.externalRestRequest = function (url, method, body, headers) {
        method = method || "GET";
        return obj.serviceCall({
            serviceUrl: Constants.host + Constants.context + "/external/rest",
            url: "?_action=call",
            type: "POST",
            data: JSON.stringify({
                url: url,
                method: method,
                body: body,
                headers: headers
            }),
            errorsHandlers: {
                "badURL": {
                    status: "404"
                },
                "badRequest": {
                    status: "400"
                },
                "badGateway": {
                    status: "502"
                }
            }
        });
    };

    return obj;
});
