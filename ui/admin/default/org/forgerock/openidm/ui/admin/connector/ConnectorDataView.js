"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "handlebars", "org/forgerock/openidm/ui/admin/connector/AbstractConnectorView", "org/forgerock/openidm/ui/common/resource/ListResourceView"], function ($, _, handlebars, AbstractConnectorView, ListResourceView) {

    var ConnectorDataTabView = AbstractConnectorView.extend({
        template: "templates/admin/connector/ConnectorDataTabViewTemplate.html",
        element: "#connectorDataTab",
        events: {
            "click .data-tab-button": "loadObjectTypeData"
        },
        partials: ["partials/connector/_noConnectorData.html"],
        data: {},

        render: function render(args) {
            var _this = this;

            this.parent = args;

            this.data.objectTypesArray = _.map(_.keys(this.parent.data.objectTypes), function (key) {
                var active = void 0;

                if (!_this.parent.data.showDataFor) {
                    active = key === _.keys(_this.parent.data.objectTypes)[0];
                } else {
                    active = _this.parent.data.showDataFor === key;
                }

                if (active) {
                    _this.data.objectType = key;
                }

                return {
                    type: key,
                    active: active
                };
            });

            this.parentRender(function () {
                _this.loadObjectTypeData();
            });
        },

        loadObjectTypeData: function loadObjectTypeData(e) {
            if (e) {
                e.preventDefault();

                this.data.objectType = $(e.target).data("objecttype");
            }

            //clear out the existing list view so we don't have elements with the same id on the page
            this.$el.find(".data-list-view").empty();

            if (this.parent.data.enabled) {
                ListResourceView.systemObjectElement = "#" + this.data.objectType + "-tab";
                delete ListResourceView.route; //without doing this ListResourceView is not displayed after hitting a managed list view
                ListResourceView.render(["system", this.parent.data.connectorId, this.data.objectType, this.parent.data.systemType + "_" + this.parent.data.connectorId]);
            } else if (this.data.objectType) {
                this.$el.find("#" + this.data.objectType + "-tab").html(handlebars.compile("{{> connector/_noConnectorData}}"));
            }
        }
    });

    return new ConnectorDataTabView();
});
