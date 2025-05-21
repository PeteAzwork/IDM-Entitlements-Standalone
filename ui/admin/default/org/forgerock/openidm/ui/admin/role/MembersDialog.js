"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "handlebars", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/openidm/ui/common/resource/ResourceCollectionSearchDialog", "org/forgerock/openidm/ui/admin/role/util/TemporalConstraintsUtils", "org/forgerock/openidm/ui/admin/role/TemporalConstraintsFormView"], function ($, _, Handlebars, AbstractView, ResourceCollectionSearchDialog, TemporalConstraintsUtils, TemporalConstraintsFormView) {
    var MembersDialog = ResourceCollectionSearchDialog.extend({
        template: "templates/admin/role/MembersSearchDialogTemplate.html",
        setRefProperties: function setRefProperties() {
            this.data._refProperties = {
                grantType: {
                    label: $.t("templates.admin.RoleEdit.grant"),
                    name: "_grantType",
                    value: !_.isEmpty(this.data.propertyValue) ? this.data.propertyValue._refProperties._grantType : ""
                },
                temporalConstraints: {
                    label: "Temporal Constraints",
                    name: "temporalConstraints",
                    value: !_.isEmpty(this.data.propertyValue) ? this.data.propertyValue._refProperties.temporalConstraints : []
                }
            };
        },
        renderDialog: function renderDialog(opts, callback) {
            var renderCallback = _.bind(function () {
                this.addTemporalConstraintsForm();

                if (callback) {
                    callback();
                }
            }, this);

            this.render(opts, renderCallback);
        },
        getNewValArray: function getNewValArray() {
            var propVal = this.data.propertyValue,
                getRefProps = _.bind(function () {
                var refProps = propVal._refProperties || {},
                    temporalConstraintsChecked = this.currentDialog.find(".enableTemporalConstraintsCheckbox").prop("checked");

                refProps.temporalConstraints = undefined;

                if (!_.isEmpty(this.data.propertyValue) && _.has(this.data.propertyValue, "_refProperties._grantType")) {
                    refProps._grantType = this.data.propertyValue._refProperties._grantType;
                }

                if (temporalConstraintsChecked) {
                    refProps.temporalConstraints = TemporalConstraintsUtils.getTemporalConstraintsValue(this.currentDialog.find('.temporalConstraintsForm'));
                }
                return refProps;
            }, this);

            return ResourceCollectionSearchDialog.prototype.getNewValArray.call(this, getRefProps());
        },
        addTemporalConstraintsForm: function addTemporalConstraintsForm() {
            var resourceDetailsForm = this.currentDialog.find("#_refProperty-temporalConstraints"),
                formContainerId = "membersTemporalContstraintsFormContainer",
                formContainer = $("<div id='" + formContainerId + "'></div>"),
                temporalConstraints = [],
                temporalConstraintsView = new TemporalConstraintsFormView();

            if (this.data.propertyValue && this.data.propertyValue._refProperties && this.data.propertyValue._refProperties.temporalConstraints) {
                temporalConstraints = _.map(this.data.propertyValue._refProperties.temporalConstraints, function (constraint) {
                    return TemporalConstraintsUtils.convertFromIntervalString(constraint.duration);
                });
            }

            resourceDetailsForm.append(formContainer);

            temporalConstraintsView.render({
                element: "#" + formContainerId,
                temporalConstraints: temporalConstraints,
                dialogView: true
            });
        }
    });

    return MembersDialog;
});
