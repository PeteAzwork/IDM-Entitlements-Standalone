/*
 * Copyright 2015-2018 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/**
 * When a managed/user is linked to a target resource, this adds a relationship to the managed/user's historicalAccounts
 * field which also includes the linked date property and will set the historical account as being active.
 *
 * The newly added relationship is of the form:
 *
 * {
 *     "_id": "2fe2f801-fbde-4c61-9b30-485e67ad08cc",
 *     "_rev": "000000002ec6cd4f",
 *     "_ref": "system/ldap/account/0fa26f3f-55c1-4e0f-993b-dec7b9bc26d3",
 *     "_refResourceCollection": "system/ldap/account",
 *     "_refResourceId": "0fa26f3f-55c1-4e0f-993b-dec7b9bc26d3",
 *     "_refProperties": {
 *       "active": true,
 *       "stateLastChanged": "Mon Feb 26 2018 12:09:46 GMT+0200 (SAST)",
 *       "state": "enabled",
 *       "linkDate": "Mon Feb 26 2018 12:09:46 GMT+0200 (SAST)",
 *       "_id": "2fe2f801-fbde-4c61-9b30-485e67ad08cc",
 *       "_rev": "000000002ec6cd4f"
 *     }
 * }
 */

var targetRef = mappingConfig.target + "/" + target._id,
    sourcePath = mappingConfig.source + "/" + source._id,
    state = target.disabled ? "disabled" : "enabled",
    historicalAccount = {
		"_ref" : targetRef,
        "_refProperties" : {
        	"active" : true,
        	"linkDate" : (new Date()).toString(),
            "state" : state,
            "stateLastChanged" : (new Date()).toString()
        }
    },
    result;

logger.debug("Adding historical account " + targetRef + " to managed user " + source._id);

result = openidm.create(sourcePath + "/historicalAccounts", null, historicalAccount);

logger.debug("Created historical account: " + result);
