/*
 * Copyright 2014-2017 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/*global exports, openidm, require */

/*
    This takes a resourceName and looks for all of the records that are linked to it,
    returning them as a list included within the data for the provided object.

    The returned object will have a new property named "linkedTo". This will be a list
    of all resources which link to the main object. Each item in the list will look like so:

    {
        "resourceName": "system/abc/id",
        "linkType": "systemAbc_managedUser",
        "mappings": [
            {
                "name": "systemAbc_managedUser",
                "type": "source"
            },
            {
                "name": "managedUser_systemAbc",
                "type": "target"
            }
        ],
        "content": {...}
    }

    There should only ever either be one or two mapping entries.
 */

exports.fetch = function (resourceName) {

    var _ = require('lib/lodash'),
        getException = function (e) {
            if (_.has(e, "javaException") && _.has(e.javaException, "cause") && e.javaException.cause !== null) {
                return e.javaException.cause.localizedMessage || e.javaException.cause.message;
            } else if (_.has(e, "messageDetail") && _.has(e.messageDetail, "message")) {
                return e.messageDetail.message;
            } else if (_.has(e, "message")) {
                return e.message;
            } else {
                return e;
            }
        },
        linkedResources = {};

    // read the resource; if the read throws an exception, let the backend handle it
    var currentResource = openidm.read(resourceName);
    if (currentResource === null) {
        return currentResource;
    }

    try {
        // read the linked resources
        linkedResources = openidm.action("sync", "getLinkedResources", {}, { "resourceName" : resourceName });
    } catch (e) {
        currentResource["error"] = getException(e);
    }

    // augment the resource with the resources that link to the main object
    return _.extend(currentResource, {
        "linkedTo": linkedResources
    });
};
