"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/openidm/ui/admin/settings/audit/AuditAdminAbstractView", "org/forgerock/openidm/ui/admin/delegates/AuditDelegate", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "jsonEditor", "bootstrap-tabdrop", "selectize"], function ($, _, AuditAdminAbstractView, AuditDelegate, uiUtils, conf, ValidatorsManager, BootstrapDialogUtils, JSONEditor) {

    var AuditEventHandlersDialog = AuditAdminAbstractView.extend({
        template: "templates/admin/settings/audit/AuditEventHandlersDialogTemplate.html",
        el: "#dialogs",
        events: {
            "keydown": "keydownHandler"
        },
        model: {
            originalValues: []
        },

        render: function render(args, callback) {
            var _this = this,
                title = "";

            this.data = _.clone(args);

            // We don't want JSON Editor handeling these fields, we will add them back to the config before saving.
            if (_.has(this.data.eventHandler, "config")) {
                if (_.has(this.data.eventHandler.config, "name")) {
                    this.data.name = this.data.eventHandler.config.name;
                    delete this.data.eventHandler.config.name;
                }
                if (_.has(this.data.eventHandler.config, "topics")) {
                    this.data.selectedTopics = this.data.eventHandler.config.topics;
                    delete this.data.eventHandler.config.topics;
                }

                if (_.has(this.data.eventHandler.config, "enabled")) {
                    this.data.enabled = this.data.eventHandler.config.enabled;
                    delete this.data.eventHandler.config.enabled;
                    // When the property enabled is not present but a handler is, treat it as enabled.
                } else {
                    this.data.enabled = true;
                }
            }

            if (this.data.newEventHandler) {
                title = $.t("templates.audit.eventHandlers.dialog.add") + ": " + _.last(this.data.eventHandlerType.split("."));
            } else {
                title = $.t("templates.audit.eventHandlers.dialog.edit") + ": " + this.data.name;
            }

            this.data.topics = _.union(this.data.selectedTopics, this.getTopics());

            AuditDelegate.availableHandlers().then(_.bind(function (data) {
                var _this2 = this;

                this.data.handler = _.find(data, function (handler) {
                    return handler.class === _this2.data.eventHandlerType;
                });

                this.model.currentDialog = $('<div id="AuditEventHandlersDialog"></div>');
                this.setElement(this.model.currentDialog);
                $('#dialogs').append(this.model.currentDialog);

                BootstrapDialogUtils.createModal({
                    title: title,
                    message: this.model.currentDialog,
                    onshown: function onshown() {
                        _this.renderTemplate(_this.data, function () {
                            var inputs = _this.$el.find("input");

                            if (_.isUndefined(inputs.first().attr("disabled"))) {
                                inputs.first().focus();
                            } else {
                                _this.$el.find(".selectize-input > input").focus();
                            }
                        });
                    },
                    buttons: ["cancel", {
                        label: $.t("common.form.submit"),
                        id: "submitAuditEventHandlers",
                        cssClass: "btn-primary save-button",
                        action: _.bind(function (dialogRef) {
                            var _this3 = this;

                            var data = {
                                eventHandler: {}
                            };

                            data.eventHandler.class = this.data.eventHandlerType;

                            if (!_.isEmpty(this.data.schemaEditor)) {
                                data.eventHandler.config = this.data.schemaEditor.getValue();
                            }

                            data.eventHandler.config.name = this.$el.find("#eventHandlerName").val();
                            data.eventHandler.config.topics = this.$el.find(".topics").val();
                            data.eventHandler.config.enabled = this.$el.find("#enabled").is(":checked");

                            if (_.isNull(data.eventHandler.config.topics)) {
                                data.eventHandler.config.topics = [];
                            }

                            _.forEach(this.model.paths, function (path, index) {
                                var pathParts = path.split("."),
                                    originalValue = _this3.model.originalValues[index];

                                // If the original value isn't a crypto type and the original value matches the current value
                                // Or the value is crypto and its original object value as a string matches the string returned by JSON Editor
                                // Then set the save data of this property back to its original object notation
                                if (_.first(_.keys(originalValue)) !== "$crypto" && _.get(data.eventHandler.config, path) === _.values(originalValue)[0] || JSON.stringify(originalValue) === _.get(data.eventHandler.config, _.dropRight(pathParts, 1))[_.last(pathParts)]) {

                                    _.get(data.eventHandler.config, _.dropRight(pathParts, 1))[_.last(pathParts)] = originalValue;
                                }
                            });

                            if (callback) {
                                callback(data);
                            }

                            dialogRef.close();
                        }, _this)
                    }]
                }).open();
            }, this));
        },

        /**
         * Performs a deep search of a provided object,
         * if any nested properties has the key "description" it is translated.
         * @param schema
         */
        translateDescriptions: function translateDescriptions(schema) {
            if (_.has(schema, "description")) {
                schema.description = $.t(schema.description);
            }

            _.forEach(schema, _.bind(function (subSchema) {
                if (_.isObject(subSchema)) {
                    this.translateDescriptions(subSchema);
                }
            }, this));
        },

        renderTemplate: function renderTemplate(data, cb) {
            uiUtils.renderTemplate(this.template, this.$el, _.assignIn({}, conf.globalData, data), _.bind(function () {
                var schema = {},
                    portPaths = this.getPaths(this.data.eventHandler.config, "port"),
                    passwordPaths = this.getPaths(this.data.eventHandler.config, "clientSecret").concat(this.getPaths(this.data.eventHandler.config, "password"));
                this.model.paths = portPaths.concat(passwordPaths);

                if (_.has(this.data.handler, "config")) {
                    schema = this.data.handler.config;

                    //override the endOfLineSymbols in the csv handler and set the default delimiterChar
                    if (schema.properties && schema.properties.formatting && schema.properties.formatting.properties && schema.properties.formatting.properties.endOfLineSymbols) {
                        if (_.has(schema, "properties.formatting.properties.delimiterChar") && (!_.has(this.data.eventHandler.config, "formatting.delimiterChar") || !this.data.eventHandler.config.formatting.delimiterChar)) {
                            this.data.eventHandler.config = this.data.eventHandler.config || {};
                            this.data.eventHandler.config.formatting = this.data.eventHandler.config.formatting || {};
                            this.data.eventHandler.config.formatting.delimiterChar = ",";
                        }

                        schema.properties.formatting.properties.endOfLineSymbols.enum = [String.fromCharCode(10), String.fromCharCode(13), String.fromCharCode(13) + String.fromCharCode(10)];
                        schema.properties.formatting.properties.endOfLineSymbols.options = {
                            "enum_titles": [$.t("templates.audit.eventHandlers.endOfLineSymbols.linefeed"), $.t("templates.audit.eventHandlers.endOfLineSymbols.carriageReturn"), $.t("templates.audit.eventHandlers.endOfLineSymbols.carriageReturnLinefeed")]
                        };
                    }
                }

                if (!_.isEmpty(schema)) {
                    var schemaConfig = void 0;
                    schema = this.updatePortType(schema);

                    if (_.has(schema.properties, "name")) {
                        delete schema.properties.name;
                    }
                    if (_.has(schema.properties, "topics")) {
                        delete schema.properties.topics;
                    }
                    if (_.has(schema.properties, "enabled")) {
                        delete schema.properties.enabled;
                    }

                    // default value for signatureInterval
                    if (_.has(schema, "properties.security.properties.signatureInterval") && (!_.has(this.data.eventHandler.config, "security.signatureInterval") || !this.data.eventHandler.config.security.signatureInterval)) {
                        this.data.eventHandler.config = this.data.eventHandler.config || {};
                        this.data.eventHandler.config.security = this.data.eventHandler.config.security || {};
                        this.data.eventHandler.config.security.signatureInterval = "1 hour";
                    }

                    this.translateDescriptions(schema);
                    this.data.schemaEditor = new JSONEditor(this.$el.find("#auditEventHandlerConfig")[0], {
                        "schema": schema,
                        "disable_edit_json": true,
                        "disable_array_reorder": false,
                        "disable_collapse": true,
                        "disable_properties": false,
                        "show_errors": "never",
                        "template": "handlebars",
                        "iconlib": "fontawesome4",
                        "theme": "bootstrap3",
                        "no_additional_properties": false,
                        "additionalItems": true,
                        "required_by_default": true
                    });

                    schemaConfig = this.getSchemaConfig(this.data.eventHandler.config, this.model.paths);
                    this.model.originalValues = schemaConfig.originals;
                    this.data.schemaEditor.setValue(schemaConfig.config);
                }

                this.$el.find(".topics").selectize({
                    delimiter: ',',
                    persist: false,
                    create: false,
                    items: this.data.selectedTopics
                });

                this.updateValues(this.data.eventHandler.config, passwordPaths);

                if (_.isEmpty(schema.properties)) {
                    this.$el.find(".jsonEditorContainer").hide();
                }

                ValidatorsManager.bindValidators(this.$el.find("#auditEventHandlersForm"));
                ValidatorsManager.validateAllFields(this.$el.find("#auditEventHandlersForm"));

                if (cb) {
                    cb();
                }
            }, this), "replace");
        },

        /**
         * Given a config object and an array of paths this will add a placeholder attribute to any jsonEditor formatted
         * input at that path location.
         * @param config
         * @param paths
         */
        updateValues: function updateValues(config, paths) {
            var _this4 = this;

            _.forEach(paths, function (path) {
                if (_.has(config, path) && _.isObject(_.get(config, path))) {
                    var jsonEditorClassPath = "[" + path.split(".").join("][") + "]";

                    _this4.$el.find("input[name=\"root" + jsonEditorClassPath + "\"]").val("");
                    _this4.$el.find("input[name=\"root" + jsonEditorClassPath + "\"]").attr("placeholder", "********");
                }
            });
        },

        /**
         *
         * @param obj
         * @param prop
         * @param path
         * @returns {string[]}
         */
        getPaths: function getPaths(obj, prop, path) {
            var _this5 = this;

            if (_.has(obj, prop) && path) {
                return [path + "." + prop];
            }

            return _.flatten(_.map(obj, function (val, key) {
                var newPath = path ? path + "." + key : key;

                return _.isObject(val) ? _this5.getPaths(val, prop, newPath) : [];
            }));
        },

        /**
         *  Given a config object and paths to properties of that object this will
         *  find all locations and update the schema to exclude the common config type.  If the type is cypto
         *  it will not be modified here.
         *
         *  All of the original objects are returned in an array
         *
         * @param config
         * @param paths
         * @returns {config, originals}
         */
        getSchemaConfig: function getSchemaConfig(config, paths) {
            var originals = [];

            _.forEach(paths, function (path) {
                var obj = _.get(config, _.dropRight(path.split("."), 1)),
                    prop = _.last(path.split(".")),
                    value = void 0;

                // Check for replacement format
                if (_.isString(obj[prop])) {
                    value = obj[prop];
                } else {
                    value = _.values(obj[prop])[0];
                }

                originals.push(obj[prop]);

                if (_.first(_.keys(obj[prop])) !== "$crypto") {
                    obj[prop] = value;
                }
            });
            return {
                "config": config,
                "originals": originals
            };
        },

        /**
         * Updates Audit Handler schema so that port types are rendered as Strings
         * and not Integers to support common config parameterization
         * @param schema
         * @returns {*}
         */
        updatePortType: function updatePortType(schema) {
            var findProps = function findProps(config, key, path) {
                if (_.has(config, key)) {
                    return [config];
                }

                return _.flatten(_.map(config, function (val, j) {
                    path = path ? path + "." + j : j;
                    return _.isObject(val) ? findProps(val, key, path) : [];
                }), true);
            };

            _.forEach(findProps(schema, "port", false), function (obj) {
                obj.port.type = "string";
            });

            return schema;
        },

        validationSuccessful: function validationSuccessful(event) {
            AuditAdminAbstractView.prototype.validationSuccessful(event);

            if (ValidatorsManager.formValidated(this.$el.find("#auditEventHandlersForm"))) {
                this.$el.parentsUntil(".model-content").find("#submitAuditEventHandlers").prop('disabled', false);
            }
        },

        validationFailed: function validationFailed(event, details) {
            AuditAdminAbstractView.prototype.validationFailed(event, details);

            this.$el.parentsUntil(".model-content").find("#submitAuditEventHandlers").prop('disabled', true);
        },

        isValid: function isValid() {
            return ValidatorsManager.formValidated(this.$el.find("#auditEventHandlersForm"));
        }

    });

    return new AuditEventHandlersDialog();
});
