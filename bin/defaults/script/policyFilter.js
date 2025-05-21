/*
 * Copyright 2012-2017 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/*globals request */

/**
 * Used to enable automatic policy evaluation during router processing of any
 * given resource.
 * @module policyFilter
 * @see policy
 */

(function (isFromRequire) {

    var namespace = isFromRequire ? exports : this;

    /**
     * Translates different request details into a single path which can have
     * policy checked for it.
     * @param {string} method Either create or update
     * @param {string} basePath Path to resource (e.g. managed/user or managed/user/1)
     * @param {string} unencodedId The identifier for the new resource, for creates
     * @returns {string} The full path to use for policy evaluation
     */
    namespace.getFullResourcePath = function (method, basePath, unencodedId) {
        var fullResourcePath;
        var id = org.forgerock.http.util.Uris.urlEncodePathElement(unencodedId);

        if (method === "create") {
            if (basePath === "") {
                fullResourcePath = id !== null ? id : "*";
            } else {
                fullResourcePath = basePath + "/" + (id !== null ? id : "*");
            }
        } else {
            fullResourcePath = basePath;
        }
        return fullResourcePath;
    };

    /**
     * @param {string} path The full path to use for policy evaluation
     * @param {Object} content Content of the resource to be evaluated
     * @returns {Array} List of all failing policies, with details
     */
    namespace.evaluatePolicy = function(path, content) {
        return openidm.action("policy/" + path, "validateObject", content, { "external" : "true" });
    };

    /**
     * Method intended to be called from router filter context, for implicit evaluation of a resource.
     * Throws an error when policy fails, with the failure details included.
     */
    namespace.runFilter = function () {
        var enforce = identityServer.getProperty("openidm.policy.enforcement.enabled", "true", true),
            fullResourcePath = this.getFullResourcePath(request.method, request.resourcePath, request.newResourceId);

        if (fullResourcePath.indexOf("policy/") !== 0 && enforce !== "false") {

            result = this.evaluatePolicy(fullResourcePath, request.content);

            if (!result.result) {
                throw {
                    "code" : 403,
                    "message" : "Policy validation failed",
                    "detail" : result
                };
            }
        }

    };

    if (!isFromRequire) {
        namespace.runFilter();
    }

}(typeof module !== "undefined"));
