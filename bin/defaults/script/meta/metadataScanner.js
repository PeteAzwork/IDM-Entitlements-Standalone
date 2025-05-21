/*
 * Copyright 2018 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/**
 *  Module which scans existing managed objects within the managed repository creating the required
 *  meta data if absent. The managed object schema is consulted in order to determine which
 *  managed object types are meta enabled and require scanning.
 */
(function (schemaObjectType, setCreateDate) {
    var _ = require('lib/lodash'),
        queryFilter = "true",
        pageSize = 1000,
        sortKeys = "_id",
        queryParam = {
            "_queryFilter" : queryFilter,
            "_pageSize" : pageSize,
            "_sortKeys" : sortKeys
        },
        fields = ["_id", "lastChanged", "createDate", "_meta"],
        queryResult;

    /**
     * Migrate all existing managed objects for meta enabled object types
     *
     * @param set of managed object schemas
     * @return summary of actions
     */
    function migrateLegacyManagedObjects(objectSchemas) {
        var summary = {"_id" : "", "result" : []},
            countObjects = 0,
            countObjectsMissingMeta = 0,
            countMetaObjectsCreated = 0;
        _.forEach(objectSchemas, function(schema) {
            logger.info("Scanning managed/" + schema.name + " objects for missing meta data.")
            var batchCount = 0;
            do {
                queryResult = openidm.query('managed/' + schema.name, queryParam, fields);
                queryParam._pagedResultsCookie = queryResult.pagedResultsCookie;
                countObjects += queryResult.resultCount;
                
                _.forEach(queryResult.result, function(managedObject) {
                    if (managedObject._meta == null) {
                        try {
                            createMetaRelationshipObject(schema, managedObject, 
                                createMetaDataObject(schema, managedObject));
                            countObjectsMissingMeta++;
                            countMetaObjectsCreated++;
                        } catch (e) {
                            logger.error("Error while attempting to create meta data object for managed/"
                                + schema.name + "/" + managedObject._id);
                        }
                    }
                });
                batchCount++;
                logger.info("Batch #" + batchCount + ": total: " + queryResult.resultCount
                        + ", missing=" + countObjectsMissingMeta
                        + ", created=" + countMetaObjectsCreated);
            } while(queryResult.pagedResultsCookie);
            
            summary.result.push({
                "objectType" : schema.name,
                "totalObjects": countObjects,
                "missingMetadata" : countObjectsMissingMeta,
                "createdMetadata" : countMetaObjectsCreated
            });
            logger.info("Completed scanning managed/" + schema.name + " objects for missing meta data.")
            logger.info("Scan summary: " + JSON.stringify(summary.result));
        });
        return summary;
    }

    /**
     * Read the managed config and return the set of managed object schemas with meta enabled
     *
     * @returns the set of meta enabled managed object schemas
     */
    function getMetaEnabledObjectTypeSchemas()  {
        return _.filter(openidm.read('config/managed').objects, function(object) {
            return object.meta !== null && typeof object.meta !== "undefined";
        });
    }

    /**
     * Read the managed config and return the managed object schema for the specified object type
     *
     * @returns the set of meta enabled managed object schemas
     */
    function getSchemaForType(objectType) {
        return _.filter(openidm.read('config/managed').objects, function(object) {
            return object.name === objectType;
        });
    }

    /**
     * Create the meta data for the provided managed object
     *
     * @param managed object schema
     * @param managed object
     * @return the created meta data object
     */
    function createMetaDataObject(schema, managedObject)  {
        var createDate = null;
        if(setCreateDate != null && setCreateDate === "true") {
          createDate = java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).toString();
        }

        _.defaults(managedObject, {"lastChanged" : null, "createDate" : createDate});
        return openidm.create(schema.meta.resourceCollection, null, {
            "createDate": managedObject.createDate,
            "lastChanged": managedObject.lastChanged,
            "loginCount": 0
        });
    }

    /**
     * Create meta relatinship for the provided managed object
     *
     * @param managed object schema
     * @param managed object
     * @param the existing meta object
     * @return the created relationship object
     */
    function createMetaRelationshipObject(schema, managedObject, metaObject) {
        return openidm.create("repo/relationships", null, {
            "firstResourceCollection" : "managed/" + schema.name,
            "firstResourceId" : managedObject._id,
            "firstPropertyName" : schema.meta.property,
            "secondResourceCollection" : schema.meta.resourceCollection,
            "secondResourceId" : metaObject._id,
            "secondPropertyName" : null,
            "properties" : null
        });
    }

    if (schemaObjectType) {
        return migrateLegacyManagedObjects(getSchemaForType(schemaObjectType));
    } else {
        return migrateLegacyManagedObjects(getMetaEnabledObjectTypeSchemas());
    }
}(
    request.additionalParameters.schemaObjectType,
    request.additionalParameters.setCreateDate
));