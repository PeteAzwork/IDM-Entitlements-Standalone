"use strict";

/*
 * Copyright 2014-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["underscore", "org/forgerock/commons/ui/common/main/AbstractConfigurationAware", "org/forgerock/commons/ui/common/util/ModuleLoader"], function (_, AbstractConfigurationAware, ModuleLoader) {
    var obj = new AbstractConfigurationAware();

    obj.updateConfigurationCallback = function (conf) {
        this.configuration = conf;

        _.forEach(conf, function (val) {
            require.config({
                "map": {
                    "*": { key: val }
                }
            });
        });
    };

    obj.getConnectorModule = function (type) {
        if (_.isUndefined(this.configuration[type])) {
            return ModuleLoader.load("org/forgerock/openidm/ui/admin/connector/ConnectorTypeView");
        } else {
            return ModuleLoader.load(this.configuration[type]);
        }
    };

    return obj;
});
