/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/*global java, openidm, resourceName, object, newObject, oldObject, historyFields, historySize */;

// Initialize the fieldHistory object
object.fieldHistory = oldObject.fieldHistory || {};

for (var index in historyFields) {
    var matchHashed, newValue, oldValue, field = historyFields[index], history;

    // Create the new history array if it doesn't already exist
    if (typeof object.fieldHistory[field] === "undefined" || object.fieldHistory[field] === null) {
        object.fieldHistory[field] = new Array(historySize);
    }

    // Get new and old field values
    newValue = object[field];
    oldValue = openidm.isEncrypted(oldObject[field])
        ? openidm.decrypt(oldObject[field])
        : oldObject[field];

    // Determine if a plain text value needs to be compared to a hashed value
    matchHashed = openidm.isHashed(oldValue) && !openidm.isHashed(newValue);

    // Check if the new and old values are different
    if ((matchHashed && !openidm.matches(newValue, oldValue))
            || (!matchHashed && JSON.stringify(newValue) !== JSON.stringify(oldValue))) {
        // The values are different, so store then new value.
        object.fieldHistory[field].shift();
        object.fieldHistory[field].push(openidm.hash(object[field], "SHA-256"));
    }
}

// Find the schema for the object type being created or updated.
var schema = openidm.read("schema/" + resourceName.head(2).toString());
if(schema && schema.properties && schema.properties.lastChanged) {
    object.lastChanged = { "date" : java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).toString() };
}
