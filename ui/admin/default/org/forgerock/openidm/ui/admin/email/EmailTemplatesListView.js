"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "backgrid", "backbone", "handlebars", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/common/util/BackgridUtils", "backgrid-paginator"], function ($, _, Backgrid, Backbone, Handlebars, AdminAbstractView, eventManager, constants, router, ConfigDelegate, BackgridUtils) {

    var EmailTemplatesListView = AdminAbstractView.extend({
        template: "templates/admin/email/EmailTemplatesListTemplate.html",
        element: "#templatesContainer",
        noBaseTemplate: true,
        events: {},
        partials: ["partials/email/_emailTemplateGridName.html", "partials/email/_emailTemplateGridStatus.html"],
        render: function render(args, callback) {
            var _this = this;

            ConfigDelegate.configQuery("_id sw 'emailTemplate'").then(function (response) {
                var collection = new Backbone.Collection(response.result),
                    emailTemplatesGrid = void 0,
                    ClickableRow = Backgrid.Row.extend({
                    events: {
                        "click": "rowClick"
                    },
                    rowClick: function rowClick(event) {
                        event.preventDefault();
                        eventManager.sendEvent(constants.EVENT_CHANGE_VIEW, {
                            route: router.configuration.routes.emailTemplateView,
                            args: [this.model.get("_id").replace("emailTemplate/", "")]
                        });
                    }
                });
                _this.parentRender(function () {
                    emailTemplatesGrid = new Backgrid.Grid({
                        className: "table backgrid table-hover",
                        row: ClickableRow,
                        columns: BackgridUtils.addSmallScreenCell([{
                            name: "name",
                            sortable: false,
                            editable: false,
                            cell: Backgrid.Cell.extend({
                                render: function render() {
                                    var emailId = this.model.get("_id"),
                                        title = emailId.slice(emailId.indexOf("/") + 1);

                                    this.$el.html(Handlebars.compile("{{> email/_emailTemplateGridName}}")({ emailId: emailId, title: title }));
                                    return this;
                                }
                            })
                        }, {
                            name: "status",
                            sortable: false,
                            editable: false,
                            cell: Backgrid.Cell.extend({
                                render: function render() {
                                    var state = "templates.emailConfig.",
                                        className;
                                    if (this.model.get('enabled')) {
                                        state += "enabled";
                                        className = "text-success";
                                    } else {
                                        state += "disabled";
                                        className = "text-danger";
                                    }
                                    this.$el.html(Handlebars.compile("{{> email/_emailTemplateGridStatus}}")({ className: className, state: state }));
                                    return this;
                                }
                            })
                        }, {
                            name: "",
                            sortable: false,
                            editable: false,
                            cell: BackgridUtils.ButtonCell([{
                                className: "fa fa-pencil pull-right"
                            }])
                        }]),
                        collection: collection
                    });

                    _this.$el.find("#emailTemplatesGrid").append(emailTemplatesGrid.render().el);

                    if (callback) {
                        callback();
                    }
                });
            });
        }
    });

    return new EmailTemplatesListView();
});
