/*
 * Copyright 2016-2017 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/**
 * This script will produce a boolean result based on whether or not the given source object has expressed
 * the preferences defined in the 'preferences' list variable.
 *
 * Example: ["marketing", "update"]
 */
preferences.reduce(function (result, pref) {
    return result &&
        source.preferences !== undefined &&
        source.preferences !== null &&
        source.preferences[pref] === true;
}, true);
