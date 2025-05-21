"use strict";

/*
 * Copyright 2014-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define([], function () {

    var obj = {
        "dashboardView": {
            view: "org/forgerock/openidm/ui/admin/dashboard/Dashboard",
            role: "ui-admin",
            url: /^dashboard\/(.*)$/,
            pattern: "dashboard/?"
        },
        "newDashboardView": {
            view: "org/forgerock/openidm/ui/admin/dashboard/NewDashboard",
            role: "ui-admin",
            url: "newDashboard/"
        },
        "manageDashboardsView": {
            view: "org/forgerock/openidm/ui/admin/dashboard/ManageDashboards",
            role: "ui-admin",
            url: "manageDashboards/"
        },
        "userRegistrationView": {
            view: "org/forgerock/openidm/ui/admin/selfservice/UserRegistrationConfigView",
            role: "ui-admin",
            url: /^selfservice\/userregistration\/(.*)$/,
            pattern: "selfservice/userregistration/?"
        },
        "passwordResetView": {
            view: "org/forgerock/openidm/ui/admin/selfservice/PasswordResetConfigView",
            role: "ui-admin",
            url: "selfservice/passwordreset/"
        },
        "forgotUsernameView": {
            view: "org/forgerock/openidm/ui/admin/selfservice/ForgotUsernameConfigView",
            role: "ui-admin",
            url: "selfservice/forgotUsername/"
        },
        "connectorListView": {
            view: "org/forgerock/openidm/ui/admin/connector/ConnectorListView",
            role: "ui-admin",
            url: "connectors/"
        },
        "editConnectorView": {
            childView: "org/forgerock/openidm/ui/admin/connector/ConnectorDetailsView",
            view: "org/forgerock/openidm/ui/admin/connector/EditConnectorView",
            role: "ui-admin",
            defaults: ["", ""],
            url: /^connectors\/edit\/(.+?)\/(.*)$/,
            pattern: "connectors/edit/?/?"
        },
        "connectorDetailsView": {
            childView: "org/forgerock/openidm/ui/admin/connector/ConnectorDetailsView",
            view: "org/forgerock/openidm/ui/admin/connector/EditConnectorView",
            role: "ui-admin",
            defaults: ["", ""],
            url: /^connectors\/details\/(.+?)\/(.*)$/,
            pattern: "connectors/details/?/?"
        },
        "connectorObjectTypesView": {
            childView: "org/forgerock/openidm/ui/admin/connector/ConnectorObjectTypesView",
            view: "org/forgerock/openidm/ui/admin/connector/EditConnectorView",
            role: "ui-admin",
            defaults: ["", ""],
            url: /^connectors\/objectTypes\/(.+?)\/(.*)$/,
            pattern: "connectors/objectTypes/?/?"
        },
        "connectorSyncView": {
            childView: "org/forgerock/openidm/ui/admin/connector/ConnectorSyncView",
            view: "org/forgerock/openidm/ui/admin/connector/EditConnectorView",
            role: "ui-admin",
            defaults: ["", ""],
            url: /^connectors\/sync\/(.+?)\/(.*)$/,
            pattern: "connectors/sync/?/?"
        },
        "connectorAdvancedView": {
            childView: "org/forgerock/openidm/ui/admin/connector/ConnectorAdvancedView",
            view: "org/forgerock/openidm/ui/admin/connector/EditConnectorView",
            role: "ui-admin",
            defaults: ["", ""],
            url: /^connectors\/advanced\/(.+?)\/(.*)$/,
            pattern: "connectors/advanced/?/?"
        },
        "connectorDataView": {
            childView: "org/forgerock/openidm/ui/admin/connector/ConnectorDataView",
            view: "org/forgerock/openidm/ui/admin/connector/EditConnectorView.js",
            role: "ui-admin",
            url: /^connectors\/data\/(.+?)\/(.*)$/,
            pattern: "connectors/data/?/?"
        },
        "addConnectorView": {
            view: "org/forgerock/openidm/ui/admin/connector/AddConnectorView",
            role: "ui-admin",
            url: "connectors/add/"
        },
        "editObjectTypeView": {
            view: "org/forgerock/openidm/ui/admin/objectTypes/EditObjectTypeView",
            role: "ui-admin",
            url: /^objectType\/edit\/(.+)\/(.+)$/,
            pattern: "objectType/edit/?/?"
        },
        "addObjectTypeView": {
            view: "org/forgerock/openidm/ui/admin/objectTypes/addObjectTypeView",
            role: "ui-admin",
            url: /^objectType\/add\/(.+)$/,
            pattern: "objectType/add/?"
        },
        "editObjectTypePropertyView": {
            view: "org/forgerock/openidm/ui/admin/objectTypes/schema/SchemaPropertyView",
            role: "ui-admin",
            url: /^objectType\/edit\/(.+)\/(.+)\/property\/(.+)$/,
            pattern: "objectType/edit/?/?/property/?"
        },
        "managedListView": {
            view: "org/forgerock/openidm/ui/admin/managed/ManagedListView",
            role: "ui-admin",
            url: "managed/"
        },
        "editManagedView": {
            view: "org/forgerock/openidm/ui/admin/managed/EditManagedView",
            role: "ui-admin",
            url: /^managed\/edit\/(.+)\/$/,
            pattern: "managed/edit/?/"
        },
        "editSchemaPropertyView": {
            view: "org/forgerock/openidm/ui/admin/managed/schema/SchemaPropertyView",
            role: "ui-admin",
            url: /^managed\/edit\/(.+)\/property\/(.+)$/,
            pattern: "managed/edit/?/property/?"
        },
        "editSchemaRelationshipView": {
            view: "org/forgerock/openidm/ui/admin/managed/schema/SchemaPropertyView",
            role: "ui-admin",
            url: /^managed\/edit\/(.+)\/relationship\/(.+)$/,
            pattern: "managed/edit/?/relationship/?",
            // we need to set some initial values
            // so original SchemaPropertyView is able to handle
            // new relationship workflow
            isRelationship: true,
            isRequired: false
        },
        "addManagedView": {
            view: "org/forgerock/openidm/ui/admin/managed/AddManagedView",
            role: "ui-admin",
            url: "managed/add/"
        },
        "authenticationView": {
            view: "org/forgerock/openidm/ui/admin/authentication/AuthenticationView",
            role: "ui-admin",
            url: "authentication/"
        },
        "settingsView": {
            view: "org/forgerock/openidm/ui/admin/settings/SettingsView",
            role: "ui-admin",
            url: /^settings\/(.*)$/,
            pattern: "settings/?/",
            defaults: ["audit"]
        },
        "addMappingView": {
            view: "org/forgerock/openidm/ui/admin/mapping/AddMappingView",
            role: "ui-admin",
            url: "mapping/add/"
        },
        "autoAddMappingView": {
            view: "org/forgerock/openidm/ui/admin/mapping/AddMappingView",
            role: "ui-admin",
            url: /mapping\/add\/(.+?)\/(.+?)$/,
            pattern: "mapping/add/?/?"
        },
        "mappingListView": {
            view: "org/forgerock/openidm/ui/admin/mapping/MappingListView",
            role: "ui-admin",
            url: "mapping/"
        },
        "propertiesView": {
            childView: "org/forgerock/openidm/ui/admin/mapping/PropertiesView",
            view: "org/forgerock/openidm/ui/admin/mapping/MappingBaseView",
            role: "ui-admin",
            url: /^properties\/([^\/]+)\/$/,
            pattern: "properties/?/"
        },
        "behaviorsView": {
            childView: "org/forgerock/openidm/ui/admin/mapping/BehaviorsView",
            view: "org/forgerock/openidm/ui/admin/mapping/MappingBaseView",
            role: "ui-admin",
            url: /^behaviors\/(.+)\/$/,
            pattern: "behaviors/?/"
        },
        "associationView": {
            childView: "org/forgerock/openidm/ui/admin/mapping/AssociationView",
            view: "org/forgerock/openidm/ui/admin/mapping/MappingBaseView",
            role: "ui-admin",
            url: /^association\/(.+)\/$/,
            pattern: "association/?/"
        },
        "scheduleView": {
            childView: "org/forgerock/openidm/ui/admin/mapping/ScheduleView",
            view: "org/forgerock/openidm/ui/admin/mapping/MappingBaseView",
            role: "ui-admin",
            url: /^schedule\/(.+)\/$/,
            pattern: "schedule/?/"
        },
        "advancedView": {
            childView: "org/forgerock/openidm/ui/admin/mapping/AdvancedView",
            view: "org/forgerock/openidm/ui/admin/mapping/MappingBaseView",
            role: "ui-admin",
            url: /^advanced\/(.+)\/$/,
            pattern: "advanced/?/"
        },
        "processListView": {
            view: "org/forgerock/openidm/ui/admin/workflow/ProcessListView",
            role: "ui-admin",
            url: "workflow/processes/"
        },
        "taskListView": {
            view: "org/forgerock/openidm/ui/admin/workflow/TaskListView",
            role: "ui-admin",
            url: "workflow/tasks/"
        },
        "taskInstanceView": {
            view: "org/forgerock/openidm/ui/admin/workflow/TaskInstanceView",
            role: "ui-admin",
            url: /^workflow\/taskinstance\/(.+)$/,
            pattern: "workflow/taskinstance/?"
        },
        "processInstanceView": {
            view: "org/forgerock/openidm/ui/admin/workflow/ProcessInstanceView",
            role: "ui-admin",
            url: /^workflow\/processinstance\/(.+)$/,
            pattern: "workflow/processinstance/?"
        },
        "processDefinitionView": {
            view: "org/forgerock/openidm/ui/admin/workflow/ProcessDefinitionView",
            role: "ui-admin",
            url: /^workflow\/processdefinition\/(.+)$/,
            pattern: "workflow/processdefinition/?"
        },
        "apiExplorerView": {
            view: "org/forgerock/openidm/ui/admin/api/ApiExplorerView",
            role: "ui-admin",
            url: /^apiExplorer$/,
            pattern: "apiExplorer"
        },
        "socialView": {
            view: "org/forgerock/openidm/ui/admin/social/SocialConfigView",
            role: "ui-admin",
            url: "social/"
        },
        "scheduler": {
            view: "org/forgerock/openidm/ui/admin/scheduler/SchedulerListView",
            role: "ui-admin",
            url: "scheduler/"
        },
        "editSchedulerView": {
            view: "org/forgerock/openidm/ui/admin/scheduler/EditSchedulerView",
            role: "ui-admin",
            defaults: ["", ""],
            url: /^scheduler\/edit\/(.+?)\/(.*)$/,
            pattern: "scheduler/edit/?/?"
        },
        "addSchedulerView": {
            view: "org/forgerock/openidm/ui/admin/scheduler/AddSchedulerView",
            role: "ui-admin",
            url: /^scheduler\/add\/(.*)$/,
            pattern: "scheduler/add/?"
        },
        "emailSettingsView": {
            view: "org/forgerock/openidm/ui/admin/email/EmailSettingsView",
            role: "ui-admin",
            url: /^emailsettings\/(.*)$/,
            pattern: "emailsettings/?/",
            defaults: ["provider"]
        },
        "emailTemplateView": {
            view: "org/forgerock/openidm/ui/admin/email/EmailTemplateView",
            role: "ui-admin",
            url: /^emailTemplate\/(.+)$/,
            pattern: "emailTemplate/?"
        },
        "progressiveProfileFormList": {
            view: "org/forgerock/openidm/ui/admin/progressiveProfileForms/ProgressiveProfileFormListView",
            role: "ui-admin",
            url: "progressiveProfileForms/"
        },
        "addProgressiveProfileForm": {
            view: "org/forgerock/openidm/ui/admin/progressiveProfileForms/AddProgressiveProfileFormView",
            role: "ui-admin",
            url: "progressiveProfileForms/add/"
        },
        "editProgressiveProfileForm": {
            view: "org/forgerock/openidm/ui/admin/progressiveProfileForms/EditProgressiveProfileFormView",
            role: "ui-admin",
            url: /^progressiveProfileForms\/edit\/(.*)\/(.*)$/,
            pattern: "progressiveProfileForms/edit/?/?"
        },
        "termsAndConditions": {
            view: "org/forgerock/openidm/ui/admin/termsAndConditions/SettingsView",
            role: "ui-admin",
            url: "termsAndConditions/"
        },
        "addTermsAndConditionsVersion": {
            view: "org/forgerock/openidm/ui/admin/termsAndConditions/AddVersionView",
            role: "ui-admin",
            url: "termsAndConditions/add/"
        },
        "viewTermsAndConditionsVersion": {
            view: "org/forgerock/openidm/ui/admin/termsAndConditions/VersionView",
            role: "ui-admin",
            url: /^termsAndConditions\/version\/(.*)\/(.*)$/,
            pattern: "termsAndConditions/version/?/?"
        },
        "kba": {
            view: "org/forgerock/openidm/ui/admin/kba/EditKbaView",
            role: "ui-admin",
            url: "kba/"
        },
        "managedRolesList": {
            view: "org/forgerock/openidm/ui/admin/role/ListRolesView",
            role: "ui-admin",
            url: /^resource\/(managed)\/role\/list\/$/,
            pattern: "resource/?/role/list/"
        },
        "internalRolesList": {
            view: "org/forgerock/openidm/ui/admin/role/ListRolesView",
            role: "ui-admin",
            url: /^resource\/(internal)\/role\/list\/$/,
            pattern: "resource/?/role/list/"
        }
    };

    return obj;
});
