"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/settings/audit/AuditAdminAbstractView", "org/forgerock/openidm/ui/admin/util/InlineScriptEditor", "org/forgerock/commons/ui/common/components/ChangesPending"], function ($, _, AuditAdminAbstractView, InlineScriptEditor, ChangesPending) {

    var ExceptionFormatterView = AuditAdminAbstractView.extend({
        template: "templates/admin/settings/audit/ExceptionFormatterTemplate.html",
        element: "#ExceptionFormatterView",
        noBaseTemplate: true,
        events: {},
        model: {
            auditData: {},
            exceptionFormatterData: {}
        },
        data: {},

        render: function render(args) {
            this.parentRender(_.bind(function () {
                if (args && args.undo) {
                    this.model.auditData = args.auditData;
                } else {
                    this.model.auditData = this.getAuditData();
                }

                if (!_.has(this.model, "changesModule")) {
                    this.model.changesModule = ChangesPending.watchChanges({
                        element: this.$el.find(".exception-formatter-alert"),
                        undo: true,
                        watchedObj: _.cloneDeep(this.model.auditData),
                        watchedProperties: ["exceptionFormatter"],
                        undoCallback: _.bind(function (original) {
                            _.forEach(this.model.changesModule.data.watchedProperties, _.bind(function (prop) {
                                if (_.has(original, prop)) {
                                    this.model.auditData[prop] = original[prop];
                                } else if (_.has(this.model.auditData, prop)) {
                                    delete this.model.auditData[prop];
                                }
                            }, this));

                            this.setProperties(["exceptionFormatter"], this.model.auditData);

                            this.render({
                                "undo": true,
                                "auditData": this.model.auditData
                            });
                        }, this)
                    });
                } else {
                    this.model.changesModule.reRender(this.$el.find(".exception-formatter-alert"));
                    if (args && args.saved) {
                        this.model.changesModule.saveChanges();
                    }
                }

                if (_.has(this.model.auditData, "exceptionFormatter")) {
                    this.model.exceptionFormatterData = this.model.auditData.exceptionFormatter;
                } else {
                    this.model.exceptionFormatterData = {};
                }

                this.model.exceptionFormatterScript = InlineScriptEditor.generateScriptEditor({
                    "element": this.$el.find("#exceptionFormatterScript"),
                    "eventName": "exceptionFormatterScript",
                    "disableValidation": true,
                    "onBlurPassedVariable": _.bind(this.checkChanges, this),
                    "onDeletePassedVariable": _.bind(this.checkChanges, this),
                    "onAddPassedVariable": _.bind(this.checkChanges, this),
                    "onChange": _.bind(this.checkChanges, this),
                    "scriptData": this.model.exceptionFormatterData,
                    "autoFocus": false
                });
            }, this));
        },

        checkChanges: function checkChanges() {
            this.model.auditData.exceptionFormatter = this.model.exceptionFormatterScript.generateScript();
            this.setProperties(["exceptionFormatter"], this.model.auditData);
            this.model.changesModule.makeChanges(_.clone(this.model.auditData, true));
        }

    });

    return new ExceptionFormatterView();
});
