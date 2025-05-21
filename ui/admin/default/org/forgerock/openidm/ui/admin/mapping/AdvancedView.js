"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/*
 * Copyright 2015-2024 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "form2js", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/components/ChangesPending"], function ($, _, form2js, MappingAdminAbstractView, constants, eventManager, ChangesPending) {
    var AdvancedView = MappingAdminAbstractView.extend({
        events: {
            "click .save-mapping": "saveMapping",
            "click .cancel-mapping-changes": "render",
            "change .advanced-mapping-panel": "checkChanges"
        },
        partials: ["partials/mapping/advanced/_booleanPartial.html", "partials/mapping/advanced/_textPartial.html"],
        template: "templates/admin/mapping/AdvancedTemplate.html",
        element: "#mappingContent",
        noBaseTemplate: true,
        model: {
            DOC_URL: constants.DOC_URL + "synchronization-guide/",
            TRANS_BASE: "templates.mapping.advanced."
        },

        render: function render(args, callback) {
            var _this = this;

            var mapping = this.getCurrentMapping(),
                panelParams = [this.createUiObj("param", { name: "correlateEmptyTargetSet", fieldType: "boolean" }), this.createUiObj("param", { name: "prefetchLinks", fieldType: "boolean" }), this.createUiObj("param", { name: "runTargetPhase", fieldType: "boolean", defaultValue: true }), this.createUiObj("param", { name: "allowEmptySourceSet", fieldType: "boolean", helpLink: "prevent-accidental-deletion.html" }), this.createUiObj("param", { name: "taskThreads", fieldType: "text", defaultValue: "10" }), this.createUiObj("param", { name: "enableSync", fieldType: "boolean", defaultValue: true })];

            panelParams.push(this.createUiObj("param", { name: "clusteredSourceReconEnabled", fieldType: "boolean" }), this.createUiObj("param", { name: "reconSourceQueryPageSize", fieldType: "text", defaultValue: "1000", activatedBy: "clusteredSourceReconEnabled" }));

            panelParams.push(this.createUiObj("param", { name: "consentRequired", fieldType: "boolean" }), this.createUiObj("param", { name: "icon", fieldType: "text" }), this.createUiObj("param", { name: "displayName", fieldType: "text" }));

            this.data.panels = [this.createUiObj("panel", { name: "additionalOptions", mapping: mapping, helpLink: "chap-performance.html", description: true, params: panelParams })];

            this.parentRender(function () {
                _this.data.panels.map(function (panel) {
                    // if enabledSync is a string we know it's an esv
                    if (_.find(panel.params, { name: "enableSync" }) && typeof _.find(panel.params, { name: "enableSync" }).configuredValue === "string") {
                        _.delay(function () {
                            $(".changes-pending-container").hide();
                        }, 500);
                    }

                    panel.changeWatcher = ChangesPending.watchChanges({
                        element: _this.$el.find(panel.domId + " .changes-pending-container"),
                        undo: true,
                        watchedObj: _.clone(mapping),
                        watchedProperties: panel.params.map(function (param) {
                            return param.name;
                        }),
                        undoCallback: function undoCallback() {
                            _this.render();
                        }
                    });
                });

                _this.initDependentFields();

                if (callback) {
                    callback();
                }
            });
        },

        checkChanges: function checkChanges(event) {
            var panelId = "#" + $(event.currentTarget)[0].id,
                buttons = this.$el.find(panelId + " .advanced-mapping-button"),
                formData = this.getFormData(),
                mapping = this.getCurrentMapping(),
                panel = _.find(this.data.panels, { domId: panelId }),
                mutatedMapping = this.mutateMapping(mapping, formData);

            panel.changeWatcher.makeChanges(mutatedMapping);

            if (panel.changeWatcher.isChanged()) {
                buttons.prop('disabled', false);
            } else {
                buttons.prop('disabled', true);
            }
        },

        getFormData: function getFormData() {
            return form2js("advancedMappingConfigForm", ".", true);
        },

        saveMapping: function saveMapping(event) {
            var _this2 = this;

            event.preventDefault();
            var mapping = this.getCurrentMapping(),
                formData = this.getFormData(),
                mutatedMapping = this.mutateMapping(mapping, formData);

            if (!_.isEqual(mutatedMapping, mapping)) {
                this.AbstractMappingSave(mutatedMapping, function () {
                    eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, "mappingSaveSuccess");
                    _this2.render();
                });
            } else {
                this.render();
            }
        },

        mutateMapping: function mutateMapping(mapping, formData) {
            var mutatedMapping = {};

            if (formData.taskThreads) {
                formData.taskThreads = Number(formData.taskThreads);
            }

            if (formData.reconSourceQueryPageSize) {
                formData.reconSourceQueryPageSize = Number(formData.reconSourceQueryPageSize);
            }

            _.assign(mutatedMapping, mapping, formData);

            // Loop over mutatedMapping and handle cases
            _.forIn(mutatedMapping, function (value, key) {

                if (key === "taskThreads") {
                    // Task threads need to handle a zero case
                    if (value === 0) {
                        mutatedMapping[key] = 0;

                        // default is 10 threads so if this is selected remove from the mapping
                    } else if (value === 10) {
                        delete mutatedMapping[key];

                        // handle other falsy values
                    } else if (!value) {
                        if (mapping.taskThreads) {
                            mutatedMapping.taskThreads = mapping.taskThreads;
                        } else {
                            delete mutatedMapping.taskThreads;
                        }
                    }
                } else if (key === "prefetchLinks") {
                    // have to reverse the expression of this because it is implicitly enabled
                    // if undefined on or false on mapping delete true and send false
                    if (_.isUndefined(mapping.prefetchLinks) || mapping.prefetchLinks === false) {
                        if (mutatedMapping.prefetchLinks === true) {
                            delete mutatedMapping.prefetchLinks;
                        } else {
                            mutatedMapping.prefetchLinks = false;
                        }
                    }
                } else if (key === "runTargetPhase") {
                    // have to reverse the expression of this because it is implicitly enabled
                    // if undefined on or false on mapping delete true and send false
                    if (_.isUndefined(mapping.runTargetPhase) || mapping.runTargetPhase === false) {
                        if (mutatedMapping.runTargetPhase === true) {
                            delete mutatedMapping.runTargetPhase;
                        } else {
                            mutatedMapping.runTargetPhase = false;
                        }
                    }
                } else if (key === "enableSync") {
                    // have to reverse the expression of this because it is implicitly enabled
                    // if undefined on or false on mapping delete true and send false
                    if (_.isUndefined(mapping.enableSync) || mapping.enableSync === false) {
                        if (mutatedMapping.enableSync === true) {
                            delete mutatedMapping.enableSync;
                        } else {
                            mutatedMapping.enableSync = false;
                        }
                    }
                } else if (!value) {
                    // If value falsy for anything else,
                    // remove it from the mapping to restore default behavior
                    delete mutatedMapping[key];
                }
            });

            return mutatedMapping;
        },

        createUiObj: function createUiObj(type, options) {
            if (!options.name) {
                throw new Error("name not specified");
            }

            var obj = {
                name: options.name,
                title: $.t(this.model.TRANS_BASE + options.name),
                helpText: $.t(this.model.TRANS_BASE + options.name + "Help"),
                getClean: function getClean(ownProp) {
                    return this[ownProp].split('#')[1];
                }
            };

            if (options.helpLink) {
                obj.helpLink = this.model.DOC_URL + options.helpLink;
            }

            // options for panel type object
            if (type === "panel") {
                obj.domId = "#" + obj.name + "Panel";
                if (options.description) {
                    obj.description = this.helpText;
                }

                obj.params = options.params.map(function (param) {

                    // Set initial values

                    // Special case for prefetchLinks
                    // prefetchLinks is implicitly enabled by default
                    if (param.name === "prefetchLinks") {
                        param.configuredValue = !options.mapping.prefetchLinks;
                    }

                    // Special case for runTargetPhase
                    // runTargetPhase is implicitly enabled by default
                    if (param.name === "runTargetPhase") {
                        param.configuredValue = !options.mapping.runTargetPhase;
                    }

                    // Special case for enableSync
                    // enableSync is implicitly enabled by default
                    if (param.name === "enableSync") {
                        if (_typeof(options.mapping.enableSync) === "object") {
                            param.configuredValue = JSON.stringify(options.mapping.enableSync);
                        } else if (_.isUndefined(options.mapping.enableSync)) {
                            param.configuredValue = true;
                        } else {
                            param.configuredValue = options.mapping.enableSync;
                        }
                    }

                    // All others should be whatever the mapping is
                    if (!_.isUndefined(options.mapping[param.name]) && param.name !== "enableSync") {
                        param.configuredValue = options.mapping[param.name];
                    }

                    // Add panel ids to configParameters
                    param.panelId = obj.domId;

                    return param;
                });
                obj.collapsed = options.collapsed;

                // options for param type object
            } else if (type === "param") {
                switch (options.fieldType) {
                    case "boolean":
                        obj.partial = function () {
                            return "mapping/advanced/_booleanPartial";
                        };
                        break;
                    case "text":
                        obj.partial = function () {
                            return "mapping/advanced/_textPartial";
                        };
                        break;
                    default:
                        throw new Error("Unknown fieldType");
                }

                if (options.defaultValue) {
                    obj.defaultValue = options.defaultValue;
                }

                if (options.activatedBy) {
                    obj.activatedBy = "#" + options.activatedBy;
                }
            }

            return obj;
        },

        initDependentFields: function initDependentFields() {
            var toggleField = function toggleField(hide, field) {
                if (hide) {
                    $(field).closest(".form-group").hide();
                } else {
                    $(field).closest(".form-group").show();
                }
            };

            _.map(this.$el.find(".dependent"), function (dep) {
                var activatedBy = $($(dep).data("activatedBy"));
                toggleField(!activatedBy.is(":checked"), dep);

                $($(dep).data("activatedBy")).on("change", function () {
                    var disabled = $(this).is(":checked");
                    $(dep).prop("disabled", !disabled);
                    toggleField(!disabled, dep);
                });
            });
        }
    });

    return new AdvancedView();
});
