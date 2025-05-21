"use strict";

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "form2js", "handlebars", "trumbowyg", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/common/delegates/SchemaDelegate", "org/forgerock/openidm/ui/admin/util/AdminUtils", "libs/codemirror/lib/codemirror", "libs/codemirror/mode/xml/xml", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/commons/ui/common/components/ChangesPending", "org/forgerock/openidm/ui/common/delegates/ResourceDelegate", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils"], function ($, _, form2js, Handlebars, trumbowyg, AdminAbstractView, eventManager, Constants, ConfigDelegate, SchemaDelegate, AdminUtils, codeMirror, xmlMode, UIUtils, ChangesPending, resourceDelegate, BootstrapDialogUtils) {

    var EmailTemplateConfigView = AdminAbstractView.extend({
        template: "templates/admin/email/EmailTemplateViewTemplate.html",
        events: {
            "click #submitEmailTemplateConfigForm": "save",
            "change #toggle-enabled": "toggleEnabled",
            "change input,textarea": "makeChanges",
            "keyup input": "makeChanges",
            "click .undo": "reload",
            "change #objectProperties": "openObjectPropertiesDialog",
            "click #previewMessage": "openPreviewDialog",
            "keydown": "enterHandler"
        },
        model: {
            managedSchemas: {}
        },
        partials: ["partials/email/_emailTemplateBasicForm.html", "partials/email/_objectProperties.html"],
        /**
        This view is the basic form for editing the configuration of email objects.
        Properties included in this form are => "enabled","from","subject","message".
        The basic form is extensible by adding an optional partial to partials/email/extensions
        using this naming convention for the file => partials/email/extensions/_resetPassword.html
        where "resetPassword" represents the id of the email template.
        **/
        render: function render(args, callback) {
            var _this = this;

            var configId = args[0],
                configRoute = "emailTemplate/" + configId,
                configReadPromise = ConfigDelegate.readEntity(configRoute),
                managedReadPromise = SchemaDelegate.getSchema("?_queryFilter=/resourceCollection sw \"managed\""),
                extensionPartialPromise = AdminUtils.loadExtensionPartial("email/extensions", "_" + configId),
                sampleDataPromise;

            this.configRoute = configRoute;
            this.data.configId = configId;
            managedReadPromise.then(function (response) {
                _this.data.managedSchemas = response.result;
                _this.data.managedSchemas.forEach(function (schema) {
                    var resourceCollectionArray = schema.resourceCollection.split('/');
                    schema.resourceName = resourceCollectionArray[resourceCollectionArray.length - 1];
                    if (_.endsWith(schema.resourceCollection, 'user') && !_this.data.resourceCollection) {
                        _this.data.resourceCollection = schema.resourceCollection;
                    }
                });
                _this.data.managedSchemas = [{ resourceName: '', resourceCollection: '' }].concat(_toConsumableArray(_this.data.managedSchemas));

                if (!_this.data.resourceCollection && _this.data.managedSchemas[1]) {
                    _this.data.resourceCollection = _this.data.managedSchemas[1].resourceCollection;
                }

                sampleDataPromise = resourceDelegate.serviceCall({
                    "type": "GET",
                    "serviceUrl": Constants.context + "/" + _this.data.resourceCollection,
                    "url": "?_queryFilter=true&_pageSize=1"
                });

                $.when(configReadPromise, extensionPartialPromise, sampleDataPromise).then(function (config, partial, sampleData) {
                    _this.data.config = config;
                    _this.data.extensionPartial = partial;
                    _this.propertiesList = _this.getPropertiesList(_this.data.managedSchemas.find(function (schema) {
                        return schema.resourceCollection === _this.data.resourceCollection;
                    }));

                    if (sampleData[0] && sampleData[0].result && sampleData[0].result[0]) {
                        _this.data.sampleData = sampleData[0].result[0];
                    } else {
                        _this.data.sampleData = _this.generateSampleData(_this.propertiesList);
                    }

                    _this.parentRender(function () {
                        _this.initializeTextEditor();

                        _this.model.changesModule = ChangesPending.watchChanges({
                            element: _this.$el.find(".changes-pending-container"),
                            undo: true,
                            watchedObj: _this.updateCurrentConfig(_this.data.config)
                        });

                        if (_this.$el.find(":text").length > 0) {
                            _this.$el.find(":text")[0].focus();
                        }

                        if (callback) {
                            callback();
                        }
                    });
                });
            });
        },

        initializeTextEditor: function initializeTextEditor() {
            var _this2 = this;

            this.model.editor = this.$el.find('#templateSourceCode');

            this.model.editor.trumbowyg({
                semantic: true,
                autogrow: true,
                btns: [['viewHTML'], ['formatting'], 'btnGrp-semantic', ['link'], ['insertImage'], 'btnGrp-justify', 'btnGrp-lists', ['horizontalRule'], ['removeformat']]
            });

            //set the initial value of the trumbowyg instance for message
            this.model.editor.trumbowyg('html', this.data.config.message.en);
            this.model.editor.on('tbwchange', function () {
                _this2.makeChanges();
            });
        },
        /**
        This function returns the result of form2js on the emailTemplateConfigForm
        **/
        getFormData: function getFormData() {
            return form2js("emailTemplateConfigForm", ".", false);
        },
        /**
        This function grabs the current state the form via form2js
        and updates this.data.config with it's results. There is a special
        case for the message field because it is handled with codemirror.
         @param config {object} - an object representing the current state of this.data.config
        @returns {object} - the up to date object
        **/
        updateCurrentConfig: function updateCurrentConfig(oldConfig) {
            var newConfig = _.cloneDeep(oldConfig),
                messageHtml = this.model.editor.trumbowyg("html");

            _.assignIn(newConfig, this.getFormData());

            //special case for message
            //trumbowyg strips out html and body tags
            newConfig.message.en = messageHtml.match(/^<html><body>/) ? messageHtml : "<html><body>" + messageHtml + "</body></html>";

            return newConfig;
        },

        save: function save(e) {
            var _this3 = this;

            if (e) {
                e.preventDefault();
            }

            this.data.config = this.updateCurrentConfig(this.data.config);

            ConfigDelegate.updateEntity(this.configRoute, this.data.config).then(function () {
                eventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "emailTemplateConfigSaveSuccess");
                _this3.reload();
            });
        },

        reload: function reload() {
            this.render([this.data.configId]);
        },

        toggleEnabled: function toggleEnabled() {
            this.$el.find("#emailTemplateConfigFormControls").slideToggle(!this.$el.find("#toggle-enabled").prop("checked"));
        },
        /**
        This function is called any time the form is updated. It updates the current config,
        checks with the changes pending module for any differences with the original form,
        toggles the save button on when there are changes, and off when the form is current.
        **/
        makeChanges: function makeChanges() {
            this.data.config = this.updateCurrentConfig(this.data.config);

            this.model.changesModule.makeChanges(_.clone(this.data.config));

            if (this.model.changesModule.isChanged()) {
                this.$el.find(".btn-save").prop("disabled", false);
            } else {
                this.$el.find(".btn-save").prop("disabled", true);
            }
        },
        /**
        This function takes a schema object loops over the order, makes a map of the properties
        which are of type "string", not the "_id" property and not protected (example "password").
         @param schema {object} - an object representing the schema of a resource
        @returns {array} - an array of schema property objects
        **/
        getPropertiesList: function getPropertiesList(schema) {
            return _(schema.order).map(function (propKey) {
                var prop = schema.properties[propKey];

                //filter out any properties that are not strings, not the _id property
                //and is not using encryption (in the case of password)
                if (prop.type === "string" && propKey !== "_id" && !prop.encryption) {
                    prop.propName = propKey;
                    return prop;
                }
            }).reject(function (val) {
                return val === undefined;
            }).value();
        },

        openObjectPropertiesDialog: function openObjectPropertiesDialog() {
            var _this4 = this;

            var resourceCollection = this.$el.find("#objectProperties").val();
            if (resourceCollection !== '') {
                this.data.resourceCollection = resourceCollection;
                var sampleDataPromise = resourceDelegate.serviceCall({
                    "type": "GET",
                    "serviceUrl": Constants.context + "/" + this.data.resourceCollection,
                    "url": "?_queryFilter=true&_pageSize=1"
                });

                $.when(sampleDataPromise).then(function (sampleData) {
                    var mangedSchema = _this4.data.managedSchemas.find(function (schema) {
                        return schema.resourceCollection === _this4.data.resourceCollection;
                    });
                    _this4.propertiesList = _this4.getPropertiesList(mangedSchema);

                    if (sampleData[0] && sampleData[0].result && sampleData[0].result[0]) {
                        _this4.data.sampleData = sampleData[0].result[0];
                    } else {
                        _this4.data.sampleData = _this4.generateSampleData(_this4.propertiesList);
                    }

                    var title = mangedSchema.resourceName + " " + $.t("templates.emailConfig.properties"),
                        dialogContent = Handlebars.compile("{{> email/_objectProperties}}")({ properties: _this4.propertiesList });

                    _this4.showDialog(title, dialogContent);
                });
            }
        },

        openPreviewDialog: function openPreviewDialog() {
            var title = $.t("templates.emailConfig.preview"),
                dialogContent = Handlebars.compile(this.data.config.message.en)({ object: this.data.sampleData });

            this.showDialog(title, dialogContent);
        },

        showDialog: function showDialog(title, content) {
            BootstrapDialogUtils.createModal({
                title: title,
                message: content,
                id: "frConfirmationDialog",
                buttons: [{
                    label: $.t('common.form.close'),
                    id: "frDialogBtnClose",
                    action: function action(dialog) {
                        dialog.close();
                    }
                }]
            }).open();
        },
        /**
        This function takes in an array of schema properties and
        creates an object with random string values having key's representing
        each.
         @param properties {array} - array of schema property objects
        @returns {object} - an array of sample data for use in the message preview
        **/
        generateSampleData: function generateSampleData(properties) {
            var sampleData = {},
                randomStrings = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua"],
                multiplyer = 10,
                shift = 1;

            _.forEach(properties, function (prop) {
                sampleData[prop.propName] = randomStrings[Math.floor(Math.random() * multiplyer + shift)];
            });

            return sampleData;
        },

        enterHandler: function enterHandler(event) {
            if (event.keyCode === Constants.ENTER_KEY && this.$el.find("#submitEmailTemplateConfigForm").is(":enabled")) {
                this.$el.find("#submitEmailTemplateConfigForm").trigger("click");
            }
        }
    });

    return new EmailTemplateConfigView();
});
