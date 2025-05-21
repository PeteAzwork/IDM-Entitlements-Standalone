"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/openidm/ui/admin/settings/audit/AuditAdminAbstractView", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "org/forgerock/commons/ui/common/util/UIUtils", "selectize"], function ($, _, AuditAdminAbstractView, Conf, ValidatorsManager, BootstrapDialogUtils, UIUtils) {

    var AuditFilterPoliciesDialog = AuditAdminAbstractView.extend({
        template: "templates/admin/settings/audit/AuditFilterPoliciesDialogTemplate.html",
        el: "#dialogs",
        events: {
            "keydown": "keydownHandler"
        },

        /**
         * Opens the dialog
         *
         * @param configs
         * @param callback
         */
        render: function render(configs, callback) {
            var _this = this,
                title = "";

            this.model = _.assignIn({}, configs);
            this.data = {};

            this.data.topics = this.getTopics();

            if (this.model.newFilter) {
                title = $.t("templates.audit.filterPolicies.add");
            } else {
                title = $.t("templates.audit.filterPolicies.edit");
                this.data.filter = this.model.filter;
            }

            this.model.currentDialog = $('<div id="AuditFilterPoliciesDialog"></div>');
            this.setElement(this.model.currentDialog);
            $('#dialogs').append(this.model.currentDialog);

            _.bind(UIUtils.renderTemplate, this)(this.template, this.$el, _.assignIn({}, Conf.globalData, this.data), _.bind(function () {

                this.$el.find(".type-select").selectize();
                this.$el.find(".topic-select").selectize();

                if (!this.model.newFilter) {
                    this.$el.find(".type-select")[0].selectize.setValue(this.data.filter.typeLiteral);
                    this.$el.find(".topic-select")[0].selectize.setValue(this.data.filter.topic);
                }
            }, this), "replace");

            BootstrapDialogUtils.createModal({
                title: title,
                message: this.model.currentDialog,
                onshown: _.bind(function () {
                    var inputs = this.$el.find("input");

                    if (_.isUndefined(inputs.first().attr("disabled"))) {
                        inputs.first().focus();
                    } else {
                        this.$el.find(".selectize-input > input").focus();
                    }
                    ValidatorsManager.bindValidators(this.$el.find(".audit-filter-form"));
                    ValidatorsManager.validateAllFields(this.$el.find(".audit-filter-form"));

                    if (callback) {
                        callback();
                    }
                }, this),
                buttons: ["cancel", {
                    label: $.t("common.form.submit"),
                    id: "submitAuditFilters",
                    cssClass: "btn-primary save-button",
                    action: _.bind(function (dialogRef) {
                        if (this.model.saveCallback) {
                            this.model.saveCallback(this.$el.find(".type-select").val(), "excludeIf", "/" + this.$el.find(".topic-select").val() + "/" + this.$el.find(".location-input").val());
                        }
                        dialogRef.close();
                    }, _this)
                }]
            }).open();
        },

        validationSuccessful: function validationSuccessful(event) {
            AuditAdminAbstractView.prototype.validationSuccessful(event);

            if (ValidatorsManager.formValidated(this.$el.find("#submitAuditFilters"))) {
                this.$el.parentsUntil(".model-content").find("#submitAuditFilters").prop('disabled', false);
            }
        },

        validationFailed: function validationFailed(event, details) {
            AuditAdminAbstractView.prototype.validationFailed(event, details);

            this.$el.parentsUntil(".model-content").find("#submitAuditFilters").prop('disabled', true);
        },

        isValid: function isValid() {
            return ValidatorsManager.formValidated(this.$el.find("#submitAuditFilters"));
        }

    });

    return new AuditFilterPoliciesDialog();
});
