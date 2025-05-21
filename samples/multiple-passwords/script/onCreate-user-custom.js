/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */


/*global object, historyFields, historySize */

object.fieldHistory = {}

for (var index in historyFields) {
    var field = historyFields[index];
    object.fieldHistory[field] = new Array(historySize);

    if (object[field]) {
        object.fieldHistory[field].shift();
        object.fieldHistory[field].push(openidm.hash(object[field], "SHA-256"));
    }
}

// Find the schema for the object type being created or updated.
var schema = openidm.read("schema/" + resourceName.head(2).toString());
if (schema && schema.properties && schema.properties.lastChanged) {
    object.lastChanged = { "date" : java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).toString() };
}