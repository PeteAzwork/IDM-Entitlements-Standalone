/*
 * Copyright 2014-2018 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/**
 * Prevents roles from being deleted that are currently assigned to users.
 * The expectation is that the 'object' value is the role fully loaded with all member relationship edges.
 */
if (object && object.members && object.members.length > 0) {
    throw {
        "code" : 409,
        "message" : "Cannot delete a role that is currently granted"
    };
}
