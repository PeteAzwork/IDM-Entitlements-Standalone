"use strict";

/*
 * Copyright 2014-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/* eslint no-eval: 0 */

define(["jquery", "underscore", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractDelegate", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate"], function ($, _, Constants, AbstractDelegate, configuration, eventManager, configDelegate) {

    var obj = new AbstractDelegate(Constants.host + Constants.context + "/sync");

    obj.performAction = function (reconId, mapping, action, sourceId, targetId, linkType) {
        var params = {
            _action: "performAction",
            reconId: reconId,
            mapping: mapping,
            action: action
        };

        if (sourceId) {
            params.sourceId = sourceId;
        } else {
            params.target = true;
        }

        if (linkType) {
            params.linkType = linkType;
        }

        if (targetId) {
            params.targetId = targetId;
        }

        if (!sourceId && !targetId) {
            return $.Deferred().resolve();
        }

        return obj.serviceCall({
            url: "?" + $.param(params),
            type: "POST"
        });
    };

    obj.deleteLinks = function (linkType, id, ordinal) {
        // ordinal is either firstId or secondId
        if (!_.includes(["firstId", "secondId"], ordinal)) {
            throw "Unexpected value passed to deleteLinks: " + ordinal;
        }
        if (!id) {
            return $.Deferred().resolve();
        } else {

            return obj.serviceCall({
                "serviceUrl": Constants.host + Constants.context + "/repo/link",
                "url": "?_queryId=links-for-" + ordinal + "&linkType=" + linkType + "&" + ordinal + "=" + encodeURIComponent(id)
            }).then(function (qry) {
                var i,
                    deletePromises = [];
                for (i = 0; i < qry.result.length; i++) {
                    deletePromises.push(obj.serviceCall({
                        "serviceUrl": Constants.host + Constants.context + "/repo/link/",
                        "url": qry.result[i]._id,
                        "type": "DELETE",
                        "headers": {
                            "If-Match": qry.result[i]._rev
                        }
                    }));
                }

                return $.when.apply($, deletePromises);
            });
        }
    };

    obj.mappingDetails = function (mapping) {
        var promise = $.Deferred(),
            url = "",
            serviceUrl = Constants.context + "/endpoint/mappingDetails",
            doServiceCall = function doServiceCall() {
            return obj.serviceCall({
                "type": "GET",
                "serviceUrl": serviceUrl,
                "url": url,
                "errorsHandlers": {
                    "missing": {
                        status: 404
                    }
                }
            }).done(function (mappingDetails) {
                promise.resolve(mappingDetails);
            });
        };

        if (mapping) {
            url = "?mapping=" + mapping;
        }

        doServiceCall().fail(function (xhr) {
            if (xhr.status === 404) {
                configDelegate.createEntity("endpoint/mappingDetails", {
                    "context": "endpoint/mappingDetails",
                    "type": "text/javascript",
                    "file": "mappingDetails.js"
                }).then(function () {
                    _.delay(doServiceCall, 2000);
                });
            }
        });

        return promise;
    };

    return obj;
});
