/*
 * Copyright 2015-2017 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/**
 * Sets any additional password fields to the value of the main "password" fields if they have not already been set.
 * Additional password fields are declared using the "additionalPasswordFields" global array in the script config.
 */

/*global object */
var additionalPasswordFields,
    object = request.content;

// Set additional password fields using the value of the main password
// Don't set the field if it is already defined
if (additionalPasswordFields !== undefined && object.password !== undefined) {
    for (var key in additionalPasswordFields) {
        var field = additionalPasswordFields[key];
        // Check if the field is not already defined
        if (!object.hasOwnProperty(field)) {
            // Inherit the value
            object[field] = object.password;
        }
    }
}
