/*
 * Copyright 2018 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

(function () {
/** Sets the initial query params. */
var _ = require('lib/lodash'),
    pagedResultsCookie = null,
    params = {
        '_queryFilter': 'true',
        '_pageSize': 1000
    },
    REPO = "repo/";
    REPO_PATH = REPO + "internal/",
    summary = {"_id" : "", "result" : []},
    relationshipsUpdated = 0;

do {
    var relationships = openidm.query('repo/relationships', params);
    if (pagedResultsCookie != null) {
        params._pagedResultsCookie = pagedResultsCookie;
    }
    /** update the cookie with the new one from the query. */
    pagedResultsCookie = relationships.pagedResultsCookie;

    _.chain(relationships.result)
    .filter(function(o) {
        return o.firstResourceCollection.indexOf(REPO_PATH) === 0 ||
        o.secondResourceCollection.indexOf(REPO_PATH) === 0
    }).forEach(function(r) {
        var firstResourceCollection = r.firstResourceCollection;
        if( r.firstResourceCollection.indexOf(REPO_PATH) === 0)  {
            firstResourceCollection = r.firstResourceCollection.replace(REPO, "");
        }

        var secondResourceCollection = r.secondResourceCollection;
        if( r.secondResourceCollection.indexOf(REPO_PATH) === 0)  {
            secondResourceCollection = r.secondResourceCollection.replace(REPO, "")
        }

        /** update the collections that have repo/internal to internal/ **/
        openidm.update("repo/relationships/" + r._id, r._rev, {
          "_id": r._id,
          "_rev": r._rev,
          "firstResourceId": r.firstResourceId,
          "firstResourceCollection": firstResourceCollection,
          "firstPropertyName": r.firstPropertyName,
          "secondResourceId": r.secondResourceId,
          "secondResourceCollection": secondResourceCollection,
          "secondPropertyName": r.secondPropertyName,
          "properties": r.properties
        });

        relationshipsUpdated++;
    });
} while (pagedResultsCookie !== null);

    summary.result.push({
        "relationshipsUpdated" : relationshipsUpdated
    });

    return summary;
}());
