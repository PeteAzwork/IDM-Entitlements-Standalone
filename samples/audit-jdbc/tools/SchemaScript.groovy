/*
 * Copyright 2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
package org.forgerock.openicf.connectors.hrdb

import static org.identityconnectors.framework.common.objects.AttributeInfo.Flags.REQUIRED

import org.forgerock.openicf.connectors.groovy.ICFObjectBuilder
import org.forgerock.openicf.connectors.groovy.OperationType
import org.forgerock.openicf.connectors.scriptedsql.ScriptedSQLConfiguration
import org.identityconnectors.common.logging.Log

/**
 * Built-in accessible objects
 **/

// OperationType is SCHEMA for this script
def operationType = operation as OperationType

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
log.info("Schema script, operationType = " + operationType.toString());

builder.schema({

    objectClass {
        type 'auditaccess'
        attributes {
            id Integer.class, REQUIRED
            objectid String.class, REQUIRED
            activitydate String.class, REQUIRED
            eventname String.class
            transactionid String.class, REQUIRED
            userid String.class
            trackingids String.class
            server_ip String.class
            server_port String.class
            client_ip String.class
            client_port String.class
            request_protocol String.class
            request_operation String.class
            request_detail String.class
            http_request_secure String.class
            http_request_method String.class
            http_request_path String.class
            http_request_queryparameters String.class
            http_request_headers String.class
            http_request_cookies String.class
            http_response_headers String.class
            response_status String.class
            response_statuscode String.class
            response_elapsedtime String.class
            response_elapsedtimeunites String.class
            roles String.class
        }
    }

    objectClass {
        type 'auditauthentication'
        attributes {
            id Integer.class, REQUIRED
            objectid String.class, REQUIRED
            transactionid String.class, REQUIRED
            activitydate String.class, REQUIRED
            userid String.class
            eventname String.class
            provider String.class
            method String.class
            result String.class
            principals String.class
            context String.class
            trackingids String.class
        }
    }

    objectClass {
        type 'auditactivity'
        attributes {
            id Integer.class, REQUIRED
            objectid String.class, REQUIRED
            activitydate String.class, REQUIRED
            eventname String.class
            transactionid String.class, REQUIRED
            userid String.class
            trackingids String.class
            runas String.class
            activityobjectid String.class
            operation String.class
            subjectbefore String.class
            subjectafter String.class
            changedfields String.class
            subjectrev String.class
            passwordchanged String.class
            message String.class
            provider String.class
            context String.class
            status String.class
        }
    }

    objectClass {
        type 'auditrecon'
        attributes {
            id Integer.class, REQUIRED
            objectid String.class, REQUIRED
            transactionid String.class, REQUIRED
            activitydate String.class, REQUIRED
            eventname String.class
            userid String.class
            trackingids String.class
            activity String.class
            exceptiondetail String.class
            linkqualifier String.class
            mapping String.class
            message String.class
            messagedetail String.class
            situation String.class
            sourceobjectid String.class
            status String.class
            targetobjectid String.class
            reconciling String.class
            ambiguoustargetobjectids String.class
            reconaction String.class
            entrytype String.class
            reconid String.class
        }
    }

    objectClass {
        type 'auditsync'
        attributes {
            id Integer.class, REQUIRED
            objectid String.class, REQUIRED
            transactionid String.class, REQUIRED
            activitydate String.class, REQUIRED
            eventname String.class
            userid String.class
            trackingids String.class
            activity String.class
            exceptiondetail String.class
            linkqualifier String.class
            mapping String.class
            message String.class
            messagedetail String.class
            situation String.class
            sourceobjectid String.class
            status String.class
            targetobjectid String.class
        }
    }

    objectClass {
        type 'auditconfig'
        attributes {
            id Integer.class, REQUIRED
            objectid String.class, REQUIRED
            activitydate String.class, REQUIRED
            eventname String.class
            transactionid String.class, REQUIRED
            userid String.class
            trackingids String.class
            runas String.class
            configobjectid String.class
            operation String.class
            beforeObject String.class
            afterObject String.class
            changedfields String.class
            rev String.class
        }
    }
})