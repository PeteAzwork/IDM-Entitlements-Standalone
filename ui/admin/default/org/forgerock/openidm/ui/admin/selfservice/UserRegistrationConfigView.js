"use strict";

/*
 * Copyright 2016-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "backbone", "lodash", "handlebars", "backgrid", "org/forgerock/openidm/ui/admin/selfservice/AbstractSelfServiceView", "org/forgerock/openidm/ui/admin/authentication/AuthenticationAbstractView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/delegates/SiteConfigurationDelegate", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/admin/selfservice/SelfServiceUtils", "org/forgerock/openidm/ui/common/delegates/SocialDelegate", "org/forgerock/openidm/ui/admin/mapping/properties/AttributesGridView", "org/forgerock/openidm/ui/common/util/BackgridUtils", "selectize", "bootstrap-tabdrop"], function ($, Backbone, _, Handlebars, Backgrid, AbstractSelfServiceView, AuthenticationAbstractView, ConfigDelegate, SiteConfigurationDelegate, AdminUtils, EventManager, Constants, SelfServiceUtils, SocialDelegate, AttributesGridView, BackgridUtils) {

    var UserRegistrationConfigView = AbstractSelfServiceView.extend({
        template: "templates/admin/selfservice/UserRegistrationConfigTemplate.html",
        events: _.assignIn({
            "click .all-check": "controlAllSwitch",
            "change .section-check": "controlSectionSwitch",
            "click .save-config": "saveConfig",
            "click .wide-card.active": "showDetailDialog",
            "click .add-registration-field": "addRegistrationField"
        }, AbstractSelfServiceView.prototype.events),
        partials: ["partials/providers/_providerCircle.html", "partials/providers/_providerBadge.html", "partials/_toggleIconBlock.html", "partials/selfservice/_registrationFormCell.html", "partials/selfservice/_captcha.html", "partials/selfservice/_consent.html", "partials/selfservice/_emailValidation.html", "partials/selfservice/_translationMap.html", "partials/selfservice/_translationItem.html", "partials/form/_basicInput.html"],
        model: {
            viewName: "idmUserDetails",
            emailServiceAvailable: false,
            dragAndDropGridList: [],
            surpressSave: false,
            serviceType: "user",
            uiConfigurationParameter: "selfRegistration",
            configUrl: "selfservice/registration",
            accountClaimUrl: "selfservice/socialUserClaim",
            msgType: "selfServiceUserRegistration",
            configList: [],
            "configAccountClaimDefault": {
                "stageConfigs": [{
                    "name": "parameters",
                    "parameterNames": ["returnParams"]
                }, {
                    "name": "socialUserClaim",
                    "identityServiceUrl": "managed/user",
                    "claimQueryFilter": "/mail eq \"{{mail}}\""
                }, {
                    "name": "localAutoLogin",
                    "successUrl": "",
                    "identityUsernameField": "userName",
                    "identityPasswordField": "password"
                }],
                "snapshotToken": {
                    "type": "jwt",
                    "jweAlgorithm": "RSAES_PKCS1_V1_5",
                    "encryptionMethod": "A128CBC_HS256",
                    "jwsAlgorithm": "HS256",
                    "tokenExpiry": 300
                },
                "storage": "stateless"
            },
            "configDefault": {
                "allInOneRegistration": true,
                "stageConfigs": [{
                    "name": "parameters",
                    "parameterNames": ["returnParams"]
                }, {
                    "name": "idmUserDetails",
                    "identityEmailField": "mail",
                    "socialRegistrationEnabled": false,
                    "registrationProperties": ["userName", "givenName", "sn", "mail"],
                    "identityServiceUrl": "managed/user",
                    "registrationPreferences": ["marketing", "updates"]
                }, {
                    "name": "termsAndConditions"
                }, {
                    "name": "consent",
                    "consentTranslations": {
                        "en": "substitute appropriate Privacy & Consent wording",
                        "fr": "substitute appropriate Privacy & Consent wording, in French"
                    }
                }, {
                    "name": "captcha",
                    "recaptchaSiteKey": "",
                    "recaptchaSecretKey": "",
                    "recaptchaUri": "https://www.google.com/recaptcha/api/siteverify"
                }, {
                    "name": "emailValidation",
                    "identityEmailField": "mail",
                    "emailServiceUrl": "external/email",
                    "emailServiceParameters": {
                        "waitForCompletion": false
                    },
                    "from": "info@example.com",
                    "subject": "Register new account",
                    "mimeType": "text/html",
                    "subjectTranslations": {
                        "en": "Register new account",
                        "fr": "Créer un nouveau compte"
                    },
                    "messageTranslations": {
                        "en": "<h3>This is your registration email.</h3><h4><a href=\"%link%\">Email verification link</a></h4>",
                        "fr": "<h3>Ceci est votre mail d'inscription.</h3><h4><a href=\"%link%\">Lien de vérification email</a></h4>"
                    },
                    "verificationLinkToken": "%link%",
                    "verificationLink": "https://localhost:8443/#/registration/"
                }, {
                    "name": "kbaSecurityAnswerDefinitionStage",
                    "kbaConfig": null
                }, {
                    "name": "selfRegistration",
                    "identityServiceUrl": "managed/user"
                }, {
                    "name": "localAutoLogin",
                    "successUrl": "",
                    "identityUsernameField": "userName",
                    "identityPasswordField": "password"
                }],
                "snapshotToken": {
                    "type": "jwt",
                    "jweAlgorithm": "RSAES_PKCS1_V1_5",
                    "encryptionMethod": "A128CBC_HS256",
                    "jwsAlgorithm": "HS256",
                    "tokenExpiry": 300
                },
                "storage": "stateless"
            },
            "saveConfig": {},
            identityServiceURLSaveLocations: [{
                "stepName": "idmUserDetails",
                "stepProperty": "identityServiceUrl"
            }, {
                "stepName": "selfRegistration",
                "stepProperty": "identityServiceUrl"
            }],
            data: {
                config: {},
                emailRequired: false
            }
        },
        initDefaultConfig: function initDefaultConfig() {
            this.model.saveConfig = {};
            $.extend(true, this.model.saveConfig, this.model.configDefault);
        },
        render: function render(args, callback) {
            //Master config list for controlling various states such as what is editable and what is enabled by default when turned on
            this.model.configList = [{
                type: "parameters",
                toggledOn: true
            }, {
                type: "socialUserDetails",
                enabledByDefault: false,
                toggledOn: true
            }, {
                type: "termsAndConditions",
                enabledByDefault: false,
                toggledOn: false
            }, {
                type: "consent",
                enabledByDefault: false,
                toggledOn: false
            }, {
                type: "captcha",
                enabledByDefault: false,
                toggledOn: false
            }, {
                type: "emailValidation",
                enabledByDefault: true,
                toggledOn: false
            }, {
                type: "kbaSecurityAnswerDefinitionStage",
                enabledByDefault: true,
                toggledOn: false
            }, {
                type: "selfRegistration",
                toggledOn: true
            }, {
                type: "localAutoLogin",
                enabledByDefault: true,
                toggledOn: true
            }, {
                type: "amAutoLogin",
                enabledByDefault: false,
                toggledOn: true
            }];

            this.data.advancedConfig = {};

            $.when(this.getResources(), ConfigDelegate.readEntity("selfservice.propertymap"), ConfigDelegate.readEntity("ui/configuration"), ConfigDelegate.readEntityAlways(this.model.configUrl), ConfigDelegate.readEntityAlways("external.email"), ConfigDelegate.readEntityAlways("selfservice.terms"), ConfigDelegate.readEntityAlways("selfservice.kba"), ConfigDelegate.readEntityAlways("selfservice/kbaUpdate"), ConfigDelegate.readEntity("managed"), SocialDelegate.providerList()).then(_.bind(function (resources, propertyMap, uiConfig, selfServiceConfig, emailConfig, termsConfig, kbaConfig, kbaUpdateConfig, managedConfig, availableProviders) {
                this.model.propertyMap = propertyMap;
                this.model.emailServiceAvailable = !_.isUndefined(emailConfig) && _.has(emailConfig, "host");
                this.model.termsAndConditionsAvailable = !_.isUndefined(termsConfig) && !_.isEmpty(termsConfig.versions);
                this.model.kbaAvailable = !_.isUndefined(kbaConfig);
                this.model.resources = resources;
                this.model.uiConfig = uiConfig;
                this.model.managed = managedConfig.objects;
                this.model.kbaUpdateEnabled = kbaUpdateConfig && _.isObject(kbaUpdateConfig);

                //Display details for all none social registration stages
                this.data.registrationOptions = [{
                    type: "captcha",
                    name: $.t("templates.selfservice.user.captchaTitle"),
                    details: $.t("templates.selfservice.captcha.description"),
                    editable: true,
                    off: false,
                    togglable: true,
                    displayIcon: "google"
                }, {
                    type: "emailValidation",
                    name: $.t("templates.selfservice.emailValidation"),
                    details: $.t("templates.selfservice.emailValidationDescription"),
                    editable: true,
                    off: !this.model.emailServiceAvailable,
                    showWarning: !this.model.emailServiceAvailable,
                    warningMessage: $.t("templates.selfservice.noEmailConfig"),
                    warningLink: "#emailsettings/",
                    togglable: true,
                    displayIcon: "envelope"
                }, {
                    type: "kbaSecurityAnswerDefinitionStage",
                    name: $.t("templates.selfservice.kbaSecurityAnswerDefinitionStageTitle"),
                    details: $.t("templates.selfservice.kbaSecurityAnswerDefinitionStageHelp"),
                    editable: true,
                    off: false,
                    togglable: true,
                    displayIcon: "list-ol"
                }, {
                    type: "termsAndConditions",
                    name: $.t("templates.selfservice.termsAndConditions.title"),
                    details: $.t("templates.selfservice.termsAndConditions.details"),
                    editable: false,
                    off: !this.model.termsAndConditionsAvailable,
                    showWarning: !this.model.termsAndConditionsAvailable,
                    warningMessage: $.t("templates.selfservice.noTermsVersionsConfig"),
                    warningLink: "#termsAndConditions/",
                    togglable: true,
                    displayIcon: "align-left"
                }, {
                    type: "consent",
                    name: $.t("templates.selfservice.consent.title"),
                    details: $.t("templates.selfservice.consent.details"),
                    editable: true,
                    off: false,
                    togglable: true,
                    displayIcon: "shield"
                }];

                this.data.socialProviders = {
                    providerList: availableProviders.providers,
                    type: "socialUserDetails",
                    editable: false,
                    togglable: true
                };

                if (selfServiceConfig) {
                    var tempIdmUserDetails = void 0;

                    this.data.identityServiceUrl = _.get(_.filter(selfServiceConfig.stageConfigs, {
                        "name": "selfRegistration"
                    })[0], "identityServiceUrl");

                    this.model.saveConfig = {};

                    $.extend(true, this.model.saveConfig, selfServiceConfig);

                    tempIdmUserDetails = _.find(this.model.saveConfig.stageConfigs, {
                        "name": "idmUserDetails"
                    });

                    this.model.registrationProperties = _.clone(tempIdmUserDetails.registrationProperties);

                    //Catch for old files without registrationProperties
                    if (_.isUndefined(this.model.registrationProperties)) {
                        this.model.registrationProperties = [];
                    }

                    this.data.enableSelfService = true;
                    this.data.advancedConfig.snapshotToken = selfServiceConfig.snapshotToken;

                    this.model.currentManagedObject = this.findManagedSchema(this.model.managed, this.data.identityServiceUrl);

                    this.parentRender(_.bind(function () {
                        this.renderAttributeGrid();
                        this.renderRegistrationProperties(this.model.currentManagedObject, this.model.registrationProperties);

                        this.$el.find(".all-check").prop("checked", true);

                        this.model.surpressSave = true;

                        //Set UI to stages to current active and available stages
                        _.forEach(selfServiceConfig.stageConfigs, _.bind(function (stage) {
                            this.$el.find(".wide-card[data-type='" + stage.name + "']").toggleClass("disabled", false);

                            if (stage.name === "idmUserDetails" && stage.socialRegistrationEnabled) {
                                this.$el.find(".wide-card[data-type='socialUserDetails'] .section-check").prop("checked", true).trigger("change");
                            } else {
                                this.$el.find(".wide-card[data-type='" + stage.name + "'] .section-check").prop("checked", true).trigger("change");
                            }
                        }, this));

                        this.model.surpressSave = false;

                        this.$el.find(".nav-tabs").tabdrop();

                        if (!_.isEmpty(_.first(args))) {
                            this.$el.find("#" + _.first(args) + "Tab a").tab("show");
                        }

                        if (callback) {
                            callback();
                        }
                    }, this));
                } else {
                    var registrationProperties = _.get(_.filter(this.model.configDefault.stageConfigs, {
                        "name": "idmUserDetails"
                    })[0], "registrationProperties");

                    this.data.identityServiceUrl = _.get(_.filter(this.model.configDefault.stageConfigs, {
                        "name": "selfRegistration"
                    })[0], "identityServiceUrl");

                    this.initDefaultConfig();

                    this.data.advancedConfig.snapshotToken = this.model.configDefault.snapshotToken;

                    this.data.enableSelfService = false;

                    //Finds current managed object
                    this.model.currentManagedObject = this.findManagedSchema(this.model.managed, this.data.identityServiceUrl);

                    this.parentRender(_.bind(function () {
                        //Feed it list built off of current + missing required schema items
                        this.renderRegistrationProperties(this.model.currentManagedObject, registrationProperties);

                        this.$el.find("#userRegistrationConfigBody").hide();
                        this.$el.find(".nav-tabs").tabdrop();

                        if (!_.isEmpty(_.first(args))) {
                            this.$el.find("#" + _.first(args) + "Tab a").tab("show");
                        }

                        if (callback) {
                            callback();
                        }
                    }, this));
                }
            }, this));
        },

        /**
         * Finds the current managed object based off of the identity resource, currently if it is a none managed resource it
         * returns an empty object allowing the UI to function
         *
         * @param managedList - managed object list
         * @param source - type of managed object based of of identity resource
         * @returns {*} Finds needed managed object based off of identity resource
         */
        findManagedSchema: function findManagedSchema(managedList, source) {
            var managedObject,
                identityUrl = source.split("/");

            if (identityUrl[0] === "managed") {
                managedObject = _.find(managedList, function (managedObject) {
                    return managedObject.name === identityUrl[1];
                });
            } else {
                //For now we catch any non-managed identity resource set the UI into a state of not being able to break
                this.model.registrationProperties = [];
                managedObject = {
                    schema: {
                        properties: [],
                        required: []
                    }
                };
            }

            return _.cloneDeep(managedObject);
        },

        /**
         * This function generates two lists that are used to configure the display of the grid and current available items for the selectize registration field list
         *
         * @param managedProperties - Full list of managed properties based off the currently set identity resource
         * @param currentProperties - List of currently listed properties for registrationProperties
         * @returns {{listItems: Array, gridItems: Array}}
         */
        generateRegistrationLists: function generateRegistrationLists(managedProperties, currentProperties) {
            var gridItems = [],
                listItems = [];

            if (currentProperties.length) {
                _.forEach(currentProperties, function (prop) {
                    var tempProperty = _.clone(managedProperties[prop]);

                    tempProperty.displayKey = prop;

                    gridItems.push(tempProperty);

                    delete managedProperties[prop];
                });

                _.forEach(managedProperties, function (value, key) {
                    var tempProperty = _.clone(managedProperties[key]);

                    if (key !== "_id" && _.isUndefined(tempProperty.encryption) && tempProperty.type === "string" && tempProperty.userEditable === true) {
                        tempProperty.displayKey = key;

                        listItems.push(tempProperty);
                    }
                });
            } else {
                _.forEach(managedProperties, function (value, key) {
                    var tempProperty = _.clone(managedProperties[key]);

                    if (key !== "_id" && _.isUndefined(tempProperty.encryption) && tempProperty.type === "string" && tempProperty.userEditable === true) {
                        tempProperty.displayKey = key;

                        listItems.push(tempProperty);
                    }
                });
            }

            return {
                "listItems": listItems,
                "gridItems": gridItems
            };
        },

        /**
         *  Renders the registration fields grid and selectize
         *
         * @param managedObject - The current managed object used with identity source
         * @param currentProperties - List of the current properties
         */
        renderRegistrationProperties: function renderRegistrationProperties(managedObject, currentProperties) {
            var _this2 = this;

            var _this = this,
                propertiesLists = this.generateRegistrationLists(managedObject.schema.properties, currentProperties);

            this.model.registrationFieldCollection = new Backbone.Collection();

            _.forEach(propertiesLists.gridItems, function (item) {
                if (_.indexOf(managedObject.schema.required, item.displayKey) !== -1) {
                    item.required = true;
                }

                _this2.model.registrationFieldCollection.add(item);
            });

            this.model.registrationFieldGrid = new Backgrid.Grid({
                className: "table backgrid backgrid-count backgrid-with-footer",
                emptyText: $.t("templates.selfservice.noRegistrationFields"),
                row: BackgridUtils.ClickableRow.extend({
                    callback: _.bind(function (e) {
                        e.preventDefault();
                    }, this)
                }),
                columns: BackgridUtils.addSmallScreenCell([{
                    name: "Details",
                    sortable: false,
                    editable: false,
                    cell: Backgrid.Cell.extend({
                        className: "col-sm-7",
                        render: function render() {
                            var data = {
                                "count": this.model.collection.indexOf(this.model) + 1,
                                "displayName": this.model.attributes.title,
                                "name": this.model.attributes.displayKey
                            };

                            this.$el.html(Handlebars.compile("{{> selfservice/_registrationFormCell}}")(data));

                            return this;
                        }
                    })
                }, {
                    name: "Required",
                    sortable: false,
                    editable: false,
                    cell: Backgrid.Cell.extend({
                        className: "required-cell col-sm-4",
                        render: function render() {
                            var display = "";

                            if (this.model.attributes.required) {
                                display = $('<span class="text-success required"><i class="fa fa-check-circle"></i>' + $.t("templates.selfservice.required") + '</span>');
                            }

                            this.$el.html(display);

                            return this;
                        }
                    })
                }, {
                    name: "",
                    sortable: false,
                    editable: false,
                    cell: Backgrid.Cell.extend({
                        render: function render() {
                            var display = $('<span class="btn-link"><i class="fa fa-arrows grid-icon move-registration-item"></i></span>');

                            this.$el.html(display);

                            return this;
                        }
                    })
                }, {
                    name: "",
                    sortable: false,
                    editable: false,
                    cell: Backgrid.Cell.extend({
                        events: {
                            "click .remove-registration-item": "removeRegistrationItem"
                        },
                        render: function render() {
                            var display;

                            if (this.model.attributes.required) {
                                display = $('<span class="btn-link disabled-item"><i class="fa fa-times grid-icon"></i></span>');
                            } else {
                                display = $('<span class="btn-link"><i class="fa fa-times grid-icon remove-registration-item"></i></span>');
                            }

                            this.$el.html(display);

                            this.$el.find(".disabled-item").popover({
                                content: function content() {
                                    return '<span>' + $.t("templates.selfservice.requiredPropertiesMessage") + '</span>';
                                },
                                placement: 'top',
                                container: 'body',
                                html: 'true',
                                title: ''
                            });

                            return this;
                        },
                        removeRegistrationItem: function removeRegistrationItem(event) {
                            var _this3 = this;

                            event.preventDefault();

                            _this.$el.find('.registration-select')[0].selectize.addOption(this.model.attributes);

                            _this.model.registrationProperties = _.reject(_this.model.registrationProperties, function (value) {
                                return value === _this3.model.attributes.displayKey;
                            });

                            _this.model.currentManagedObject.schema.properties[this.model.attributes.displayKey] = this.model.attributes;

                            this.model.collection.remove(this.model);

                            //We need to preserve the dragAndDrop refrence so we must empty and not create a new array
                            _this.model.dragAndDropGridList.length = 0;

                            _.forEach(_this.model.registrationFieldCollection.models, function (model) {
                                _this.model.dragAndDropGridList.push(model.attributes);
                            });

                            _this.customSaveConfig(_this.model.saveConfig);
                        }
                    })
                }]),
                collection: this.model.registrationFieldCollection
            });

            this.$el.find("#registrationFormBody").append(this.model.registrationFieldGrid.render().el);

            this.model.dragAndDropGridList = _.cloneDeep(propertiesLists.gridItems);

            //Setup drag and drop
            BackgridUtils.sortable({
                "containers": [this.$el.find("#registrationFormBody tbody")[0]],
                "handlesClassName": "move-registration-item",
                "rows": this.model.dragAndDropGridList
            }, function (registrationProperties) {
                _this2.moveRegistrationItem(registrationProperties);
            });

            //Setup selectize
            this.$el.find('.registration-select').selectize({
                valueField: 'displayKey',
                labelField: 'title',
                searchField: 'displayKey',
                create: false,
                render: {
                    option: function option(item) {
                        var element = $('<div class="fr-search-option"></div>');

                        $(element).append('<span class="fr-search-primary">' + item.title + '</span>');
                        $(element).append('<span class="fr-search-secondary text-muted"> (' + item.displayKey + ')</span>');

                        return element.prop('outerHTML');
                    }
                }
            });

            //Load selectize
            _.forEach(propertiesLists.listItems, function (property) {
                _this2.$el.find('.registration-select')[0].selectize.addOption(property);
            });
        },

        /**
         * Reloads the grid with the newly arranged schema items (based off drag and drop results)
         *
         * @param registrationProperties List of newly arranged schema properties
         */
        moveRegistrationItem: function moveRegistrationItem(registrationProperties) {
            var registrationList = [];

            this.model.registrationFieldCollection.reset(registrationProperties);

            _.forEach(registrationProperties, function (prop) {
                registrationList.push(prop.displayKey);
            });

            this.model.registrationProperties = registrationList;

            this.customSaveConfig(this.model.saveConfig);
        },

        /**
         * Adds a registration property to the grid and removes the corresponding property from selectize
         *
         * @param event - Click event from add registration property button
         */
        addRegistrationField: function addRegistrationField(event) {
            var _this4 = this;

            event.preventDefault();

            var currentItem = this.$el.find('.registration-select').val(),
                currentProperty = _.clone(this.model.currentManagedObject.schema.properties[currentItem]),
                selectize = this.$el.find('.registration-select')[0].selectize;

            if (_.indexOf(this.model.currentManagedObject.schema.required, currentItem) !== -1) {
                currentProperty.required = true;
            }

            currentProperty.displayKey = currentItem;

            this.model.registrationProperties.push(currentItem);

            this.model.registrationFieldCollection.add(currentProperty);

            selectize.removeOption(selectize.getValue());

            this.model.dragAndDropGridList.length = 0;

            _.forEach(this.model.registrationFieldCollection.models, function (model) {
                _this4.model.dragAndDropGridList.push(model.attributes);
            });

            this.customSaveConfig(this.model.saveConfig);
        },

        renderAttributeGrid: function renderAttributeGrid(propertiesList, requiredPropertiesList) {
            var promise = $.Deferred();

            if (!_.isUndefined(propertiesList)) {
                promise.resolve(propertiesList, requiredPropertiesList);
            } else {
                $.when(AdminUtils.findPropertiesList(this.data.identityServiceUrl.split("/")), AdminUtils.findPropertiesList(this.data.identityServiceUrl.split("/"), true)).then(_.bind(function (propList, requiredProperties) {
                    promise.resolve(propList, requiredProperties);
                }, this));
            }

            $.when(promise).then(_.bind(function (propertiesList, requiredPropertiesList) {
                var availableObjects = {
                    source: {
                        fullName: "mapIdpCommonSchemaToManagedUser",
                        name: "mapIdpCommonSchemaToManagedUser",
                        properties: ["honorificPrefix", "givenName", "middleName", "familyName", "honorificSuffix", "fullName", "nickname", "displayName", "title", "email", "postalAddress", "addressLocality", "addressRegion", "postalCode", "country", "phone", "id", "username", "profileUrl", "photoUrl", "preferredLanguage", "locale", "timezone", "active", "rawProfile"]
                    },
                    target: {
                        fullName: this.data.identityServiceUrl,
                        name: "user",
                        properties: _.chain(propertiesList).keys().sortBy().value()
                    }
                },
                    staticSourceObject = {
                    IDMSampleMappingName: "mapIdpCommonSchemaToManagedUser",
                    "honorificPrefgitix": "Ms",
                    "givenName": "Emma",
                    "middleName": "Ann",
                    "familyName": "Smith",
                    "honorificSuffix": "Jr",
                    "fullName": "Emma Ann Smith Jr",
                    "nickname": "Em",
                    "displayName": "Emma Smith",
                    "title": "Business Analyst",
                    "email": "Emma.Smith@forgerock.com",
                    "postalAddress": "123 Fake Street",
                    "addressLocality": "San Francisco",
                    "addressRegion": "CA",
                    "postalCode": "94101",
                    "country": "USA",
                    "phone": "+1-555-555-5555",
                    "id": "123456",
                    "username": "Emma.smith",
                    "profileUrl": "http://www.fakesocialprovider.com/123456",
                    "photoUrl": "http://www.fakesocialprovider.com/123456/profilePhoto",
                    "preferredLanguage": "en",
                    "locale": "en_US",
                    "timezone": "UTC−08:00",
                    "active": true,
                    "rawProfile": {}
                },
                    _this = this;
                AttributesGridView.render({
                    usesDragIcon: false,
                    usesLinkQualifier: false,
                    usesDynamicSampleSource: false,
                    staticSourceSample: staticSourceObject,
                    availableObjects: availableObjects,
                    requiredProperties: _.keys(requiredPropertiesList),
                    mapping: _.assignIn(this.model.propertyMap, { "name": "mapIdpCommonSchemaToManagedUser" }),
                    save: function save(mappingProperties) {
                        _this.model.propertyMap.properties = mappingProperties;
                        ConfigDelegate.updateEntity("selfservice.propertymap", _this.model.propertyMap).then(function () {
                            _this.renderAttributeGrid(propertiesList, requiredPropertiesList);
                        });
                    }
                });
            }, this));
        },

        showDetailDialog: function showDetailDialog(event) {
            var el,
                currentData = {},
                cardDetails;

            if ($(event.target).hasClass("self-service-card")) {
                el = $(event.target);
            } else {
                el = $(event.target).closest(".self-service-card");
            }

            cardDetails = this.getCardDetails(el);

            if (cardDetails.disabled && !this.$el.find(".all-check").val()) {
                return false;
            }

            if ($(event.target).parents(".checkbox").length === 0 && cardDetails.editable === "true") {
                currentData = _.filter(this.model.saveConfig.stageConfigs, { "name": cardDetails.type })[0];

                this.loadSelfServiceDialog(el, cardDetails.type, cardDetails.type, currentData);
            }
        },

        getDetails: function getDetails() {
            var _this5 = this;

            var details = this.model.saveConfig.stageConfigs.filter(function (stage) {
                return stage.name === "selfRegistration" || stage.name === "localAutoLogin" || stage.name === "idmUserDetails";
            }).reduce(function (result, item) {
                return _.assignIn(result, item);
            }, {});

            AdminUtils.findPropertiesList(details.identityServiceUrl.split("/")).then(function (properties) {
                details.identityEmailOptions = _.chain(properties).keys().sortBy().value();
                details.identityServiceOptions = _this5.model.resources;
                details.snapshotToken = _this5.model.saveConfig.snapshotToken;

                if (!_.isUndefined(_this5.model.currentManagedObject.schema.properties.preferences)) {
                    details.userPreferencesDisplay = _this5.model.currentManagedObject.schema.properties.preferences.properties;
                }
            });
            return details;
        },

        controlAllSwitch: function controlAllSwitch() {
            var _this6 = this;

            var check = this.$el.find(".all-check"),
                tempConfig,
                tempIdmUserDetails;

            this.data.enableSelfService = check.is(":checked");

            if (this.data.enableSelfService) {
                this.$el.find("#userRegistrationConfigBody").show();
                this.$el.find("#enableRegistrationModal").show();

                this.renderAttributeGrid();

                this.model.surpressSave = true;

                _.forEach(this.$el.find(".wide-card"), _.bind(function (card) {
                    tempConfig = _.find(this.model.configList, function (config) {
                        return $(card).attr("data-type") === config.type;
                    });

                    if (tempConfig.type === "kbaSecurityAnswerDefinitionStage") {
                        tempConfig.enabledByDefault = this.model.kbaAvailable;
                    }

                    if (tempConfig.enabledByDefault) {
                        this.activateStage(this.model.emailServiceAvailable, card, $(card).attr("data-type"));
                    } else {
                        this.model.saveConfig.stageConfigs = _.reject(this.model.saveConfig.stageConfigs, function (stage) {
                            return stage.name === $(card).attr("data-type");
                        });
                    }
                }, this));

                this.model.surpressSave = false;

                this.model.uiConfig.configuration[this.model.uiConfigurationParameter] = true;

                tempIdmUserDetails = _.find(this.model.saveConfig.stageConfigs, {
                    "name": "idmUserDetails"
                });

                this.model.registrationProperties = _.clone(tempIdmUserDetails.registrationProperties);

                this.createConfig().then(function () {
                    EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, _this6.model.msgType + "Save");

                    if (_this6.data.socialProviders.providerList.length > 0) {
                        _this6.$el.find("#social .section-check").prop("checked", true).trigger("change");
                    }

                    _this6.openDetails();
                });
            } else {
                this.$el.find(".self-service-body").hide();
                this.$el.find(".self-service-modal-edit").hide();

                this.model.surpressSave = true;
                this.$el.find(".section-check:checked").prop("checked", false).trigger("change");
                this.model.surpressSave = false;
                this.model.uiConfig.configuration[this.model.uiConfigurationParameter] = false;

                this.deleteConfig().then(_.bind(function () {
                    this.initDefaultConfig();
                    EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, this.model.msgType + "Delete");
                }, this));
            }
        },

        activateStage: function activateStage(emailServiceAvailable, card, type) {
            if (type !== "emailValidation") {
                $(card).find(".section-check").prop("checked", true).trigger("change");
            } else if (emailServiceAvailable === true) {
                $(card).find(".section-check").prop("checked", true).trigger("change");
            } else {
                this.model.saveConfig.stageConfigs = _.reject(this.model.saveConfig.stageConfigs, function (stage) {
                    return stage.name === "emailValidation";
                });
            }
        },

        getSuccessUrl: function getSuccessUrl() {
            return _.get(this.model.saveConfig.stageConfigs.find(function (stage) {
                return stage.name === "localAutoLogin";
            }), "successUrl") || "";
        },
        setSuccessUrl: function setSuccessUrl(config, successUrl) {
            config = _.cloneDeep(config);
            _.set(config.stageConfigs.find(function (stage) {
                return stage.name === "localAutoLogin";
            }), "successUrl", successUrl);
            return config;
        },


        controlSectionSwitch: function controlSectionSwitch(event) {
            var _this7 = this;

            var check = $(event.target),
                card = check.parents(".wide-card"),
                cardDetails = this.getCardDetails(card),
                removeConfig = false,
                currentData;

            if (check.is(":checked")) {
                this.model.saveConfig.stageConfigs = this.setSwitchOn(card, this.model.saveConfig.stageConfigs, this.model.configList, this.model.configDefault.stageConfigs, cardDetails.type);

                if (!this.model.surpressSave) {
                    this.showDetailDialog(event);

                    if (cardDetails.type !== "socialUserDetails") {
                        currentData = _.filter(this.model.saveConfig.stageConfigs, { "name": cardDetails.type })[0];

                        if (cardDetails.editable === "true" && cardDetails.type !== "kbaSecurityAnswerDefinitionStage") {
                            this.loadSelfServiceDialog(card, cardDetails.type, cardDetails.type, currentData);
                        } else {
                            this.customSaveConfig(this.model.saveConfig);
                        }
                    } else {
                        this.updateAutoLoginConfigToCurrentAuthenticationMethod(this.setSuccessUrl(this.model.configAccountClaimDefault, this.getSuccessUrl())).then(function (updatedConfig) {
                            _this7.model.configAccountClaimDefault = updatedConfig;
                            return ConfigDelegate.createEntity(_this7.model.accountClaimUrl, updatedConfig);
                        });
                    }
                }
            } else {
                this.model.saveConfig.stageConfigs = this.setSwitchOff(card, this.model.saveConfig.stageConfigs, this.model.configList, cardDetails.type);

                if (cardDetails.type === "socialUserDetails") {
                    ConfigDelegate.deleteEntity(this.model.accountClaimUrl);
                }
            }

            if (!this.model.surpressSave && !removeConfig) {
                this.customSaveConfig(this.model.saveConfig);
            }
        },

        /**
         * @param card {object}
         * @param stages {Array.<Object>}
         * @param configList {Array.<Object>}
         * @param defaultStages {Array.<Object>}
         * @param type {string}
         *
         * @returns {Array.<Object>}
         *
         * This function updates the html to the on status for a stage and returns the updated stage list
         */
        setSwitchOn: function setSwitchOn(card, stages, configList, defaultStages, type) {
            var configItem, saveOrder, defaultLocation, currentStage;

            card.toggleClass("disabled", false);
            card.toggleClass("active", true);

            configItem = _.find(configList, function (config) {
                return config.type === type;
            });

            if (configItem) {
                configItem.toggledOn = true;
            }

            //socialRegistrationEnabled
            if (type !== "socialUserDetails") {
                if (_.filter(stages, { "name": type }).length === 0) {
                    saveOrder = this.findPosition(configList, type);
                    defaultLocation = _.findIndex(defaultStages, function (stage) {
                        return stage.name === type;
                    });

                    stages.splice(saveOrder, 0, _.clone(defaultStages[defaultLocation]));
                }
            } else {
                currentStage = _.find(stages, function (stage) {
                    return stage.name === "idmUserDetails";
                });

                this.$el.find("#attributesGrid").show();

                currentStage.socialRegistrationEnabled = true;
            }

            return stages;
        },

        /**
         * @param card {object}
         * @param stages {Array.<Object>}
         * @param configList {Array.<Object>}
         * @param type {string}
         *
         * @returns {Array.<Object>}
         *
         * This function updates the html to the off status for a stage and returns the updated stage list
         */
        setSwitchOff: function setSwitchOff(card, stages, configList, type) {
            var configItem, currentStage;

            card.toggleClass("active", false);
            card.toggleClass("disabled", true);

            configItem = _.find(configList, function (config) {
                return config.type === type;
            });

            if (configItem) {
                configItem.toggledOn = false;
            }

            if (type !== "socialUserDetails") {
                return _.reject(stages, function (stage) {
                    return stage.name === type;
                });
            } else {
                currentStage = _.find(stages, function (stage) {
                    return stage.name === "idmUserDetails";
                });

                this.$el.find("#attributesGrid").hide();

                currentStage.socialRegistrationEnabled = false;

                return stages;
            }
        },

        /**
         * @param orderedList {Array.<Object>}
         * @param type {string}
         *
         * This function will find the correct position based on what stages are turned on vs its default recommended location
         */
        findPosition: function findPosition(orderedList, type) {
            var position = 0;

            _.forEach(orderedList, function (item) {
                if (item.type === type) {
                    return false;
                }

                if (item.toggledOn) {
                    position++;
                }
            });

            return position;
        },

        /**
         *
         * @param card {object}
         * @returns {{type: string, editable: boolean, disabled: boolean}}
         */
        getCardDetails: function getCardDetails(card) {
            return {
                "type": card.attr("data-type"),
                "editable": card.attr("data-editable"),
                "disabled": card.hasClass("disabled")
            };
        },

        setKBAEnabled: function setKBAEnabled() {
            var uiConfiguration = this.model.uiConfig.configuration;

            if (!this.model.kbaAvailable) {
                uiConfiguration.kbaDefinitionEnabled = false;
                uiConfiguration.kbaEnabled = false;
            } else {
                uiConfiguration.kbaDefinitionEnabled = !!_.find(this.model.saveConfig.stageConfigs, function (stage) {
                    return stage.name === "kbaSecurityAnswerDefinitionStage";
                });
                uiConfiguration.kbaEnabled = !!uiConfiguration.kbaDefinitionEnabled || !!uiConfiguration.kbaVerificationEnabled;
            }
            /*
                If kbaUpdate is enabled we want to make sure the kbaEnabled flag is set to true
                so a user can edit his or her kba questions and answers in the end user profile view.
            */
            if (!uiConfiguration.kbaEnabled && this.model.kbaUpdateEnabled) {
                uiConfiguration.kbaEnabled = true;
            }
        },

        getResources: function getResources() {
            var resourcePromise = $.Deferred();

            if (!this.model.resources) {
                AdminUtils.getAvailableResourceEndpoints().then(_.bind(function (resources) {
                    resourcePromise.resolve(resources);
                }, this));
            } else {
                resourcePromise.resolve(this.model.resources);
            }

            return resourcePromise.promise();
        },

        createConfig: function createConfig() {
            var _this8 = this;

            this.setKBAEnabled();

            return this.updateAutoLoginConfigToCurrentAuthenticationMethod(this.model.saveConfig).then(function (updatedConfig) {
                _this8.model.saveConfig = updatedConfig;
                return $.when(ConfigDelegate.createEntity(_this8.model.configUrl, updatedConfig), ConfigDelegate.updateEntity("ui/configuration", _this8.model.uiConfig));
            }).then(function () {
                return SiteConfigurationDelegate.updateConfiguration(function () {
                    EventManager.sendEvent(Constants.EVENT_UPDATE_NAVIGATION);
                });
            });
        },

        updateAutoLoginConfigToCurrentAuthenticationMethod: function updateAutoLoginConfigToCurrentAuthenticationMethod(currentConfig) {
            var newStage = null,
                updatedConfig = currentConfig,
                currentLocalLoginStage = _.find(currentConfig.stageConfigs, function (stage) {
                return stage.name === "localAutoLogin";
            });
            newStage = SelfServiceUtils.getLocalLoginStage(currentLocalLoginStage.successUrl, currentLocalLoginStage.identityUsernameField, currentLocalLoginStage.identityPasswordField);

            if (newStage) {
                updatedConfig = SelfServiceUtils.replaceAutoLoginStage(currentConfig, newStage);
            }

            return new Promise(function (resolve) {
                resolve(updatedConfig);
            });
        },
        deleteConfig: function deleteConfig() {
            this.setKBAEnabled();

            return $.when(ConfigDelegate.deleteEntity(this.model.configUrl), ConfigDelegate.updateEntity("ui/configuration", this.model.uiConfig)).then(function () {
                SiteConfigurationDelegate.updateConfiguration(function () {
                    EventManager.sendEvent(Constants.EVENT_UPDATE_NAVIGATION);
                });
            });
        },

        customSaveConfig: function customSaveConfig(config, oldData) {
            var _this9 = this;

            var saveData = {},
                idmUserDetailsIndex = _.findIndex(this.model.saveConfig.stageConfigs, {
                "name": "idmUserDetails"
            }),
                idmRegistrationIndex = _.findIndex(this.model.saveConfig.stageConfigs, {
                "name": "selfRegistration"
            }),
                localAutoLoginIndex = _.findIndex(this.model.saveConfig.stageConfigs, {
                "name": "localAutoLogin"
            }),
                refreshView = false,
                managedObject;

            this.setKBAEnabled();

            $.extend(true, saveData, config);

            if (!_.isUndefined(saveData.snapshotToken)) {
                saveData.snapshotToken.tokenExpiry = parseInt(saveData.snapshotToken.tokenExpiry, 10);
            }

            if (!_.isUndefined(oldData) && oldData.identityServiceUrl && saveData.stageConfigs[idmRegistrationIndex].identityServiceUrl !== oldData.identityServiceUrl) {
                refreshView = true;

                managedObject = this.findManagedSchema(this.model.managed, saveData.stageConfigs[idmRegistrationIndex].identityServiceUrl);

                //Changing schema will set the registration properties to everything currently set as required in the schema
                saveData.stageConfigs[idmUserDetailsIndex].registrationProperties = _.clone(managedObject.schema.required);
                saveData.stageConfigs[idmUserDetailsIndex].identityServiceUrl = saveData.stageConfigs[idmRegistrationIndex].identityServiceUrl;
            } else {
                saveData.stageConfigs[idmUserDetailsIndex].registrationProperties = _.clone(this.model.registrationProperties);
            }

            _.forEach(saveData.stageConfigs, function (step) {
                if (_.has(step, "identityServiceProperties")) {
                    delete step.identityServiceProperties;
                    delete step.identityServicePropertiesDetails;
                }
            });

            return this.updateAutoLoginConfigToCurrentAuthenticationMethod(saveData).then(function (updatedConfig) {
                _this9.model.saveConfig = updatedConfig;
                return $.when(ConfigDelegate.updateEntity(_this9.model.configUrl, updatedConfig), ConfigDelegate.updateEntity("ui/configuration", _this9.model.uiConfig));
            }).then(function () {
                if (localAutoLoginIndex !== -1 && _this9.model.saveConfig.stageConfigs[idmUserDetailsIndex].socialRegistrationEnabled) {

                    return _this9.updateAutoLoginConfigToCurrentAuthenticationMethod(_this9.setSuccessUrl(_this9.model.configAccountClaimDefault, _this9.getSuccessUrl())).then(function (updatedConfig) {
                        if (!_.isEqual(_this9.model.configAccountClaimDefault, updatedConfig)) {
                            _this9.model.configAccountClaimDefault = updatedConfig;
                            return ConfigDelegate.updateEntity(_this9.model.accountClaimUrl, updatedConfig);
                        }
                    });
                }
            }).then(function () {
                SiteConfigurationDelegate.updateConfiguration(function () {
                    EventManager.sendEvent(Constants.EVENT_UPDATE_NAVIGATION);
                });

                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, _this9.model.msgType + "Save");

                //If the identityServiceUrl changes we reload the view
                if (refreshView) {
                    _this9.render();
                }
            });
        }
    });

    return new UserRegistrationConfigView();
});
