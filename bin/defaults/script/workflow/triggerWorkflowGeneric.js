/*
 * Copyright 2015-2017 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/*global workflowName, openidm, params */

/*
 triggerWorkflowGeneric.js - A script to create workflow from event hooks given a set of parameters.
 The parameters is a map of key value pairs. The values are expected to be script snip-its which
 are evaluated and their values reassigned to the key.


 Example "params" for Contractor Onboarding Process workflow:
 {
     "mail": "object.mail",
     "startDate": "object.startDate",
     "sn": "object.sn",
     "department": "object.dept",
     "provisionToXML": "false",
     "_formGenerationTemplate": "object.formGenTemp"
     "endDate": "object.endDate",
     "givenName": "object.name",
     "password": "object.pw",
     "description": "object.desc",
     "telephoneNumber": "object.phone",
     "userName": "object.username",
     "jobTitle": "object.title"
 }

 Example "workflowName": "contractorOnboarding:1:3"

 In addition to the well-known "params" and "workflowName" variables, there can be additional variables exposed to this script depending on the context in which it is invoked.
 For example, things like "object", "source", "target", etc...

 Those variables are only going to be used indirectly, by evaluating the param keys, but they are still important to be aware of in order to make sense of this script.
 */

(function () {
    for (var script in params) {
        try {
            params[script] = eval(params[script]);
        } catch (e) {

        }
    }

    params._key = workflowName;

    openidm.create('workflow/processinstance', null, params);

    return;
}());
