"use strict";

/*
 * Copyright 2016-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "form2js", "jsonEditor", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/openidm/ui/admin/util/InlineScriptEditor"], function ($, _, form2js, JSONEditor, AdminAbstractView, ConfigDelegate, Constants, EventManager, InlineScriptEditor) {

    var authenticationDataChanges = {},
        authenticationData = {},
        AuthenticationAbstractView = AdminAbstractView.extend({
        noBaseTemplate: true,
        element: "#AuthenticationModuleDialogContainer",
        model: {},
        /*
         * beforeSaveCallbacks is an array of optional functions that can be added to AuthenticationAbstractView
         * via pushing to it a function that returns a promise. For example from the render function of the
         * specific auth module's view add something like this:
         *
         *      this.beforeSaveCallbacks.push(this.handleOpenAMUISettings);
         *
         * these functions will recieve one arguement which is the value of authenticationDataChanges
         * and will be run in succession before the actual save to authentication.json
         * **NOTE**
         * if you add one of these functions to an auth module view it will only be executed
         * if that module has been edited
         */
        beforeSaveCallbacks: [],
        knownProperties: ["enabled", "queryOnResource", "queryId", "defaultUserRoles", "propertyMapping", "augmentSecurityContext", "groupRoleMapping"],
        partials: ["partials/form/_titaToggle.html", "partials/form/_basicSelect.html", "partials/form/_basicInput.html", "partials/form/_tagSelectize.html", "partials/authentication/_customProperties.html", "partials/authentication/_augmentSecurityContext.html", "partials/authentication/_propertyMapping.html"],
        events: {
            "click .advanced-toggle": "toggleAdvanced",
            "change #select-userOrGroup": "userOrGroupChange"
        },
        userOrGroupOptions: [{
            "value": "userRoles",
            "display": "templates.auth.modules.userRoles"
        }, {
            "value": "groupMembership",
            "display": "templates.auth.modules.groupMembership"
        }],
        JSONEditorDefaults: {
            disable_edit_json: true,
            disable_array_reorder: false,
            disable_collapse: true,
            disable_properties: true,
            show_errors: 'never',
            template: 'handlebars',
            iconlib: 'fontawesome4',
            theme: 'bootstrap3',
            no_additional_properties: true,
            additionalItems: false,
            required_by_default: true
        },

        getConfig: function getConfig() {
            var basic = form2js("basicFields", ".", true),
                advanced = form2js("advancedFields", ".", true),
                custom = this.getCustomProperties(this.customPropertiesEditor.getValue()),
                augmentSecurityContext = this.getAugmentSecurityContext(),
                userOrGroup = this.getUserOrGroupProperties();

            basic.name = this.data.config.name;

            if (_.has(advanced, "properties")) {
                basic.properties = _.assignIn(basic.properties || {}, advanced.properties);
            }

            basic.properties = _.assignIn(basic.properties || {}, custom);
            basic.properties = _.assignIn(basic.properties || {}, augmentSecurityContext);
            basic.properties = _.assignIn(basic.properties || {}, userOrGroup);

            if (this.getCustomPropertyConfigs) {
                basic.properties = _.assignIn(basic.properties || {}, this.getCustomPropertyConfigs());
            }

            return basic;
        },

        /**
         *
         * @param args
         * @param args.name {string}
         * @param args.customProperties {array}
         * @param args.augmentSecurityContext {object}
         */
        postRenderComponents: function postRenderComponents(args) {
            this.$el.find(".array-selection").selectize({
                delimiter: ",",
                persist: false,
                create: function create(input) {
                    return {
                        value: input,
                        text: input
                    };
                }
            });

            this.$el.find(".array-selection-no-custom").selectize({
                delimiter: ",",
                persist: false
            });

            if (!_.isUndefined(args.augmentSecurityContext)) {
                this.model.scriptEditor = InlineScriptEditor.generateScriptEditor({
                    "element": this.$el.find("#augmentSecurityContext"),
                    "eventName": "module" + args.name + "ScriptEditor",
                    "scriptData": args.augmentSecurityContext
                });
            }

            if (!_.isUndefined(args.customProperties)) {
                this.initCustomPropertiesJSONEditor(args.customProperties);
            }

            if (!_.isUndefined(args.userOrGroup)) {
                this.initGroupMembershipJSONEditor(args.userOrGroup);
            }
        },

        getAugmentSecurityContext: function getAugmentSecurityContext() {
            var returnVal = {};
            if (this.model.scriptEditor.generateScript() !== null) {
                returnVal.augmentSecurityContext = this.model.scriptEditor.generateScript();
            }
            return returnVal;
        },

        /**
         * Takes a list of known properties and the defined properties then creates a list of the
         * unknown properties formatted in such a way that it can be consumed by JSONEditor.
         *
         * @param knownProperties {array<string>} A list of known properties
         * @param configProperties {object} The properties object of an authentication module
         * @returns {Array<object>} A list of JSONEditor formatted object to render custom properties
         */
        getCustomPropertiesList: function getCustomPropertiesList(knownProperties, configProperties) {
            var customProperties = [],
                customPropertyKeys = _.filter(_.keys(configProperties), function (key) {
                if (knownProperties.indexOf(key) === -1) {
                    return true;
                }
            });

            _.forEach(customPropertyKeys, function (property) {
                customProperties.push({
                    "propertyName": property,
                    "propertyValue": configProperties[property]
                });
            });

            return customProperties;
        },

        /**
         * Get the JSONEditor value for the custom properties and formats them back into a
         * standard key:value pair object
         *
         * @returns {object}
         */
        getCustomProperties: function getCustomProperties(config) {
            var formattedProperties = {};

            _.forEach(config, function (property) {
                if (property.propertyName.length > 0) {
                    formattedProperties[property.propertyName] = property.propertyValue;
                }
            });

            return formattedProperties;
        },

        /**
         * Given a default value this will initialize the custom properties JSONEditor with that value.
         * @param defaultValue
         */
        initCustomPropertiesJSONEditor: function initCustomPropertiesJSONEditor(defaultValue) {
            var schema = {
                "type": "array",
                "title": " ",
                "items": {
                    "type": "object",
                    "title": $.t("templates.auth.modules.property"),
                    "headerTemplate": "{{self.propertyName}}",
                    "properties": {
                        "propertyName": {
                            "title": $.t("templates.auth.modules.propertyName"),
                            "type": "string"
                        },
                        "propertyValue": {
                            "title": $.t("templates.auth.modules.propertyType"),
                            "oneOf": [{
                                "type": "string",
                                "title": $.t("templates.auth.modules.string")
                            }, {
                                "title": $.t("templates.auth.modules.simpleArray"),
                                "type": "array",
                                "format": "table",
                                "items": {
                                    "type": "string",
                                    "title": $.t("templates.auth.modules.value")
                                }
                            }]
                        }
                    }
                }
            };

            this.customPropertiesEditor = new JSONEditor(this.$el.find("#customProperties")[0], _.assignIn({
                schema: schema,
                startval: defaultValue
            }, this.JSONEditorDefaults));
        },

        /**
         * Given a authentication module configuration this will determine if the UI should us
         * the user roles or group membership
         *
         * @param config {object}
         * @returns {{type: string, formattedGroupRoleMapping: Array}}
         */
        getUserOrGroupDefault: function getUserOrGroupDefault(config) {
            var userOrGroup = {
                type: "userRoles",
                formattedGroupRoleMapping: []
            };

            if (_.has(config, "properties") && _.has(config.properties, "propertyMapping") && _.has(config.properties.propertyMapping, "groupMembership")) {
                userOrGroup.type = "groupMembership";

                if (_.has(config.properties, "groupRoleMapping")) {
                    _.forEach(config.properties.groupRoleMapping, function (mappings, roleName) {
                        userOrGroup.formattedGroupRoleMapping.push({
                            "groupMapping": mappings,
                            "roleName": roleName
                        });
                    });
                }
            }

            return userOrGroup;
        },

        getUserOrGroupProperties: function getUserOrGroupProperties() {
            if (this.$el.find("#basicPropertyMappingFields")[0] && this.$el.find("#select-userOrGroup")[0]) {
                var userOrGroupProperties = form2js("basicPropertyMappingFields", ".", true),
                    userOrGroup = this.$el.find("#select-userOrGroup").val();

                if (!_.has(userOrGroupProperties, "properties")) {
                    userOrGroupProperties.properties = { "propertyMapping": {} };
                }

                userOrGroupProperties.properties.propertyMapping[userOrGroup] = this.$el.find("#input-properties\\.propertyMapping\\." + userOrGroup).val();

                if (userOrGroup === "groupMembership") {
                    userOrGroupProperties.properties.groupRoleMapping = this.formatGroupMembershipProperties(this.groupMembershipEditor.getValue());
                }

                return userOrGroupProperties.properties;
            }
        },

        /**
         * Takes a JSONEditor formatted value of group membership properties and converts them to an IDM format
         * @param editorValue
         * @returns {{}}
         */
        formatGroupMembershipProperties: function formatGroupMembershipProperties(editorValue) {
            var mappings = {};
            _.forEach(editorValue, function (group) {
                mappings[group.roleName] = group.groupMapping;
            });
            return mappings;
        },

        userOrGroupChange: function userOrGroupChange(e) {
            if ($(e.currentTarget).val() === "userRoles") {
                this.$el.find("#groupMembershipOptions").hide();
                this.$el.find("#userRolesOptions").show();

                this.$el.find("#input-properties.propertyMapping.userRoles").val("");
            } else {
                this.$el.find("#groupMembershipOptions").show();
                this.$el.find("#userRolesOptions").hide();

                this.customPropertiesEditor.setValue({});
            }
        },

        /**
         * Given a default value this will initialize the groupMembership JSONEditor with that value.
         * @param defaultValue
         */
        initGroupMembershipJSONEditor: function initGroupMembershipJSONEditor(config) {
            if (config.type === "groupMembership") {
                this.$el.find("#select-userOrGroup").val("groupMembership").change();
            }

            var schema = {
                "title": $.t("templates.auth.modules.groupRoleMapping"),
                "type": "array",
                "default": [{ "roleName": "internal/role/openidm-admin", "groupMapping": [] }],
                "items": {
                    "type": "object",
                    "title": $.t("templates.auth.modules.role"),
                    "headerTemplate": "{{self.roleName}}",
                    "properties": {
                        "roleName": {
                            "type": "string",
                            "title": $.t("templates.auth.modules.roleName")
                        },
                        "groupMapping": {
                            "title": $.t("templates.auth.modules.groupMappings"),
                            "type": "array",
                            "format": "table",
                            "items": {
                                "type": "string",
                                "title": $.t("templates.auth.modules.group")
                            }
                        }
                    }
                }
            };

            this.groupMembershipEditor = new JSONEditor(this.$el.find("#groupMembershipOptionsEditor")[0], _.assignIn({
                schema: schema,
                startval: config.formattedGroupRoleMapping
            }, this.JSONEditorDefaults));
        },

        retrieveAuthenticationData: function retrieveAuthenticationData(callback) {
            ConfigDelegate.readEntity("authentication").then(_.bind(function (data) {
                authenticationDataChanges = _.cloneDeep(data);
                authenticationData = _.cloneDeep(data);

                if (callback) {
                    callback();
                }
            }, this));
        },

        toggleAdvanced: function toggleAdvanced() {
            this.$el.find(".advancedShowHide").toggleClass("fa fa-caret-down");
            this.$el.find(".advancedShowHide").toggleClass("fa fa-caret-right");
            this.$el.find("#advancedForm").toggle();

            if (this.$el.find("#advancedForm").is(":visible")) {
                this.model.scriptEditor.refresh();
            }
        },

        removeURLsFromUIConfig: function removeURLsFromUIConfig() {
            var patchDefinitions = [{
                "field": "/configuration/logoutUrl",
                "operation": "remove"
            }, {
                "field": "/configuration/amDataEndpoints",
                "operation": "remove"
            }];

            return ConfigDelegate.patchEntity({ "id": "ui/configuration" }, patchDefinitions);
        },

        saveLogoutURL: function saveLogoutURL(logoutURL) {
            return this.patchUIConfig("logoutUrl", logoutURL);
        },

        saveAmDataEndpoints: function saveAmDataEndpoints(amDataEndpoints) {
            return this.patchUIConfig("amDataEndpoints", amDataEndpoints);
        },

        patchUIConfig: function patchUIConfig(field, value) {
            var patchDefinition = {
                "field": "/configuration/" + field,
                "operation": "replace",
                "value": value
            };

            return ConfigDelegate.patchEntity({ "id": "ui/configuration" }, [patchDefinition]);
        },

        getAuthenticationData: function getAuthenticationData() {
            return _.cloneDeep(authenticationData.serverAuthContext);
        },

        /**
         * Keeps a clean, ready to save copy of the authentication changes.
         * This should be called by implementing views right before calling checkChanges to ensure data is always uptodate.
         *
         * @param properties {array} - an array of strings representing the properties in the passed in object.
         * @param object {object} - the object containing changes
         */
        setProperties: function setProperties(properties, object) {
            _.forEach(properties, _.bind(function (prop) {
                if (_.isEmpty(object[prop]) && !_.isNumber(object[prop]) && !_.isBoolean(object[prop])) {
                    delete authenticationDataChanges[prop];
                } else {
                    authenticationDataChanges.serverAuthContext[prop] = object[prop];
                }
            }, this));
        },

        saveAuthentication: function saveAuthentication() {
            var doSave = function doSave() {
                return ConfigDelegate.updateEntity("authentication", authenticationDataChanges).then(function () {
                    EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "authSaveSuccess");
                    authenticationData = _.cloneDeep(authenticationDataChanges);
                    $(".sessionResetAlert").show();
                });
            },
                beforeSaveCallbacksPromise;

            /*
             * Check to see if there have been any beforeSaveCallbacks pushed
             * to AuthenticationAbstractView.beforeSaveCallbacks[]
             * if so loop over all of them concatenating the promises together.
             * Once all their promises are resolved then save authentcation.json.
             */
            if (this.beforeSaveCallbacks.length) {
                _.forEach(this.beforeSaveCallbacks, function (callback) {
                    if (beforeSaveCallbacksPromise) {
                        //concat the promise
                        beforeSaveCallbacksPromise = beforeSaveCallbacksPromise.then(function () {
                            return callback(authenticationDataChanges);
                        });
                    } else {
                        beforeSaveCallbacksPromise = callback(authenticationDataChanges);
                    }
                });
                return beforeSaveCallbacksPromise.then(function () {
                    return doSave();
                });
            } else {
                return doSave();
            }
        },

        reSetElement: function reSetElement(element) {
            this.element = element;
        }

    });

    return AuthenticationAbstractView;
});
