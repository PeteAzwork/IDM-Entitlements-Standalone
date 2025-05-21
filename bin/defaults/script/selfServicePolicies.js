/*
 * Copyright 2017 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/*global openidm, require */

(function () {

    // set a local variable to reference the global openidm binding, if it exists
    var router = typeof openidm !== "undefined" ? openidm : null;

    /**
     Provide a mock object to use in place of the real one when testing
     */
    exports.mockRouter = function (mockRouter) {
        router = mockRouter;
    }

    /**
        Returns a list of property policies which apply to the selfservice/reset endpoint
        Return value structure must patch properties defined statically in policy.json
        @returns {Object[]} properties - the properties and their associated policies
    */
    exports.getResetProperties = function () {
        var identityServiceUrl = this.getIdentityServiceUrl(
                'config/selfservice/reset',
                'resetStage'
            ),
            upstreamPolicy;

        if (!identityServiceUrl) {
            return [];
        }

        upstreamPolicy = router.read('policy/' + identityServiceUrl);

        if (!upstreamPolicy ||
            !upstreamPolicy.properties) {
            return [];
        }

        return upstreamPolicy.properties;
    };

    /**
        Returns a list of property policies which apply to the selfservice/registration endpoint
        Return value structure must patch properties defined statically in policy.json
        @returns {Object[]} properties - the properties and their associated policies
    */
    exports.getRegistrationProperties = function () {
        var identityServiceUrl = this.getIdentityServiceUrl(
            'config/selfservice/registration',
            'idmUserDetails'
        );

        if (!identityServiceUrl) {
            return [];
        }

        return this.applyPrefixToPolicyProperties(
            router.read('policy/' + identityServiceUrl),
            '/user/'
        ).map(function (property) {
            var uniquePolicy = property.policies.filter(function (policy) {
                return policy.policyId === "unique";
            })[0];
            if (uniquePolicy) {
                uniquePolicy.params = uniquePolicy.params || {};
                uniquePolicy.params.resourcePath = identityServiceUrl;
            }
            // property possibly updated by reference via uniquePolicy
            return property;
        });
    }

    /**
        Takes an existing policy response and applies a prefix for each property name
        @param {Object} policy - policy response object
        @param {String} prefix
        @returns {Object[]} - array of properties with the names prefixed
    */
    exports.applyPrefixToPolicyProperties = function (policy, prefix) {
        if (!policy.properties) {
            return [];
        }

        return policy.properties
        .map(function (property) {
            var cannotContainOthersPolicy;
            property.policies = property.policies || [];
            cannotContainOthersPolicy = property.policies.filter(function (policy) {
                // the only known policy which contains references to other properties
                return policy.policyId === "cannot-contain-others";
            });

            if (cannotContainOthersPolicy.length) {
                cannotContainOthersPolicy.forEach(function (cco) {
                    if (cco.params && cco.params.disallowedFields) {
                        cco.params.disallowedFields = cco.params.disallowedFields
                        .map(function (f) {
                            return prefix + f;
                        });
                    }
                });
            }

            property.name = prefix + property.name;

            return property;
        });
    };

    /**
        Takes a self-service config objet and a stage name and returns the "identityServiceUrl" found for that stage
        @param {String} config - self-service config route
        @param {String} stageName - name of stage within config containing "identityServiceUrl" entry
        @returns {String} the value of the identityServiceUrl or null if not found
    */
    exports.getIdentityServiceUrl = function (config, stageName) {
        var selfServiceConfig = router.read(config),
            stage;

        if (!selfServiceConfig ||
            !selfServiceConfig.stageConfigs ||
            !selfServiceConfig.stageConfigs.length) {
            return null;
        }

        stage = selfServiceConfig.stageConfigs
            .filter(function (stage) {
                return stage.name === stageName;
            })[0];

        if (!stage ||
            !stage.identityServiceUrl) {
            return null;
        }

        return stage.identityServiceUrl;
    };

}());
