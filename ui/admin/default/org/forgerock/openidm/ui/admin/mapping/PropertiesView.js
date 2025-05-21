"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/openidm/ui/admin/mapping/properties/LinkQualifiersView", "org/forgerock/openidm/ui/admin/mapping/properties/MappingAssignmentsView", "org/forgerock/openidm/ui/admin/mapping/properties/AttributesGridView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/admin/util/LinkQualifierUtils", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/util/AdminUtils"], function ($, _, MappingAdminAbstractView, LinkQualifiersView, MappingAssignmentsView, AttributesGridView, EventManager, Constants, LinkQualifierUtil, ConnectorDelegate, ConfigDelegate, AdminUtils) {

    var PropertiesView = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/PropertiesTemplate.html",
        element: "#mappingContent",
        noBaseTemplate: true,
        data: {},

        render: function render(args, callback) {
            this.data.docHelpUrl = Constants.DOC_URL;

            this.data.hasLinkQualifiers = !_.isUndefined(this.getCurrentMapping().linkQualifiers);

            this.parentRender(_.bind(function () {

                LinkQualifiersView.render();

                this.renderAttributesGrid(callback);

                MappingAssignmentsView.render();
            }, this));
        },
        renderAttributesGrid: function renderAttributesGrid(callback) {
            var currentMapping = this.getCurrentMapping();
            this.buildAvailableObjectsMap(currentMapping).then(_.bind(function (availableObjects) {
                var _this = this;

                AttributesGridView.render({
                    useDragIcon: true,
                    usesLinkQualifier: true,
                    linkQualifiers: LinkQualifierUtil.getLinkQualifier(currentMapping.name),
                    usesDynamicSampleSource: true,
                    availableObjects: availableObjects[0],
                    requiredProperties: availableObjects[1],
                    mapping: currentMapping,
                    save: function save(mappingProperties) {
                        var mapping = currentMapping;

                        if (mapping.recon) {
                            delete mapping.recon;
                        }

                        if (mappingProperties) {
                            mapping.properties = mappingProperties;

                            _this.AbstractMappingSave(mapping, _.bind(function () {
                                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "mappingSaveSuccess");
                                this.setCurrentMapping(mapping);
                                this.render();
                            }, _this));
                        }
                    },
                    numRepresentativeProps: this.getNumRepresentativeProps()

                }, _.bind(function () {
                    if (callback) {
                        callback();
                    }
                }, this));
            }, this));
        },

        /**
         * Takes an object with a source and target property and returns an Array.
         * The first returned parameter is an object containing name and property information about
         * the source and the target.  The second item is an Array of required target properties
         *
         * @param currentMapping {object}
         * @param currentMapping.target {string}
         * @param currentMapping.source {string}
         *
         * @returns {*}
         */
        buildAvailableObjectsMap: function buildAvailableObjectsMap(currentMapping) {
            var sourceProm = $.Deferred(),
                targetProm = $.Deferred(),
                targetNameParts = currentMapping.target.split("/"),
                sourceNameParts = currentMapping.source.split("/"),
                sourceProperties = AdminUtils.findPropertiesList(sourceNameParts),
                targetProperties = AdminUtils.findPropertiesList(targetNameParts),
                requiredProperties = AdminUtils.findPropertiesList(targetNameParts, true);

            function getManaged(name, promise, properties) {
                promise.resolve({
                    "name": name,
                    "fullName": "managed/" + name,
                    "properties": _.chain(properties).keys().sortBy().value(),
                    "schema": properties
                });
            }

            function getSystem(nameParts, promise, properties, connectorConfig) {
                promise.resolve({
                    "name": nameParts[1],
                    "fullName": nameParts.join("/"),
                    "properties": _.chain(properties).keys().sortBy().value(),
                    "schema": properties,
                    "config": connectorConfig
                });
            }

            return $.when(targetProperties, sourceProperties, requiredProperties).then(_.bind(function (targetProps, sourceProps, requiredProps) {

                // Target is a system object,
                // System properties are always returned as an array of objects, Managed properties are not.
                if (targetNameParts[0] === "system") {
                    var _targetProperties = targetProps[0],
                        targetConfig = targetProps[1];

                    requiredProps = requiredProps[0];
                    getSystem(targetNameParts, targetProm, _targetProperties, targetConfig);

                    // Target is a managed object
                } else {
                    getManaged(targetNameParts[1], targetProm, targetProps);
                }

                // Source is a system object
                // System properties are always returned as an array of objects, Managed properties are not.
                if (sourceNameParts[0] === "system") {
                    var _sourceProperties = sourceProps[0],
                        sourceConfig = sourceProps[1];

                    getSystem(sourceNameParts, sourceProm, _sourceProperties, sourceConfig);

                    // Source is a managed object
                } else {
                    getManaged(sourceNameParts[1], sourceProm, sourceProps);
                }

                return $.when(sourceProm, targetProm).then(function (source, target) {
                    return [{ source: source, target: target }, _.keys(requiredProps)];
                });
            }, this));
        }
    });

    return new PropertiesView();
});
