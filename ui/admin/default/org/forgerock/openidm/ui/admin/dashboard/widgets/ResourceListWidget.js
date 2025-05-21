"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/openidm/ui/common/dashboard/widgets/AbstractWidget", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate", "org/forgerock/openidm/ui/admin/util/ConnectorUtils", "org/forgerock/openidm/ui/admin/delegates/SyncDelegate"], function ($, _, AbstractWidget, ConfigDelegate, ConnectorDelegate, ConnectorUtils, SyncDelegate) {
    var widgetInstance = {},
        Widget = AbstractWidget.extend({
        template: "templates/admin/dashboard/widgets/ResourceListWidgetTemplate.html",
        widgetRender: function widgetRender(args, callback) {
            var _this = this;

            $.when(SyncDelegate.mappingDetails(), ConnectorDelegate.currentConnectors(), ConfigDelegate.readEntity("managed")).then(function (sync, connectors, managedObjects) {
                var tempIconClass = void 0;

                _this.element = args.element[0];

                if (_.isUndefined(args.menuItems)) {
                    args.menuItems = [];
                }

                if (_.isUndefined(args.hideSettings)) {
                    args.hideSettings = false;
                }

                _.forEach(connectors, function (connector) {
                    var splitConfig = connector.config.split("/");

                    connector.cleanUrlName = splitConfig[1] + "_" + splitConfig[2];
                    tempIconClass = ConnectorUtils.getIcon(connector.connectorRef.connectorName);
                    connector.iconClass = tempIconClass.iconClass;
                    connector.iconSrc = tempIconClass.src;
                    connector.cleanUrlName = splitConfig[1] + "_" + splitConfig[2];
                });

                _this.data.count = {
                    connectors: connectors.length,
                    mappings: sync.mappings.length,
                    managed: managedObjects.objects.length
                };

                sync.mappings = _.sortBy(sync.mappings, 'name').slice(0, 4);
                connectors = _.sortBy(connectors, 'displayName').slice(0, 4);
                managedObjects.objects = _.sortBy(managedObjects.objects, 'name').slice(0, 4);

                _this.data.mappings = sync.mappings;
                _this.data.managed = managedObjects.objects;
                _this.data.connectors = connectors;

                _this.parentRender(function () {
                    if (callback) {
                        callback(_this);
                    }
                });
            });
        }
    });

    widgetInstance.generateWidget = function (loadingObject, callback) {
        var widget = {};

        $.extend(true, widget, new Widget());

        widget.render(loadingObject, callback);

        return widget;
    };

    return widgetInstance;
});
