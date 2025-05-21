/*
 * Copyright 2015-2018 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/**
 * When a target is unlinked from a managed/user, this updates the historicalAccounts relationship on the managed/user
 * with the date of the unlink event and sets the "active" flag to false.
 *
 * The updated relationship is of the form:
 *
 * {
 *     "_id": "2fe2f801-fbde-4c61-9b30-485e67ad08cc",
 *     "_rev": "00000000f00cf26e",
 *     "_ref": "system/ldap/account/0fa26f3f-55c1-4e0f-993b-dec7b9bc26d3",
 *     "_refResourceCollection": "system/ldap/account",
 *     "_refResourceId": "0fa26f3f-55c1-4e0f-993b-dec7b9bc26d3",
 *     "_refProperties": {
 *       "active": false,
 *       "stateLastChanged": "Mon Feb 26 2018 12:22:22 GMT+0200 (SAST)",
 *       "state": "disabled",
 *       "linkDate": "Mon Feb 26 2018 12:09:46 GMT+0200 (SAST)",
 *       "unlinkDate": "Mon Feb 26 2018 12:29:35 GMT+0200 (SAST)",
 *       "_id": "2fe2f801-fbde-4c61-9b30-485e67ad08cc",
 *       "_rev": "00000000f00cf26e"
 *     }
 * }
 */

var refResourceContainer = mappingConfig.target,
    refResourceId = targetId,
    historicalAccountsCollection = mappingConfig.source + "/" + sourceId + "/historicalAccounts",
    query = {
        "_queryFilter": "/_refResourceCollection eq " + "'" + refResourceContainer + "'" + " and /_refResourceId eq " + "'" + refResourceId + "'"
    },
    id, rev, account, result, queryResult;

// Query the historical account collection on this user to find the relationship specific to this account
queryResult = openidm.query(historicalAccountsCollection, query).result;

// Check if a result was found
if (typeof queryResult !== 'undefined' && queryResult !== null) {
    account = queryResult[0];
    if (typeof account !== 'undefined' && account !== null) {
        // A result was found
        // Set "active" to false and add an "unlinkDate"
        account._refProperties.active = false;
        account._refProperties.unlinkDate = (new Date()).toString();

        id = account._refProperties._id;
        rev = account._refProperties._rev;
        logger.debug("Updating historical account relationship for " + refResourceContainer + "/" + refResourceId + " on managed user " + sourceId);
        // Update the relationship object
        result = openidm.update(historicalAccountsCollection + "/" + id, rev, account);
        logger.debug("Deactivated historical account: " + result);
    } else {
        logger.debug("account is undefined");
    }
} else {
    logger.debug("queryResult is undefined");
}
