"use strict";

/*
 * Copyright 2015-2022 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "handlebars", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/openidm/ui/common/resource/GenericEditResourceView", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/openidm/ui/admin/role/MembersView"], function ($, _, Handlebars, AbstractView, GenericEditResourceView, ValidatorsManager, MembersView) {

    var EditUserView = function EditUserView() {
        return AbstractView.apply(this, arguments);
    };

    EditUserView.prototype = Object.create(GenericEditResourceView);
    EditUserView.prototype.tabViewOverrides.roles = new MembersView();
    EditUserView.prototype.tabViewOverrides.authzRoles = new MembersView();
    EditUserView.prototype.events = _.assignIn({
        "change #password :input": "showPendingChanges",
        "keyup #password :input": "showPendingChanges",
        "shown.bs.tab #tabHeader_password a[data-toggle='tab']": "toggleResetPasswordEventBtn",
        "hidden.bs.tab #tabHeader_password > a[data-toggle='tab']": "toggleResetPasswordEventBtn"
    }, GenericEditResourceView.events);

    EditUserView.prototype.partials = GenericEditResourceView.partials.concat(["partials/resource/_passwordTab.html", "partials/_alert.html", "partials/resource/_passwordFields.html"]);

    EditUserView.prototype.render = function (args, callback) {
        GenericEditResourceView.render.call(this, args, _.bind(function () {
            if (_.has(this.data.schema.properties, "password") && !this.$el.find("#password").length) {
                this.addPasswordTab(callback);
            } else if (callback) {
                callback();
            }
        }, this));
    };

    EditUserView.prototype.setResetPasswordScriptAvailable = function (resetPasswordScriptAvailable) {
        this.resetPasswordScriptAvailable = resetPasswordScriptAvailable;
    };

    EditUserView.prototype.getResetPasswordScriptAvailable = function () {
        return this.resetPasswordScriptAvailable;
    };

    EditUserView.prototype.setEmailServiceAvailable = function (emailServiceAvailable) {
        this.emailServiceAvailable = emailServiceAvailable;
    };
    EditUserView.prototype.getEmailServiceAvailable = function () {
        return this.emailServiceAvailable;
    };

    EditUserView.prototype.getEmailConfigAlertHidden = function () {
        if (!this.data.newObject && this.getResetPasswordScriptAvailable()) {
            return this.getEmailServiceAvailable();
        } else {
            return true;
        }
    };

    EditUserView.prototype.addPasswordTab = function (callback) {
        var _this = this;

        if (this.data.newObject) {
            var passwordFields = Handlebars.compile("{{> resource/_passwordTab newObject=true }}");

            this.$el.find("#resource-details").find("form").append(passwordFields);
            //add an id to the save button so the validation on password fields can disable it when password is invalid
            this.$el.find(".saveBtn").attr("id", "passwordSaveBtn");

            _.forEach(_.filter(this.data.schema.properties, function (p) {
                return p.hasOwnProperty("default");
            }), function (property) {
                //hide field that has a default value
                _this.$el.find("input[name='root[" + property.propName + "]']").closest(".row").hide();
                _this.$el.find("select[name='root[" + property.propName + "]']").closest(".row").hide();
            });
        } else {
            this.$el.find(".container-password").remove();
            var tabHeader = this.$el.find("#tabHeaderTemplate").clone(),
                tabContent = Handlebars.compile("{{> resource/_passwordTab" + " emailServiceAvailable=" + this.getEmailConfigAlertHidden() + " resetPasswordScriptAvailable=" + this.getResetPasswordScriptAvailable() + " emailMessage='" + $.t("templates.admin.ChangeUserPasswordDialogTemplate.outboundEmailConfigRequired") + "'" + " linkMessage='" + $.t("templates.admin.ChangeUserPasswordDialogTemplate.outboundEmailConfigRequiredLinkMessage") + "'" + " error='" + $.t("common.form.warning") + "'" + "}}");

            tabHeader.attr("id", "tabHeader_password");
            tabHeader.find("a").attr("href", "#password").text($.t('common.user.password'));
            tabHeader.show();

            this.$el.find("#resourceDetailsTabHeader").after(tabHeader);
            this.$el.find("#resource-details").after(tabContent);
        }

        ValidatorsManager.bindValidators(this.$el.find("#password"), [this.data.objectType, this.objectName, this.objectId || "*"].join("/"));

        if (callback) {
            callback();
        }
    };

    EditUserView.prototype.getFormValue = function () {
        var passwordText = this.$el.find("#input-password").val(),
            formVal = GenericEditResourceView.getFormValue.call(this);

        if (ValidatorsManager.formValidated(this.$el.find("#password")) && passwordText && passwordText.length) {
            return _.set(formVal, "password", passwordText);
        } else {
            return formVal;
        }
    };

    /**
    * This function overrides showPendingChanges to be able to handle the situation where
    * an invalid password is entered. We need to be able to click the "Reset" button.
    **/
    EditUserView.prototype.showPendingChanges = function () {
        var passwordText = this.$el.find("#input-password").val(),
            changedFields = this.$el.find("#changedFields"),
            passwordInvalidText = $.t("templates.admin.ResourceEdit.passwordInvalid");

        GenericEditResourceView.showPendingChanges.call(this);

        if (passwordText && passwordText.length) {
            this.$el.find("#resetBtn").removeAttr('disabled');

            if (this.$el.find("#password").find("[data-validation-status=error]").length > 0) {
                this.$el.find("#passwordSaveBtn").attr('disabled', true);
                changedFields.html(passwordInvalidText);
                this.$el.find("#resourceChangesPending").show();
            } else {
                this.$el.find("#passwordSaveBtn").removeAttr('disabled');
            }
        } else {
            this.$el.find("#passwordSaveBtn").removeAttr('disabled');
        }
    };

    return new EditUserView();
});
