/*
 * Copyright 2018 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/**
 * When a managed/user object is deleted, if that managed/user object contains
 * any idp data in their idps property, they will need to be removed so they do
 * not become orphaned objects in the repo.
 */
(function () {
    exports.removeConnectedIdpData = function (oldObject, resourceName) {
        if (resourceName.startsWith("managed/user")) {
            // delete idpData related to this user
            try {
                (oldObject.idps || []).forEach(function (relationship) {
                    openidm.delete(relationship._ref, null);
                });
            } catch (e) {
                // no problem, simply unable to find an /idps endpoint
            }
        }
    };
}());
