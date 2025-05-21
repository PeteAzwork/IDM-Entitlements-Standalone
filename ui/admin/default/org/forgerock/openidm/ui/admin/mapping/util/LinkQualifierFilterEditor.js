"use strict";

/*
 * Copyright 2015-2022 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/common/util/QueryFilterEditor", "org/forgerock/openidm/ui/common/delegates/ScriptDelegate", "org/forgerock/openidm/ui/admin/util/LinkQualifierUtils"], function ($, _, QueryFilterEditor, ScriptDelegate, LinkQualifierUtils) {

    var LinkQualifierFilterEditor = QueryFilterEditor.extend({
        events: {
            "change .expressionTree :input": "updateLinkQualifierNodeValue",
            "click .expressionTree .add-btn": "addLinkQualifierNode",
            "click .expressionTree .remove-btn": "removeLinkQualifierNode"
        },
        model: {},

        render: function render(args) {
            this.setElement(args.element);

            this.model.sourceProps = args.mapProps;
            this.model.schema = args.sourceSchema;
            this.model.linkQualifiers = LinkQualifierUtils.getLinkQualifier(args.mappingName);

            this.data = {
                config: {
                    ops: ["and", "or", "not", "expr"],
                    tags: ["pr", "equalityMatch", "approxMatch", "co", "greaterOrEqual", "gt", "lessOrEqual", "lt"]
                },
                showSubmitButton: false
            };

            this.data.filterString = args.queryFilter;

            if (this.data.filterString !== "") {
                ScriptDelegate.parseQueryFilter(this.data.filterString).then(_.bind(function (queryFilterTree) {
                    this.data.queryFilterTree = queryFilterTree;
                    this.data.filter = this.transform(this.data.queryFilterTree);
                    this.delegateEvents(this.events);
                    this.renderExpressionTree(_.bind(function () {
                        this.changeToDropdown();
                    }, this));
                }, this));
            } else {
                this.data.filter = { "op": "none", "children": [] };
                this.delegateEvents(this.events);
                this.renderExpressionTree(_.bind(function () {
                    this.changeToDropdown();
                }, this));
            }

            $(".bootstrap-dialog").removeAttr("tabindex");
        },
        removeLinkQualifierNode: function removeLinkQualifierNode(event) {
            this.removeNode(event, _.bind(function () {
                this.changeToDropdown();
            }, this));
        },
        addLinkQualifierNode: function addLinkQualifierNode(event) {
            this.addNodeAndReRender(event, _.bind(function () {
                this.changeToDropdown();
            }, this));
        },
        updateLinkQualifierNodeValue: function updateLinkQualifierNodeValue(event) {
            this.updateNodeValue(event, _.bind(function () {
                this.changeToDropdown();
            }, this));
        },
        changeToDropdown: function changeToDropdown() {
            var _this = this;

            this.createNameDropdown();

            this.$el.find(".name").each(function () {
                var currentSelect = this,
                    parentHolder = $(currentSelect).closest(".node"),
                    tempValue;

                if ($(currentSelect).val() === "/linkQualifier") {
                    tempValue = parentHolder.find(".value").val();
                    parentHolder.find(".value").replaceWith(_this.createLinkQualifierCombo());
                    parentHolder.find(".value").val(tempValue);
                }

                $(currentSelect).selectize({
                    create: true
                });

                $(currentSelect)[0].selectize.setValue($(currentSelect).val());

                $(currentSelect)[0].selectize.on('option_add', function (value) {
                    if (_this.model.previousSelectizeAdd !== value) {
                        _this.model.previousSelectizeAdd = "/object/" + value;

                        $(currentSelect)[0].selectize.removeOption(value);
                        $(currentSelect)[0].selectize.addOption({ value: "/object/" + value, text: value });
                        $(currentSelect)[0].selectize.addItem("/object/" + value);
                    }
                });

                $(this).bind("change", function () {
                    var value = $(this).val(),
                        parent = $(this).closest(".node");

                    if (value === "/linkQualifier") {
                        parent.find(".value").replaceWith(_this.createLinkQualifierCombo());
                    } else {
                        parent.find(".value").replaceWith('<input type="text" class="value form-control">');
                    }

                    parent.find(".value").trigger("change");
                });
            });
        },
        createNameDropdown: function createNameDropdown() {
            var baseElement = $('<select style="width:100%;" class="name form-control"><option value="/linkQualifier">Link Qualifier</option></select>'),
                appendElement,
                tempValue,
                displayValue;

            _.forEach(this.model.sourceProps, function (source) {
                if (source !== undefined) {
                    baseElement.append('<option value="/object/' + source + '">' + source + '</option>');
                }
            });

            this.$el.find(".name").each(function () {
                tempValue = $(this).val();
                appendElement = baseElement.clone();

                if (tempValue.length > 0 && appendElement.find("option[value='/object/" + tempValue + "']").length === 0 && appendElement.find("option[value='" + tempValue + "']").length === 0) {
                    displayValue = tempValue.replace("/object/", "");

                    appendElement.append('<option value="' + tempValue + '">' + displayValue + '</option>');
                }

                $(this).replaceWith(appendElement);

                appendElement.val(tempValue);
            });
        },
        createLinkQualifierCombo: function createLinkQualifierCombo() {
            var baseElement = $('<select style="width:100%;" class="value form-control"></select>');

            _.forEach(this.model.linkQualifiers, function (linkQualifier) {
                baseElement.append('<option value="' + linkQualifier + '">' + linkQualifier + '</option>');
            });

            return baseElement;
        }
    });

    return LinkQualifierFilterEditor;
});
