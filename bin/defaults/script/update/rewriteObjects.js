/*
 * Copyright 2020-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/**
 * Provided an array of object paths, this script will query the objects and immediately follow with an update for each
 * found object using the same content that the query returned.  This can be useful after modifying config such as new
 * searchable properties, encryption key rotation, etc.
 *
 * Example Execution:
 * curl --location --request POST 'http://localhost:8080/openidm/script/?_action=eval' \
 *  --header 'content-type: application/json' \
 *  --header 'x-openidm-password: openidm-admin' \
 *  --header 'x-openidm-username: openidm-admin' \
 *  --header 'X-OpenIDM-NoSession: true' \
 *  --data-raw '{
 *   "type":"text/javascript",
 *   "file":"bin/defaults/script/update/rewriteObjects.js",
 *   "globals" : {
 *       "rewriteConfig" :{
 *           "queryFilter": 'true',
 *           "pageSize": 1000,
 *           "objectPaths": [
 *               "repo/config",
 *               "repo/internal/usermeta",
 *               "repo/managed/role",
 *               "repo/managed/user",
 *               "repo/reconprogressstate",
 *               "repo/relationships",
 *               "repo/scheduler/triggers"
 *           ]
 *       }
 *   }
 * }'
 *
 */


(function () {

    if (!rewriteConfig || !rewriteConfig.objectPaths || rewriteConfig.objectPaths.length < 1) {
        return {"_id": "", "result": [{"error": "Invalid config; missing 'rewriteConfig/objectPaths' array."}]};
    }

    logger.info("Rewriting process has started for the following objectPaths: " + rewriteConfig.objectPaths);

    var _ = require('lib/lodash'),
        pagedResultsCookie = null,
        params = {
            '_queryFilter': rewriteConfig && rewriteConfig.queryFilter
                ? rewriteConfig.queryFilter
                : 'true',
            '_pageSize': rewriteConfig && rewriteConfig.pageSize && rewriteConfig.pageSize > 0
                ? rewriteConfig.pageSize
                : 1000
        },
        summary = {"_id": params, "result": []};


    for (objectPath of rewriteConfig.objectPaths) {
        var pageCount = 0;
        var objectsUpdated = 0;
        do {
            pageCount++;
            var objects = openidm.query(objectPath, params);
            if (pagedResultsCookie != null) {
                params._pagedResultsCookie = pagedResultsCookie;
                logger.debug(objectPath + ": working page " + pageCount + ", pagedResultsCookie=" + pagedResultsCookie);
            } else {
                logger.debug(objectPath + ": working last page : " + pageCount);
            }
            /** update the cookie with the new one from the query. */
            pagedResultsCookie = objects.pagedResultsCookie;

            for (objectToUpdate of objects.result) {
                objectsUpdated++;
                openidm.update(objectPath + "/" + objectToUpdate._id, objectToUpdate._rev, objectToUpdate);
            }
        } while (pagedResultsCookie !== null);

        logger.info(objectPath + ": objectsUpdated: " + objectsUpdated);
        summary.result.push({
            "objectPath": objectPath,
            "objectsUpdated": objectsUpdated
        })
    }

    return summary;
}());
