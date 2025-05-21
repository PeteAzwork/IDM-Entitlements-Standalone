/*
 * Copyright 2011-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

// Jscript example for the "result" script that deals with the recon stats. See:
// https://wikis.forgerock.org/confluence/display/openidm/Reconciliation+reports
// First build the HTML body with the recon statistics
// Then use the external email service to email the report
// 3 objects are passed to the script:
//
// global: contains general information about reconciliation (mapping name,
// recon id, start date, end date)
//
// source: contains detailed information about source system processing
// (system name, start date, end date, duration, situations/entries)
//
// target: contains detailed information about target system processing
// (system name, start date, end date, duration, situations/entries)

/*global global,source,target */

var email = {
        //UPDATE THESE VALUES
        from : "openidm@example.com",
        to : "idmadmin1@example.com",
        cc : "idmadmin2@example.com,idmadmin3@example.com",
        subject : "Recon stats for " + global.mappingName,
        type : "text/html"
    },
    template,
    Handlebars;

// if there is a configuration found, assume that it has been properly configured
if (openidm.read("config/external.email")) {

    source.durationMinutes = Math.floor(source.duration / 60.0) / 1000;
    source.entryListDurationSeconds = Math.floor(source.entryListDuration * 1000.0 / 1000) / 1000;

    target.durationMinutes = Math.floor(target.duration / 60.0) / 1000;
    target.entryListDurationSeconds = Math.floor(target.entryListDuration * 1000.0 / 1000) / 1000.0;

    Handlebars = require("lib/handlebars");

    email.body = new Packages.org.mozilla.javascript.Synchronizer(function() {
            template = Handlebars.compile(readFile(identityServer.getProjectLocation() + "/script/reconStatTemplate.html"));
            return template({
                "global": global,
                "source": source,
                "target": target
            });
        }, Handlebars)();

    openidm.action("external/email", "send", email);

} else {
    console.log("Email service not configured; report not generated. ");
}
