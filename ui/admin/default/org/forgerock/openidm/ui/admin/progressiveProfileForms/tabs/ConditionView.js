"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * Copyright 2017-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "handlebars", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/util/AdminUtils", "org/forgerock/openidm/ui/common/util/Constants", "org/forgerock/openidm/ui/admin/util/InlineScriptEditor", "org/forgerock/openidm/ui/common/resource/util/ResourceQueryFilterEditor"], function ($, _, Handlebars, AdminAbstractView, AdminUtils, Constants, InlineScriptEditor, ResourceQueryFilterEditor) {
    var ConditionView = AdminAbstractView.extend({
        template: "templates/admin/progressiveProfileForms/tabs/ConditionViewTemplate.html",
        partials: ["partials/progressiveProfileForms/_loginCount.html", "partials/progressiveProfileForms/_timeSince.html", "partials/progressiveProfileForms/_profileCompleteness.html", "partials/progressiveProfileForms/_propertyValue.html", "partials/resource/_attributeSelectizeTemplate.html"],
        events: {
            "click .btn-toggle": "sectionControl",
            "click .btn-editor": "changeEditorType",
            "click .btn-level": "changeLevel",
            "change :input": "inputHandler",
            "keyup input": "keyupHandler"
        },
        defaultTypeData: {
            "loginCount": { interval: "at", amount: 1 },
            "timeSince": { property: "/_meta/createDate", years: 0, months: 0, weeks: 0, days: 0, hours: 0, minutes: 0 },
            "profileCompleteness": { percentLessThan: 0 },
            "propertyValue": { operation: "pr" },
            "scripted": { type: "scripted", script: { type: "text/javascript", source: "", globals: {} } },
            "queryFilter": { type: "queryFilter", filter: "" }
        },
        loginIntervals: ["at", "every"],
        operations: ["pr", "!pr", "eq"],
        timeSinceOrder: {
            years: 0,
            months: 1,
            weeks: 2,
            days: 3,
            hours: 4,
            minutes: 5
        },

        updateModel: function updateModel(condition) {
            this.model = _.set(this.model, "condition", condition);
        },

        render: function render(args, callback) {
            var _this = this;

            var element = args.element,
                makeChanges = args.makeChanges,
                identityServiceUrl = args.identityServiceUrl,
                saveForm = args.saveForm,
                condition = args.condition;

            _.merge(this, { element: element, saveForm: saveForm, makeChanges: makeChanges });

            this.model = _.merge({}, { condition: condition, identityServiceUrl: identityServiceUrl, saveForm: saveForm });

            this.data.condition = _.cloneDeep(condition);

            this.data.types = _.keys(this.defaultTypeData).reduce(function (acc, type) {
                return _this.isBasic(type) ? acc.concat({ value: type, text: $.t("templates.progressiveProfile." + type) }) : acc;
            }, []);

            this.parentRender(function () {
                var type = condition.type,
                    conditionLevel = _this.isBasic(type) ? "basic" : "advanced";

                _this.setActiveClass("data-condition-level", conditionLevel);

                if (conditionLevel === "advanced") {
                    _this.setActiveClass("data-advanced-editor", _this.editorNameHelper(condition.type));
                }

                _this.$el.find("#typeSelect").selectize();
                _this.renderTypeFormFields(condition);

                if (callback) {
                    callback();
                }
            });
        },

        /*
         * Render form specific to condition types
         * @param {Object} condition
         * @param {Boolean} [fireChangesPending=true] -- Flag for calling `makeChanges` after script editor renders
         * @return undefined
         */
        renderTypeFormFields: function renderTypeFormFields(condition, fireChangesPending) {
            var _this2 = this;

            var typeName = condition.type,
                partial = this.isBasic(typeName) ? "progressiveProfileForms/_" + typeName : "",
                render = function render(data, condition) {
                _this2.$el.find("#typeFormFields").html(Handlebars.compile("{{> " + partial + "}}")(_.merge({}, data, { condition: condition })));
            };

            fireChangesPending = fireChangesPending === false ? false : true;

            switch (condition.type) {
                case "loginCount":
                    this.data.intervals = this.loginIntervals.map(function (interval) {
                        return { value: interval, text: $.t("templates.progressiveProfile." + interval) };
                    });

                    render(this.data, condition);
                    this.$el.find("#loginCountIntervalSelect").selectize();
                    break;
                case "timeSince":
                    if (this.model.condition.type === "timeSince") {
                        var validTimeSinceProperties = ["type"].concat(_.keys(this.defaultTypeData.timeSince));
                        // merge with default data to add any missing intervals to ensure the time intervals display correctly
                        condition = _.merge(this.defaultTypeData.timeSince, this.model.condition);
                        // pick only the properties that should be on the object
                        condition = _.pick(condition, validTimeSinceProperties);

                        this.data.timeIntervals = _.toPairs(condition).reduce(function (acc, pair) {
                            var _pair = _slicedToArray(pair, 2),
                                interval = _pair[0],
                                value = _pair[1];

                            acc[_this2.timeSinceOrder[interval]] = {
                                interval: interval,
                                intervalName: $.t("templates.progressiveProfile." + interval),
                                value: value
                            };

                            return acc;
                        }, []);
                    } else {
                        this.data.timeIntervals = _.toPairs(this.defaultTypeData.timeSince).reduce(function (acc, pair) {
                            var _pair2 = _slicedToArray(pair, 2),
                                interval = _pair2[0],
                                value = _pair2[1];

                            return acc.concat(interval !== "property" ? { interval: interval, intervalName: $.t("templates.progressiveProfile." + interval), value: value } : []);
                        }, []);
                    }

                    render(this.data, condition);
                    break;
                case "propertyValue":
                    this.data.operations = this.operations.map(function (op) {
                        return { value: op, text: $.t("templates.progressiveProfile." + op) };
                    });

                    condition.operation = condition.operation ? condition.operation : "pr";

                    this.loadAvailableProperties().then(function (availableProps) {
                        var initialValue = void 0,
                            attributeSelectize = void 0;

                        if (_.isUndefined(condition.attribute)) {
                            condition.attribute = _.first(availableProps).value;
                        }

                        initialValue = condition.attribute;

                        render(_this2.data, condition);

                        _this2.toggleEqValueField();

                        attributeSelectize = _this2.$el.find("#attributeSelect").selectize({
                            options: availableProps,
                            valueField: "value",
                            labelField: "text",
                            create: false,
                            render: {
                                option: function option(item) {
                                    var text = item.text,
                                        value = item.value.slice(1),
                                        html = Handlebars.compile("{{> resource/_attributeSelectizeTemplate}}")({ text: text, value: value });

                                    return html;
                                }
                            }
                        });

                        attributeSelectize[0].selectize.setValue(initialValue, true);

                        _this2.$el.find("#operationSelect").selectize();
                    });
                    break;
                case "queryFilter":
                    this.resetEditor("queryFilterEditor");
                    this.setActiveClass("data-advanced-editor", "queryFilter");
                    this.renderQueryFilterEditor(condition);

                    if (_.isEmpty(condition.queryFilter)) {
                        condition = _.cloneDeep(this.model.condition);
                    }

                    this.data.condition = _.cloneDeep(condition);
                    break;
                case "scripted":
                    this.renderScriptEditor(condition.script, fireChangesPending);
                    break;
                default:
                    render(this.data, condition);
                    break;
            }

            this.data.condition = condition;
        },

        renderQueryFilterEditor: function renderQueryFilterEditor(condition) {
            var _this3 = this;

            if (_.isUndefined(this.queryFilterEditor)) {
                this.queryFilterEditor = new ResourceQueryFilterEditor();
            }

            this.queryFilterEditor.render({
                element: "#queryFilterContainer",
                data: this.queryFilterEditor.createDataObject(),
                resource: "managed/user",
                queryFilter: _.clone(condition.filter),
                onChange: function onChange() {
                    var filter = _this3.queryFilterEditor.getFilterString();

                    _this3.data.condition = _.merge({}, { type: "queryFilter", filter: filter });

                    if (!_.isEmpty(_this3.data.condition.filter)) {
                        _this3.makeChanges();
                    }
                },
                loadSourceProps: function loadSourceProps() {
                    return AdminUtils.findPropertiesList(_this3.model.identityServiceUrl.split("/")).then(function (props) {
                        var sortedPropsCollection = _.sortBy(_.toPairs(props), function (pair) {
                            return _.last(pair).title;
                        }).map(function (pair) {
                            return _.merge(_.last(pair), { propName: _.first(pair), title: _.last(pair).title || _.startCase(_.firstProp) });
                        });

                        return _.map(sortedPropsCollection, "propName");
                    });
                }
            });
        },

        renderScriptEditor: function renderScriptEditor(condition, fireChangesPending) {
            this.resetEditor("scriptEditor");
            this.setActiveClass("data-advanced-editor", "scripted");
            this.generateScriptEditor(condition);

            if (fireChangesPending) {
                this.makeChanges();
            }
        },

        generateScriptEditor: function generateScriptEditor(condition) {
            var _this4 = this;

            var setCondition = function setCondition() {
                var generatedScript = _this4.scriptEditor.generateScript(),
                    defaultScript = _this4.defaultTypeData.scripted.script;

                _this4.data.condition = {
                    type: "scripted",
                    script: generatedScript ? generatedScript : defaultScript
                };
                _this4.makeChanges();
            },
                options = {
                element: "#scriptEditorContainer",
                noValidation: true,
                onChange: setCondition,
                onAddPassedVariable: setCondition,
                scriptData: condition
            };

            this.scriptEditor = InlineScriptEditor.generateScriptEditor(options);
        },

        resetEditor: function resetEditor(editor) {
            if (!_.isUndefined(this[editor])) {
                this.$el.find("#" + editor + "Container").empty();
                delete this[editor];
            }
        },

        loadAvailableProperties: function loadAvailableProperties() {
            var _this5 = this;

            return AdminUtils.findPropertiesList(this.model.identityServiceUrl.split("/")).then(function (availableProps) {
                _this5.data.availableProps = [];

                availableProps = _.toPairs(availableProps).reduce(function (acc, pair) {
                    var _pair3 = _slicedToArray(pair, 2),
                        key = _pair3[0],
                        attribute = _pair3[1];

                    if (key === "preferences") {
                        return acc.concat(_.keys(attribute.properties).map(function (pref) {
                            return {
                                value: "/preferences/" + pref,
                                text: $.t("templates.progressiveProfile.preferences") + ": " + pref
                            };
                        }));
                    } else if (key === "kbaInfo" || key === "_id") {
                        return acc.concat([]);
                    }

                    return acc.concat({
                        value: "/" + key,
                        text: attribute.title || key
                    });
                }, _this5.data.availableProps);

                return _.sortBy(availableProps, "text");
            });
        },

        update: function update(name, value) {
            var condition;

            if (name === "type") {
                var conditionType = value;

                if (conditionType === this.model.condition.type) {
                    this.renderTypeFormFields(_.cloneDeep(this.model.condition));
                } else {
                    condition = _.merge(_defineProperty({}, name, value), this.defaultTypeData[conditionType]);
                    this.renderTypeFormFields(condition);
                }
            } else if (name === "operation") {
                this.data.condition = _.set(_.cloneDeep(this.data.condition), name, value);
                this.toggleEqValueField();
            } else if (name) {
                this.data.condition[name] = value;
            }
        },

        isBasic: function isBasic(type) {
            return !type.match(/script|queryFilter|javascript|groovy|advanced|scripted/);
        },

        getValue: function getValue() {
            return this.data.condition;
        },

        toggleEqValueField: function toggleEqValueField() {
            var isHidden = this.data.condition.operation !== "eq";

            this.$el.find("#eqValueField").toggleClass("hidden", isHidden);
            if (!isHidden) {
                this.data.condition.value = "";
                this.$el.find("#eqValueField").focus();
            } else {
                delete this.data.condition.value;
            }
        },

        editorNameHelper: function editorNameHelper(str) {
            if (str.match(/text/) || str === "scripted") {
                return "scripted";
            } else if (str === "queryFilter") {
                return "queryFilter";
            } else {
                return "";
            }
        },

        setActiveClass: function setActiveClass(dataAttribute, value) {
            this.$el.find(dataAttribute).removeClass("active");
            this.$el.find("[" + dataAttribute + "=\"" + value + "\"]").addClass("active");
        },

        inputHandler: function inputHandler(event) {
            var _eventToInputData = this.eventToInputData(event),
                name = _eventToInputData.name,
                value = _eventToInputData.value;

            event.preventDefault();

            if (!_.includes(["scriptType", "fileType"], name)) {
                this.update(name, value);
            }
        },

        eventToInputData: function eventToInputData(event) {
            var name = event.target.name,
                inputType = event.target.type,
                value = event.target.value;

            //number types come in as strings so we must convert them to numbers
            if (inputType === "number") {
                value = Number(value);

                //do not allow negative numbers
                //if the number is negative set the input to 0
                if (value < 0) {
                    value = 0;
                    $(event.target).val(0);

                    // do not allow percentLessThan go above 100
                    // if the number is about 100 set the input to 100
                } else if (name === "percentLessThan" && value > 100) {
                    value = 100;
                    $(event.target).val(100);

                    // do not allow loginCount to go below 1
                    // if the number is below 1 set the input to be 1
                } else if (name === "amount" && this.data.condition.type === "loginCount" && value <= 0) {
                    value = 1;
                    $(event.target).val(1);
                }
            }
            return { name: name, inputType: inputType, value: value };
        },

        keyupHandler: function keyupHandler(event) {
            var _eventToInputData2 = this.eventToInputData(event),
                name = _eventToInputData2.name,
                value = _eventToInputData2.value;

            if (event.keyCode === Constants.ENTER_KEY) {
                event.preventDefault();
                this.saveForm();
            } else if (name) {
                this.data.condition[name] = value;
                this.makeChanges();
            }
        },

        sectionControl: function sectionControl(event) {
            var selected = $(event.target),
                changesPending = $(".changes-pending-container");

            selected.parent().find('.active').removeClass('active');
            selected.toggleClass('active', true);

            //look for changes pending and removeClass
            if (changesPending.is(":visible")) {
                changesPending.hide();
            }
        },

        changeLevel: function changeLevel(event) {
            var level = $(event.target).data("condition-level"),
                origCondition = this.model.condition,
                matchesOrigLevel = this.isBasic(level) === this.isBasic(origCondition.type),
                condition;

            if (matchesOrigLevel) {
                condition = origCondition;
            } else if (this.isBasic(level)) {
                var type = _.first(_.keys(this.defaultTypeData));

                condition = _.merge({ type: type }, this.defaultTypeData[type]);
            } else {
                condition = _.cloneDeep(this.defaultTypeData.queryFilter);
            }

            this.$el.find("[data-advanced-editor]").removeClass("active");
            this.renderTypeFormFields(condition, false);
        },

        changeEditorType: function changeEditorType(event) {
            var editorType = $(event.target).data("advanced-editor"),
                origCondition = this.model.condition,
                matchesOrigType = editorType === this.editorNameHelper(origCondition.type),
                condition;

            if (matchesOrigType) {
                condition = _.cloneDeep(this.model.condition);
            } else {
                condition = _.cloneDeep(this.defaultTypeData[editorType]);
            }

            this.renderTypeFormFields(condition, false);
        },

        ensureSupportedCondition: function ensureSupportedCondition(condition) {
            var supportedTypes = _.keys(this.defaultTypeData).filter(function (key) {
                return key !== "script";
            }).concat(["text/javascript", "text/groovy"]),
                updatedCondition = _.includes(supportedTypes, condition.type) ? condition : this.defaultTypeData.scripted;

            return updatedCondition;
        }
    });

    return new ConditionView();
});
