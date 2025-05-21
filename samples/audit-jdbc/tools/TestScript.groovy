/*
 * Copyright 2013-2017 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

import java.sql.Connection

import groovy.sql.Sql
import org.identityconnectors.common.logging.Log

// Parameters:
// The connector sends the following:
// connection: handler to the SQL connection
// action: a string describing the action ("TEST" here)
// log: a handler to the Log facility

def sql = new Sql(connection as Connection);
def log = log as Log;

log.info("Entering Test Script");

// a relatively-cheap query to run on start up to ensure database connectivity and table existence
sql.eachRow("select * from auditauthentication limit 1", { } );
sql.eachRow("select * from auditrecon limit 1", { } );
sql.eachRow("select * from auditactivity limit 1", { } );
sql.eachRow("select * from auditaccess limit 1", { } );
sql.eachRow("select * from auditsync limit 1", { } );

