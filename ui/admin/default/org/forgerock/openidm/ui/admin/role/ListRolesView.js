"use strict";

/*
 * Copyright 2018-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "bootstrap", "backgrid", "handlebars", "moment", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/openidm/ui/common/resource/ListResourceView", "org/forgerock/openidm/ui/admin/role/util/TemporalConstraintsUtils"], function ($, _, bootstrap, Backgrid, Handlebars, moment, AdminAbstractView, BackgridUtils, Constants, EventManager, ListResourceView, TemporalConstraintsUtils) {
    var ListRolesView = AdminAbstractView.extend({
        template: "templates/admin/role/ListRolesViewTemplate.html",
        events: {
            "click #roleTabHeaders li": "reRoute"
        },
        partials: ["partials/role/_timeConstraintCell.html", "partials/role/_timeConstraintDetail.html"],
        model: {},
        data: {},
        render: function render(args, callback) {
            var _this = this;

            this.data.roleType = args[0];

            this.parentRender(function () {
                _this.loadGrid(args[0]);

                if (callback) {
                    callback();
                }
            });
        },
        loadGrid: function loadGrid(roleType) {
            ListResourceView.data.overrides = {
                element: "#" + roleType + "Tab",
                hideTitle: true,
                noBaseTemplate: true,
                customColumns: this.getCustomColumns()
            };

            ListResourceView.reloadGrid = function (event) {
                if (event) {
                    event.preventDefault();
                }
                // hard reloading here because the default behavior of .reloadGrid() is to just re-render ListResourceView
                // ListResourceView does not know about tabs
                window.location.reload();
            };

            ListResourceView.render([roleType, "role"], function () {
                delete ListResourceView.data.overrides;
                delete ListResourceView.route; //without doing this ListResourceView is not displayed after hitting a managed list view
            });
        },

        reRoute: function reRoute(e) {
            var roleType = $(e.currentTarget).attr("data-role-type");
            e.preventDefault();
            if (roleType) {
                EventManager.sendEvent(Constants.ROUTE_REQUEST, { routeName: roleType + "RolesList", args: [roleType] });
            }
        },
        getCustomColumns: function getCustomColumns() {
            return [{
                "name": "grant",
                "label": $.t("templates.admin.RoleList.grant"),
                "cell": Backgrid.Cell.extend({
                    render: function render() {
                        var cellText = $.t("templates.admin.RoleList.direct");

                        if (_.has(this.model.attributes, "condition") && this.model.attributes.condition && this.model.attributes.condition.length) {
                            cellText = $.t("templates.admin.RoleList.dynamic");
                        }

                        this.$el.html(cellText);

                        return this;
                    }
                }),
                "sortable": false,
                "editable": false
            }, {
                "name": "timeConstraint",
                "label": $.t("templates.admin.RoleList.timeConstraint"),
                "cell": Backgrid.Cell.extend({
                    render: function render() {
                        if (_.has(this.model.attributes, "temporalConstraints") && !_.isNull(this.model.attributes.temporalConstraints) && this.model.attributes.temporalConstraints.length) {
                            var temporalConstraint = TemporalConstraintsUtils.convertFromIntervalString(this.model.attributes.temporalConstraints[0].duration),
                                expired = moment(new Date()).isAfter(new Date(temporalConstraint.end)),
                                active = moment(new Date()).isBetween(new Date(temporalConstraint.start), new Date(temporalConstraint.end));

                            this.$el.html(Handlebars.compile("{{> role/_timeConstraintCell}}")({ active: active, expired: expired }));

                            this.$el.find(".time-constraint-cell").popover({
                                trigger: "hover",
                                placement: "left",
                                html: true,
                                content: function content() {
                                    return Handlebars.compile("{{> role/_timeConstraintDetail}}")({ expired: expired, temporalConstraint: temporalConstraint, active: active });
                                }
                            });
                        }

                        return this;
                    }
                }),
                "sortable": false,
                "editable": false
            }];
        }
    });

    return new ListRolesView();
});
