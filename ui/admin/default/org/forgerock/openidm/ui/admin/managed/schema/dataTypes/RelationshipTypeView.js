"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * Copyright 2016-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "handlebars", "backbone", "backgrid", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/managed/schema/dataTypes/EditResourceCollectionDialog", "org/forgerock/openidm/ui/admin/managed/schema/util/RelationshipUtils", "org/forgerock/openidm/ui/admin/managed/schema/util/SchemaUtils", "org/forgerock/openidm/ui/admin/util/AdminUtils"], function ($, _, Handlebars, Backbone, Backgrid, BootstrapDialogUtils, BackgridUtils, AdminAbstractView, ConfigDelegate, EditResourceCollectionDialog, RelationshipUtils, SchemaUtils, AdminUtils) {

    var RelationshipTypeView = AdminAbstractView.extend({
        template: "templates/admin/managed/schema/dataTypes/RelationshipTypeViewTemplate.html",
        noBaseTemplate: true,
        events: {
            "click .addNewRefPropertyButton": "addNewRefProperty",
            "click .cancelEditRefProperty": "cancelEditRefProperty",
            "click .saveEditRefProperty": "saveEditRefProperty",
            "change .setRefPropertiesOnchange": "setRefProperties",
            "keyup .setRefPropertiesOnchange": "setRefProperties",
            "click .add-resource": "addResource",
            "click .edit-resource": "editResource",
            "click .delete-resource": "deleteResource",
            "change .relationship-type-select": "updateRelationshipType",
            "click [data-toggle='popover']": "relationshipSelectPopoverHandler"
        },
        model: {},
        partials: ["partials/managed/schema/_refPropertiesNewRow.html", "partials/managed/schema/_refPropertiesEditableRow.html", "partials/managed/schema/_resourcePartial.html"],

        initialize: function initialize(args, options) {
            AdminAbstractView.prototype.initialize.call(this, args, options);
            var managedConfig = args.managedConfig,
                managedObjectName = args.managedObjectName,
                propertyName = args.propertyName,
                element = args.element,
                makeChanges = args.makeChanges,
                property = args.property,
                relationship = RelationshipUtils.populate(managedConfig, managedObjectName, propertyName);

            if (property) {
                _.first(relationship[propertyName])["property"] = property;
            } else {
                property = _.first(relationship[propertyName]).property;
            }
            this.model = _.merge({}, {
                currentManagedObject: RelationshipUtils.getObjectByName(managedObjectName, managedConfig),
                managedConfig: managedConfig,
                managedObjectName: managedObjectName,
                property: property,
                propertyName: propertyName,
                reversePropertyName: RelationshipUtils.getRelationshipValue(_.first(relationship[propertyName]).property, "reversePropertyName"),
                relationship: relationship,
                updatedRelationship: _.cloneDeep(relationship)
            });

            this.element = element;
            this.makeChanges = makeChanges;
        },

        render: function render(callback) {
            var _this2 = this;

            var _RelationshipUtils$ge = RelationshipUtils.getRelationshipType(this.model.updatedRelationship, this.model.propertyName),
                _RelationshipUtils$ge2 = _slicedToArray(_RelationshipUtils$ge, 2),
                relationshipType = _RelationshipUtils$ge2[0],
                reverseRelationshipType = _RelationshipUtils$ge2[1];
            // set values for the template


            this.data.icon = this.model.currentManagedObject.schema.icon;
            this.data.noResources = _.isEmpty(this.getResources());
            this.data.propertyName = this.model.propertyName;
            this.data.managedObjectName = this.model.managedObjectName;
            this.data.relationshipType = relationshipType;
            this.data.relationshipTypeTitle = $.t("templates.managed.schemaEditor." + _.camelCase("has-" + relationshipType));
            this.data.reverseRelationship = RelationshipUtils.getRelationshipValue(this.currentRelationshipItem("property"), "reverseRelationship");
            this.data.reversePropertyName = this.model.reversePropertyName;
            this.data.reverseRelationshipType = reverseRelationshipType;
            this.data.reverseRelationshipTypeTitle = $.t("templates.managed.schemaEditor." + _.camelCase("has-" + reverseRelationshipType));

            this.parentRender(function () {
                _this2.initializePopover();
                _this2.initializePopoverBodyClickHandler();
                _this2.loadPropertiesGrid();
                _this2.renderResourceCollection(_this2.getResources());
                _this2.openResourceCollection(_this2.getResources());

                if (callback) {
                    callback();
                }
            });
        },

        openResourceCollection: function openResourceCollection(resources) {
            if (resources.length === 0) {
                // open the new resource dialog
                this.$el.find(".add-resource")[0].click();
            }
        },

        renderResourceCollection: function renderResourceCollection(resources) {
            var _this3 = this;

            var listEl = this.$el.find("#resourceCollection"),
                html = resources.filter(function (resource) {
                return resource.path.match(/^managed/);
            }).map(function (resource, i) {
                var name = _.last(resource.path.split("/")),
                    icon = _.get(RelationshipUtils.getObjectByName(name, _this3.model.managedConfig), "schema.icon", "fa-cube"),
                    key = i;
                return Handlebars.compile("{{> managed/schema/_resourcePartial}}")({ name: name, icon: icon, key: key });
            });
            listEl.empty();
            listEl.append(html);
        },

        initializePopover: function initializePopover() {
            var popoverEl = this.$el.find("[data-toggle='popover']"),
                side = popoverEl.data("side");

            popoverEl.popover({
                html: true,
                placement: "top",
                trigger: "click",
                content: function content() {
                    return $("<select>", {
                        "class": "relationship-type-select form-control",
                        "data-side": side
                    });
                }
            });
        },

        /**
         * handler to close popover if anywhere but the popover content area is clicked.
         */
        initializePopoverBodyClickHandler: function initializePopoverBodyClickHandler() {
            var _this4 = this;

            $('body').off('click');
            $('body').on('click', function (event) {
                if (_this4.$el.find(".popover").is(":visible") && $(event.target).data('toggle') !== 'popover' && $(event.target).parents('.popover.in').length === 0) {
                    var id = _this4.$el.find(".popover").attr("id");
                    _this4.$el.find("button[aria-describedby=\"" + id + "\"]").click();
                }
            });
        },

        /**
         * Add options for the relationship based on triggering side
         * @param  {DomEvent} event
         */
        relationshipSelectPopoverHandler: function relationshipSelectPopoverHandler(event) {
            var target = $(event.target),
                options = ["one", "many"],
                side = target.data("side"),
                popoverId = target.attr("aria-describedby"),
                popoverSelect = this.$el.find("#" + popoverId + " select"),
                value = target.data("value");

            event.preventDefault();

            // add "none" as an option if it is the reverse side of the relationship
            if (side === "reverse") {
                options = ["none"].concat(options);
            }

            // add options to select
            popoverSelect.append(options.map(function (item) {
                return $("<option>", { "text": "Has " + item, "value": item, selected: item === value });
            }));

            popoverSelect.attr("data-popover-id", popoverId);
            popoverSelect.selectize();
        },

        /**
         * Updated the type on the triggering side of the relationship
         * to selected type ("one", "many", "none")
         * @param  {DomEvent}
         */
        updateRelationshipType: function updateRelationshipType(event) {
            var _this5 = this;

            var target = $(event.target),
                sideTypeValue = event.target.value,
                popoverId = target.data("popover-id"),
                button = this.$el.find("button[aria-describedby=\"" + popoverId + "\"]"),
                side = button.data("side"),
                message = $.t("templates.managed.schemaEditor.confirmReveseRelationshipDelete");

            event.preventDefault();

            if (sideTypeValue === "none") {
                // fire warning modal => "this will delete properties from x managed objects"
                AdminUtils.confirmDeleteDialog(message, function () {
                    button.data("value", sideTypeValue).html("<i class=\"fa fa-plus text-muted\"></i>" + $.t("templates.managed.schemaEditor.twoWayRelationship"));
                    _this5.$el.find(".arrow-line.up").addClass("disabled");

                    var current = _this5.model.updatedRelationship[_this5.model.propertyName];

                    // updated the relationship to only be the current property list
                    _this5.model.updatedRelationship = _defineProperty({}, _this5.model.propertyName, current.map(function (relationshipItem) {
                        relationshipItem.property = RelationshipUtils.setRelationshipValue(relationshipItem.property, "reverseRelationship", false);
                        relationshipItem.property = RelationshipUtils.setRelationshipValue(relationshipItem.property, "reversePropertyName", "");
                        return relationshipItem;
                    }));

                    _this5.makeChanges();
                    _this5.render();
                });
            } else if (side === "reverse") {
                // if we're going from none to something, for the first time, fire displayProps modal
                if (!RelationshipUtils.isReverseRelationship(this.currentRelationshipItem("property"))) {
                    this.configureReverseRelationship(sideTypeValue, function () {
                        _this5.updateReverseSideType(button, sideTypeValue);
                    });
                } else {
                    this.updateReverseSideType(button, sideTypeValue);
                }
            } else {
                var propertyName = this.model.propertyName;
                // update relationship
                this.model.updatedRelationship[propertyName] = this.model.updatedRelationship[propertyName].map(function (relationshipItem) {
                    relationshipItem.property = RelationshipUtils.toSideType(relationshipItem.property, sideTypeValue);
                    return relationshipItem;
                });
                this.makeChanges();
                this.render();
            }
        },

        /**
         * Updated the dom and current state of the reverse side of the relationship
         * based on the provided type ("one", "many", "none")
         * @param {DomElement} button
         * @param {String} sideTypeValue
         */
        updateReverseSideType: function updateReverseSideType(button, sideTypeValue) {
            this.model.updatedRelationship[this.model.reversePropertyName] = this.reverseRelationshipItems().map(function (relationshipItem) {
                relationshipItem.property = RelationshipUtils.toSideType(relationshipItem.property, sideTypeValue);
                return relationshipItem;
            });
            // Update the reverseProperty config on the resourceCollection array
            var resourceCollection = this.model.updatedRelationship[this.model.propertyName][0].property.items ? this.model.updatedRelationship[this.model.propertyName][0].property.items.resourceCollection : this.model.updatedRelationship[this.model.propertyName][0].property.resourceCollection;
            resourceCollection.forEach(function (collection) {
                collection.reverseProperty.type = sideTypeValue === "many" ? "array" : "relationship";
            });
            if (this.model.updatedRelationship[this.model.propertyName][0].property.items) {
                this.model.updatedRelationship[this.model.propertyName][0].property.items.resourceCollection = resourceCollection;
            } else {
                this.model.updatedRelationship[this.model.propertyName][0].property.resourceCollection = resourceCollection;
            }
            this.makeChanges();
            this.render();
        },

        /**
         * Handler for firing modal to add resource to resource collection for current property
         * @param {DomEvent}
         */
        addResource: function addResource() {
            var _this6 = this;

            // grab all objects not already resources
            var managedObjects = _.reject(this.model.managedConfig.objects, function (object) {
                var resourceNames = _this6.getResources().map(function (resource) {
                    return _.last(resource.path.split("/"));
                });
                return _.includes(resourceNames, object.name);
            });
            this.fireResourceModal({ managedObjects: managedObjects }, function (resource) {
                var resourceCollection = _this6.getResources();

                // if this is a reverse relationship add a new item to "updatedRelationship"
                if (RelationshipUtils.isReverseRelationship(_this6.currentRelationshipItem("property"))) {
                    var reverseRelationshipItems = _this6.reverseRelationshipItems();
                    if (reverseRelationshipItems.length) {
                        resource["reverseProperty"] = _.first(resourceCollection).reverseProperty;
                        // if there is already a reverse item, use it as a template property
                        var resourceRelationshipItem = _.cloneDeep(_.first(reverseRelationshipItems));

                        resourceRelationshipItem.objectName = RelationshipUtils.pathToName(resource.path);
                        resourceRelationshipItem.object = RelationshipUtils.getObjectByName(resourceRelationshipItem.objectName, _this6.model.managedConfig);
                        _this6.model.updatedRelationship[_this6.model.reversePropertyName] = reverseRelationshipItems.concat(resourceRelationshipItem);
                    }
                }
                _this6.setResources(resourceCollection.concat(resource));
                _this6.makeChanges();
                _this6.render();
            });
        },

        /**
         * Handler for deleting resource out of resource collection for current property
         * @param  {DomEvent}
         */
        deleteResource: function deleteResource(event) {
            event.preventDefault();

            var resourceKey = $(event.currentTarget).data("resource-key"),
                resources = this.getResources(),
                remainingResources = _.reject(resources, function (resource, i) {
                return i === resourceKey;
            }),
                deletedResourceName = RelationshipUtils.pathToName(_.first(_.pullAt(resources, resourceKey)).path),
                preserved = _.cloneDeep(this.model.updatedRelationship);

            // set current side resources
            this.setResources(remainingResources);

            // if this is a reverse relationship remove the resource relationshipItem from the reverse side
            if (RelationshipUtils.isReverseRelationship(this.currentRelationshipItem("property"))) {

                // if there is more than one item in the current side of the relationship,
                // create a version of the relationship with all other items preserved,
                // but with the current property's resource removed from the selected resource
                if (this.model.updatedRelationship[this.model.propertyName].length > 1) {
                    var objectName = this.currentRelationshipItem("objectName"),
                        reversePropName = this.model.reversePropertyName,
                        preservedItem = _.find(preserved[reversePropName], { objectName: deletedResourceName }),
                        preservedResCol = RelationshipUtils.getRelationshipValue(preservedItem.property, "resourceCollection"),
                        updatedPreservedResCol = _.reject(preservedResCol, function (resourceItem) {
                        return RelationshipUtils.pathToName(resourceItem.path) === objectName;
                    });

                    preservedItem.property = RelationshipUtils.setRelationshipValue(preservedItem.property, "resourceCollection", updatedPreservedResCol);
                    this.model.preservedRelationship = preserved;
                }

                var updatedReverseItems = _.reject(this.reverseRelationshipItems(), { objectName: deletedResourceName });
                this.model.updatedRelationship[this.model.reversePropertyName] = updatedReverseItems;
                // deleting the last resource is the same as turning this to a n/1 => none type relationship
                if (_.isEmpty(this.getResources())) {
                    var propertyItems = this.propertyItems().map(function (item) {
                        item.property = RelationshipUtils.setRelationshipValue(item.property, "reversePropertyName", "");
                        item.property = RelationshipUtils.setRelationshipValue(item.property, "reverseRelationship", false);
                        return item;
                    });

                    this.model.updatedRelationship[this.model.propertyName] = propertyItems;
                    this.model.updatedRelationship = _.omit(this.model.updatedRelationship, this.model.reversePropertyName);
                }
            }

            this.makeChanges();
            this.render();
        },

        /**
         * Handler for editing an element of the resource collection on the current property
         * @param {DomEvent}
         */
        editResource: function editResource(event) {
            var _this7 = this;

            var resourceKey = $(event.currentTarget).data("resource-key"),
                resources = this.getResources(),
                resource = resources[resourceKey];

            resource.icon = this.data.icon;
            this.fireResourceModal(resource, function (editedResource) {
                editedResource["reverseProperty"] = resources[resourceKey]["reverseProperty"];
                resources[resourceKey] = editedResource;
                _this7.setResources(resources);
                _this7.makeChanges();
                _this7.render();
            });
        },
        /**
         * Handler for configuring the two-sided-relationship details
         * @param  {String} reverseSideType
         * @param  {Function} cb -- the callback for updating the dom if the configuration successfully completes
         */
        configureReverseRelationship: function configureReverseRelationship(reverseSideType, cb) {
            var _this8 = this;

            var path = "managed/" + this.model.managedObjectName,
                icon = this.data.icon,
                resources = this.getResources().map(function (resource) {
                return RelationshipUtils.pathToName(resource.path);
            }),
                compatibleRelationships = RelationshipUtils.getCompatibleRelationships(this.model.managedConfig, _.first(resources), this.model.propertyName),
                propertyNames = resources.reduce(function (acc, recName) {
                return acc.concat(_.keys(RelationshipUtils.getObjectByName(recName, _this8.model.managedConfig).schema.properties));
            }, []),
                invalidPropertyNames = _.xor(propertyNames, compatibleRelationships.map(_.first)),
                set = RelationshipUtils.setRelationshipValue;

            this.fireResourceModal({ path: path, icon: icon, invalidPropertyNames: invalidPropertyNames, reverseRelationship: { resources: resources } }, function (data) {
                var propertyItems = _this8.propertyItems().map(function (item) {
                    item.property = set(item.property, "reverseRelationship", true);
                    item.property = set(item.property, "reversePropertyName", data.propertyName);
                    var resourceCollection = item.property.items ? item.property.items.resourceCollection : item.property.resourceCollection;
                    resourceCollection.forEach(function (prop) {
                        prop.reverseProperty = {
                            type: reverseSideType === "many" ? "array" : "relationship",
                            validate: data.validate,
                            resourceCollection: {
                                notify: data.notify,
                                query: {
                                    queryFilter: data.resource.query.queryFilter,
                                    fields: data.resource.query.fields
                                }
                            }
                        };
                    });
                    if (item.property.items) {
                        item.property.items.resourceCollection = resourceCollection;
                    } else {
                        item.property.resourceCollection = resourceCollection;
                    }
                    return item;
                }),
                    reverseItems = void 0,
                    updatedRelationship = void 0;

                if (compatibleRelationships.length && _.includes(compatibleRelationships.map(_.first), data.propertyName)) {
                    var relationship = compatibleRelationships.reduce(function (acc, rel) {
                        if (_.first(rel) === data.propertyName) {
                            acc = _.last(rel);
                        }

                        return acc;
                    }, {});

                    updatedRelationship = RelationshipUtils.addItemToSide(relationship, _this8.model.propertyName, _this8.currentRelationshipItem(), data.resource);
                } else {
                    var _updatedRelationship;

                    reverseItems = resources.map(function (name) {
                        var property = RelationshipUtils.blankProperty({
                            reverseRelationship: true,
                            reversePropertyName: _this8.model.propertyName,
                            resourceCollection: [data.resource],
                            validate: data.validate
                        }),
                            propertyName = data.propertyName,
                            object = RelationshipUtils.getObjectByName(name, _this8.model.managedConfig);

                        property.title = data.title;
                        property = RelationshipUtils.toSideType(property, reverseSideType);

                        return { objectName: name, propertyName: propertyName, property: property, object: object };
                    });

                    updatedRelationship = (_updatedRelationship = {}, _defineProperty(_updatedRelationship, _this8.model.propertyName, propertyItems), _defineProperty(_updatedRelationship, data.propertyName, reverseItems), _updatedRelationship);
                }

                _this8.model.reversePropertyName = data.propertyName;
                _this8.model.updatedRelationship = updatedRelationship;
                _this8.makeChanges();
                _this8.render(cb);
            });
        },

        /**
         * Helper method for firing the edit resource modal.
         * @param  {Object} options
         * @param  {Function} dataHandler
         */
        fireResourceModal: function fireResourceModal(options, dataHandler) {
            var _RelationshipUtils$bl = RelationshipUtils.blankResource(),
                path = _RelationshipUtils$bl.path,
                notify = _RelationshipUtils$bl.notify,
                label = _RelationshipUtils$bl.label,
                query = _RelationshipUtils$bl.query,
                formView,
                title,
                currentValue;

            dataHandler = dataHandler || console.log;

            if (options) {
                options = _.merge({ path: path, notify: notify, label: label, query: query, dataHandler: dataHandler }, options);
            }

            if (_.isEmpty(options.path)) {
                title = $.t("templates.managed.schemaEditor.addResource");
            } else if (!_.isEmpty(options.reverseRelationship)) {
                title = $.t("templates.managed.schemaEditor.configureReverseRelationship");
            } else {
                title = $.t("templates.managed.schemaEditor.editResource");
            }

            currentValue = {
                "path": options.path || "",
                "label": _.capitalize(_.last(_.get(options, "path", "").split("/"))) || "",
                "query": options.query || {
                    "queryFilter": "true",
                    "fields": [],
                    "sortKeys": []
                }
            };

            if (options && typeof options.notify !== 'undefined') {
                currentValue.notify = options.notify;
            }

            if (options && options.conditionalAssociation) {
                currentValue.conditionalAssociation = options.conditionalAssociation;
            }

            if (options && options.conditionalAssociationField) {
                currentValue.conditionalAssociationField = options.conditionalAssociationField;
            }

            formView = new EditResourceCollectionDialog({
                currentValue: currentValue,
                dataHandler: options.dataHandler,
                icon: options.icon,
                managedObjects: options.managedObjects,
                invalidPropertyNames: options.invalidPropertyNames || [],
                reverseRelationship: options.reverseRelationship || false
            });

            this.currentDialog = $('<div id="editResourceCollectionDialog"></div>');
            $('#dialogs').append(this.currentDialog);
            //change dialog
            this.dialog = BootstrapDialogUtils.createModal({
                title: title,
                message: this.currentDialog,
                cssClass: "objecttype-windows",
                onshown: function onshown(dialogRef) {
                    // render form
                    formView.render({ dialogRef: dialogRef });
                },
                buttons: [{
                    label: $.t('common.form.cancel'),
                    id: "resourceCollectionDialogCloseBtn",
                    action: function action(dialogRef) {
                        dialogRef.close();
                    }
                }, {
                    label: $.t('common.form.save'),
                    cssClass: "btn-primary disabled",
                    id: "resourceCollectionDialogSaveBtn",
                    action: function action(dialogRef) {
                        // export data
                        if (formView.isValid()) {
                            formView.exportResource();
                            dialogRef.close();
                        }
                    }
                }]
            }).open();
        },

        /**
         * helper method for returning the current relationship item
         * @param {String} -- a property on relationship
         * @return {Object|String} -- attempts to return the passed property,
         * but defaults to returning complete relationship item
         */
        currentRelationshipItem: function currentRelationshipItem(prop) {
            var _model = this.model,
                updatedRelationship = _model.updatedRelationship,
                propertyName = _model.propertyName,
                current = _.first(updatedRelationship[propertyName]);

            if (prop && _.has(current, prop)) {
                return current[prop];
            } else {
                return current;
            }
        },

        /**
         * helper method for grabbing the current value of resourceCollection
         * @return {Array}
         */
        getResources: function getResources() {
            return _.cloneDeep(RelationshipUtils.getRelationshipValue(this.currentRelationshipItem("property"), "resourceCollection"));
        },

        /**
         * overwrite the current value for the resource collection with the passed value
         * @param {Array} resources
         * @return {Array}
         */
        setResources: function setResources(resources) {
            var _model2 = this.model,
                propertyName = _model2.propertyName,
                updatedRelationship = _model2.updatedRelationship;


            this.model.updatedRelationship = _.set(updatedRelationship, propertyName, updatedRelationship[propertyName].map(function (relationshipItem) {
                return _.set(relationshipItem, "property", RelationshipUtils.setRelationshipValue(relationshipItem.property, "resourceCollection", resources));
            }));
        },

        propertyItems: function propertyItems() {
            return this.model.updatedRelationship[this.model.propertyName];
        },

        /**
         * helper method for grabbing the tail of the updateRelationship from the model
         * @return {Object[]} -- returns a list of relationship objects.
         */
        reverseRelationshipItems: function reverseRelationshipItems() {
            return this.model.updatedRelationship[this.model.reversePropertyName];
        },

        /**
         * list of operations that need to be performed to update managed config
         * @typedef {Object} ConfigChanges
         * @property {Array} insertions -- the list of objects that need a schema property updated or created
         * @property {Array} deletions -- list of objects that need to have properties deleted off of them
         */

        /**
         * generate the config changes object based on a comparison between the updated and origin versions of the relationship
         * @return {ConfigChanges} -- object has two properties arrays `insertions` and `deletions`
         */
        generateConfigChanges: function generateConfigChanges(original, changed) {
            var _this9 = this;

            original = original || this.model.relationship;
            changed = changed || this.model.updatedRelationship;

            var originalRelationship = _(_.cloneDeep(original)).values().flattenDeep().map(function (item) {
                return _.set(item, "version", "original");
            }).value(),
                updatedRelationship = _(_.cloneDeep(changed)).values().flattenDeep().map(function (item) {
                var properties = RelationshipUtils.getRelationshipValue(_this9.currentRelationshipItem("property"), "properties");
                item = _.set(item, "version", "updated");
                // sync ref props
                item = _.set(item, "property", RelationshipUtils.setRelationshipValue(item.property, "properties", properties));
                return item;
            }).value();

            return _(originalRelationship.concat(updatedRelationship))
            // initially group by 'objectName'
            .groupBy("objectName")
            // group object changes by 'propertyName'
            .transform(function (result, diffObjs, objName) {
                return _.set(result, objName, _.groupBy(diffObjs, "propertyName"));
            })
            // convert object groups to pairs so it can be further reduced to a config changes object
            .toPairs().value().reduce(function (configChanges, objDiff) {
                var objectName = _.first(objDiff),
                    propertyDict = _.last(objDiff);

                _.forIn(propertyDict, function (versions) {
                    var _map = ["updated", "original"].map(function (version) {
                        return _.find(versions, { version: version });
                    }),
                        _map2 = _slicedToArray(_map, 2),
                        updated = _map2[0],
                        original = _map2[1],
                        updatedProperty = _.get(updated, "property"),
                        originalProperty = _.get(original, "property"),
                        _model3 = _this9.model,
                        originalRefPropertiesCollection = _model3.originalRefPropertiesCollection,
                        refPropertiesCollection = _model3.refPropertiesCollection;

                    if (originalProperty) {
                        if (updatedProperty) {
                            // if updated property different than original property add to insertions
                            // (if they are the same no config changes needed)
                            var propertiesEqual = _.isEqual(originalProperty, updatedProperty) && _.isEqual(originalRefPropertiesCollection.toJSON(), refPropertiesCollection.toJSON());

                            if (!propertiesEqual) {
                                var propertyName = updated.propertyName,
                                    property = updated.property;

                                configChanges.insertions.push({ objectName: objectName, propertyName: propertyName, property: property });
                            }
                            // if there is no updated property for object, then it was deleted from relationship
                            // add property name to deletions
                        } else if (_.isUndefined(updatedProperty)) {
                            configChanges.deletions.push({ objectName: objectName, propertyName: original.propertyName });
                        }
                        // if no orig, but updated then add to insert
                    } else if (updatedProperty) {
                        var _propertyName = updated.propertyName,
                            _property = updated.property;

                        configChanges.insertions.push({ objectName: objectName, propertyName: _propertyName, property: _property });
                    }
                });
                return configChanges;
            }, { insertions: [], deletions: [] });
        },

        /**
         * @typedef {Object} UpdatedConfig
         * @property {Object} updatedConfig -- new version of managed config
         * @property {Array} changedObjects -- list of objects that were updated
         *
         */

        /**
         * Config changes to managed config and return an updated config object
         * @param {ConfigChanges} configChanges
         * @param {Object} managedConfig
         * @return {UpdatedConfig}
         */
        applyConfigChanges: function applyConfigChanges(managedConfig, configChanges) {
            var _this10 = this;

            var updatedConfig = _.cloneDeep(managedConfig),
                changedObjectNames = [];

            updatedConfig.objects = updatedConfig.objects.map(function (managedObject) {
                var _map3 = ["insertions", "deletions"].map(function (opType) {
                    return configChanges[opType].filter(function (operation) {
                        return operation.objectName === managedObject.name;
                    });
                }),
                    _map4 = _slicedToArray(_map3, 2),
                    insertions = _map4[0],
                    deletions = _map4[1];

                if (!_.isEmpty(insertions)) {
                    changedObjectNames.push(managedObject.name);
                    managedObject = insertions.reduce(function (updatedObject, insertion) {
                        updatedObject.schema = _this10.safeSchemaCheck(updatedObject.schema);

                        return _.chain(updatedObject).set("schema.properties." + insertion.propertyName, insertion.property).set('schema.order', _.uniq(updatedObject.schema.order.concat(insertion.propertyName))).value();
                    }, managedObject);
                }

                if (!_.isEmpty(deletions)) {
                    changedObjectNames.push(managedObject.name);
                    managedObject = deletions.reduce(function (updatedObject, deletion) {
                        updatedObject.schema = _this10.safeSchemaCheck(updatedObject.schema);

                        return _.chain(updatedObject).set("schema.properties", _.omit(updatedObject.schema.properties, deletion.propertyName)).set("schema.order", _.reject(updatedObject.schema.order, function (propName) {
                            return propName === deletion.propertyName;
                        })).value();
                    }, managedObject);
                }
                return managedObject;
            });

            return {
                updatedConfig: updatedConfig,
                changedObjects: _.uniq(changedObjectNames).map(function (name) {
                    return RelationshipUtils.getObjectByName(name, updatedConfig);
                })
            };
        },

        /**
         * Checks to make sure there is a schema for a managed object as well as an order property
         *
         * @param schema - The current schema for a managed object
         * @returns schema - Returns a modified version of the schema which will ensure order is available
         */
        safeSchemaCheck: function safeSchemaCheck(schema) {
            // Check for partial schema
            if (_.isUndefined(schema)) {
                schema = {
                    order: []
                };
            } else if (_.isUndefined(schema.order)) {
                schema.order = [];
            }

            return schema;
        },

        /**
         * get an updated version of managed config based on the current state of the
         * relationship
         * @return {ConfigChanges}
         */
        getValue: function getValue() {
            var configChanges,
                propertyName = this.model.propertyName;

            if (this.model.preservedRelationship) {
                var preserved = this.model.preservedRelationship;

                preserved[propertyName] = [this.currentRelationshipItem()].concat(_.rest(preserved[propertyName]));
                configChanges = this.generateConfigChanges(this.model.relationship, preserved);
            } else {
                configChanges = this.generateConfigChanges();
            }

            return this.applyConfigChanges(this.model.managedConfig, configChanges);
        },

        loadPropertiesGrid: function loadPropertiesGrid() {
            var _this11 = this;

            var _this = this,
                cols = [{
                name: "propName",
                label: $.t("templates.managed.schemaEditor.propertyName"),
                cell: "string",
                sortable: false,
                editable: false
            }, {
                name: "labelText",
                label: $.t("templates.managed.schemaEditor.label"),
                cell: "string",
                sortable: false,
                editable: false
            }, {
                label: "",
                cell: BackgridUtils.ButtonCell([{
                    className: "fa fa-times grid-icon col-sm-1 pull-right",
                    callback: function callback() {
                        _this.model.refPropertiesCollection.remove(this.model);
                        _this.setRefProperties();
                        _this.makeChanges();
                        _this.render();
                    }
                }, {
                    // No callback necessary, the row click will trigger the edit
                    className: "fa fa-pencil grid-icon col-sm-1 pull-right"
                }, {
                    className: "dragToSort fa fa-arrows grid-icon col-sm-1 pull-right"
                }]),
                sortable: false,
                editable: false
            }],
                propertiesGrid,
                refProperties = SchemaUtils.convertSchemaToPropertiesArray(RelationshipUtils.getRelationshipValue(this.currentRelationshipItem("property"), "properties")._refProperties),
                makeSortable,
                addNewRow = $(Handlebars.compile("{{> managed/schema/_refPropertiesNewRow}}")());

            // Adding labelText to each refProperty based on the value of label (will be removed before save)
            refProperties.forEach(function (prop) {
                prop.labelText = prop.label;
            });
            this.model.refPropertiesCollection = new Backbone.Collection(refProperties);
            this.model.originalRefPropertiesCollection = this.model.refPropertiesCollection.clone();

            makeSortable = function makeSortable() {
                BackgridUtils.sortable({
                    "containers": [_this11.$el.find(".refPropertiesList tbody")[0]],
                    "rows": _.cloneDeep(_this11.model.refPropertiesCollection.toJSON())
                }, _.bind(function (newOrder) {
                    this.model.refPropertiesCollection = new Backbone.Collection(newOrder);
                    this.setRefProperties();
                    this.makeChanges();
                }, _this11));
            };

            propertiesGrid = new Backgrid.Grid({
                columns: BackgridUtils.addSmallScreenCell(cols),
                collection: this.model.refPropertiesCollection,
                row: BackgridUtils.ClickableRow.extend({
                    callback: _.bind(function (event) {
                        var row = $(event.target).closest("tr"),
                            name = row.find("td:eq(0)").text(),
                            label = row.find("td:eq(1)").text(),
                            editableRow = $(Handlebars.compile("{{> managed/schema/_refPropertiesEditableRow}}")({ name: name, label: label }));

                        event.preventDefault();
                        row.replaceWith(editableRow);
                        //hide the add row
                        this.$el.find(".refPropertiesNewRow").hide();
                    }, this)
                })
            });

            this.$el.find(".refPropertiesList").append(propertiesGrid.render().el);

            this.$el.find(".refPropertiesList tbody").append(addNewRow);

            this.$el.find(".refPropertiesList tbody tr:eq(0)").hide();

            makeSortable();
        },

        /**
        * adds a new refProperty to the properties grid
        */
        addNewRefProperty: function addNewRefProperty(event) {
            var name = this.$el.find(".newRefPropertyName").val(),
                label = this.$el.find(".newRefPropertyLabel").val(),
                newProp = {
                label: label,
                type: "string",
                propName: name
            };

            event.preventDefault();

            if (name.length) {
                this.model.refPropertiesCollection.add(newProp);
                this.setRefProperties();
                this.makeChanges();
                this.render();
            }
        },

        /**
        * saves the editable row for a refProperty in the properties grid
        */
        saveEditRefProperty: function saveEditRefProperty(event) {
            var row = $(event.target).closest("tr"),
                name = row.find(".editRefPropertyName").val(),
                label = row.find(".editRefPropertyLabel").val(),
                thisModel,
                rowIndex = AdminUtils.getClickedRowIndex(event);

            event.preventDefault();

            if (name.length) {
                thisModel = this.model.refPropertiesCollection.at(rowIndex);
                thisModel.set({
                    propName: name,
                    label: label,
                    required: false,
                    type: "string"
                });
                this.setRefProperties();
                this.makeChanges();
                this.render();
            }
        },

        /**
        * cancels editing a row in the properties grid
        */
        cancelEditRefProperty: function cancelEditRefProperty(event) {
            event.preventDefault();
            this.setRefProperties();
            this.makeChanges();
            this.render();
        },

        /**
         * add ref properties to current version of the relationship
         */
        setRefProperties: function setRefProperties() {
            var refProps = {};

            _.forEach(this.model.refPropertiesCollection.toJSON(), function (refProp) {
                refProps[refProp.propName] = _.omit(refProp, "required", "propName", "labelText");
            });

            this.model.updatedRelationship = RelationshipUtils.mapAllItems(this.model.updatedRelationship, function (relationshipItem) {
                relationshipItem.property = RelationshipUtils.setRelationshipValue(relationshipItem.property, "properties._refProperties.properties", refProps);
                return relationshipItem;
            });
        }

    });

    return RelationshipTypeView;
});
