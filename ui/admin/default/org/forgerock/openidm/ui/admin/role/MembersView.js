"use strict";

/*
 * Copyright 2011-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "handlebars", "org/forgerock/commons/ui/common/main/AbstractView", "backgrid", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/openidm/ui/common/resource/RelationshipArrayView", "org/forgerock/openidm/ui/common/resource/ResourceCollectionSearchDialog", "org/forgerock/openidm/ui/admin/role/MembersDialog", "org/forgerock/openidm/ui/common/util/ResourceCollectionUtils", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/admin/role/util/TemporalConstraintsUtils"], function ($, _, Handlebars, AbstractView, Backgrid, BackgridUtils, RelationshipArrayView, ResourceCollectionSearchDialog, MembersDialog, resourceCollectionUtils, Router, TemporalConstraintsUtils) {
    var MembersView = {},
        detailsColumnLabel;

    MembersView.partials = ["partials/resource/_resourceEditLink.html"];

    //overriding the render function here to remove the checkboxes from grid rows
    //that have the _grantType set to conditional
    //accomplished by adding the onGridChange arg
    MembersView.render = function (args, callback) {
        args.onGridChange = _.bind(function () {
            var membersList = this.$el.find("#relationshipArrayList-members tbody, #relationshipArrayList-roles tbody, #relationshipArrayList-authzRoles tbody");

            this.removeConditionalGrantCheckboxes(membersList);

            if (callback) {
                callback();
            }
        }, this);

        if (args.prop.propName === "roles" || args.prop.propName === "authzRoles") {
            detailsColumnLabel = $.t("templates.admin.RoleEdit.role");
        } else {
            detailsColumnLabel = $.t("templates.admin.RoleEdit.member");
        }

        RelationshipArrayView.prototype.render.call(this, args, callback);
    };
    /**
     * @param memberList {object} - a jquery object representing the data rows from the members list grid
     */
    MembersView.removeConditionalGrantCheckboxes = function (membersList) {
        _.forEach(membersList.find("tr"), function (row) {
            var rowIsConditional = $(row).find("td:contains('conditional')").length;

            if (rowIsConditional) {
                $(row).find(".select-row-cell input[type=checkbox]").remove();
            }
        });
    };

    MembersView.openResourceCollectionDialog = function (propertyValue) {
        var opts = this.getResourceCollectionDialogOptions(propertyValue);

        new MembersDialog().renderDialog(opts);
    };

    MembersView.getCols = function () {
        var _this = this,
            selectCol = {
            name: "",
            cell: "select-row",
            headerCell: "select-all",
            sortable: false,
            editable: false
        },
            cols = [],
            relationshipProp = this.schema.properties[this.data.prop.propName].items;

        this.hasRefProperties = _.toArray(relationshipProp.properties._refProperties.properties).length > 1;

        cols.push({
            "name": "details",
            "label": detailsColumnLabel,
            "cell": Backgrid.Cell.extend({
                render: function render() {
                    var displayObject = resourceCollectionUtils.buildResourceDisplayObject(_this.schema, _this.data.prop, this.model.attributes, this.model.attributes),
                        routeArgs = this.model.attributes._ref.split("/"),
                        editRouteName,
                        href,
                        link;

                    if (routeArgs[0] === "system") {
                        editRouteName = "adminEditSystemObjectView";
                    } else {
                        editRouteName = "adminEditManagedObjectView";
                    }

                    href = Router.getLink(Router.configuration.routes[editRouteName], routeArgs);
                    link = Handlebars.compile("{{> resource/_resourceEditLink}}")({
                        "href": href,
                        "displayText": displayObject.txt
                    });

                    this.$el.html(link);

                    return this;
                }
            }),
            sortable: false,
            editable: false
        });

        if (this.hasRefProperties) {
            this.$el.find('.clear-filters-btn').show();
        }

        _.forEach(relationshipProp.properties._refProperties.properties, _.bind(function (col, colName) {
            if (colName !== "_id" && colName !== "_grantType") {
                cols.push({
                    "name": "/_refProperties/" + colName,
                    "label": col.title || col.label || colName,
                    "headerCell": BackgridUtils.FilterHeaderCell,
                    "cell": "string",
                    "sortable": true,
                    "editable": false,
                    "sortType": "toggle"
                });
            }
        }, this));

        cols.push({
            "name": "/_refProperties/_grantType",
            "label": $.t("templates.admin.RoleEdit.grant"),
            "headerCell": BackgridUtils.FilterHeaderCell,
            "cell": "string",
            "sortable": true,
            "editable": false,
            "sortType": "toggle"
        });

        cols.push({
            "name": "/_refProperties/temporalConstraints",
            "label": $.t("templates.admin.RoleEdit.timeConstraint"),
            "cell": Backgrid.Cell.extend({
                render: function render() {
                    var temporalConstraints = this.model.attributes._refProperties.temporalConstraints,
                        timeConstraint = _.isArray(temporalConstraints) && temporalConstraints.length ? TemporalConstraintsUtils.convertFromIntervalString(temporalConstraints[0].duration) : false,
                        cellText = _.isObject(timeConstraint) ? timeConstraint.start + " to " + timeConstraint.end : "";

                    this.$el.html(cellText);

                    return this;
                }
            }),
            "sortable": false,
            "editable": false,
            "sortType": "toggle"
        });

        cols.unshift(selectCol);

        return cols;
    };

    return RelationshipArrayView.extend(MembersView);
});
