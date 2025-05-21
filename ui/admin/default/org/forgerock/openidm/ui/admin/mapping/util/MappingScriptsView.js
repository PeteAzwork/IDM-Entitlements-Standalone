"use strict";

/*
 * Copyright 2015-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["underscore", "org/forgerock/openidm/ui/admin/mapping/util/MappingAdminAbstractView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/admin/util/InlineScriptEditor", "org/forgerock/openidm/ui/admin/util/ScriptList"], function (_, MappingAdminAbstractView, eventManager, constants, InlineScriptEditor, ScriptList) {

    var MappingScriptsView = MappingAdminAbstractView.extend({
        template: "templates/admin/mapping/util/MappingScriptsTemplate.html",

        init: function init(args) {
            this.model.availableScripts = _.clone(this.model.scripts);
            this.model.scriptEditors = [];
            this.model.sync = this.getSyncConfig();
            this.model.mapping = this.getCurrentMapping();
            this.model.mappingName = this.getMappingName();
            this.model.hasWorkflow = true;

            if (!_.isUndefined(args) && args.hasWorkFlow === false) {
                this.model.hasWorkflow = false;
            }

            var addedEvents = _.keys(_.pick(this.model.mapping, this.model.scripts)),
                eventName,
                defaultScript;

            if (this.model.scripts.length > 1) {

                this.model.scriptList = ScriptList.generateScriptList({
                    element: this.$el.find(".scriptContainer"),
                    label: "",
                    selectEvents: _.difference(this.model.availableScripts, addedEvents),
                    addedEvents: addedEvents,
                    currentObject: this.model.mapping,
                    hasWorkflow: this.model.hasWorkflow
                });
            } else if (this.model.scripts.length === 1) {
                eventName = this.model.scripts[0];
                defaultScript = null;

                this.model.singleScript = true;
                this.$el.find(".addScriptContainer").hide();

                if (_.has(this.model.mapping, eventName)) {
                    defaultScript = this.model.mapping[eventName];
                }

                this.model.scriptEditors[eventName] = InlineScriptEditor.generateScriptEditor({
                    "element": this.$el.find(".scriptContainer"),
                    "eventName": eventName,
                    "disableValidation": false,
                    "validationCallback": _.bind(function (valid) {
                        if (valid) {
                            this.$el.find(".saveScripts").prop("disabled", false);
                            this.$el.find(".deleteScript").prop("disabled", false);
                        } else {
                            this.$el.find(".saveScripts").prop("disabled", true);
                            this.$el.find(".deleteScript").prop("disabled", true);
                        }
                    }, this),
                    "scriptData": defaultScript,
                    "hasWorkflow": true
                });
            }
        },

        saveScripts: function saveScripts(e, deleteScript) {
            e.preventDefault();

            this.model.mapping = this.getCurrentMapping();

            var scriptHook = null,
                tmpEditor,
                eventName,
                currentScripts,
                scriptsToDelete,
                addRemoveFromMapping = _.bind(function () {
                if (!_.isNull(scriptHook)) {
                    this.model.mapping[eventName] = scriptHook;
                } else if (_.has(this.model.mapping, eventName)) {
                    delete this.model.mapping[eventName];
                }
            }, this);

            if (this.model.singleScript) {
                tmpEditor = this.model.scriptEditors.result;
                scriptHook = deleteScript ? null : tmpEditor.generateScript();
                eventName = tmpEditor.model.eventName;
                addRemoveFromMapping();
            } else {
                currentScripts = this.model.scriptList.getScripts();
                scriptsToDelete = _.difference(this.model.availableScripts, _.keys(currentScripts));

                _.assignIn(this.model.mapping, currentScripts);

                // Remove any mapping instances of scripts that are not added
                _.forEach(scriptsToDelete, _.bind(function (script) {
                    if (_.has(this.model.mapping, script)) {
                        delete this.model.mapping[script];
                    }
                }, this));
            }

            this.AbstractMappingSave(this.model.mapping, _.bind(function () {
                eventManager.sendEvent(constants.EVENT_DISPLAY_MESSAGE_REQUEST, this.model.successMessage);
            }, this));
        }
    });

    return MappingScriptsView;
});
