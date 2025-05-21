"use strict";

/*
 * Copyright 2014-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/commons/ui/common/main/Configuration", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/EventManager", "ThemeManager", "org/forgerock/commons/ui/common/util/UIUtils"], function ($, _, AbstractView, Configuration, Constants, EventManager, ThemeManager, UIUtils) {
    var AdminAbstractView = AbstractView.extend({

        compareObjects: function compareObjects(property, obj1, obj2) {
            function compare(val1, val2) {
                _.forEach(val1, function (property, key) {
                    if (_.isEmpty(property) && !_.isNumber(property) && !_.isBoolean(property)) {
                        delete val1[key];
                    }
                });

                _.forEach(val2, function (property, key) {
                    if (_.isEmpty(property) && !_.isNumber(property) && !_.isBoolean(property)) {
                        delete val2[key];
                    }
                });

                return _.isEqual(val1, val2);
            }

            return compare(obj1[property], obj2[property]);
        },
        parentRender: function parentRender(callback) {
            this.callback = callback;

            var _this = this,
                needsNewBaseTemplate = function needsNewBaseTemplate() {
                return Configuration.baseTemplate !== _this.baseTemplate && !_this.noBaseTemplate;
            };
            EventManager.registerListener(Constants.EVENT_REQUEST_RESEND_REQUIRED, function () {
                _this.unlock();
            });

            ThemeManager.getTheme().then(function (theme) {
                _this.data.theme = theme;

                if (needsNewBaseTemplate()) {
                    UIUtils.renderTemplate(_this.baseTemplate, $("#wrapper"), _.assignIn({}, Configuration.globalData, _this.data), _.bind(_this.loadTemplate, _this), "replace", needsNewBaseTemplate);
                } else {
                    _this.loadTemplate();
                }
                // Wait for all inputs to be on the screen then check input values for esv replacement strings.
                // If the value is an esv disable the input field.
                _.delay(function () {
                    $("input").each(function () {
                        var val = $(this).val(),
                            replacementRegex = /&\s*{(.*?)}|"\$purpose"/gm,
                            actualValue = $(this).attr('actualvalue'),
                            fieldName = $(this).attr('name'),
                            fieldType = $(this).attr('type');
                        var matches = val.match(replacementRegex);

                        // Boolean value handler
                        if (fieldType === "checkbox" && actualValue && actualValue.match(replacementRegex)) {
                            var el = $('<span>'),
                                el_id = "replacement-text-" + fieldName;
                            el.attr('id', el_id);
                            el.text(actualValue);

                            if ($("#" + el_id).length === 0) {
                                el.insertAfter($(this));
                            }

                            $(this).attr('value', actualValue);
                            $(this).click();
                            matches = actualValue.match(replacementRegex);
                        }

                        if (matches) {
                            $(this).prop('disabled', true);
                            // if this field is a password type switch it to text so the user can view
                            // the replacement and not just a greyed out password field (*******)
                            if ($(this).prop('type') === 'password') {
                                $(this).prop('type', 'text');
                            }
                        }
                    });
                }, 200);
            });
        }
    });

    return AdminAbstractView;
});
