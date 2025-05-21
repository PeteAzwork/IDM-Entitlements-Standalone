"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
define(["jquery", "lodash", "backbone", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/openidm/ui/admin/progressiveProfileForms/tabs/AttributesView", "org/forgerock/commons/ui/common/components/ChangesPending", "org/forgerock/openidm/ui/admin/progressiveProfileForms/tabs/ConditionView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/admin/progressiveProfileForms/tabs/DetailsView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/commons/ui/common/main/ValidatorsManager"], function ($, _, Backbone, AdminAbstractView, AdminUtils, AttributesView, ChangesPending, ConditionView, ConfigDelegate, Constants, DetailsView, EventManager, Router, UIUtils, ValidatorsManager) {
    var EditProgressiveProfileFormView = AdminAbstractView.extend({
        template: "templates/admin/progressiveProfileForms/EditProgressiveProfileFormViewTemplate.html",
        events: {
            "click .btn-save": "saveForm",
            "click #deleteProgressiveProfileCompletionForm": "deleteForm",
            "change input": "makeChanges",
            "change select": "makeChanges",
            "shown.bs.tab": "refreshScriptEditor"
        },
        model: {},
        render: function render(args, callback) {
            var _this = this;

            this.args = args;
            this.model.stageConfigIndex = args[0];
            this.data.showAttributesTab = args[1];

            ConfigDelegate.readEntity("selfservice/profile").then(function (profileCompletionConfig) {
                //save the original config
                _this.model.profileCompletionConfig = profileCompletionConfig;
                //grab the stageConfig
                _this.model.form = _this.model.profileCompletionConfig.stageConfigs[_this.model.stageConfigIndex];
                //ensure the condition type is valid, or provide default scripted condition
                _this.model.form.condition = ConditionView.ensureSupportedCondition(_this.model.form.condition);
                //need the displayName for the template
                _this.data.formDisplayName = _this.model.form.onConditionTrue.uiConfig.displayName;

                _this.loadTabs(function () {
                    _this.setTabChangeEvent();

                    if (callback) {
                        callback();
                    }
                });
            });
        },
        loadTabs: function loadTabs(callback) {
            var _this2 = this;

            this.parentRender(function () {
                var saveForm = _.bind(_this2.saveForm, _this2),
                    identityServiceUrl = _this2.model.form.identityServiceUrl;

                AttributesView.render({
                    element: "#attributesFormContainer",
                    attributes: _this2.model.form.onConditionTrue.attributes,
                    identityServiceUrl: identityServiceUrl,
                    onSave: saveForm
                });

                ConditionView.render({
                    element: "#conditionFormContainer",
                    condition: _this2.model.form.condition,
                    identityServiceUrl: identityServiceUrl,
                    makeChanges: _this2.makeChanges.bind(_this2),
                    saveForm: saveForm
                });

                DetailsView.render({
                    element: "#detailsFormContainer",
                    uiConfig: _this2.model.form.onConditionTrue.uiConfig
                }, function () {
                    ValidatorsManager.bindValidators(_this2.$el.find("#detailsFormBB"));
                    ValidatorsManager.validateAllFields(_this2.$el.find("#detailsFormBB"));
                });

                _this2.setupChangesPending();

                if (callback) {
                    callback();
                }
            });
        },
        getValue: function getValue() {
            var form = _.cloneDeep(this.model.form),
                details = _.cloneDeep(DetailsView.getValue());

            form.onConditionTrue.uiConfig = details;
            form.condition = ConditionView.getValue();
            form.onConditionTrue.attributes = AttributesView.getValue();

            return form;
        },
        saveForm: function saveForm(e) {
            var _this3 = this;

            if (e) {
                e.preventDefault();
            }

            this.model.form = this.getValue();
            this.model.profileCompletionConfig.stageConfigs[this.model.stageConfigIndex] = this.model.form;

            ConfigDelegate.updateEntity("selfservice/profile", this.model.profileCompletionConfig).then(function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "progressiveProfileFormSaveSuccess");
                //reset changesPending
                ConditionView.updateModel(_.cloneDeep(_.get(_this3.model.form, "condition")));
                _this3.setupChangesPending();
                _this3.makeChanges();
                //make sure the page header stays up to date with the current form name
                _this3.$el.find("#formDisplayName").text(_this3.model.form.onConditionTrue.uiConfig.displayName);
            });
        },
        deleteForm: function deleteForm(e) {
            var _this4 = this;

            var overrides = {
                title: $.t("templates.progressiveProfile.deleteForm"),
                okText: $.t("common.form.confirm")
            },
                formName = escape(unescape(this.model.form.onConditionTrue.uiConfig.displayName));

            e.preventDefault();

            UIUtils.confirmDialog($.t("templates.progressiveProfile.confirmFormDelete", { formName: formName }), "danger", function () {
                _this4.model.profileCompletionConfig.stageConfigs.splice(_this4.model.stageConfigIndex, 1);

                ConfigDelegate.updateEntity("selfservice/profile", _this4.model.profileCompletionConfig).then(function () {
                    EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "progressiveProfileFormSaveSuccess");
                    EventManager.sendEvent(Constants.EVENT_CHANGE_VIEW, { route: Router.configuration.routes.progressiveProfileFormList });
                });
            }, overrides);
        },
        setupChangesPending: function setupChangesPending() {
            var _this5 = this;

            var watchedObj = _.cloneDeep(this.model.form);

            this.model.changesModule = ChangesPending.watchChanges({
                element: this.$el.find(".changes-pending-container"),
                undo: true,
                watchedObj: watchedObj,
                undoCallback: function undoCallback() {
                    var activeTab = _this5.$el.find(".tab-menu").find("li.active a").attr("href");

                    //make sure we open the tab we are currently viewing
                    _this5.render(_this5.args, function () {
                        _this5.$el.find('a[href="' + activeTab + '"]').tab('show');
                    });
                }
            });
        },
        //this function is called any time an input on either the Display Condition or Details tab changes
        makeChanges: function makeChanges() {
            this.model.changesModule.makeChanges(_.cloneDeep(this.getValue()));

            //enable/disable the save button accordingly
            if (this.model.changesModule.isChanged() && ValidatorsManager.formValidated(this.$el.find("#detailsFormBB"))) {
                this.$el.find(".btn-save").prop("disabled", false);
            } else {
                this.$el.find(".btn-save").prop("disabled", true);
            }
        },

        refreshScriptEditor: function refreshScriptEditor() {
            if (ConditionView.scriptEditor && ConditionView.scriptEditor.cmBox) {
                ConditionView.scriptEditor.refresh();
            }
        },
        /**
        * This function sets an event for each bootstrap tab on "show" which looks for any
        * pending form changes in the currently visible tab. If there are changes the tab
        * change is halted and a dialog is displayed asking the user if he/she would like to discard
        * or save the changes before actually changing tabs.
        *
        **/
        setTabChangeEvent: function setTabChangeEvent() {
            var _this6 = this;

            this.$el.on('show.bs.tab [role="tab"]', function (e) {
                var navigateToTab = e.target.hash;

                if (_this6.$el.find(".changes-pending-container:visible").length && !$("#frConfirmationDialog").hasClass('in') && _.includes(navigateToTab, "Container")) {
                    //stop processing this tab change
                    e.preventDefault();

                    AdminUtils.confirmSaveChanges(_this6, navigateToTab, function () {
                        _this6.saveForm();
                        _this6.$el.find('a[href="' + navigateToTab + '"]').tab('show');
                    });
                }
            });
        }
    });

    return new EditProgressiveProfileFormView();
});
