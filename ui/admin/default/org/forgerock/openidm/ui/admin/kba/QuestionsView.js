"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "bootstrap", "form2js", "handlebars", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/commons/ui/common/components/ChangesPending", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/UIUtils", "org/forgerock/commons/ui/common/main/ValidatorsManager"], function ($, _, boostrap, form2js, Handlebars, AbstractView, AdminUtils, ChangesPending, ConfigDelegate, Constants, EventManager, UiUtils, ValidatorsManager) {
    var QuestionsView = AbstractView.extend({
        element: "#questionsTab",
        template: "templates/admin/kba/QuestionsTemplate.html",
        noBaseTemplate: true,
        events: {
            "click .fa-pencil": "showEditPanel",
            "click .cancel-add-edit": "cancelAdd",
            "click .add-translation": "addTranslation",
            "click .update-add-edit": "updateQuestion",
            "click .add-edit-panel .fa-times": "deleteQuestionTranslation",
            "click .preview-row .fa-times": "deleteQuestion",
            "click .add-question": "addQuestion",
            "change .translation-locale": "checkLocale",
            "keyup [name=minimumAnswersToDefine]": "setMinimumAnswersToDefineMessage",
            "click .save-kbaQuestions-config": "confirmChangeToMinimumAnswersToDefine",
            "keyup input": "keyupHandler"
        },
        partials: ["partials/selfservice/_kbaTranslation.html", "partials/_alert.html"],
        model: {
            selectize: {},
            defaultKbaConfig: {
                "kbaPropertyName": "kbaInfo",
                "minimumAnswersToDefine": 2,
                "minimumAnswersToVerify": 1,
                "questions": {
                    "1": {
                        "en": "What's your favorite color?",
                        "en_GB": "What is your favourite colour?",
                        "fr": "Quelle est votre couleur préférée?"
                    },
                    "2": {
                        "en": "Who was your first employer?"
                    }
                }
            }
        },
        render: function render(args, refreshView) {
            var _this = this;

            //set default this.data
            this.data = {
                "locales": ["de", "en", "en_GB", "es", "fr", "it", "ja", "ko", "pt_BR", "sv", "zh_CN", "zh_TW"]
            };

            _.assignIn(this.data, args.data, true);

            this.args = _.cloneDeep(args);
            this.data.locales = _.sortBy(this.data.locales);

            ConfigDelegate.readEntityAlways("selfservice.kba").then(function (kba) {
                var continueRender = function continueRender() {
                    _this.model.kba = _.cloneDeep(kba, true);
                    _this.data.questions = _this.getFormattedQuestions(kba.questions);
                    _this.data.minimumAnswersToDefine = kba.minimumAnswersToDefine;
                    _this.data.minimumAnswersToVerify = kba.minimumAnswersToVerify;
                    _this.data.numberOfAttemptsAllowed = kba.numberOfAttemptsAllowed;
                    _this.data.kbaAttemptsPropertyName = kba.kbaAttemptsPropertyName;
                    _this.model.questions = _.cloneDeep(_this.data.questions);
                    _this.renderParent(refreshView);
                };

                if (_.isUndefined(kba)) {
                    kba = _this.model.defaultKbaConfig;
                    //if there is no selfservice.kba config object then create one using the default settings
                    ConfigDelegate.createEntity("selfservice.kba", kba).then(function () {
                        continueRender();
                    });
                } else {
                    continueRender();
                }
            });
        },

        renderParent: function renderParent(refreshView) {
            var _this2 = this;

            if (!refreshView) {
                this.data.numberOfAttemptsAllowed = this.data.numberOfAttemptsAllowed || parseInt(this.$el.find("#numberOfAttemptsAllowed").val(), 10) || null;
                this.data.kbaAttemptsPropertyName = this.data.kbaAttemptsPropertyName || _.trim(this.$el.find("#kbaAttemptsPropertyName").val()) || null;
            }
            this.model.usedQuestionKeys = _.map(this.model.questions, function (translations, key) {
                var num = parseInt(key, 10);

                if (!_.isNaN(num)) {
                    return num;
                } else {
                    return key;
                }
            });

            if (this.$el.find("#input-minimumAnswersToVerify").length && !refreshView) {
                this.data.minimumAnswersToDefine = this.$el.find("#input-minimumAnswersToDefine").val();
                this.data.minimumAnswersToVerify = this.$el.find("#input-minimumAnswersToVerify").val();
            }

            this.parentRender(function () {
                _.forEach(_this2.data.questions, function (val, key) {
                    _this2.model.selectize[key] = _this2.$el.find(".editPanel[data-question-key='" + key + "'] .translation-locale").selectize({
                        "create": true,
                        "createOnBlur": true
                    });
                });

                _this2.model.addSelectize = _this2.$el.find(".addPanel .translation-locale").selectize({
                    "create": true,
                    "createOnBlur": true
                });

                ValidatorsManager.bindValidators(_this2.$el.find("#kbaSecurityAnswerDefinitionStage"));
                ValidatorsManager.validateAllFields(_this2.$el.find("#kbaSecurityAnswerDefinitionStage"));

                if (!_.has(_this2.model.kba, "numberOfAttemptsAllowed")) {
                    //these two props need a value to compare so changes pending works
                    _this2.model.kba.numberOfAttemptsAllowed = null;
                    _this2.model.kba.kbaAttemptsPropertyName = null;
                }

                if (!_this2.model.changesModule) {
                    _this2.model.changesModule = ChangesPending.watchChanges({
                        element: _this2.$el.find(".questions-changes-pending-container"),
                        undo: true,
                        watchedObj: _.cloneDeep(_this2.model.kba),
                        undoCallback: function undoCallback() {
                            delete _this2.model.changesModule;
                            _this2.render(_this2.args, true);
                        }
                    });
                }

                if (refreshView) {
                    _this2.$el.find(":text")[0].focus();
                }
            });
        },

        checkLocale: function checkLocale(e) {
            var addTranslationContainer = $(e.currentTarget).closest(".input-row"),
                selectedLocale = e.currentTarget.value,
                questionPanel = $(e.currentTarget).closest(".add-edit-panel"),
                key = questionPanel.attr("data-question-key"),
                usedLocales = _.map(this.model.questions[key], "locale");

            if (_.indexOf(usedLocales, selectedLocale) > -1) {
                questionPanel.find(".local-alert").show();
                addTranslationContainer.find(".add-translation").toggleClass("disabled", true);
            } else {
                questionPanel.find(".local-alert").hide();
                addTranslationContainer.find(".add-translation").toggleClass("disabled", false);
            }
        },

        getFreshKey: function getFreshKey(usedKeys) {
            var max = _.max(usedKeys);

            if (max === -Infinity) {
                return 1;
            } else {
                return max + 1;
            }
        },

        addQuestion: function addQuestion(e) {
            e.preventDefault();
            this.$el.find(".addPanel").show();
            this.$el.find(".add-question").hide();

            this.$el.find(".preview-row").show();
            this.$el.find(".editPanel").hide();
            this.clearInputs();

            this.$el.find(".addPanel").attr("data-question-key", this.getFreshKey(this.model.usedQuestionKeys));
        },

        addTranslation: function addTranslation(e) {
            e.preventDefault();

            if ($(e.currentTarget).hasClass("disabled")) {
                return false;
            }

            var panel = $(e.currentTarget).closest(".add-edit-panel"),
                key = panel.attr("data-question-key"),
                locale = panel.find(".translation-locale").val(),
                translation = {
                "locale": locale,
                "translation": panel.find(".translation-value").val()
            },
                insertedIndex,
                newRow;

            if (!_.isArray(this.model.questions[key])) {
                this.model.questions[key] = [];
            }

            this.model.questions[key].push(translation);
            this.model.questions[key] = _.sortBy(this.model.questions[key], "locale");

            insertedIndex = _.findIndex(this.model.questions[key], translation);
            newRow = Handlebars.compile("{{> selfservice/_kbaTranslation}}")(translation);

            $(newRow).insertBefore(panel.find("li")[insertedIndex]);

            this.clearInputs();
        },

        clearInputs: function clearInputs() {
            this.$el.find(".translation-value").val("");

            this.model.addSelectize[0].selectize.clear();
            _.forEach(this.model.selectize, function (selectize) {
                selectize[0].selectize.clear();
            });

            this.$el.find(".add-translation").toggleClass("disabled", true);
        },

        deleteQuestion: function deleteQuestion(e) {
            e.preventDefault();

            var container = $(e.currentTarget).closest(".preview-row"),
                key = container.attr("data-question-key"),
                translationContainer = container.next();

            delete this.model.questions[key];

            delete this.data.questions[key];

            container.remove();
            translationContainer.remove();
            this.renderParent();
            this.checkChanges(true);
        },

        deleteQuestionTranslation: function deleteQuestionTranslation(e) {
            e.preventDefault();

            var questionPanel = $(e.currentTarget).closest(".add-edit-panel"),
                key = questionPanel.attr("data-question-key"),
                translationContainer = $(e.currentTarget).closest("li"),
                deleteIndex = _.findIndex(questionPanel.find(".translation"), function (el) {
                return el === translationContainer[0];
            });

            this.model.questions[key].splice(deleteIndex, 1);
            translationContainer.remove();
        },

        updateQuestion: function updateQuestion(e) {
            e.preventDefault();
            this.data.questions = _.cloneDeep(this.model.questions);
            this.renderParent();
            this.checkChanges(true);
        },

        /**
         * Takes the raw questions object from selfservice.kba.json and formats the data for handlebars rendering
         * @param unformattedQuestions {object}
         * @returns {*}
         */
        getFormattedQuestions: function getFormattedQuestions(unformattedQuestions) {
            var questions = _.cloneDeep(unformattedQuestions);

            _.forEach(unformattedQuestions, function (question, key) {
                questions[key] = [];
                _.forEach(question, function (translation, locale) {
                    questions[key].push({
                        "locale": locale,
                        "translation": translation
                    });
                });
                questions[key] = _.sortBy(questions[key], "locale");
            });

            return questions;
        },
        setKbaValue: function setKbaValue() {
            var _this3 = this;

            var addQuestionsToModel = function addQuestionsToModel() {
                _this3.model.kba.questions = {};

                _.forEach(_this3.data.questions, function (questionArray, key) {
                    _this3.model.kba.questions[key] = {};

                    _.forEach(questionArray, function (val) {
                        _this3.model.kba.questions[key][val.locale] = val.translation;
                    });
                });
            };

            this.model.kba.minimumAnswersToDefine = parseInt(this.$el.find("#input-minimumAnswersToDefine").val(), 10);
            this.model.kba.minimumAnswersToVerify = parseInt(this.$el.find("#input-minimumAnswersToVerify").val(), 10);
            this.model.kba.numberOfAttemptsAllowed = parseInt(this.$el.find("#numberOfAttemptsAllowed").val(), 10);
            this.model.kba.kbaAttemptsPropertyName = _.trim(this.$el.find("#kbaAttemptsPropertyName").val());

            if (_.isEmpty(this.model.kba.kbaAttemptsPropertyName)) {
                this.model.kba.numberOfAttemptsAllowed = null;
                this.model.kba.kbaAttemptsPropertyName = null;
            }

            addQuestionsToModel();
        },

        saveKBA: function saveKBA() {
            var _this4 = this;

            if (_.isNull(this.model.kba.kbaAttemptsPropertyName)) {
                delete this.model.kba.numberOfAttemptsAllowed;
                delete this.model.kba.kbaAttemptsPropertyName;
            }
            ConfigDelegate.updateEntity("selfservice.kba", this.model.kba).then(function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "kbaQuestionsSave");
                delete _this4.model.changesModule;
                _this4.render(_this4.args, true);
            });
        },

        getData: function getData() {
            this.saveKBA();

            return this.args;
        },

        showEditPanel: function showEditPanel(e) {
            e.preventDefault();
            var key = $(e.currentTarget).closest("li").attr("data-question-key");

            // If a panel is opened while another was being worked on the previous unsaved changes
            // need to be overwritten so the ui doesn't get in an odd state
            this.model.questions = _.cloneDeep(this.data.questions);

            this.$el.find(".preview-row").show();
            this.$el.find(".editPanel").hide();
            this.$el.find(".addPanel").hide();
            this.$el.find(".add-question").show();

            this.$el.find(".editPanel[data-question-key='" + key + "']").slideToggle(300);
            this.$el.find(".editPanel[data-question-key='" + key + "']").prev().hide();
        },

        cancelAdd: function cancelAdd(e) {
            e.preventDefault();
            this.renderParent();
        },

        validationSuccessful: function validationSuccessful(event) {
            AbstractView.prototype.validationSuccessful(event);
            this.$el.find(".save-kbaQuestions-config").toggleClass("disabled", false);
        },

        validationFailed: function validationFailed(event, details) {
            AbstractView.prototype.validationFailed(event, details);
            this.$el.find(".save-kbaQuestions-config").toggleClass("disabled", true);
        },

        setMinimumAnswersToDefineMessage: function setMinimumAnswersToDefineMessage(event) {
            var newValue;

            if (event.target.value) {
                newValue = parseInt(event.target.value, 10);
            }

            if (newValue && newValue > this.data.minimumAnswersToDefine) {
                this.$el.find(".save-kbaQuestions-config").addClass("confirmChangeToMinimumAnswersToDefine");
            } else {
                this.$el.find(".save-kbaQuestions-config").removeClass("confirmChangeToMinimumAnswersToDefine");
            }
        },

        confirmChangeToMinimumAnswersToDefine: function confirmChangeToMinimumAnswersToDefine(event) {
            var _this5 = this;

            if ($(event.target).hasClass("confirmChangeToMinimumAnswersToDefine")) {
                UiUtils.confirmDialog($.t("templates.selfservice.kbaStage.changeToMinimumAnswersToDefineMessage"), "danger", function () {
                    _this5.$el.find(".save-kbaQuestions-config").removeClass("confirmChangeToMinimumAnswersToDefine");
                    _this5.$el.find(".save-kbaQuestions-config").click();
                }, {
                    okText: $.t('common.form.save')
                });
            } else {
                this.saveKBA();
            }
        },

        checkChanges: function checkChanges(reloadChangesPending) {
            if (reloadChangesPending) {
                this.model.changesModule.reRender(this.$el.find(".questions-changes-pending-container"));
            }

            this.setKbaValue();
            this.model.changesModule.makeChanges(this.model.kba);

            if (this.model.changesModule.isChanged() && ValidatorsManager.formValidated(this.$el.find("form"))) {
                this.$el.find(".save-kbaQuestions-config").prop("disabled", false);
            } else {
                this.$el.find(".save-kbaQuestions-config").prop("disabled", true);
            }
        },

        keyupHandler: function keyupHandler(event) {
            if (this.model.changesModule) {
                this.checkChanges();
            }

            if (this.data.kbaUpdateEnabled && event.keyCode === Constants.ENTER_KEY) {
                event.preventDefault();
                this.saveKBA();
            }
        }
    });

    return new QuestionsView();
});
