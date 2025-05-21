/*
 * Copyright 2015-2019 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
package org.forgerock.openicf.connectors.hrdb

import java.sql.Connection

import groovy.sql.Sql
import org.forgerock.openicf.connectors.groovy.OperationType
import org.forgerock.openicf.connectors.scriptedsql.ScriptedSQLConfiguration
import org.identityconnectors.common.logging.Log
import org.identityconnectors.framework.common.objects.ObjectClass
import org.identityconnectors.framework.common.objects.Uid

/**
 * Built-in accessible objects
 **/

// OperationType is DELETE for this script
def operation = operation as OperationType

// The configuration class created specifically for this connector
def configuration = configuration as ScriptedSQLConfiguration

// Default logging facility
def log = log as Log

// The Uid of the object to be deleted
def uid = uid as Uid

// The objectClass of the object to be deleted, e.g. ACCOUNT or GROUP
def objectClass = objectClass as ObjectClass

/**
 * Script action - Customizable
 *
 * Delete an object in the external source.  Connectors that do not support this should
 * throw an UnsupportedOperationException.
 *
 * This script has no return value but should throw an exception is something goes wrong
 **/

/* Log something to demonstrate this script executed */

def connection = connection as Connection
def ORG = new ObjectClass("organization")

log.info("Delete script, operation = " + operation.toString());
def sql = new Sql(connection);

switch (objectClass) {
    case ObjectClass.ACCOUNT:
        sql.execute("DELETE FROM users where id= ?", [uid.uidValue])
        break

    case ObjectClass.GROUP:
        sql.execute("DELETE FROM account_groups where id= ?", [uid.uidValue])
        break

    case ORG:
        sql.execute("DELETE FROM organizations where id= ?", [uid.uidValue])
        break

    default:
        throw new UnsupportedOperationException(operation.name() + " operation of type:" +
                objectClass.objectClassValue + " is not supported.")
}
