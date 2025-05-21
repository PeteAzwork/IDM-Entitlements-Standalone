"use strict";

/*
 * Copyright 2015-2022 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "jsonEditor", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/openidm/ui/common/delegates/ResourceDelegate", "org/forgerock/openidm/ui/common/util/ResourceCollectionUtils"], function ($, _, JSONEditor, AbstractView, resourceDelegate, resourceCollectionUtils) {

    var LinkedView = AbstractView.extend({
        template: "templates/admin/linkedView/LinkedView.html",
        events: {
            "change #linkedViewSelect": "changeResource"
        },
        editors: {},

        render: function render(args, callback) {
            resourceDelegate.linkedView(args.id, args.resourcePath).then(_.bind(function (linkedData) {

                this.data.linkedData = linkedData;
                this.data.linkedResources = [];

                _.forEach(this.data.linkedData, _.bind(function (resource, index) {
                    this.data.linkedResources.push(this.cleanLinkName(resource.resourceName, resource.linkQualifier));

                    //This second loop is to ensure that null returned first level values actually display in JSON editor
                    //Without this it will not display the textfields
                    _.forEach(resource.content, _.bind(function (attribute, key) {
                        if (attribute === null) {
                            this.data.linkedData[index].content[key] = "";
                        }
                    }, this));
                }, this));

                this.parentRender(_.bind(function () {
                    this.loadEditor("all");

                    if (callback) {
                        callback();
                    }
                }, this));
            }, this));
        },

        cleanLinkName: function cleanLinkName(name, linkQualifier) {
            var cleanName = name.split("/");

            cleanName.pop();

            cleanName = cleanName.join("/");

            if (linkQualifier) {
                cleanName = cleanName + " - " + linkQualifier;
            }

            return cleanName;
        },

        changeResource: function changeResource(event) {
            event.preventDefault();

            this.loadEditor($(event.target).val());
        },

        loadEditor: function loadEditor(selectedIndex) {
            var linkToResource = "#resource/",
                resourceId,
                displayEditor = _.bind(function (selection) {
                if (this.editors[selection]) {
                    this.editors[selection].destroy();
                }

                if (this.data.linkedData.length > 0) {

                    this.$el.closest(".container").find("#linkedSystemsTabHeader").show();

                    if (this.data.linkedData[selection].content !== null) {
                        resourceId = _.last(this.data.linkedData[selection].resourceName.split("/"));
                        var provisionerId = 'provisioner.openicf_' + this.data.linkedData[selection].resourceName.split("/")[1];
                        linkToResource += this.data.linkedData[selection].resourceName.replace(resourceId, "edit/" + resourceId) + '/' + provisionerId;

                        this.$el.find("#linkToResource").attr("href", linkToResource);

                        resourceDelegate.getSchema(this.data.linkedData[selection].resourceName.split("/")).then(_.bind(function (schema) {
                            var _this = this;

                            var propCount = 0;
                            if (schema.order) {
                                _.forEach(schema.order, function (prop) {
                                    schema.properties[prop].propertyOrder = propCount++;
                                });
                            }

                            schema.properties = resourceCollectionUtils.convertRelationshipTypes(schema.properties);

                            if (schema.allSchemas) {
                                delete schema.allSchemas;
                            }

                            this.editors[selection] = new JSONEditor(this.$el.find("#linkedViewContent")[0], {
                                theme: "bootstrap3",
                                iconlib: "fontawesome4",
                                disable_edit_json: true,
                                disable_properties: true,
                                disable_array_delete: true,
                                disable_array_reorder: true,
                                disable_array_add: true,
                                schema: schema,
                                horizontalForm: true
                            });

                            if (this.data.linkedData[selection].content._id) {
                                delete this.data.linkedData[selection].content._id;
                            }

                            _.forEach(this.data.linkedData[selection].content, _.bind(function (value, key) {
                                if (_.isArray(value) && value.length === 0) {
                                    this.data.linkedData[selection].content[key] = undefined;
                                }
                            }, this));

                            this.editors[selection].setValue(this.data.linkedData[selection].content);

                            // for LDAP queries, when key/value is Empty Array, this was modified to "undefined" above
                            // so we need to skip this
                            Object.keys(this.data.linkedData[selection].content).forEach(function (key) {
                                if (_this.$el.find("#0-root-" + key)[0] !== undefined) {
                                    _this.$el.find("#0-root-" + key)[0].id = "#0-root-" + key + "-" + selection;
                                }
                            });
                            this.$el.find(".row select").hide();
                            this.$el.find(".row input").attr("disabled", true);
                        }, this));
                    } else {
                        this.$el.find("#linkedViewContent").text($.t("templates.admin.LinkedTemplate.recordMissing") + ': ' + this.data.linkedData[selection].resourceName);
                    }
                }
            }, this);

            if (selectedIndex === "all") {
                this.$el.find("#linkToResource").hide();
                _.forEach(this.data.linkedResources, function (resource, index) {
                    displayEditor(index);
                });
            } else {
                this.$el.find("#linkToResource").show();
                displayEditor(selectedIndex);
            }
        }
    });

    return LinkedView;
});
