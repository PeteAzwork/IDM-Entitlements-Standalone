"use strict";

/*
 * Copyright 2014-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/connector/ConnectorTypeAbstractView", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/openidm/ui/admin/connector/ldap/LDAPFilterDialog", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils"], function ($, _, ConnectorTypeAbstractView, validatorsManager, ldapFilterDialog, ConnectorDelegate, uiUtils, BootstrapDialogUtils) {
    var baseContextsSelectizeArrayDelimeter = "####";
    var LDAPTypeView = ConnectorTypeAbstractView.extend({
        events: {
            "click .filter": "showFilterDialog",
            "click #ssl": "toggleSSLPort",
            "click #syncBaseContext": "toggleSyncBaseContext",
            "click #toggleCert": "toggleCert",
            "change #ldapTemplateType": "changeLdapType"
        },
        data: {
            ldapSelector: [{
                "displayName": "Generic LDAP Configuration",
                "fileName": "baseConfig"
            }, {
                "displayName": "AD LDAP Configuration",
                "fileName": "provisioner.openicf-adldap"
            }, {
                "displayName": "ADLDS LDAP Configuration",
                "fileName": "provisioner.openicf-adldsldap"
            }, {
                "displayName": "DS LDAP Configuration",
                "fileName": "provisioner.openicf-ldap"
            }],
            generic: true
        },
        model: {},
        render: function render(args, callback) {
            var _this2 = this;

            var base = "templates/admin/connector/";

            this.data.publicKey = "";

            $("#connectorDetails").hide();

            this.data.connectorDefaults = args.connectorDefaults;

            // If excludeUnmodified doesn't exist, default it to true
            if (_.isUndefined(this.data.connectorDefaults.excludeUnmodified)) {
                this.data.connectorDefaults.excludeUnmodified = true;
            }

            if (!this.model.defaultLdap) {
                this.model.defaultLdap = _.cloneDeep(this.data.connectorDefaults);
            }

            this.data.editState = args.editState;

            this.model.systemType = args.systemType;
            this.model.connectorType = args.connectorType;

            this.template = base + args.connectorType + ".html";

            if (!this.data.editState) {
                if (args.ldapType) {
                    this.model.ldapType = args.ldapType;
                    this.$el.find("#ldapTemplateType").val(args.ldapType);
                } else {
                    this.model.ldapType = "baseConfig";
                }
            }

            if (!_.isUndefined(this.data.connectorDefaults.configurationProperties.baseContexts) && !_.isUndefined(this.data.connectorDefaults.configurationProperties.baseContextsToSynchronize)) {
                this.data.baseContextsSameResults = this.compareBaseContext(this.data.connectorDefaults.configurationProperties.baseContexts, this.data.connectorDefaults.configurationProperties.baseContextsToSynchronize);
            } else {
                this.data.baseContextsSameResults = true;
            }

            this.ldapParentRender(args, function () {
                _this2.fieldButtonCheck();

                $('#failoverArray').selectize({
                    delimiter: ',',
                    persist: false,
                    create: function create(input) {
                        return {
                            value: input,
                            text: input
                        };
                    }
                });

                $('#baseContextsArray').val(_this2.data.connectorDefaults.configurationProperties.baseContexts.join(baseContextsSelectizeArrayDelimeter));

                $('#baseContextsArray').selectize({
                    delimiter: baseContextsSelectizeArrayDelimeter,
                    persist: false,
                    create: function create(input) {
                        return {
                            value: input,
                            text: input
                        };
                    }
                });

                $('#baseContextsToSyncArray').val(_this2.data.connectorDefaults.configurationProperties.baseContextsToSynchronize.join(baseContextsSelectizeArrayDelimeter));

                $('#baseContextsToSyncArray').selectize({
                    delimiter: baseContextsSelectizeArrayDelimeter,
                    persist: false,
                    create: function create(input) {
                        return {
                            value: input,
                            text: input
                        };
                    }
                });

                $('#accountObjectClassesArray').selectize({
                    delimiter: ',',
                    persist: false,
                    create: function create(input) {
                        return {
                            value: input,
                            text: input
                        };
                    }
                });

                $('#groupObjectClassesArray').selectize({
                    delimiter: ',',
                    persist: false,
                    create: function create(input) {
                        return {
                            value: input,
                            text: input
                        };
                    }
                });

                $('#objectClassesToSynchronizeArray').selectize({
                    delimiter: ',',
                    persist: false,
                    create: function create(input) {
                        return {
                            value: input,
                            text: input
                        };
                    }
                });

                if (callback) {
                    callback();
                }
            });
        },
        compareBaseContext: function compareBaseContext(base, sync) {
            var sameResults = true,
                compare;

            if (base.length === sync.length) {
                compare = _.difference(base, sync);

                if (compare.length !== 0) {
                    sameResults = false;
                }
            } else {
                sameResults = false;
            }

            return sameResults;
        },
        ldapParentRender: function ldapParentRender(args, callback) {
            this.parentRender(_.bind(function () {
                if (!this.data.editState) {
                    this.$el.find("#ldapTemplateType").val(this.model.ldapType);
                }

                if (args.animate) {
                    $("#connectorDetails").slideDown("slow", function () {});
                } else {
                    $("#connectorDetails").show();
                }

                if (this.data.connectorDefaults.configurationProperties.ssl) {
                    this.$el.find("#toggleCert").show();
                }

                validatorsManager.bindValidators(this.$el, "config/provisioner.openicf/ldap", _.bind(function () {
                    validatorsManager.validateAllFields(this.$el);
                }, this));

                if (callback) {
                    callback();
                }
            }, this));
        },

        changeLdapType: function changeLdapType(event) {
            var value = $(event.target).val();

            uiUtils.jqConfirm($.t("templates.connector.ldapConnector.ldapTypeChange"), _.bind(function () {
                if (value === "baseConfig") {
                    this.data.generic = true;
                    this.render({
                        "animate": false,
                        "connectorDefaults": this.model.defaultLdap,
                        "editState": this.data.editState,
                        "systemType": this.model.systemType,
                        "connectorType": this.model.connectorType,
                        "ldapType": value
                    });
                } else {
                    ConnectorDelegate.connectorDefault(value, "ldap").then(_.bind(function (result) {
                        this.data.generic = false;
                        this.render({
                            "animate": false,
                            "connectorDefaults": result,
                            "editState": this.data.editState,
                            "systemType": this.model.systemType,
                            "connectorType": this.model.connectorType,
                            "ldapType": value
                        });
                    }, this));
                }
            }, this), _.bind(function () {
                this.$el.find("#ldapTemplateType").val(this.model.ldapType);
            }, this), "330px");
        },

        showFilterDialog: function showFilterDialog(event) {
            event.preventDefault();

            var filterProp = $(event.target).closest(".filter-holder").find("input").attr("id"),
                updatePromise = $.Deferred();

            ldapFilterDialog.render({
                filterString: this.data.connectorDefaults.configurationProperties[filterProp],
                type: $.t("templates.connector.ldapConnector." + filterProp),
                promise: updatePromise
            });

            updatePromise.then(_.bind(function (filterString) {
                this.data.connectorDefaults.configurationProperties[filterProp] = filterString;
                this.data.connectorDefaults.configurationProperties[filterProp.replace('Search', 'Synchronization')] = filterString;

                $("#" + filterProp).val(filterString);
                $("#" + filterProp + "Hidden").val(filterString);
            }, this));
        },
        toggleSyncBaseContext: function toggleSyncBaseContext(event) {
            if (!$(event.target).is(":checked")) {
                this.$el.find("#baseContextsToSynchronizeHolder").show();
            } else {
                this.$el.find("#baseContextsToSynchronizeHolder").hide();
            }

            validatorsManager.validateAllFields(this.$el);
        },
        toggleSSLPort: function toggleSSLPort(event) {
            if ($(event.target).is(":checked")) {
                this.$el.find("#port").val("636").trigger("change");
                this.$el.find("#toggleCert").show();
            } else {
                this.$el.find("#port").val("389").trigger("change");
                this.$el.find("#toggleCert").hide();
            }

            validatorsManager.validateAllFields($(event.target).parents(".group-field-block"));
        },

        toggleCert: function toggleCert(event) {
            var _this = this;

            if (event) {
                event.preventDefault();
            }

            //change dialog
            BootstrapDialogUtils.createModal({
                title: "SSL Certificate",
                message: this.$el.find("#certContainer").clone().attr("id", "certificateContainerClone"),
                onshown: function onshown(dialogRef) {
                    dialogRef.$modalDialog.find("#certificateContainerClone").show();
                },
                buttons: ["cancel", {
                    label: $.t('common.form.save'),
                    id: "sslSaveButton",
                    cssClass: "btn-primary",
                    action: function action(dialogRef) {
                        var saveBtn = dialogRef.$modalFooter.find("#sslSaveButton"),
                            certField;

                        if (!saveBtn.prop("disabled")) {
                            certField = _this.$el.find("#certContainer").find('.certificate');

                            certField.text($('#certificateContainerClone').find('textarea').val());
                            certField.val(certField.text()); // seems to be necessary for IE

                            validatorsManager.validateAllFields(_this.$el);
                        }

                        dialogRef.close();
                    }
                }]
            }).open();
        },
        /**
         *
         * For special fields failover, accountObject, groupObject, baseContext and baseContextToSync and credentials special logic is needed to save correctly.
         *
         * failover, accountObject, groupObject, baseContext and baseContextToSync are arrays and require special checking to save correctly
         *
         * credentials is a crypto object that should only be saved if the length of the field is changed
         *
         */
        connectorSaved: function connectorSaved(patch, connectorConfig, connector) {
            var baseContexts = $("#baseContextsArray")[0].selectize.getValue(),
                baseContextToSync = this.$el.find("#syncBaseContext").is(":checked") ? $("#baseContextsArray")[0].selectize.getValue() : $("#baseContextsToSyncArray")[0].selectize.getValue(),
                failover = $("#failoverArray")[0].selectize.getValue(),
                accountObject = $("#accountObjectClassesArray")[0].selectize.getValue(),
                groupObject = $("#groupObjectClassesArray")[0].selectize.getValue(),
                objectClasses = $("#objectClassesToSynchronizeArray")[0].selectize.getValue(),
                credentials = $("#credentials").val(),
                oldBaseContexts = connectorConfig.configurationProperties.baseContexts || [],
                oldBaseContextsToSync = connectorConfig.configurationProperties.baseContextsToSynchronize || [],
                oldFailover = connectorConfig.configurationProperties.failover || [],
                oldAccountObject = connectorConfig.configurationProperties.accountObjectClasses || [],
                oldGroupObject = connectorConfig.configurationProperties.groupObjectClasses || [],
                oldObjectClasses = connectorConfig.configurationProperties.objectClassesToSynchronize || [],
                credsArePlaceholder = credentials.match(/&\s*{(.*?)}|"\$purpose"/gm);

            if (this.$el.find("#ssl").is(":checked") && this.$el.find("#certContainer").find('.certificate').val().length === 0 && connector.data.publicKey.length > 0) {
                connector.data.publicKey = "";
            } else if (this.$el.find("#ssl").is(":checked") && connector.data.publicKey !== this.$el.find("#certContainer").find('.certificate').val()) {
                connector.data.publicKey = this.$el.find("#certContainer").find('.certificate').val();
            }

            if (baseContexts !== oldBaseContexts.join(baseContextsSelectizeArrayDelimeter)) {
                patch.push({
                    "field": "/configurationProperties/baseContexts/",
                    "operation": "replace",
                    "value": $("#baseContextsArray")[0].selectize.getValue().length > 0 ? $("#baseContextsArray")[0].selectize.getValue().split(baseContextsSelectizeArrayDelimeter) : []
                });
            }

            if (failover !== oldFailover.join(',')) {
                patch.push({
                    "field": "/configurationProperties/failover/",
                    "operation": "replace",
                    "value": $("#failoverArray")[0].selectize.getValue().length > 0 ? $("#failoverArray")[0].selectize.getValue().split(',') : []
                });
            }

            if (accountObject !== oldAccountObject.join(',')) {
                patch.push({
                    "field": "/configurationProperties/accountObjectClasses/",
                    "operation": "replace",
                    "value": $("#accountObjectClassesArray")[0].selectize.getValue().length > 0 ? $("#accountObjectClassesArray")[0].selectize.getValue().split(',') : []
                });
            }

            if (groupObject !== oldGroupObject.join(',')) {
                patch.push({
                    "field": "/configurationProperties/groupObjectClasses/",
                    "operation": "replace",
                    "value": $("#groupObjectClassesArray")[0].selectize.getValue().length > 0 ? $("#groupObjectClassesArray")[0].selectize.getValue().split(',') : []
                });
            }

            if (baseContextToSync !== oldBaseContextsToSync.join(baseContextsSelectizeArrayDelimeter)) {
                patch.push({
                    "field": "/configurationProperties/baseContextsToSynchronize/",
                    "operation": "replace",
                    "value": baseContextToSync.length > 0 ? baseContextToSync.split(baseContextsSelectizeArrayDelimeter) : []
                });
            }

            if (objectClasses !== oldObjectClasses.join(',')) {
                patch.push({
                    "field": "/configurationProperties/objectClassesToSynchronize/",
                    "operation": "replace",
                    "value": $("#objectClassesToSynchronizeArray")[0].selectize.getValue().length > 0 ? $("#objectClassesToSynchronizeArray")[0].selectize.getValue().split(',') : []
                });
            }

            if (credentials.length > 0 && !credsArePlaceholder) {
                patch.push({
                    "field": "/configurationProperties/credentials/",
                    "operation": "replace",
                    "value": credentials
                });
            }

            return patch;
        },

        addConnectorSave: function addConnectorSave(connectorData) {
            var baseContextToSync = this.$el.find("#syncBaseContext").is(":checked") ? $("#baseContextsArray")[0].selectize.getValue() : $("#baseContextsToSyncArray")[0].selectize.getValue();

            connectorData.baseContexts = $("#baseContextsArray")[0].selectize.getValue().length > 0 ? $("#baseContextsArray")[0].selectize.getValue().split(baseContextsSelectizeArrayDelimeter) : [];
            connectorData.failover = $("#failoverArray")[0].selectize.getValue().length > 0 ? $("#failoverArray")[0].selectize.getValue().split(',') : [];
            connectorData.accountObjectClasses = $("#accountObjectClassesArray")[0].selectize.getValue().length > 0 ? $("#accountObjectClassesArray")[0].selectize.getValue().split(',') : [];
            connectorData.groupObjectClasses = $("#groupObjectClassesArray")[0].selectize.getValue().length > 0 ? $("#groupObjectClassesArray")[0].selectize.getValue().split(',') : [];
            connectorData.baseContextsToSynchronize = baseContextToSync.length > 0 ? baseContextToSync.split(baseContextsSelectizeArrayDelimeter) : [];
            connectorData.objectClassesToSynchronize = $("#objectClassesToSynchronizeArray")[0].selectize.getValue().length > 0 ? $("#objectClassesToSynchronizeArray")[0].selectize.getValue().split(',') : [];
            connectorData.credentials = $("#credentials").val();

            return connectorData;
        },


        connectorCreate: function connectorCreate(details) {
            if (this.$el.find("#syncBaseContext").is(":checked")) {
                details.configurationProperties.baseContextsToSynchronize = details.configurationProperties.baseContexts;
            }

            return details;
        }
    });

    return new LDAPTypeView();
});
