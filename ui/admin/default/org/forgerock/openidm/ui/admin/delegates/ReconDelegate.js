"use strict";

/*
 * Copyright 2011-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate", "org/forgerock/commons/ui/common/main/SpinnerManager", "org/forgerock/commons/ui/common/main/Router"], function ($, _, Constants, AbstractDelegate, spinner, router) {

    var obj = new AbstractDelegate(Constants.host + Constants.context + "/recon");

    obj.waitForAll = function (reconIds, suppressSpinner, progressCallback, delayTime) {
        var resultPromise = $.Deferred(),
            completedRecons = [],
            _checkCompleted,
            startView = router.currentRoute.view;

        if (!delayTime) {
            delayTime = 1000;
        }

        _checkCompleted = function checkCompleted() {
            /**
            * Check to make sure we are still on the same page we were when this process
            * started. If not then cancel the process so ajax requests
            * will not continue to fire in the background.
            */
            if (router.currentRoute.view === startView) {
                obj.serviceCall({
                    "type": "GET",
                    "url": "/" + reconIds[completedRecons.length],
                    "suppressSpinner": suppressSpinner,
                    "errorsHandlers": {
                        "Not found": {
                            status: 404
                        }
                    }
                }).then(function (reconStatus) {

                    if (progressCallback) {
                        progressCallback(reconStatus);
                    }

                    if (reconStatus.ended.length !== 0) {
                        completedRecons.push(reconStatus);
                        if (completedRecons.length === reconIds.length) {
                            resultPromise.resolve(completedRecons);
                        } else {
                            _.delay(_checkCompleted, delayTime);
                        }
                    } else {
                        if (!suppressSpinner) {
                            spinner.showSpinner();
                        }
                        _.delay(_checkCompleted, delayTime);
                    }
                }, function () {
                    // something went wrong with the read on /recon/_id, perhaps this recon was interrupted during a restart of the server?

                    completedRecons.push({
                        "reconId": reconIds[completedRecons.length],
                        "status": "failed"
                    });

                    if (completedRecons.length === reconIds.length) {
                        resultPromise.resolve(completedRecons);
                    } else {
                        _.delay(_checkCompleted, delayTime);
                    }
                });
            } else {
                resultPromise.reject();
            }
        };

        if (!suppressSpinner) {
            spinner.showSpinner();
        }
        _.delay(_checkCompleted, 100);

        return resultPromise;
    };

    obj.triggerRecons = function (mappings, suppressSpinner) {
        var reconPromises = [];

        _.forEach(mappings, function (m) {
            reconPromises.push(obj.triggerRecon(m, suppressSpinner));
        });

        return $.when.apply($, reconPromises);
    };

    obj.triggerRecon = function (mapping, suppressSpinner, progressCallback, delayTime, persistAssociations) {
        var persistAssociationsParameter = persistAssociations ? "&persistAssociations=true" : "";

        return obj.serviceCall({
            "suppressSpinner": suppressSpinner,
            "url": "?_action=recon&mapping=" + mapping + persistAssociationsParameter,
            "type": "POST"
        }).then(function (reconId) {
            return obj.waitForAll([reconId._id], suppressSpinner, progressCallback, delayTime).then(function (reconArray) {
                return reconArray[0];
            });
        });
    };

    obj.triggerReconById = function (mapping, recordId, ammendId, suppressSpinner) {
        return obj.serviceCall({
            "suppressSpinner": suppressSpinner,
            "url": "?_action=reconById&amendReconAssociation=" + ammendId + "&mapping=" + mapping + "&ids=" + recordId,
            "type": "POST"
        }).then(function (reconId) {
            return obj.waitForAll([reconId._id], suppressSpinner);
        });
    };

    obj.stopRecon = function (id, suppressSpinner) {
        return obj.serviceCall({
            "suppressSpinner": suppressSpinner,
            "serviceUrl": Constants.context + "/recon/" + id,
            "url": "?_action=cancel",
            "type": "POST"
        });
    };

    obj.getRecon = function (id, suppressSpinner) {
        return obj.serviceCall({
            "suppressSpinner": suppressSpinner,
            "serviceUrl": Constants.context + "/recon/" + id,
            "type": "GET"
        });
    };
    /**
     * Important notes around recon association:
     *
     * 1) Recon association will only work if a recon has persistAssociations=true set
     * 2) Recon by ID will not generate a recon association, but it can amend a recon association if you set amendReconAssociation=true and a reconId to the reconById call
     * 3) Recon association entry call allows for three query filters one at the base level and one for both source and target filters _queryFilter, sourceQueryFilter and targetQueryFilter
     * 4) Historical storing of recon association is configurable and out of the box only defaults to the most recent recon result
     */
    obj.getReconAssoc = function (reconId) {
        var filter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

        return obj.serviceCall({
            "type": "GET",
            "serviceUrl": Constants.context + ("/recon/assoc/" + reconId + "/entry?_queryFilter=" + filter)
        });
    };

    obj.getReconAssocDetails = function (reconId) {
        var filter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
        var sourceFilter = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
        var targetFilter = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

        return obj.serviceCall({
            "type": "GET",
            "serviceUrl": Constants.context + ("/recon/assoc/" + reconId + "/entry?_queryFilter=" + filter + "&sourceQueryFilter=" + sourceFilter + "&targetQueryFilter=" + targetFilter)
        });
    };

    obj.getReconAssocDetailsNoSourceTarget = function (reconId) {
        var filter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

        return obj.serviceCall({
            "type": "GET",
            "serviceUrl": Constants.context + ("/recon/assoc/" + reconId + "/entry?_queryFilter=" + filter + "&queryMissingSide=true")
        });
    };

    obj.getReconAssocList = function (reconId) {
        var filter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

        return obj.serviceCall({
            "type": "GET",
            "serviceUrl": Constants.context + ("/recon/assoc?_queryFilter=" + filter)
        });
    };

    return obj;
});
