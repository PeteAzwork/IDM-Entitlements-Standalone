/*
 * Copyright 2016-2018 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/**
    Implements an action request which will augment the currently-running user
    with a profile read from an identity provider.

    Expects one "additionalParameters" provided as part of the request:
        provider: the name of the identity provider which is being interacted with

    Expects one http header provided as part of the request:
        X-OpenIDM-DataStoreToken: the token used to identify the datastore maintaining the oauth client details

    Returns the modified user account
*/
(function () {
    var _ = require('lib/lodash'),
        idp,
        userIdp,
        token;

    if (!request.content) {
        throw {
            "code": 400
        };
    } else {
        token = { "token": request.content };
    }

    idp = openidm.action("identityProviders", "getProfile", token);

    userIdp = _.extend(idp.rawProfile, {
        user: {
            _ref: context.security.authorization.component + "/" + context.security.authorization.id
        },
        _meta: {
            subject: idp.subject,
            scope: idp.scope,
            dateCollected: idp.dateCollected
        }
    });

    return openidm.create(
        "managed/" + request.additionalParameters.provider,
        idp.subject,
        userIdp
    );

}());