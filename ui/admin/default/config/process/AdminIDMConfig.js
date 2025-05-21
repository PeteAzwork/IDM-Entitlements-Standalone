"use strict";

/*
 * Copyright 2016-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["underscore", "org/forgerock/openidm/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager"], function (_, constants, EventManager) {
    var obj = [{
        startEvent: constants.EVENT_HANDLE_DEFAULT_ROUTE,
        description: "",
        override: true,
        dependencies: ["org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/commons/ui/common/main/Router", "config/routes/AdminRoutesConfig"],
        processDescription: function processDescription(event, ConfigDelegate, Configuration, Router, AdminRoutesConfig) {
            var landingPage, dashboardIndex;
            if (Configuration.loggedUser) {
                ConfigDelegate.readEntity("ui/dashboard").then(_.bind(function (dashboardConfig) {
                    // If a default dashboard is configured set that to the landing page
                    if (_.has(dashboardConfig, "adminDashboards") && dashboardConfig.adminDashboards.length > 0) {

                        dashboardIndex = _.findIndex(dashboardConfig.adminDashboards, { "isDefault": true });

                        if (dashboardIndex === -1) {
                            dashboardIndex = 0;
                        }

                        landingPage = {
                            view: "org/forgerock/openidm/ui/admin/dashboard/Dashboard",
                            role: "ui-admin",
                            url: "dashboard/" + dashboardIndex
                        };

                        // If there are no dashboards set the landing page to the new dashboard view
                    } else {
                        landingPage = AdminRoutesConfig.newDashboardView;
                    }

                    EventManager.sendEvent(constants.EVENT_CHANGE_VIEW, { route: landingPage });
                }));
            } else {
                EventManager.sendEvent(constants.EVENT_CHANGE_VIEW, { route: Router.configuration.routes.login });
            }
        }
    }, {
        startEvent: constants.EVENT_REFRESH_CONNECTOR_OBJECT_TYPES,
        description: "",
        override: true,
        dependencies: ["org/forgerock/openidm/ui/admin/connector/EditConnectorView"],
        processDescription: function processDescription(event, EditConnectorView) {
            EditConnectorView.updateConnector(event.objectTypes, event.hasAvailableObjectTypes, event.connectorConfig);
        }
    }, {
        startEvent: constants.EVENT_QUALIFIER_CHANGED,
        description: "",
        override: true,
        dependencies: ["org/forgerock/commons/ui/common/main/Router", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/openidm/ui/admin/mapping/PropertiesView"],
        processDescription: function processDescription(event, router, conf, PropertiesView) {
            PropertiesView.render([event]);
        }
    }, {
        startEvent: constants.EVENT_UPDATE_NAVIGATION,
        description: "Update Navigation Bar",
        dependencies: ["jquery", "org/forgerock/commons/ui/common/components/Navigation", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/main/Configuration"],
        processDescription: function processDescription(event, $, Navigation, ConfigDelegate) {
            var completedCallback,
                name = "";

            if (event) {
                completedCallback = event.callback;
            }

            $.when(ConfigDelegate.readEntity("managed"), ConfigDelegate.readEntity("ui/configuration"), ConfigDelegate.readEntity("ui/dashboard"), ConfigDelegate.readEntityAlways("workflow")).then(function (managedConfig, uiConfig, dashboardConfig, workflow) {
                var selfServiceOptions = [{
                    href: "#selfservice/userregistration/",
                    confKey: "selfRegistration"
                }, {
                    href: "#selfservice/passwordreset/",
                    confKey: "passwordReset"
                }, {
                    href: "#selfservice/forgotUsername/",
                    confKey: "forgotUsername"
                }],
                    workflowEnabled = false;

                if (!_.isUndefined(workflow)) {
                    workflowEnabled = true;
                }

                _.forEach(selfServiceOptions, function (option) {
                    var toggleClass,
                        navItem = _.find(Navigation.configuration.links.admin.urls.configuration.urls, { url: option.href });

                    if (navItem) {
                        if (uiConfig.configuration[option.confKey]) {
                            toggleClass = "fa-toggle-on text-success";
                        } else {
                            toggleClass = "fa-toggle-off text-danger";
                        }

                        // remove all classes from the icon list which start with either fa-* or text-*
                        navItem.icon = _.reject(navItem.icon.split(" "), function (cssClass) {
                            return cssClass.indexOf("fa-") !== -1 || cssClass.indexOf("text-") !== -1;
                        }).join(" ");
                        navItem.icon += " " + toggleClass;
                    }
                });

                // Updates the Dashboards dropdown values
                Navigation.configuration.links.admin.urls.dashboard.urls = [];

                _.forEach(dashboardConfig.adminDashboards, function (dashboard, index) {
                    name = dashboard.name;

                    Navigation.configuration.links.admin.urls.dashboard.urls.push({
                        "url": "#dashboard/" + index,
                        "name": name
                    });
                });

                Navigation.configuration.links.admin.urls.dashboard.urls.push({
                    divider: true
                });

                Navigation.configuration.links.admin.urls.dashboard.urls.push({
                    "url": "#newDashboard/",
                    "icon": "fa fa-plus",
                    "name": "config.AppConfiguration.Navigation.links.newDashboard"
                });

                Navigation.configuration.links.admin.urls.dashboard.urls.push({
                    "url": "#manageDashboards/",
                    "icon": "fa fa-list",
                    "name": "config.AppConfiguration.Navigation.links.manageDashboards"
                });

                // Updates the Managed dropdown values
                Navigation.configuration.links.admin.urls.managed.urls = [];

                Navigation.configuration.links.admin.urls.managed.urls.push({
                    "header": true,
                    "headerTitle": "data"
                });

                _.forEach(managedConfig.objects, function (managed) {
                    if (!managed.schema) {
                        managed.schema = {};
                    }

                    if (!managed.schema.icon) {
                        managed.schema.icon = "fa-cube";
                    }

                    Navigation.configuration.links.admin.urls.managed.urls.push({
                        "url": "#resource/managed/" + managed.name + "/list/",
                        "name": managed.name,
                        "icon": "fa " + managed.schema.icon,
                        "cssClass": "navigation-managed-object"
                    });
                });

                if (workflowEnabled) {
                    Navigation.configuration.links.admin.urls.managed.urls.push({
                        divider: true
                    });

                    Navigation.configuration.links.admin.urls.managed.urls.push({
                        "header": true,
                        "headerTitle": "workflow"
                    });

                    Navigation.configuration.links.admin.urls.managed.urls.push({
                        "url": "#workflow/tasks/",
                        "name": "Tasks",
                        "icon": "fa fa-check-circle-o",
                        "inactive": false
                    });

                    Navigation.configuration.links.admin.urls.managed.urls.push({
                        "url": "#workflow/processes/",
                        "name": "Processes",
                        "icon": "fa fa-random",
                        "inactive": false
                    });
                }

                return Navigation.reload();
            }).always(function () {
                if (completedCallback) {
                    completedCallback();
                }
            });
        }
    }, {
        startEvent: constants.EVENT_SELF_SERVICE_CONTEXT,
        description: "",
        override: true,
        dependencies: ["org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/main/Router"],
        processDescription: function processDescription(event, configDelegate, router) {
            configDelegate.readEntity("ui.context/enduser").then(function (data) {
                location.href = router.getCurrentUrlBasePart() + data.urlContextRoot;
            });
        }
    }, {
        startEvent: constants.EVENT_REST_CALL_ERROR,
        description: "",
        override: true,
        dependencies: ["org/forgerock/commons/ui/common/main/SpinnerManager", "org/forgerock/commons/ui/common/main/ErrorsHandler", "org/forgerock/commons/ui/common/components/Messages"],
        processDescription: function processDescription(event, spinner, errorsHandler, messagesManager) {
            // For legacy reasons policy failures return a 403 error code. This tries to detect this case and display a proper error message.
            if (event.data.status === 403 && _.get(event, ['data', 'responseJSON', 'detail', 'failedPolicyRequirements'])) {
                messagesManager.messages.addMessage({ "type": "error", "message": event.data.responseJSON.message });
            } else {
                errorsHandler.handleError(event.data, event.errorsHandlers);
            }
            spinner.hideSpinner();
        }
    }];

    return obj;
});
