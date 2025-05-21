/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
package org.forgerock.openicf.connectors.hrdb

import static org.identityconnectors.framework.common.objects.AttributeInfo.Flags.MULTIVALUED
import static org.identityconnectors.framework.common.objects.AttributeInfo.Flags.REQUIRED
import static org.identityconnectors.framework.common.objects.AttributeInfo.Flags.NOT_READABLE
import static org.identityconnectors.framework.common.objects.AttributeInfo.Flags.NOT_RETURNED_BY_DEFAULT

import org.forgerock.openicf.connectors.groovy.ICFObjectBuilder
import org.forgerock.openicf.connectors.groovy.OperationType
import org.forgerock.openicf.connectors.scriptedsql.ScriptedSQLConfiguration
import org.identityconnectors.common.logging.Log

/**
 * Built-in accessible objects
 **/

// OperationType is SCHEMA for this script
def operation = operation as OperationType

// The configuration class created specifically for this connector
def configuration = configuration as ScriptedSQLConfiguration

// Default logging facility
def log = log as Log

// The schema builder object
def builder = builder as ICFObjectBuilder

/**
 * Script action - Customizable
 *
 * Build the schema for this connector that describes what the ICF client will see.  The schema
 * might be statically built or may be built from data retrieved from the external source.
 *
 * This script should use the builder object to create the schema.
 **/
/* Log something to demonstrate this script executed */
log.info("Schema script, operation = " + operation.toString());

builder.schema({
    objectClass {
        type ObjectClass.ACCOUNT_NAME
        attributes {
            uid String.class, REQUIRED
            password String.class, NOT_READABLE, NOT_RETURNED_BY_DEFAULT
            firstname String.class, REQUIRED
            lastname String.class, REQUIRED
            fullname String.class, REQUIRED
            email String.class, REQUIRED
            cars Map.class, MULTIVALUED
            organization String.class, REQUIRED
        }
    }
    objectClass {
        type ObjectClass.GROUP_NAME
        attributes {
            name String.class, REQUIRED
            gid String.class, REQUIRED
            description String.class, REQUIRED
            users Map.class, MULTIVALUED
        }
    }
    objectClass {
        type 'organization'
        attributes {
            name String.class, REQUIRED
            description String.class, REQUIRED
        }
    }
})
