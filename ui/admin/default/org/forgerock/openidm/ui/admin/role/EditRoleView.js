"use strict";

/*
 * Copyright 2011-2022 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "handlebars", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/openidm/ui/common/resource/GenericEditResourceView", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/openidm/ui/common/resource/util/ResourceQueryFilterEditor", "org/forgerock/openidm/ui/admin/role/util/TemporalConstraintsUtils", "org/forgerock/openidm/ui/admin/role/TemporalConstraintsFormView", "org/forgerock/openidm/ui/common/delegates/ResourceDelegate", "org/forgerock/openidm/ui/admin/role/MembersView", "org/forgerock/openidm/ui/admin/role/PrivilegesView"], function ($, _, Handlebars, AbstractView, GenericEditResourceView, ValidatorsManager, ResourceQueryFilterEditor, TemporalConstraintsUtils, TemporalConstraintsFormView, ResourceDelegate, MembersView, PrivilegesView) {
    var EditRoleView = function EditRoleView() {
        return AbstractView.apply(this, arguments);
    };

    EditRoleView.prototype = Object.create(GenericEditResourceView);
    EditRoleView.prototype.tabViewOverrides.members = new MembersView();
    EditRoleView.prototype.tabViewOverrides.authzMembers = new MembersView();
    EditRoleView.prototype.events = _.assignIn({
        "change .expressionTree :input": "showPendingChanges",
        "blur :input.datetimepicker": "showPendingChanges"
    }, GenericEditResourceView.events);

    EditRoleView.prototype.partials = GenericEditResourceView.partials.concat(["partials/role/_conditionForm.html"]);

    EditRoleView.prototype.render = function (args, callback) {
        delete this.data.privilegesView;

        GenericEditResourceView.render.call(this, args, _.bind(function () {
            var _this2 = this;

            var addPrivilegesTab = function addPrivilegesTab() {
                var tabHeader = _this2.$el.find("#tabHeaderTemplate").clone(),
                    tabContent = _this2.$el.find("#tabContentTemplate").clone(),
                    promise = $.Deferred();

                if (!_this2.data.newObject) {
                    tabHeader.attr("id", "tabHeader_resource-privileges");
                    tabHeader.find("a").attr("href", "#resource-privileges").text(_this2.data.schema.properties.privileges.title);
                    tabHeader.show();

                    tabContent.attr("id", "resource-privileges");
                    tabContent.find(".resourceCollectionArray").attr("id", "relationshipArray-privileges");

                    _this2.$el.find("#resourceDetailsTabHeader").after(tabHeader);
                    _this2.$el.find("#resource-details").after(tabContent);

                    _this2.loadPrivilegesView(function () {
                        promise.resolve();
                    });
                } else {
                    promise.resolve();
                }

                return promise;
            };

            if (_.has(this.data.schema.properties, "temporalConstraints")) {
                if (!this.data.newObject && !this.$el.find('#temporalConstraintsForm').length) {
                    this.addTemporalConstraintsForm();
                }
            }

            if (_.has(this.data.schema.properties, "condition") && !this.$el.find("#condition").length) {
                if (!this.data.newObject && !this.$el.find('#conditionFilterForm').length) {
                    this.addConditionForm();
                }
            }

            //remove default privileges jsonEditor element and add the privileges tab override
            this.$el.find("[data-schemaPath='root.privileges']").remove();
            if (!this.data.newObject && !_.isUndefined(this.data.schema.properties.privileges)) {
                addPrivilegesTab();
            }

            if (callback) {
                callback();
            }
        }, this));
    };

    EditRoleView.prototype.addTemporalConstraintsForm = function () {
        var _this = this,
            resourceDetailsForm = this.$el.find("#resource-details form"),
            formContainerId = "temporalContstraintsFormContainer",
            formContainer = $("<div id='" + formContainerId + "'></div>"),
            temporalConstraints = [],
            temporalConstraintsView = new TemporalConstraintsFormView();

        if (this.oldObject.temporalConstraints) {
            temporalConstraints = _.map(this.oldObject.temporalConstraints, function (constraint) {
                return TemporalConstraintsUtils.convertFromIntervalString(constraint.duration);
            });
        }

        resourceDetailsForm.append(formContainer);

        temporalConstraintsView.render({
            element: "#" + formContainerId,
            toggleCallback: function toggleCallback() {
                _this.showPendingChanges();
            },
            temporalConstraints: temporalConstraints
        });
    };

    EditRoleView.prototype.addConditionForm = function () {
        var _this3 = this;

        var resourceDetailsForm = this.$el.find("#resource-details form"),
            conditionContent = Handlebars.compile("{{> role/_conditionForm}}");

        resourceDetailsForm.append(conditionContent);

        /*
         * get rid of any existing queryEditors that may be polluting this view
         * if this is not done pending changes does not work properly
         */
        delete this.queryEditor;
        var conditionCheckbox = this.$el.find("#enableDynamicRoleGrantCheckbox");
        conditionCheckbox.click(function () {
            return _this3.toggleQueryView();
        });

        if (this.oldObject.condition && this.oldObject.condition !== "false") {
            if (this.oldObject.condition.length) {
                conditionCheckbox.prop("checked", true);
            }

            this.toggleQueryView();
        }
    };

    EditRoleView.prototype.renderEditor = function (clearFilter) {
        var _this = this,
            editor = new ResourceQueryFilterEditor(),
            filter = "";

        if (this.oldObject.condition && this.oldObject.condition !== "false" && !clearFilter) {
            filter = _this.oldObject.condition;
        }

        editor.loadSourceProps = function () {
            return ResourceDelegate.getSchema(editor.args.resource.split("/")).then(function (resourceSchema) {
                return _.keys(resourceSchema.properties).sort();
            });
        };

        editor.render({
            "queryFilter": filter,
            "element": "#conditionFilterHolder",
            "resource": "managed/user"
        }, function () {
            if (filter.length || clearFilter) {
                /*
                    The QueryFilterEditor (QFE) will replace single quoted qf nodes with double quotes
                    example: !(a eq '') turns into !(a eq "")
                    this causes changesPending on Condition to be displayed when there are actually no changes.
                    We need to set oldObject.condition to be the same representation of what is displayed
                    in the QFE before we fire off showPendingChanges for the first time
                */
                _this.oldObject.condition = editor.data.filterString;

                _this.showPendingChanges();
            }
        });

        return editor;
    };

    EditRoleView.prototype.toggleQueryView = function (e) {
        if (e) {
            e.preventDefault();
        }

        if (this.$el.find("#enableDynamicRoleGrantCheckbox").prop("checked")) {
            this.$el.find("#roleConditionQueryField").show();
            this.queryEditor = this.renderEditor();
        } else {
            this.$el.find("#roleConditionQueryField").hide();
            this.queryEditor = this.renderEditor(true);
        }
    };

    EditRoleView.prototype.getFormValue = function () {
        var conditionChecked = this.$el.find("#enableDynamicRoleGrantCheckbox").prop("checked"),
            temporalConstraintsChecked = this.$el.find(".enableTemporalConstraintsCheckbox").prop("checked"),
            condition = "",
            temporalConstraints = [],
            returnVal;

        if (conditionChecked && this.queryEditor) {
            condition = this.queryEditor.getFilterString();
        } else {
            condition = undefined;
        }

        if (temporalConstraintsChecked) {
            temporalConstraints = TemporalConstraintsUtils.getTemporalConstraintsValue(this.$el.find('.temporalConstraintsForm'));
        } else {
            temporalConstraints = undefined;
        }

        returnVal = _.assignIn({
            "condition": condition,
            "temporalConstraints": temporalConstraints
        }, GenericEditResourceView.getFormValue.call(this));

        if (!this.data.newObject && this.data.privilegesView) {
            returnVal.privileges = this.data.privilegesView.getValue();
        }

        return returnVal;
    };

    EditRoleView.prototype.loadPrivilegesView = function (callback) {
        var _this4 = this;

        this.data.privilegesView = new PrivilegesView();

        this.data.privilegesView.render({
            element: "#relationshipArray-privileges",
            role: this.oldObject,
            schema: this.data.schema,
            onUpdatePrivileges: function onUpdatePrivileges() {
                _this4.render(_this4.data.args, function () {
                    _this4.$el.find('a[href="#resource-privileges"]').tab('show');
                    if (callback) {
                        callback();
                    }
                });
            }
        }, function () {
            if (callback) {
                callback();
            }
        });
    };

    return new EditRoleView();
});
