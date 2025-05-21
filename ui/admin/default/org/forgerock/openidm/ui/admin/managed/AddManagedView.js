"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "form2js", "faiconpicker", "org/forgerock/openidm/ui/admin/managed/AbstractManagedView", "org/forgerock/openidm/ui/common/util/CommonUIUtils", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/delegates/RepoDelegate"], function ($, _, form2js, faiconpicker, AbstractManagedView, CommonUIUtils, ValidatorsManager, ConfigDelegate, RepoDelegate) {
    var AddManagedView = AbstractManagedView.extend({
        template: "templates/admin/managed/AddManagedTemplate.html",
        events: {
            "submit #addManagedObjectForm": "createManagedObject",
            "onValidate": "onValidate"
        },
        data: {},
        model: {},

        render: function render(args, callback) {
            $.when(ConfigDelegate.readEntity("managed"), RepoDelegate.findRepoConfig()).then(_.bind(function (managedObjects, repoConfig) {
                this.model.managedObjects = managedObjects;
                this.data.repoConfig = repoConfig;

                this.parentRender(_.bind(function () {
                    ValidatorsManager.bindValidators(this.$el.find("#addManagedObjectForm"));
                    this.$el.find('#managedObjectIcon').iconpicker({
                        hideOnSelect: true
                    });

                    this.$el.find("#managedObjectName").focus();

                    if (callback) {
                        callback();
                    }
                }, this));
            }, this));
        },

        createManagedObject: function createManagedObject(event) {
            event.preventDefault();

            var managedObject = form2js('addManagedObjectForm', '.', true),
                nameCheck;

            managedObject.schema = {};
            managedObject.schema.icon = this.$el.find("#managedObjectIcon").val();

            nameCheck = this.checkManagedName(managedObject.name, this.model.managedObjects.objects);

            if (!nameCheck) {
                this.model.managedObjects.objects.push(managedObject);

                managedObject.schema.icon = this.$el.find("#managedObjectIcon").val();
                managedObject.schema["mat-icon"] = this.$el.find("#materialDesignIcon").val();
                managedObject.schema.title = this.$el.find("#managedObjectTitle").val();
                managedObject.schema.description = this.$el.find("#managedObjectDescription").val();

                this.saveManagedObject(CommonUIUtils.replaceEmptyStringWithNull(managedObject), this.model.managedObjects, true);
            } else {
                this.$el.find("#managedErrorMessage .message").html($.t("templates.managed.duplicateNameError"));
                this.$el.find("#managedErrorMessage").show();
                this.$el.find("#addManagedObject").prop("disabled", true);
            }
        }
    });

    return new AddManagedView();
});
