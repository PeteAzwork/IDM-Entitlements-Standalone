/*
 * Copyright 2015-2018 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

var refResourceContainer = mappingConfig.source,
    refResourceId = sourceId,
    historicalAccountsCollection = mappingConfig.target + "/" + targetId + "/historicalAccounts",
    query = {
            "_queryFilter": "/_refResourceCollection eq " + "'" + refResourceContainer + "'" + " and /_refResourceId eq " + "'" + refResourceId + "'"
    },
    disabled = source.disabled,
    newState, account, result, queryResult;

//Query the historical account collection on this user to find the relationship specific to this account
queryResult = openidm.query(historicalAccountsCollection, query).result;

//Check if a result was found
if (typeof queryResult !== 'undefined' && queryResult !== null) {
    account = queryResult[0];
    if (typeof account !== 'undefined' && account !== null) {
        // A result was found, check if the state has changed;
        newState = disabled ? "disabled" : "enabled";
        if (newState !== account._refProperties.state) {
            // State has changed
            logger.debug("Setting historical account state to " + newState);
            account._refProperties.state = newState;
            account._refProperties.stateLastChanged = (new Date()).toString();

            logger.debug("Updating historical account relationship for " + refResourceContainer + "/" + refResourceId + " on managed user " + sourceId);
            // Update the relationship object
            result = openidm.update(historicalAccountsCollection + "/" + account._refProperties._id,
                    account._refProperties._rev, account);
        }
    } else {
        logger.debug("account is undefined");
    }
} else {
    logger.debug("queryResult is undefined");
}
