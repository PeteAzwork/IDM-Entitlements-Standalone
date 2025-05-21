"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate"], function ($, _, Constants, ConfigDelegate) {
    /**
     * Repo-specific extentions to the config delegate
     * @exports org/forgerock/openidm/ui/admin/delegates/RepoDelegate
     */

    var obj = Object.create(ConfigDelegate);

    /**
     * Queries the config store for a single entry which starts with "repo."
     */
    obj.findRepoConfig = function () {
        return obj.serviceCall({
            url: "?_queryFilter=_id sw 'repo.'",
            type: "GET"
        }).then(function (response) {
            return response.result[0];
        });
    };

    /**
     * Determines the type of repo based on the config.
     */
    obj.getRepoTypeFromConfig = function (config) {
        return config._id.replace('repo.', '');
    };

    /**
     * Returns a reference to the appropriate resource mapping section of the config
     * if one can be found; otherwise, undefined.
     */
    obj.findGenericResourceMappingForRoute = function (config, route) {
        return _.has(config, "resourceMapping.genericMapping") ? config.resourceMapping.genericMapping[route] : undefined;
    };

    /**
     * Modifies a resource mapping block to reflect the list of searchable properties passed into it
     * @param {Object} resourceConfig - the map of generic object details to modify
     * @param {Array} searchablePropertiesList - complete list of simple strings or JSON Pointers, representing all searchable properties for this object
     */
    obj.syncSearchablePropertiesForGenericResource = function (resourceConfig, searchablePropertiesList) {
        // only need to bother if all the properties are not already searchable by default
        if (resourceConfig && resourceConfig.searchableDefault === false) {
            resourceConfig.properties = _.reduce(searchablePropertiesList, function (result, prop) {
                result[(prop.indexOf("/") !== 0 ? "/" : "") + prop] = {
                    "searchable": true
                };
                return result;
            }, {});
        }
        return resourceConfig;
    };

    return obj;
});
