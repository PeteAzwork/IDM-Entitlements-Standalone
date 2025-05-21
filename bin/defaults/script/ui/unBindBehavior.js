/*
 * Copyright 2016-2017 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

 var _ = require('lib/lodash'),
     idpsPath = "managed/user/" + object._id + "/idps",
     userIdps = openidm.query(idpsPath, { '_queryFilter' : 'true' }),
     idp = false;

     if  (userIdps.result.length) {
         idp = _.find(userIdps.result, function(idp){ return idp._ref.indexOf("managed/" + request.additionalParameters.provider) === 0; });
     }

if (idp) {
    var user = openidm.read(resourcePath),
        enabledCount = 0,
        disableProvider = function() {
            //delete the data from provider
            openidm.delete(idp._ref,null);
        };

    if (!user.password) {
        if (userIdps.result.length > 1) {
            disableProvider();
        } else {
            throw {
                "code" : 400,
                "message" : "config.messages.socialProviders.cannotUnbind"
            };
        }
    } else {
        disableProvider();
    }
}
