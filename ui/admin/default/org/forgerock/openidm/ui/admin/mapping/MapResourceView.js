"use strict";

/*
 * Copyright 2014-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "form2js", "handlebars", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils"], function ($, _, form2js, handlebars, AbstractView, eventManager, constants, router, ConfigDelegate, ValidatorsManager, BootstrapDialogUtils) {
    var MapResourceView = AbstractView.extend({
        template: "templates/admin/mapping/MapResourceView.html",
        noBaseTemplate: true,
        element: "#resourceMappingBody",
        events: {
            "click .select-resource": "selectAnotherResource",
            "click #createMapping": "submitNewMapping",
            "click .mapping-swap": "swapSourceTarget"
        },
        partials: ["partials/mapping/_mapResourceDialog.html", "partials/mapping/_mapResourceCard.html"],
        model: {
            sourceAdded: false,
            targetAdded: false,
            sourceDetails: null,
            targetDetails: null,
            resourceAddRef: null,
            targetAddRef: null,
            mappingList: null,
            syncExist: true
        },

        render: function render(args, callback) {
            var _this2 = this;

            //Reset variables on render to ensure data is clean when navigating around
            this.model.sourceAdded = false;
            this.model.targetAdded = false;
            this.model.sourceDetails = null;
            this.model.targetDetails = null;
            this.model.resourceAddRef = null;
            this.model.targetAddRef = null;
            this.model.mappingList = null;
            this.model.removeCallback = null;
            this.model.addCallback = null;

            this.model.removeCallback = args.removeCallback;
            this.model.addCallback = args.addCallback;

            ConfigDelegate.readEntityAlways("sync").then(function (sync) {
                if (_.isUndefined(sync)) {
                    _this2.model.mappingList = [];
                    _this2.model.syncExist = false;
                } else {
                    _this2.model.mappingList = sync.mappings;
                    _this2.model.syncExist = true;
                }

                _this2.parentRender(function () {
                    if (callback) {
                        callback();
                    }
                });
            });
        },
        addMapping: function addMapping(mappingObj) {
            if (!this.model.sourceAdded) {
                this.model.sourceDetails = mappingObj;
                this.displayDetails("mappingSource", this.model.sourceDetails);
                this.model.sourceAdded = true;
            } else {
                this.model.targetDetails = mappingObj;
                this.displayDetails("mappingTarget", this.model.targetDetails);
                this.model.targetAdded = true;
            }

            if (this.model.sourceAdded && this.model.targetAdded) {
                this.$el.find("#createMapping").prop("disabled", false);
            } else {
                this.$el.find("#createMapping").prop("disabled", true);
            }

            if (this.model.addCallback) {
                this.model.addCallback(this.model.sourceAdded, this.model.targetAdded);
            }
        },
        submitNewMapping: function submitNewMapping(event) {
            event.preventDefault();

            var _this = this,
                mappingName,
                nameCheck,
                counter = 0,
                generateMappingInfo = this.createMappingName(this.model.targetDetails, this.model.sourceDetails, this.$el.find("#mappingTarget .resource-object-type-select").val(), this.$el.find("#mappingSource .resource-object-type-select").val()),
                tempName = generateMappingInfo.generatedName,
                cleanName = tempName,
                currentData = {
                "mappingName": "",
                "availableLinks": ""
            };

            this.model.targetDetails.saveName = generateMappingInfo.target;
            this.model.sourceDetails.saveName = generateMappingInfo.source;

            while (!mappingName) {
                nameCheck = this.checkMappingName(tempName);

                if (nameCheck) {
                    mappingName = tempName;
                } else {
                    tempName = cleanName + counter;
                    counter++;
                }
            }

            currentData.mappingName = mappingName;
            currentData.availableLinks = this.findLinkedMapping();

            BootstrapDialogUtils.createModal({
                title: $.t("templates.mapping.createMappingDialog"),
                message: $(handlebars.compile("{{> mapping/_mapResourceDialog}}")(currentData)),
                onshown: function onshown(dialogRef) {
                    _this.setElement(dialogRef.$modalBody);
                    ValidatorsManager.bindValidators(dialogRef.$modalBody.find("form"));
                    dialogRef.$modalBody.find("input[type='text']:visible")[0].focus();
                },
                onhide: function onhide() {
                    _this.setElement($("#resourceMappingBody"));
                },
                buttons: [{
                    label: $.t("common.form.cancel"),
                    id: "mappingSaveCancel",
                    action: function action(dialogRef) {
                        dialogRef.close();
                    }
                }, {
                    label: $.t('common.form.create'),
                    id: "mappingSaveOkay",
                    cssClass: "btn-primary",
                    action: _.bind(function (dialogRef) {
                        this.saveMapping(dialogRef, function () {
                            dialogRef.close();
                        });
                    }, this)
                }]
            }).open();
        },
        saveMapping: function saveMapping(dialogRef, callback) {
            var completeMapping = {
                "mappings": this.model.mappingList
            },
                tempMapping,
                mappingForm = form2js("createMappingForm");

            if (_.isUndefined(mappingForm.displayName)) {
                mappingForm.displayName = mappingForm.mappingName;
            }

            if (_.isUndefined(mappingForm.icon)) {
                mappingForm.icon = null;
            }

            if (_.isUndefined(mappingForm.icon)) {
                mappingForm.consentRequired = false;
            }

            tempMapping = {
                "target": this.model.targetDetails.saveName,
                "source": this.model.sourceDetails.saveName,
                "name": mappingForm.mappingName,
                "consentRequired": mappingForm.consentEnable,
                "icon": mappingForm.icon,
                "displayName": mappingForm.displayName,
                "properties": [],
                "policies": [{
                    "action": "ASYNC",
                    "situation": "ABSENT"
                }, {
                    "action": "ASYNC",
                    "situation": "ALL_GONE"
                }, {
                    "action": "ASYNC",
                    "situation": "AMBIGUOUS"
                }, {
                    "action": "ASYNC",
                    "situation": "CONFIRMED"
                }, {
                    "action": "ASYNC",
                    "situation": "FOUND"
                }, {
                    "action": "ASYNC",
                    "situation": "FOUND_ALREADY_LINKED"
                }, {
                    "action": "ASYNC",
                    "situation": "LINK_ONLY"
                }, {
                    "action": "ASYNC",
                    "situation": "MISSING"
                }, {
                    "action": "ASYNC",
                    "situation": "SOURCE_IGNORED"
                }, {
                    "action": "ASYNC",
                    "situation": "SOURCE_MISSING"
                }, {
                    "action": "ASYNC",
                    "situation": "TARGET_IGNORED"
                }, {
                    "action": "ASYNC",
                    "situation": "UNASSIGNED"
                }, {
                    "action": "ASYNC",
                    "situation": "UNQUALIFIED"
                }]
            };

            if (mappingForm.mappingLinked !== "none") {
                tempMapping.links = mappingForm.mappingLinked;
            }

            completeMapping.mappings.push(tempMapping);

            ConfigDelegate[this.model.syncExist ? "updateEntity" : "createEntity"]("sync", completeMapping).then(_.bind(function () {

                if (callback) {
                    callback();
                }

                eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "mappingSaveSuccess");
                eventManager.sendEvent(constants.ROUTE_REQUEST, { routeName: "propertiesView", args: [tempMapping.name] });
            }, this));
        },
        findLinkedMapping: function findLinkedMapping() {
            var linksFound = _.filter(this.model.mappingList, function (mapping) {
                return mapping.links;
            }),
                availableLinks = _.filter(this.model.mappingList, function (mapping) {
                return !mapping.links;
            }),
                returnedLinks = [];

            _.find(availableLinks, _.bind(function (available) {
                var safe = true;

                _.forEach(linksFound, function (link) {
                    if (link.links === available.name) {
                        safe = false;
                    }
                }, this);

                if (safe) {
                    returnedLinks.push(available);
                } else {
                    safe = true;
                }
            }, this));

            returnedLinks = _.filter(returnedLinks, _.bind(function (link) {
                return link.source === this.model.targetDetails.saveName && link.target === this.model.sourceDetails.saveName;
            }, this));

            return returnedLinks;
        },
        /**
         *
         * @param targetDetails - Object of the mapping target information
         * @param sourceDetails - Object of the mapping source information
         * @param targetObjectType - Object type name for a target connector
         * @param sourceObjectType - Object type name for a source connector
         *
         * Generates a mapping name based off of the mapping source and target items created
         */
        createMappingName: function createMappingName(targetDetails, sourceDetails, targetObjectType, sourceObjectType) {
            var targetName = "",
                sourceName = "",
                mappingSource,
                mappingTarget,
                tempName,
                tempObjectType;

            tempName = this.properCase(targetDetails.name);

            if (targetDetails.resourceType === "connector") {
                tempObjectType = targetObjectType.charAt(0).toUpperCase() + targetObjectType.substring(1);
                targetName = "system" + tempName + tempObjectType;
                mappingTarget = "system/" + targetDetails.name + "/" + targetObjectType;
            } else {
                targetName = "managed" + tempName;
                mappingTarget = "managed/" + targetDetails.name;
            }

            tempName = this.properCase(sourceDetails.name);

            if (sourceDetails.resourceType === "connector") {
                tempObjectType = sourceObjectType.charAt(0).toUpperCase() + sourceObjectType.substring(1);
                sourceName = "system" + tempName + tempObjectType;
                mappingSource = "system/" + sourceDetails.name + "/" + sourceObjectType;
            } else {
                sourceName = "managed" + tempName;
                mappingSource = "managed/" + sourceDetails.name;
            }

            tempName = sourceName + "_" + targetName;

            if (tempName.length > 50) {
                tempName = tempName.substring(0, 49);
            }

            return {
                source: mappingSource,
                target: mappingTarget,
                generatedName: tempName
            };
        },
        //Used to create a properly formatted name of the user selected resources. example managedSystem or sourceLdapAccount
        properCase: function properCase(name) {
            var tempName;

            if (name.length > 1) {
                tempName = name.charAt(0).toUpperCase() + name.substring(1).toLowerCase();
            } else {
                tempName = name.charAt(0).toUpperCase();
            }

            return tempName;
        },
        swapSourceTarget: function swapSourceTarget(event) {
            event.preventDefault();

            var currentTarget = this.model.targetDetails,
                currentSource = this.model.sourceDetails,
                currentSourceAdded = this.model.sourceAdded,
                currentTargetAdded = this.model.targetAdded;

            this.setEmpty("mappingSource");
            this.setEmpty("mappingTarget");

            this.model.targetDetails = currentSource;
            this.model.sourceDetails = currentTarget;
            this.model.sourceAdded = currentTargetAdded;
            this.model.targetAdded = currentSourceAdded;

            if (currentTarget !== null) {
                this.displayDetails("mappingSource", currentTarget);
            }

            if (currentSource !== null) {
                this.displayDetails("mappingTarget", currentSource);
            }

            if (this.model.sourceAdded && this.model.targetAdded) {
                $("#createMapping").prop("disabled", false);
            }

            if (this.model.addCallback) {
                this.model.addCallback(this.model.sourceAdded, this.model.targetAdded);
            }
        },
        displayDetails: function displayDetails(id, details) {
            if (details.resourceType === "connector") {
                this.$el.find("#" + id + " .resource-small-icon").attr('class', "resource-small-icon " + details.icon);

                this.$el.find("#" + id + " .resource-type-name").html(details.displayName);
                this.$el.find("#" + id + " .resource-given-name").html(details.name);
                this.$el.find("#" + id + " .edit-objecttype").show();

                this.$el.find("#" + id + " .object-type-name").hide();
                this.$el.find("#" + id + " .resource-object-type-select").show();
                this.$el.find("#" + id + " .resource-object-type-select option").remove();

                _.forEach(details.objectTypes, _.bind(function (value) {
                    this.$el.find("#" + id + " .resource-object-type-select").append("<option value='" + value + "'>" + value + "</option>");
                }, this));
            } else {
                this.$el.find("#" + id + " .resource-small-icon").attr('class', "resource-small-icon " + details.icon);

                this.$el.find("#" + id + " .resource-type-name").html($.t("templates.managed.managedObjectType"));
                this.$el.find("#" + id + " .resource-given-name").html(details.name);
                this.$el.find("#" + id + " .edit-objecttype").hide();
                this.$el.find("#" + id + " .object-type-name").show();
                this.$el.find("#" + id + " .resource-object-type-select").hide();
            }

            this.$el.find("#" + id + " .mapping-resource").show();
            this.$el.find("#" + id + " .mapping-resource-empty").hide();
            this.$el.find("#" + id + " .select-resource").prop("disabled", false);
        },
        selectAnotherResource: function selectAnotherResource(event) {
            var targetId = $(event.currentTarget).parents(".mapping-resource-body").prop("id");

            this.setEmpty(targetId);
        },
        setEmpty: function setEmpty(id) {
            this.$el.find("#" + id + " .mapping-resource-empty").show();
            this.$el.find("#" + id + " .mapping-resource").hide();
            this.$el.find("#" + id + " .select-resource").prop("disabled", true);
            this.$el.find("#createMapping").prop("disabled", true);

            if (id === "mappingSource") {
                this.model.sourceAdded = false;
                this.model.sourceDetails = null;
            } else {
                this.model.targetAdded = false;
                this.model.targetDetails = null;
            }

            this.model.removeCallback();
        },
        checkMappingName: function checkMappingName(value) {
            return !_.find(this.model.mappingList, _.bind(function (mapping) {
                return value === mapping.name;
            }, this));
        },
        validationSuccessful: function validationSuccessful(event) {
            AbstractView.prototype.validationSuccessful(event);
            this.customValidate();
        },

        validationFailed: function validationFailed(event, details) {
            AbstractView.prototype.validationFailed(event, details);
            this.customValidate();
        },

        customValidate: function customValidate() {
            var formValid = ValidatorsManager.formValidated(this.$el.find("form"));

            if (formValid) {
                //Save button not in this.$el scope
                $("#mappingSaveOkay").attr("disabled", false);
            } else {
                $("#mappingSaveOkay").attr("disabled", true);
            }
        }
    });

    return new MapResourceView();
});
