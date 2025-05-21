/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
package org.forgerock.openicf.connectors.hrdb

import java.sql.Connection

import groovy.sql.Sql
import org.forgerock.openicf.connectors.groovy.MapFilterVisitor
import org.forgerock.openicf.connectors.groovy.OperationType
import org.forgerock.openicf.connectors.scriptedsql.ScriptedSQLConfiguration
import org.identityconnectors.common.logging.Log
import org.identityconnectors.framework.common.exceptions.ConnectorException
import org.identityconnectors.framework.common.objects.AttributeBuilder
import org.identityconnectors.framework.common.objects.ObjectClass
import org.identityconnectors.framework.common.objects.OperationOptions
import org.identityconnectors.framework.common.objects.SearchResult
import org.identityconnectors.framework.common.objects.filter.Filter

/**
 * Built-in accessible objects
 **/

// OperationType is SEARCH for this script
def operation = operation as OperationType

// The configuration class created specifically for this connector
def configuration = configuration as ScriptedSQLConfiguration

// Default logging facility
def log = log as Log

// The objectClass of the object to be searched, e.g. ACCOUNT or GROUP
def objectClass = objectClass as ObjectClass

// The search filter for this operation
def filter = filter as Filter

// Additional options for this operation
def options = options as OperationOptions


def connection = connection as Connection
def ORG = new ObjectClass("organization")


log.info("Entering " + operation + " Script")

def sql = new Sql(connection)
def where = " WHERE 1=1 "
def whereParams = []

//Need to handle the __UID__ and __NAME__ in queries - this map has entries for each objectType,
//and is used to translate fields that might exist in the query object from the ICF identifier
//back to the real property name.
def fieldMap = [
        "organization": [
                "__UID__" : "id",
                "__NAME__": "name"
        ],
        "__ACCOUNT__" : [
                "__UID__" : "id",
                "__NAME__": "uid"
        ],
        "__GROUP__"   : [
                "__UID__" : "id",
                "__NAME__": "name"
        ]
]

// Set where and whereParams if they have been passed in the request for paging
if (options.pagedResultsCookie != null) {
    def cookieProps = options.pagedResultsCookie.split(",")
    if (cookieProps.size() != 2) {
        throw new ConnectorException("Expecting pagedResultsCookie to contain timestamp and id.")
    }
    // The timestamp and id are for this example only.
    // The user can use their own properties to sort on.
    // For paging it is important that the properties that you use must identify
    // a distinct set of pages for each iteration of the
    // pagedResultsCookie, which can be decided by last record of the previous set.
    where = " WHERE timestamp >= ? AND id > ? "
    whereParams = [cookieProps[0], cookieProps[1].toInteger()]
}

// Determine what properties will be used to sort the query
def orderBy = []
if (options.sortKeys != null && options.sortKeys.size() > 0) {
    options.sortKeys.each {
        def key = it.toString()
        def keySuffix = key.substring(1, key.size())
        def field = fieldMap[objectClass.objectClassValue][keySuffix] ?
            fieldMap[objectClass.objectClassValue][keySuffix] : keySuffix
        if ((objectClass == ObjectClass.ACCOUNT && field == "cars")
            || (objectClass == ObjectClass.GROUP && field == "users")) {
            // ordering joined tables doesn't work well in UI
            return
        }
        if (key.substring(0, 1) == "+") {
            orderBy.add(field + " ASC")
        } else {
            orderBy.add(field + " DESC")
        }
    }
}
if (orderBy) {
    orderBy = " ORDER BY " + orderBy.join(",")
} else {
    orderBy = ""
}

def limit = ""
if (options.pageSize != null) {
    limit = " LIMIT " + options.pageSize.toString()
}

// keep track of lastTimestamp and lastId so we can
// use it for the next request to do paging
def lastTimestamp
def lastId

if (filter != null) {

    def query = filter.accept(MapFilterVisitor.INSTANCE, null)

    // this closure function recurses through the (potentially complex) query object in order to build an equivalent
    // SQL 'where' expression
    def queryParser
    queryParser = { queryObj ->

        if (queryObj.operation == "OR" || queryObj.operation == "AND") {
            return "(" + queryParser(queryObj.right) + " " + queryObj.operation + " " + queryParser(queryObj.left) + ")"
        } else {

            if (fieldMap[objectClass.objectClassValue] && fieldMap[objectClass.objectClassValue][queryObj.get("left")]) {
                queryObj.put("left", fieldMap[objectClass.objectClassValue][queryObj.get("left")])
            }

            def left = queryObj.get('left')
            def not = queryObj.get('not')
            def template
            switch (queryObj.get('operation')) {
                case 'CONTAINS':
                    template = "$left ${not ? "NOT " : ""}LIKE ?"
                    whereParams.add("%" + queryObj.get("right") + "%")
                    break
                case 'ENDSWITH':
                    template = "$left ${not ? "NOT " : ""}LIKE ?"
                    whereParams.add("%" + queryObj.get("right"))
                    break
                case 'STARTSWITH':
                    template = "$left ${not ? "NOT " : ""}LIKE ?"
                    whereParams.add(queryObj.get("right") + "%")
                    break
                case 'EQUALS':
                    template = "$left ${not ? "<>" : "="} ?"
                    whereParams.add(queryObj.get("right"))
                    break
                case 'GREATERTHAN':
                    template = "$left ${not ? "<=" : ">"} ?"
                    whereParams.add(queryObj.get("right"))
                    break
                case 'GREATERTHANOREQUAL':
                    template = "$left ${not ? "<" : ">="} ?"
                    whereParams.add(queryObj.get("right"))
                    break
                case 'LESSTHAN':
                    template = "$left ${not ? ">=" : "<"} ?"
                    whereParams.add(queryObj.get("right"))
                    break
                case 'LESSTHANOREQUAL':
                    template = "$left ${not ? ">" : "<="} ?"
                    whereParams.add(queryObj.get("right"))
            }
            return template.toString()
        }
    }

    where = where + " AND " + queryParser(query)
    log.ok("Search WHERE clause is: " + where)
}
def resultCount = 0
switch (objectClass) {
    case ObjectClass.ACCOUNT:
        def dataCollector = [uid: "", cars: []]

        def handleCollectedData = {
            if (dataCollector.uid != "") {
                handler {
                    uid dataCollector.id
                    id dataCollector.uid
                    attribute 'uid', dataCollector.uid
                    attribute 'fullname', dataCollector.fullname
                    attribute 'firstname', dataCollector.firstname
                    attribute 'lastname', dataCollector.lastname
                    attribute 'email', dataCollector.email
                    attribute 'organization', dataCollector.organization
                    attributes AttributeBuilder.build('cars', dataCollector.cars)
                }
                resultCount++
            }
        }

        def statement = """
            SELECT
              a.id,
              u.uid,
              u.fullname,
              u.firstname,
              u.lastname,
              u.email,
              u.organization,
              u.timestamp,
              c.year,
              c.make,
              c.model
            FROM
              users u
              INNER JOIN (
                SELECT
                  id
                FROM
                  users ${where} ${orderBy} ${limit}
              ) a ON a.id = u.id
              LEFT OUTER JOIN car c ON c.users_id = u.id
        """
        sql.eachRow(statement, whereParams, { row ->
            if (dataCollector.uid != row.uid) {
                // new user row, process what we've collected

                handleCollectedData()

                dataCollector = [
                        id          : row.id as String,
                        uid         : row.uid,
                        fullname    : row.fullname,
                        firstname   : row.firstname,
                        lastname    : row.lastname,
                        email       : row.email,
                        organization: row.organization,
                        cars        : []
                ]
            }

            if (row.year) {
                dataCollector.cars.add([
                        year : row.year,
                        make : row.make,
                        model: row.model
                ])
            }

            lastTimestamp = row.timestamp
            lastId = row.id
        })

        handleCollectedData()

        break

    case ObjectClass.GROUP:

        def dataCollector = [gid: "", users: []]

        def handleCollectedData = {
            if (dataCollector.gid != "") {
                handler {
                    uid dataCollector.id
                    id dataCollector.gid
                    attribute 'gid', dataCollector.gid
                    attribute 'name', dataCollector.name
                    attribute 'description', dataCollector.description
                    attributes AttributeBuilder.build('users', dataCollector.users)
                }
                resultCount++
            }
        }

        def statement = """
            SELECT
              a.id,
              g.gid,
              g.name,
              g.description,
              g.timestamp,
              u.users_id
            FROM
              account_groups g
              INNER JOIN (
                SELECT
                  id
                FROM
                  account_groups ${where} ${orderBy} ${limit}
              ) a ON a.id = g.id
              LEFT OUTER JOIN groups_users u ON u.groups_id = g.id
        """
        sql.eachRow(statement, whereParams, { row ->
            if (dataCollector.gid != row.gid) {
                // new user row, process what we've collected

                handleCollectedData()

                dataCollector = [
                        id         : row.id as String,
                        gid        : row.gid,
                        name       : row.name,
                        description: row.description,
                        users      : []
                ]
            }

            if (row.users_id) {
                dataCollector.users.add([
                        uid: row.users_id
                ])
            }

            lastTimestamp = row.timestamp
            lastId = row.id
        })

        handleCollectedData()

        break

    case ORG:
        def statement = """
            SELECT
              id,
              name,
              description,
              timestamp
            FROM
              organizations ${where} ${orderBy} ${limit}
        """
        sql.eachRow(statement, whereParams, { row ->
            handler {
                id row.name
                uid row.id as String
                attribute 'description', row.description
            }
            lastTimestamp = row.timestamp
            lastId = row.id
            resultCount++
        })
        break

    default:
        throw new UnsupportedOperationException(operation.name() + " operation of type:" +
                objectClass.objectClassValue + " is not supported.")
}

// If paging is not wanted just return the default SearchResult object
if (orderBy.toString().isEmpty() || limit.toString().isEmpty() || resultCount < options.pageSize) {
    return new SearchResult()
}

return new SearchResult(lastTimestamp.toString() + "," + lastId.toString(), -1)
