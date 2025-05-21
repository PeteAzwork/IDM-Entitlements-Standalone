/*
 * Copyright 2018 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

(function () {
  var INTERNAL_ROLE_PATH = "internal/role",
      INTERNAL_USER_PATH = "internal/user",
      ANONYMOUS = "anonymous",
      OPENIDM_ADMIN = "openidm-admin",
      roleDetails = [
          { "name" : "openidm-admin", "description" : "Administrative access" },
          { "name" : "openidm-authorized", "description" : "Basic miniumum user" },
          { "name" : "openidm-reg", "description" : "Anonymous access" },
          { "name" : "openidm-cert", "description" : "Authenticated via certificate" },
          { "name" : "openidm-tasks-manager", "description" : "Allowed to reassign workflow tasks" },
          { "name" : "openidm-prometheus", "description" : "Prometheus access" }
      ],
      internalRolesCreated = [],
      internalRolesUpdated = [],
      internalUsersCreated = [],
      internalUsersUpdated = [];

  updateCreateInternalRoles();
  updateCreateInternalUsers();

  /**
   * @name updateCreateInternalRoles
   * @desc Updates existing roles. Creates those that didn't exist
   */
  function updateCreateInternalRoles() {
    var internalRoleResponse = openidm.query("internal/role", {"_queryFilter" : "true"});
    // Retrieve all of the existing internal roles and patch each one with the 'name' field
    if (internalRoleResponse.resultCount > 0) {
        internalRoleResponse.result.forEach(function(role) {
            openidm.patch(INTERNAL_ROLE_PATH + "/" + role._id, null,
                [ {"operation" : "replace", "field" : "/name", "value" : role._id } ]);
            internalRolesUpdated.push({ "_id" : role._id });
            // Remove this role from the details
            roleDetails = roleDetails.filter(function(roleDetail) {
              return roleDetail.name !== role._id;
            });
        });
    }
    // For the roles that did not exist to be patched, create them
    roleDetails.forEach(function(roleDetail) {
        openidm.create(INTERNAL_ROLE_PATH, roleDetail.name,
            { "name" : roleDetail.name, "description" : roleDetail.description });
        internalRolesCreated.push({ "_id" : roleDetail.name });
    });
  }

  /**
   * @name updateCreateInternalUsers
   * @desc Updates 'openidm-admin' if it exists, creates it otherwise.
   *       Updates 'anonymous' if it exists, creates it otherwise.
   */
  function updateCreateInternalUsers() {

    // If internal user 'openidm-admin' exists, patch it to add the authzRoles relationships, else create it
    if (openidm.query(INTERNAL_USER_PATH, { "_queryFilter" : "/_id eq \"openidm-admin\""}).resultCount > 0) {
      openidm.patch(INTERNAL_USER_PATH + "/" + OPENIDM_ADMIN, null, [ { "operation" : "replace",
          "field" : "/authzRoles",
          "value" : [ { "_ref" : "internal/role/openidm-admin" }, { "_ref" : "internal/role/openidm-authorized" } ]} ]);
      internalUsersUpdated.push({ "_id" : OPENIDM_ADMIN });
    } else {
      openidm.create(INTERNAL_USER_PATH, OPENIDM_ADMIN, { "password" : "openidm-admin",
            "authzRoles" :
                [ { "_ref" : "internal/role/openidm-admin" }, { "_ref" : "internal/role/openidm-authorized" } ]});
      internalUsersCreated.push({ "_id" : OPENIDM_ADMIN });
    }

    // If internal user 'anonymous' exists, patch it to add the authzRoles relationship, else create it
    if (openidm.query(INTERNAL_USER_PATH, { "_queryFilter" : "/_id eq \"anonymous\""}).resultCount > 0) {
      openidm.patch(INTERNAL_USER_PATH + "/" + ANONYMOUS, null, [ { "operation" : "replace",
        "field" : "/authzRoles",
        "value" : [ { "_ref" : "internal/role/openidm-reg" } ]}]);
      internalUsersUpdated.push({ "_id" : ANONYMOUS });
    } else {
      openidm.create(INTERNAL_USER_PATH, ANONYMOUS,
        { "password" : "anonymous", "authzRoles" : [ { "_ref" : "internal/role/openidm-reg" } ] });
      internalUsersCreated.push({ "_id" : ANONYMOUS });
    }
  }

  // Return the results of the update
  return {
    "_id" : "",
    "result" : [{
          "internalRolesCreated" : internalRolesCreated,
          "internalRolesUpdated" : internalRolesUpdated,
          "internalUsersCreated" : internalUsersCreated,
          "internalUsersUpdated" : internalUsersUpdated
    }]
  }
}());
