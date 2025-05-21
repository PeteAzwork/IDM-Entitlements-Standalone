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
import org.identityconnectors.framework.common.exceptions.ConnectorException
import org.identityconnectors.framework.common.objects.Attribute
import org.identityconnectors.framework.common.objects.AttributesAccessor
import org.identityconnectors.framework.common.objects.ObjectClass
import org.identityconnectors.framework.common.objects.Uid

/**
 * Built-in accessible objects
 **/

// OperationType is UPDATE for this script
def operation = operation as OperationType

// The configuration class created specifically for this connector
def configuration = configuration as ScriptedSQLConfiguration

// Default logging facility
def log = log as Log

// Set of attributes describing the object to be updated
def updateAttributes = new AttributesAccessor(attributes as Set<Attribute>)

// The Uid of the object to be updated
def uid = uid as Uid

// The objectClass of the object to be updated, e.g. ACCOUNT or GROUP
def objectClass = objectClass as ObjectClass

/**
 * Script action - Customizable
 *
 * Update an object in the external source.  Connectors that do not support this should
 * throw an UnsupportedOperationException.
 *
 * This script should return the Uid of the updated object
 **/

/* Log something to demonstrate this script executed */
log.info("Update script, operation = " + operation.toString())

def connection = connection as Connection
def sql = new Sql(connection)
def ORG = new ObjectClass("organization")

switch (operation) {
    case OperationType.UPDATE:
        switch (objectClass) {
            case ObjectClass.ACCOUNT:
                // Prepare statement and params for users UPDATE
                def updateParams = []
                def updateStatement = "UPDATE users SET"

                if (updateAttributes.hasAttribute("fullname")) {
                    updateStatement += " fullname = ?,"
                    updateParams.add(updateAttributes.findString("fullname"))
                }
                if (updateAttributes.hasAttribute("firstname")) {
                    updateStatement += " firstname = ?,"
                    updateParams.add(updateAttributes.findString("firstname"))
                }
                if (updateAttributes.hasAttribute("lastname")) {
                    updateStatement += " lastname = ?,"
                    updateParams.add(updateAttributes.findString("lastname"))
                }
                if (updateAttributes.hasAttribute("email")) {
                    updateStatement += " email = ?,"
                    updateParams.add(updateAttributes.findString("email"))
                }
                if (updateAttributes.hasAttribute("organization")) {
                    updateStatement += " organization = ?,"
                    updateParams.add(updateAttributes.findString("organization"))
                }
                if (updateAttributes.hasAttribute("password")) {
                    updateStatement += " password = coalesce(sha1(?), password),"
                    updateParams.add(updateAttributes.findString("password"))
                }

                if (updateParams.size() > 0) {
                    updateStatement += " timestamp = now() WHERE id = ?"
                    updateParams.add(uid.uidValue)

                    // Execute UPDATE for users
                    sql.executeUpdate("${updateStatement}", updateParams)
                }

                // Execute UPDATE for car if 'cars' attribute exists
                if (updateAttributes.hasAttribute("cars")) {
                    sql.executeUpdate("DELETE FROM car WHERE users_id=?",
                            [
                                    uid.uidValue
                            ]
                    )
                    updateAttributes.findList("cars").each {
                        sql.executeInsert(
                                "INSERT INTO car (users_id,year,make,model) VALUES (?,?,?,?)",
                                [
                                        uid.uidValue,
                                        it.year,
                                        it.make,
                                        it.model
                                ]
                        )
                    }
                }
                break
            case ObjectClass.GROUP:
                // Prepare statement and params for account_groups UPDATE
                def updateStatement = "UPDATE account_groups SET"
                def updateParams = []

                if (updateAttributes.hasAttribute("description")) {
                    updateStatement += " description = ?,"
                    updateParams.add(updateAttributes.findString("description"))
                }
                if (updateAttributes.hasAttribute("gid")) {
                    updateStatement += " gid = ?,"
                    updateParams.add(updateAttributes.findString("gid"))
                }

                if (updateParams.size() > 0) {
                    updateStatement += " timestamp = now() WHERE id = ?"
                    updateParams.add(uid.uidValue)

                    // Execute UPDATE for account_groups
                    sql.executeUpdate("${updateStatement}", updateParams)
                }

                // Execute UPDATE for groups_users if 'users' attribute exists
                if (updateAttributes.hasAttribute("users")) {
                    sql.executeUpdate("DELETE FROM groups_users WHERE groups_id=?",
                            [
                                    uid.uidValue
                            ]
                    )
                    updateAttributes.findList("users").each {
                        sql.executeInsert(
                                "INSERT INTO groups_users (users_id,groups_id) SELECT id,? FROM users WHERE id=?",
                                [
                                        uid.uidValue,
                                        it.uid
                                ]
                        )
                    }
                }
                break
            case ORG:
                // If the only attribute other than _NAME_ is present
                if (updateAttributes.hasAttribute("description")) {
                    // Execute UPDATE for Organizations
                    sql.executeUpdate("""
                        UPDATE
                            Organizations
                        SET
                            description = ?,
                            timestamp = now()
                        WHERE
                            id = ?
                        """,
                            [
                                    updateAttributes.findString("description"),
                                    uid.uidValue
                            ]
                    )
                }
                break
            default:
                throw new ConnectorException("UpdateScript can not handle object type: " + objectClass.objectClassValue)
        }
        return uid.uidValue
    case OperationType.ADD_ATTRIBUTE_VALUES:
        throw new UnsupportedOperationException(operation.name() + " operation of type:" +
                objectClass.objectClassValue + " is not supported.")
    case OperationType.REMOVE_ATTRIBUTE_VALUES:
        throw new UnsupportedOperationException(operation.name() + " operation of type:" +
                objectClass.objectClassValue + " is not supported.")
    default:
        throw new ConnectorException("UpdateScript can not handle operation:" + operation.name())
}
