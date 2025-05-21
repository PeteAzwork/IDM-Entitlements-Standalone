/*
 * Copyright 2018 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/** Sets the initial query params. */
var params = {
    '_queryFilter': 'true',
    '_pageSize': 1000
};

do {
    var relationships = openidm.query('repo/relationships', params);
    /** update the cookie with the new one from the query. */
    params._pagedResultsCookie = relationships.pagedResultsCookie;
    relationships.result.forEach(function(r) {
        if ("firstResourceCollection" in r) {
            // skip processing, already transformed
        } else {
            // transform repo relationship
            openidm.update("repo/relationships/" + r._id, r._rev, {
                "_id": r._id,
                "_rev": r._rev,
                "firstResourceId": org.forgerock.json.resource.ResourcePath.valueOf(r.firstId).leaf(),
                "firstResourceCollection": org.forgerock.json.resource.ResourcePath.valueOf(r.firstId).parent().toString(),
                "firstPropertyName": r.firstPropertyName,
                "secondResourceId": org.forgerock.json.resource.ResourcePath.valueOf(r.secondId).leaf(),
                "secondResourceCollection": org.forgerock.json.resource.ResourcePath.valueOf(r.secondId).parent().toString(),
                "secondPropertyName": r.secondPropertyName,
                "properties": r.properties
            });
        }

    });
} while (params._pagedResultsCookie !== null);
