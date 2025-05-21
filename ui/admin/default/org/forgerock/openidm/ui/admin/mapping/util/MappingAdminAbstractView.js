"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["underscore", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/delegates/SyncDelegate", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate"], function (_, AdminAbstractView, SyncDelegate, ConfigDelegate) {

    var currentMapping = {},
        syncConfig = {},
        numRepresentativeProps = 4,
        recon = null,
        syncCanceled = null,
        runSync = _.noop(),
        MappingAdminAbstractView = AdminAbstractView.extend({
        getCurrentMapping: function getCurrentMapping() {
            if (currentMapping.recon) {
                delete currentMapping.recon;
            }

            return _.cloneDeep(currentMapping);
        },

        getSyncConfig: function getSyncConfig() {
            return _.cloneDeep(syncConfig);
        },

        getRecon: function getRecon() {
            return _.cloneDeep(recon);
        },

        getSyncNow: function getSyncNow() {
            return runSync;
        },

        getSyncCanceled: function getSyncCanceled() {
            return _.cloneDeep(syncCanceled);
        },

        getMappingName: function getMappingName() {
            if (currentMapping) {
                return currentMapping.name;
            } else {
                return undefined;
            }
        },

        getNumRepresentativeProps: function getNumRepresentativeProps() {
            return numRepresentativeProps;
        },

        setNumRepresentativeProps: function setNumRepresentativeProps(num) {
            numRepresentativeProps = num;
            return num;
        },

        setCurrentMapping: function setCurrentMapping(mapping) {
            if (mapping.recon) {
                delete mapping.recon;
            }

            currentMapping = mapping;
            return mapping;
        },

        setSyncConfig: function setSyncConfig(sync) {
            syncConfig = sync;
            return sync;
        },

        setRecon: function setRecon(data) {
            recon = data;
            return data;
        },

        setSyncNow: function setSyncNow(syncNow) {
            runSync = syncNow;
            return syncNow;
        },

        setSyncCanceled: function setSyncCanceled(canceled) {
            syncCanceled = canceled;
            return canceled;
        },

        AbstractMappingSave: function AbstractMappingSave(mapping, callback) {
            var i = _.findIndex(syncConfig.mappings, { name: mapping.name });

            if (i >= 0) {
                currentMapping = syncConfig.mappings[i] = mapping;
                ConfigDelegate.updateEntity("sync", { "mappings": syncConfig.mappings }).then(_.bind(callback, this));
            }
        },

        refreshMapping: function refreshMapping(newValues) {
            //get the latest mapping
            var mapping = this.getCurrentMapping();
            //loop over the values of the newValues object
            //and set the value of each mapping[key] property
            _.forEach(newValues, function (val, key) {
                mapping[key] = val;
                //if the property is undefined remove it from the mapping
                if (val === undefined) {
                    delete mapping[key];
                }
            });

            return mapping;
        }
    });

    return MappingAdminAbstractView;
});
