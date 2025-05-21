"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/common/delegates/ScriptDelegate"], function ($, _, ScriptDelegate) {
    var obj = {};

    obj.model = {
        linkQualifier: []
    };

    obj.checkLinkQualifier = function (mapping) {
        var linkQualifierPromise = $.Deferred();

        if (mapping.linkQualifiers !== undefined) {

            if (mapping.linkQualifiers.type) {
                if (this.model.linkQualifier[mapping.name] !== null && this.model.linkQualifier[mapping.name] !== undefined) {
                    linkQualifierPromise.resolve(this.model.linkQualifier[mapping.name]);
                } else {
                    ScriptDelegate.evalLinkQualifierScript(mapping.linkQualifiers).then(_.bind(function (result) {
                        this.model.linkQualifier[mapping.name] = result;

                        linkQualifierPromise.resolve(this.model.linkQualifier[mapping.name]);
                    }, this));
                }
            } else {
                this.model.linkQualifier[mapping.name] = mapping.linkQualifiers;

                linkQualifierPromise.resolve(this.model.linkQualifier[mapping.name]);
            }
        } else {
            this.model.linkQualifier[mapping.name] = ['default'];

            linkQualifierPromise.resolve(this.model.linkQualifier[mapping.name]);
        }

        return linkQualifierPromise;
    };

    obj.getLinkQualifier = function (mappingName) {
        return this.model.linkQualifier[mappingName];
    };

    obj.setLinkQualifier = function (linkQualifier, mappingName) {
        this.model.linkQualifier[mappingName] = linkQualifier;
    };

    return obj;
});
