"use strict";

/*
 * Copyright 2017-2024 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "backbone", "form2js", "handlebars", "jsonEditor", "org/forgerock/openidm/ui/admin/managed/AbstractManagedView", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/openidm/ui/admin/managed/schema/dataTypes/ArrayTypeView", "org/forgerock/commons/ui/common/components/ChangesPending", "org/forgerock/openidm/ui/common/util/CommonUIUtils", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/openidm/ui/admin/managed/schema/dataTypes/ObjectTypeView", "org/forgerock/openidm/ui/admin/managed/schema/PolicyView", "org/forgerock/openidm/ui/admin/managed/schema/dataTypes/RelationshipTypeView", "org/forgerock/openidm/ui/admin/managed/schema/util/RelationshipUtils", "org/forgerock/openidm/ui/admin/delegates/RepoDelegate", "org/forgerock/openidm/ui/admin/managed/schema/util/SchemaUtils", "org/forgerock/openidm/ui/admin/util/ScriptList", "org/forgerock/commons/ui/common/util/UIUtils"], function ($, _, backbone, form2js, handlebars, JSONEditor, AbstractManagedView, AdminUtils, ArrayTypeView, ChangesPending, CommonUIUtils, ConfigDelegate, Constants, EventManager, ObjectTypeView, PolicyView, RelationshipTypeView, RelationshipUtils, RepoDelegate, SchemaUtils, ScriptList, UIUtils) {

    var SchemaPropertyView = AbstractManagedView.extend({
        template: "templates/admin/managed/schema/dataTypes/SchemaPropertyViewTemplate.html",
        events: {
            "click .advanced-options-toggle": "toggleAdvanced",
            "change input,textarea,select": "makeChanges",
            "change .secureHash_selection": "makeChanges",
            "keyup input": "makeChanges",
            "change #hashedToggle": "toggleHashSelect",
            "change #encryptionToggle": "toggleEncryptionSelect",
            "click .savePropertyDetails": "saveProperty",
            "click #deleteProperty": "deleteProperty",
            "click input[name='isVirtual']": "showHideReturnByDefault",
            "click input[name='notifySelf']": "makeChanges",
            "click input[name='deleteQueryConfig']": "makeChanges",
            "click input[name='flattenProperties']": "makeChanges",
            "shown.bs.tab": "focusFirstInput",
            "keydown form": "handleEnterKey"
        },
        data: {},
        model: {},
        partials: [],
        /**
        * @param {array} args - args[0] = managed object name, args[1] = slash separated list representing property path
        * @param {function} callback - a function to be executed after load
        */
        render: function render(args, callback) {
            var _this = this;

            var partialPromise = UIUtils.preloadPartial("partials/managed/schema/_propertyBreadcrumbLink.html"),
                managedConfigPromise = ConfigDelegate.readEntity("managed"),
                repoPromise = RepoDelegate.findRepoConfig(),
                isRelationship = this.route.isRelationship,
                relationshipSchemaPromise = isRelationship ? this.getRelationshipPropertySchema(args[0], args[1].split("/")[0]).then(function (response) {
                return response;
            }).catch(function (err) {
                if (err.status !== 404) {
                    throw err;
                }
            }) : $.Deferred().resolve(false);

            this.args = args;

            //set this.data and this.model every time this view is rendered so always start with a clean slate
            this.data = {
                availableHashes: ["SHA-256", "SHA-384", "SHA-512"],
                showAdvanced: this.data.showAdvanced,
                objectProperties: this.data.objectProperties,
                currentTab: this.data.currentTab
            };
            this.model = {
                eventList: ["onValidate", "onRetrieve", "onStore"]
            };

            this.data.managedObjectName = args[0];
            this.data.showDefaultValue = true;
            this.propertyArgs = args[1].split("/");
            this.data.isNewProperty = false;

            $.when(managedConfigPromise, repoPromise, partialPromise, relationshipSchemaPromise).then(function (managedConfig, repoConfig, partial, relationshipSchema) {
                _this.data.isRelationship = isRelationship;
                _this.data.managedConfig = managedConfig;
                _this.data.repoConfig = repoConfig;

                //get the breadcrumb trail
                _this.data.breadcrumbs = _this.buildBreadcrumbArray(_this.data.managedObjectName, _this.propertyArgs);

                //dig in get the currentManagedObject and get a reference to the property to be edited based on propertyArgs
                _this.data.currentManagedObjectIndex = _.findIndex(managedConfig.objects, { name: _this.data.managedObjectName });

                _this.model.managedConfig = _.cloneDeep(managedConfig);
                _this.data.currentManagedObject = managedConfig.objects[_this.data.currentManagedObjectIndex];
                _this.data.property = isRelationship && _this.args.length > 2 ? _this.getPropertyFromCurrentManagedObject(_this.data.currentManagedObject, _this.propertyArgs, _this.args[2]) : _this.getPropertyFromCurrentManagedObject(_this.data.currentManagedObject, _this.propertyArgs, relationshipSchema);

                //check to see if there is actually a property
                if (_this.data.property === "INVALID") {
                    _this.data.invalidProperty = true;
                }

                _this.setTypeSpecificElements();

                //if this is an obect type property we always want to default to the properties tab showSchema flag does this
                //otherwise the details tab will be the default
                if (_this.data.property.type === "object") {
                    _this.data.showSchema = true;
                }

                // hide default value editor for relationships and virtual props
                if (_this.data.property.type === "relationship" || _this.data.property.type === "relationships" || _this.data.property.isVirtual || _this.propertyArgs.length > 1) {
                    _this.data.showDefaultValue = false;
                }

                _this.parentRender(function () {
                    _this.focusFirstInput();
                    // setup default value editor for all types except relationships and virtual props
                    if (_this.data.showDefaultValue) {
                        _this.setDefaultValue();
                    }
                    _this.setupChangesPending();
                    _this.setTabChangeEvent();

                    PolicyView.render([_this]);

                    _this.setupScriptList();
                    //setup notifyRelationships multiselect
                    _this.setupNotifyRelationships();

                    if (_this.loadTypeSpecificElements) {
                        _this.loadTypeSpecificElements();
                    }

                    if (_this.data.currentTab) {
                        _this.$el.find('a[href="' + _this.data.currentTab + '"]').tab('show');
                    }

                    _this.showHideReturnByDefault();

                    if (callback) {
                        callback();
                    }
                });
            });
        },
        /**
        * This function sets up a JSONEditor based on property type.
        * Used to set/display the property's default value.
        */
        setDefaultValue: function setDefaultValue() {
            var editorContainer = this.$el.find(".default-value-editor"),
                editorSchema = {
                type: this.data.property.type
            },
                editor,
                editorValue;

            if (!this.data.property.default) {
                switch (this.data.property.type) {
                    case "object":
                        this.data.property.default = {};
                        break;
                    case "boolean":
                        this.data.property.default = false;
                        break;
                    case "array":
                        this.data.property.default = [];
                        break;
                }
            }

            if (this.data.property.default === undefined || this.data.property.default === null) {
                editorValue = null;
            } else {
                editorValue = this.data.property.default;
            }

            if (this.data.property.type === "object") {
                editorSchema = {
                    type: "object",
                    properties: this.data.property.properties || {},
                    order: this.data.property.order || []
                };

                editorValue = _.cloneDeep(this.data.property.default);

                if (!editorValue) {
                    editorValue = {};
                }
            }

            if (this.data.property.type === "array") {
                editorSchema = {
                    type: "array",
                    items: {
                        type: this.data.property.items.type || null,
                        properties: this.data.property.items.properties || null,
                        order: this.data.property.items.order || null
                    }
                };

                editorValue = _.cloneDeep(this.data.property.default);

                if (!editorValue) {
                    editorValue = [];
                }
            }

            editor = new JSONEditor(editorContainer[0], {
                disable_array_reorder: true,
                disable_collapse: true,
                disable_edit_json: false,
                disable_properties: false,
                iconlib: "fontawesome4",
                no_additional_properties: false,
                theme: "bootstrap3",
                schema: editorSchema
            });

            editorContainer.find("label:eq(0)").hide();
            editorContainer.find("span:contains(root)").hide();
            editorContainer.find(".form-group").removeClass("form-group");

            editor.on('change', _.bind(function () {
                if (this.data.property.type === 'number' && editor.root.value === '') {
                    this.data.property.default = null;
                } else {
                    this.data.property.default = editor.getValue();
                }
                this.makeChanges();
            }, this));

            editor.setValue(editorValue);
        },
        setupChangesPending: function setupChangesPending() {
            var _this2 = this;

            var watchedObj = _.cloneDeep(this.getCurrentFormValue(this.data.property));
            this.model.changesModule = ChangesPending.watchChanges({
                element: this.$el.find(".changes-pending-container"),
                undo: true,
                watchedObj: watchedObj,
                watchedProperties: _.keys(watchedObj).concat(["encryption", "scope", "secureHash", "referencedRelationshipFields", "referencedObjectFields", "flattenProperties", "notifyRelationships"]),
                undoCallback: function undoCallback() {
                    _this2.render(_this2.args, function () {
                        if (_this2.data.showAdvanced) {
                            _this2.toggleAdvanced();
                        }
                    }, true);
                }
            });
        },
        setupScriptList: function setupScriptList() {
            var _this3 = this;

            var eventKeys = _.chain(this.data.property).keys().without("name", "properties").value();

            //Added events are used for the events that are currently set by the managed object
            this.data.addedEvents = _.intersection(eventKeys, this.model.eventList);

            //Select events are the events currently available for the select
            this.data.selectEvents = _.difference(this.model.eventList, eventKeys);

            this.model.propertyScripts = ScriptList.generateScriptList({
                element: this.$el.find("#managedPropertyEvents"),
                label: $.t("templates.managed.addPropertyScript"),
                selectEvents: this.data.selectEvents,
                addedEvents: this.data.addedEvents,
                currentObject: this.data.property,
                hasWorkflow: true,
                workflowContext: this.data.isRelationship ? null : this.data.currentManagedObject.schema.order,
                saveCallback: function saveCallback() {
                    _this3.saveProperty(false, function () {
                        _this3.$el.find('a[href="#scriptsContainer"]').tab('show');
                    });
                }
            });
        },
        /**
        * This function digs in to the currentManagedObject and returns the property to be edited based on the propertyArgs.
        * It also sets the this.data.parentProperty object to be used when saving the property.
        * If the property does not exist then the string "INVALID PROPERTY" is returned.
        * @param {object} currentManagedObject
        * @param {array} propertyArgs
        * @returns {object}
        */
        getPropertyFromCurrentManagedObject: function getPropertyFromCurrentManagedObject(currentManagedObject, propertyArgs, schemaProperty) {
            var _this4 = this;

            var property = schemaProperty ? schemaProperty : currentManagedObject.schema.properties[propertyArgs[0]],
                propertyName = propertyArgs[0],
                nestedItems,
                invalid = "INVALID",
                getPropertyFromArrayObject = function getPropertyFromArrayObject(prop, propName) {
                if (prop.items) {
                    prop = getPropertyFromArrayObject(prop.items, propName);
                } else {
                    prop = prop.properties[propName];
                }

                return prop || invalid;
            },
                getPropertyFromProperty = function getPropertyFromProperty(prop, propName) {
                _this4.data.parentProperty = prop;

                if (prop.type === "array") {
                    prop = getPropertyFromArrayObject(prop.items, propName);
                    nestedItems = SchemaUtils.handleArrayNest(_this4.data.parentProperty.items);
                    prop.requiredByParent = _.indexOf(nestedItems.required, propName) >= 0;
                } else {
                    prop = prop.properties[propName];

                    if (prop) {
                        prop.requiredByParent = _.indexOf(_this4.data.parentProperty.required, propName) >= 0;
                    }
                }

                return prop || invalid;
            };

            if (!property) {
                this.data.isNewProperty = true;
                if (this.data.isRelationship) {
                    // property doesn't exist and is invalid, but we want to create new relationship
                    property = RelationshipUtils.relationshipPropertyTemplate;
                    property.title = _.capitalize(propertyName);
                    this.data.propertyName = propertyName;
                    currentManagedObject.schema.order = currentManagedObject.schema.order.concat(propertyName);
                    currentManagedObject.schema.properties[propertyName] = property;
                    this.data.managedConfig.objects[this.data.currentManagedObjectIndex] = this.data.currentManagedObject;

                    this.data.currentManagedObjectIndex = _.findIndex(this.data.managedConfig.objects, { name: this.data.managedObjectName });

                    // Assign the model config after managedConfig has been mutated with any new relationship property
                    this.model.managedConfig = _.cloneDeep(this.data.managedConfig);
                    this.data.currentManagedObject = _.cloneDeep(currentManagedObject);
                } else {
                    return invalid;
                }
            } else {
                this.data.isNewProperty = false;
            }

            property.requiredByParent = _.indexOf(currentManagedObject.schema.required, propertyArgs[0]) >= 0;

            this.data.parentProperty = currentManagedObject.schema;

            _.forEach(propertyArgs, function (propName, index) {
                if (index > 0) {
                    property = getPropertyFromProperty(property, propName);
                }

                property.nullable = false;

                if (_.isArray(property.type)) {
                    property.type = property.type[0];
                    property.nullable = true;
                }

                if (property.type === "array" && property.items.type === "relationship") {
                    property.type = "relationships";
                }

                if (property.type === "relationships" && typeof property.items.notifySelf !== "undefined") {
                    property.notifySelf = property.items.notifySelf;
                }

                if (index === propertyArgs.length - 1) {
                    _this4.data.propertyName = propName;
                } else {
                    delete property.requiredByParent;
                }
                // special handling of property.queryConfig.referencedRelationshipFields because it is an array
                if (property.isVirtual && _.has(property, 'queryConfig.referencedRelationshipFields')) {
                    // stringify the referencedRelationshipFields then parse it before saving
                    property.queryConfig.referencedRelationshipFields = JSON.stringify(property.queryConfig.referencedRelationshipFields);
                }
            });

            property = _.cloneDeep(property);

            return property;
        },
        getCurrentFormValue: function getCurrentFormValue(currentProperty) {
            var formVal = form2js("propertyDetailsForm", ".", false);

            if (this.data.relationshipTypeView) {
                var _data$relationshipTyp = this.data.relationshipTypeView.getValue(),
                    updatedConfig = _data$relationshipTyp.updatedConfig;

                currentProperty = RelationshipUtils.getObjectByName(this.data.managedObjectName, updatedConfig).schema.properties[this.data.propertyName];
            }

            if (!this.$el.find("#encryptionToggle:checked").length || this.$el.find("#encryptionToggle:checked").length && !formVal.encryption.purpose.length) {
                delete currentProperty.encryption;
                delete formVal.encryption;
            }

            if (!this.$el.find("#privateToggle:checked").length && currentProperty.scope) {
                delete currentProperty.scope;
                delete formVal.scope;
            }

            if (!this.$el.find("#hashedToggle:checked").length) {
                delete currentProperty.secureHash;
                delete formVal.secureHash;
            }

            if (this.model.propertyScripts) {
                _.assignIn(currentProperty, this.model.propertyScripts.getScripts());
            }

            if (this.data.arrayTypeView) {
                var items = this.data.arrayTypeView.getValue();

                if (items.type) {
                    currentProperty.items = items;
                }
            }

            return _.assignIn(currentProperty, formVal);
        },
        /**
        * This function builds an array of breadcrumb objects base on the props array
        */
        buildBreadcrumbArray: function buildBreadcrumbArray(managedObject, props) {
            var link = "#managed/edit/" + managedObject,
                breadcrumbArray = [{
                html: handlebars.compile("{{> managed/schema/_propertyBreadcrumbLink}}")({
                    link: link + "/",
                    prop: managedObject
                }),
                text: managedObject,
                route: {
                    name: "editManagedView",
                    args: [managedObject]
                }
            }],
                propsClone = _.cloneDeep(props);

            link += "/property";

            _.forEach(propsClone, function (prop, index) {
                var html,
                    route = {
                    name: "editSchemaPropertyView",
                    args: [managedObject, propsClone]
                },
                    isLast = index === propsClone.length - 1;

                link += "/" + prop;

                html = handlebars.compile("{{> managed/schema/_propertyBreadcrumbLink}}")({
                    link: link,
                    prop: prop,
                    isLast: isLast
                });

                breadcrumbArray.push({
                    html: html,
                    text: prop,
                    route: route,
                    isLast: isLast
                });
            });

            return breadcrumbArray;
        },
        setTypeSpecificElements: function setTypeSpecificElements() {
            this.loadTypeSpecificElements = false;

            switch (this.data.property.type) {
                case "object":
                    this.loadTypeSpecificElements = this.loadPropertiesGrid;
                    this.data.headerIcon = "fa-cube";
                    break;
                case "array":
                    this.loadTypeSpecificElements = this.loadArrayTypeView;
                    this.data.headerIcon = "fa-list";
                    break;
                case "relationship":
                case "relationships":
                    this.loadTypeSpecificElements = this.loadRelationshipTypeView;
                    this.data.headerIcon = "fa-arrows-h";
                    break;
                case "string":
                    this.data.headerIcon = "fa-font";
                    break;
                case "boolean":
                    this.data.headerIcon = "fa-toggle-on";
                    break;
                case "number":
                    this.data.headerIcon = "fa-hashtag";
                    break;
            }
        },
        toggleAdvanced: function toggleAdvanced(e) {
            var _this5 = this;

            if (e) {
                e.preventDefault();
            }

            this.$el.find(".advanced-options-toggle").toggle();
            this.$el.find(".advancedShowHide").slideToggle(function () {
                _this5.data.showAdvanced = _this5.$el.find(".advancedShowHide").is(":visible");
            });
        },
        /**
        This function is called any time the form is updated. It updates the current config,
        checks with the changes pending module for any differences with the original form,
        toggles the save button on when there are changes, and off when the form is current.
        **/
        makeChanges: function makeChanges() {
            this.data.property = this.getCurrentFormValue(this.data.property);

            this.model.changesModule.makeChanges(_.clone(this.data.property));

            var isValidRelationship = this.data.isRelationship && this.data.property.type === 'relationship' && this.data.property.resourceCollection.length > 0 || this.data.property.type === 'array' || this.data.property.type === 'relationships' && this.data.property.items.resourceCollection.length > 0;
            if (this.model.changesModule.isChanged() && (isValidRelationship || !this.data.isRelationship)) {
                this.$el.find(".btn-save").prop("disabled", false);
            } else {
                this.$el.find(".btn-save").prop("disabled", true);
            }
        },
        toggleHashSelect: function toggleHashSelect(e) {
            e.preventDefault();

            if ($(e.target).is(":checked")) {
                this.$el.find(".secureHash_selection").show();
                if (this.$el.find("#encryptionToggle").is(":checked")) {
                    this.$el.find("#encryptionToggle").click();
                }
            } else {
                this.$el.find(".secureHash_selection").hide();
            }
        },
        toggleEncryptionSelect: function toggleEncryptionSelect(e) {
            e.preventDefault();

            if ($(e.target).is(":checked")) {
                this.$el.find("#encryptionPurpose").show();
            } else {
                this.$el.find("#encryptionPurpose").hide();
            }

            if ($(e.target).is(":checked") && this.$el.find("#hashedToggle").is(":checked")) {
                this.$el.find("#hashedToggle").click();
            }
        },
        saveProperty: function saveProperty(e, callback) {
            var self = this,
                requiredIndex = _.indexOf(this.data.parentProperty.required, this.data.propertyName),
                property = this.data.property,
                parentProperty = this.data.parentProperty,
                currentTab = this.data.currentTab,
                scriptsView = this.model.propertyScripts,
                saveCallback = callback,
                nestedItems,
                promises = [];

            if (e) {
                e.preventDefault();
                saveCallback = function saveCallback() {
                    self.$el.find('a[href="' + currentTab + '"]').tab('show');
                    if (callback) {
                        callback();
                    }
                };
            }

            if (this.data.relationshipTypeView) {
                var _data$relationshipTyp2 = this.data.relationshipTypeView.getValue(),
                    updatedConfig = _data$relationshipTyp2.updatedConfig,
                    changedObjects = _data$relationshipTyp2.changedObjects,
                    _data = this.data,
                    propertyName = _data.propertyName,
                    managedObjectName = _data.managedObjectName,
                    managedConfig = _.cloneDeep(updatedConfig),
                    currentObjectIndex = _.findIndex(managedConfig.objects, { name: managedObjectName }),
                    propertyPath = "objects[" + currentObjectIndex + "].schema.properties." + propertyName,
                    cleanProperty = _.omit(property, _.reject(_.keys(property), function (key) {
                    return _.includes(RelationshipUtils.otherProperties, key);
                })),
                    currentManagedObject = void 0,
                    updatedCleanProperty = void 0;
                // create an updated version of the property


                updatedCleanProperty = _.merge(_.cloneDeep(property), cleanProperty);
                // add scripts
                if (scriptsView) {
                    //remove all previously existing scripts
                    updatedCleanProperty = _.omit(updatedCleanProperty, this.model.eventList);
                    //then add the lastest version of these scripts back to the property
                    updatedCleanProperty = _.assignIn(updatedCleanProperty, scriptsView.getScripts());
                }
                // add property to config
                managedConfig = _.set(managedConfig, propertyPath, updatedCleanProperty);

                // pass any additional changed objects to `saveManagedObject` as repo promises
                if (changedObjects.length > 1) {
                    var getRepoPromise = _.bind(this.getRepoPromise, this);
                    promises = promises.concat(_.reject(changedObjects, { name: managedObjectName }).map(getRepoPromise));
                }

                // handle requiredByParent field
                if (property.requiredByParent) {
                    if (this.data.isRelationship) {
                        property.required = true;
                    }
                    managedConfig.objects[currentObjectIndex].schema.required.push(propertyName);
                } else {
                    if (this.data.isRelationship) {
                        property.required = false;
                    }
                    var requiredFields = managedConfig.objects[currentObjectIndex].schema.required,
                        filteredRequiredList = _.reject(requiredFields, function (requiredProperty) {
                        return requiredProperty === propertyName;
                    });
                    managedConfig.objects[currentObjectIndex].schema.required = filteredRequiredList;
                }

                // replace data config with updated version of config
                currentManagedObject = _.find(managedConfig.objects, { name: managedObjectName });
                if (!this.data.isRelationship) {
                    property = currentManagedObject.schema.properties[propertyName];
                }

                // if property.type is set to "relationships" here set it back to "array"
                if (property.type === "relationships") {
                    property.type = "array";
                }

                this.data.property = property;
                this.data.managedConfig = managedConfig;
                this.data.currentManagedObject = currentManagedObject;

                // handle nullable false
                if (cleanProperty.nullable === false && this.data.property.type !== "array" && _.isArray(this.data.property.type)) {
                    this.data.property.type = "relationship";
                }
            }

            if (property.pattern === null || !_.isUndefined(property.pattern) && property.pattern.length === 0) {
                delete property.pattern;
            }

            if (parentProperty.type === "array") {
                nestedItems = SchemaUtils.handleArrayNest(parentProperty.items);
                requiredIndex = _.indexOf(nestedItems.required, this.data.propertyName);
            }

            // delete default value if property.default is an empty string, is false, or is an empty object/array
            if (property.type === "string" && this.data.property.default === "" || property.type === "boolean" && this.data.property.default === false || property.type === "number" && this.data.property.default === null || (property.type === "object" || property.type === "array") && _.isEmpty(this.data.property.default)) {
                delete this.data.property.default;
            }

            var shouldCleanArray = property.type === "array" && _.has(this.data.property, "default") && this.data.property.default.length > 0;
            if (shouldCleanArray) {
                this.data.property.default = this.data.property.default.filter(function (value) {
                    return value;
                });
            }

            if (property.nullable) {
                property.type = [property.type, "null"];
            }
            // remove properties that should not be sent with the save payload
            delete property.nullable;
            delete property.root;

            if (scriptsView) {
                //remove all previously existing scripts
                property = _.omit(property, this.model.eventList);
                //then add the lastest version of these scripts back to the property
                property = _.assignIn(property, scriptsView.getScripts());
            }

            if (property.type === "object") {
                property = _.assignIn(property, this.data.objectProperties.getValue());
            }

            if (property.minLength && typeof property.minLength === "string") {
                property.minLength = Number(property.minLength);
            }

            if (this.data.arrayTypeView) {
                property.items = this.data.arrayTypeView.getValue();
            }

            if (property.requiredByParent && requiredIndex === -1) {
                if (parentProperty.type === "array") {
                    nestedItems.required.push(this.data.propertyName);
                } else {
                    parentProperty.required.push(this.data.propertyName);
                }
            } else if (!property.requiredByParent && requiredIndex > -1) {
                if (parentProperty.type === "array") {
                    nestedItems.required.splice(requiredIndex, 1);
                } else {
                    parentProperty.required.splice(requiredIndex, 1);
                }
            }

            delete property.requiredByParent;

            if (parentProperty.type === "array") {
                nestedItems.properties[this.data.propertyName] = property;
            } else {
                parentProperty.properties[this.data.propertyName] = property;
            }

            property.referencedRelationshipFields = property.referencedRelationshipFields ? property.referencedRelationshipFields.replace(/\s+/g, '') : "";
            property.referencedObjectFields = property.referencedObjectFields ? property.referencedObjectFields.replace(/\s+/g, '') : "";
            if (property.isVirtual && property.referencedRelationshipFields.length > 0) {
                if (!property.queryConfig || _.isEmpty(property.queryConfig)) {
                    property.queryConfig = {
                        "referencedRelationshipFields": property.referencedRelationshipFields.split(",")
                    };
                } else {
                    property.queryConfig.referencedRelationshipFields = property.referencedRelationshipFields.split(",");
                }
                if (property.referencedObjectFields.length > 0) {
                    property.queryConfig.referencedObjectFields = property.referencedObjectFields.split(",");
                }
                if (property.flattenProperties) {
                    property.queryConfig.flattenProperties = true;
                } else {
                    delete property.queryConfig.flattenProperties;
                }
            }

            delete property.referencedRelationshipFields;
            delete property.referencedObjectFields;
            delete property.flattenProperties;

            if (property.deleteQueryConfig) {
                delete property.queryConfig;
            }
            // always remove property.deleteQueryConfig
            delete property.deleteQueryConfig;

            if (!property.isVirtual) {
                delete property.queryConfig;
            }

            if (property.type === "array" && this.data.isRelationship) {
                property.items.notifySelf = property.notifySelf;
                delete property.notifySelf;
                delete this.data.property.notifySelf;
            }

            if (!this.data.isRelationship) {
                delete property.notifySelf;
            }

            if (!this.data.isRelationship && !property.isVirtual) {
                delete property.returnByDefault;
            } else if (this.data.isRelationship) {
                delete property.isVirtual;
            }

            // Clean up bad encryption property prior to save
            if (_.has(property, "encryption") && _.isEmpty(property.encryption.purpose)) {
                delete property.encryption;
            }

            // Clean up null values for minLength prior to save
            if (_.has(property, "minLength") && _.isEmpty(property.minLength)) {
                delete property.minLength;
            }

            // Clean up null values for minLength prior to save
            if (_.has(property, "pattern") && _.isEmpty(property.pattern)) {
                delete property.pattern;
            }
            // special handling of property.queryConfig.referencedRelationshipFields because it is an array
            if (property.isVirtual && _.has(property, 'queryConfig.referencedRelationshipFields')) {
                // parse referencedRelationshipFields before saving
                try {
                    var parsedValue = JSON.parse(property.queryConfig.referencedRelationshipFields);
                    // check the value is an array of arrays
                    if (Array.isArray(parsedValue) && parsedValue.length) {
                        property.queryConfig.referencedRelationshipFields = parsedValue;
                        this.$el.find("#referencedRelationshipFieldsForm").removeProp("style");
                        this.$el.find("#referencedRelationshipFieldsFormErrorMessage").hide();
                    } else {
                        throw "invalid array";
                    }
                } catch (error) {
                    this.$el.find("#referencedRelationshipFieldsForm").prop("style", "border: 2px solid red !important;");
                    this.$el.find("#referencedRelationshipFieldsFormErrorMessage").show();
                    return;
                }
            }

            if (property.notifyRelationships.length) {
                property.notifyRelationships = property.notifyRelationships.split(",");
            } else {
                delete property.notifyRelationships;
            }

            if (this.data.isRelationship) {
                this.data.currentManagedObject.schema.properties[this.data.propertyName] = property;
                this.saveRelationshipProperty(this.data.currentManagedObject, this.data.managedObjectName, this.data.propertyName, this.data.isNewProperty, CommonUIUtils.replaceEmptyStringWithNull(property), saveCallback, promises);
            } else {
                this.saveManagedObject(CommonUIUtils.replaceEmptyStringWithNull(this.data.currentManagedObject), this.data.managedConfig, false, saveCallback, promises);
            }
        },
        deleteProperty: function deleteProperty(e) {
            var _this6 = this;

            var breadcrumbs = this.data.breadcrumbs,
                previousObjectBreadcrumb = breadcrumbs[breadcrumbs.length - 2],
                route = previousObjectBreadcrumb.route,
                propertyArgs = route.args[1],
                parentProperty = this.data.parentProperty,
                propertyName = this.data.propertyName,
                nestedItems;

            e.preventDefault();

            UIUtils.confirmDialog($.t("templates.managed.schemaEditor.confirmPropertyDelete", { propName: this.data.propertyName }), "danger", function () {
                if (_.isArray(propertyArgs)) {
                    propertyArgs.pop();
                    propertyArgs = propertyArgs.join("/");
                }

                if (parentProperty.type === "array") {
                    nestedItems = SchemaUtils.handleArrayNest(parentProperty.items);
                    nestedItems.order = _.without(nestedItems.order, propertyName);
                    nestedItems.required = _.without(nestedItems.required, propertyName);
                    delete nestedItems.properties[propertyName];
                } else {
                    parentProperty.order = _.without(parentProperty.order, propertyName);
                    parentProperty.required = _.without(parentProperty.required, propertyName);
                    delete parentProperty.properties[propertyName];
                }

                _this6.saveManagedObject(_this6.data.currentManagedObject, _this6.data.managedConfig, false, function () {
                    //take us back to the deleted property's parent object edit page
                    EventManager.sendEvent(Constants.ROUTE_REQUEST, { routeName: route.name, args: [route.args[0], propertyArgs] });
                });
            });
        },
        loadPropertiesGrid: function loadPropertiesGrid() {
            var _this7 = this;

            var wasJustSaved = false;

            if (_.isObject(this.data.objectProperties) && this.data.propertyName === this.args[this.args.length - 1]) {
                wasJustSaved = true;
            }

            this.data.objectProperties = new ObjectTypeView();

            this.data.objectProperties.render({
                elementId: "object-properties-list",
                schema: this.data.property,
                saveSchema: function saveSchema() {
                    _this7.saveProperty();
                },
                parentObjectName: this.data.propertyName,
                propertyRoute: this.args.join("/"),
                wasJustSaved: wasJustSaved
            });
        },
        loadArrayTypeView: function loadArrayTypeView() {
            this.data.arrayTypeView = new ArrayTypeView();

            this.data.arrayTypeView.render({
                elementId: "arrayTypeContainer",
                propertyName: this.data.propertyName,
                propertyRoute: this.args.join("/"),
                items: this.data.property.items,
                makeChanges: _.bind(this.makeChanges, this),
                nestingIndex: 0
            });
        },

        loadRelationshipTypeView: function loadRelationshipTypeView() {
            var _$cloneDeep = _.cloneDeep(this.data),
                managedObjectName = _$cloneDeep.managedObjectName,
                propertyName = _$cloneDeep.propertyName,
                property = _$cloneDeep.property;

            if (property.type === "relationships") {
                property.type = "array";
            }
            this.data.relationshipTypeView = new RelationshipTypeView({
                element: "#relationshipTypeContainer",
                makeChanges: _.bind(this.makeChanges, this),
                managedConfig: this.model.managedConfig,
                managedObjectName: managedObjectName,
                propertyName: propertyName,
                property: property
            });

            this.data.relationshipTypeView.render();
        },
        /**
        * This function sets an event for each bootstrap tab on "show" which looks for any
        * pending form changes in the currently visible tab. If there are changes the the tab
        * change is halted and a dialog is displayed asking the user if he/she would like to discard
        * or save the changes before actually changing tabs.
        *
        * @param {string} tabId - (optional) specific tab on which to set the change event...otherwise the event will be set on all tabs
        **/
        setTabChangeEvent: function setTabChangeEvent(tabId) {
            var _this8 = this;

            var scope = this.$el;

            if (tabId) {
                scope = scope.find("#" + tabId);
            }

            //look for all bootstrap tabs within "scope"
            scope.on('show.bs.tab', 'a[data-toggle="tab"]', function (e) {
                _this8.data.currentTab = e.target.hash;

                //check to see if there are changes pending
                if (_this8.$el.find(".changes-pending-container[style='display: block;']").length) {
                    //stop processing this tab change
                    e.preventDefault();
                    //throw up a confirmation dialog
                    AdminUtils.confirmSaveChanges(_this8, e.target.hash, function () {
                        //once confirmed save the form then continue showing the new tab
                        _this8.saveProperty(false, function () {
                            _this8.$el.find('a[href="' + e.target.hash + '"]').tab('show');
                        });
                    });
                }
            });
        },

        /**
         * Toggle the visibility of 'returnByDefault' checkbox in advanced options
         * based on state of the 'isVirtual' checkbox, or state of 'data.property.isVirtual'
         * @param  {DomEvent} [event]
         */
        showHideReturnByDefault: function showHideReturnByDefault(event) {
            var isVirtual = event ? event.target.checked : this.data.property.isVirtual,
                isRelationship = this.data.isRelationship,
                isHidden = !isVirtual && !isRelationship;

            this.$el.find("[data-schemaProperty='returnByDefault']").toggleClass("hidden", isHidden);
        },

        focusFirstInput: function focusFirstInput() {
            this.$el.find("input").first().focus();
        },

        handleEnterKey: function handleEnterKey(event) {
            if (event.keyCode === Constants.ENTER_KEY) {
                this.$el.find(".savePropertyDetails").click();
                event.preventDefault();
            }
        },
        setupNotifyRelationships: function setupNotifyRelationships() {
            var selectNotifyRelationships = $("#select_notifyRelationships"),
                relationshipProperties = _.map(_.keys(_.pickBy(this.data.currentManagedObject.schema.properties, function (prop) {
                return prop.type === "relationship" || prop.type === "array" && prop.items.type === "relationship";
            })), function (prop) {
                return { id: prop };
            }),
                selectizeOpts = {
                valueField: "id",
                labelField: "id",
                maxItems: "10000",
                create: false,
                preload: true,
                hideSelected: true,
                options: relationshipProperties,
                load: _.bind(function () {
                    selectNotifyRelationships[0].selectize.setValue(this.data.property.notifyRelationships.split(","));
                }, this),
                onChange: _.bind(function (val) {
                    $("#notifyRelationships").val(val);
                }, this)
            };

            selectNotifyRelationships.selectize(selectizeOpts);
        }
    });

    return new SchemaPropertyView();
});
