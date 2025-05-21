"use strict";

/*
 * Copyright 2015-2022 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/commons/ui/common/util/Constants"], function ($, _, Constants) {
    var obj = {
        "changed": {
            "name": "Changed field",
            "dependencies": [],
            "validator": function validator(el, input, callback) {
                callback();
            }
        },
        "requiredURL": {
            "name": "URL required",
            "dependencies": [],
            "validator": function validator(el, input, callback) {
                var v = $(input).val();
                // This regex verifies there are no spaces in the context and that only valid URL characters are included.
                if (v.length > 0 && !/^[a-zA-Z0-9\-\.\_\~\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=]+$/.test(v)) {
                    callback(["Not a valid URL"]);
                    return;
                }

                if (v === Constants.context || v === "/admin" || v === "/system") {
                    callback(["The URL cannot be one of the following reserved names: '" + Constants.context + "', 'admin' or 'system'."]);
                    return;
                }

                callback();
            }
        },
        "certificate": {
            "name": "Valid Certificate String",
            "dependencies": [],
            "validator": function validator(el, input, callback) {

                var v = $(input).val();
                if (v.length && !v.match(/\-\-\-\-\-BEGIN CERTIFICATE\-\-\-\-\-\n[^\-]*\n\-\-\-\-\-END CERTIFICATE\-\-\-\-\-\s*$/)) {
                    callback(["Invalid Certificate"]);
                    return;
                }

                callback();
            }
        },
        "bothRequired": {
            "name": "Two Required Fields",
            "dependencies": [],
            "validator": function validator(el, input, callback) {
                var inputs = $(el).find('input[data-validator*="bothRequired"]'),
                    secondInput;

                if (inputs.length !== 2) {
                    callback([$.t("templates.scriptEditor.bothRequired")]);
                    return;
                }

                if (!$(inputs[0]).val() || $(inputs[0]).val() === "" || !$(inputs[1]).val() || $(inputs[1]).val() === "") {
                    callback([$.t("templates.scriptEditor.bothRequired")]);
                    return;
                }

                secondInput = inputs.not(input);

                if ($(secondInput).attr('data-validation-status') !== "ok") {
                    secondInput.attr("data-validation-status", "ok");
                    secondInput.trigger("blur");
                    input.trigger("focus");
                }

                callback();
            }
        },
        "spaceCheck": {
            "name": "Whitespace validator",
            "dependencies": [],
            "validator": function validator(el, input, callback) {
                var v = input.val();
                if (!v || v === "" || v.indexOf(' ') !== -1) {
                    callback([$.t("common.form.validation.spaceNotAllowed")]);
                    return;
                }

                callback();
            }
        },
        "uniqueShortList": {
            "name": "Unique value amongst a short list of values loaded in the client",
            "dependencies": [],
            "validator": function validator(el, input, callback) {
                var v = input.val().toUpperCase().trim(),
                    usedNames = JSON.parse($(input).attr("data-unique-list").toUpperCase()),
                    message = $(input).attr("data-error-message") || $.t("common.form.validation.unique");

                if (v.length > 0 && !_.includes(usedNames, v)) {
                    callback();
                } else {
                    callback([message]);
                }
            }
        },
        "uniqueShortListObject": {
            "name": "Unique value amongst a short list of values loaded in the client",
            "dependencies": [],
            "validator": function validator(el, input, callback) {
                var v = input.val().toLowerCase().trim(),
                    usedNames = JSON.parse($(input).attr("data-unique-list")),
                    message = $(input).attr("data-error-message") || $.t("common.form.validation.unique"),
                    uniqueCheck = true;

                _.forEach(usedNames, function (dashboard) {
                    if (dashboard.name && dashboard.name.toLowerCase() === v) {
                        uniqueCheck = false;
                    }
                });

                if (uniqueCheck) {
                    callback();
                } else {
                    callback([message]);
                }
            }
        },
        "restrictedCharacters": {
            "name": "Cannot contain any of the following characters ;",
            "dependencies": [],
            "validator": function validator(el, input, callback) {
                var v = input.val(),
                    pattern = input.attr("restrictedCharacterPattern") || "^[a-z0-9_]+$",
                    description = input.attr("restrictedCharacterDescription") || "Non-alphanumeric",
                    characterCheck = new RegExp(pattern, 'i').test(v);

                if (characterCheck) {
                    callback();
                } else {
                    callback($.t("common.form.validation.CANNOT_CONTAIN_CHARACTERS", { "forbiddenChars": description }));
                }
            }
        },
        "isPositiveNumber": {
            "name": "The input value must a number greater than or equal to one",
            "dependencies": [],
            "validator": function validator(el, input, callback) {
                var val = Number(input.val());

                if (input.val().length > 0 && !_.isNaN(val) && val > 0) {
                    callback();
                } else {
                    callback($.t("common.form.validation.IS_NUMBER_GREATER_ZERO"));
                }
            }
        },
        "isPositiveNumberOrEmpty": {
            "name": "The input value must a number greater than or equal to one or empty",
            "dependencies": [],
            "validator": function validator(el, input, callback) {
                var val = input.val();

                if (val.length === 0) {
                    callback();
                } else if (_.isNumber(Number(val)) && val > 0) {
                    callback();
                } else {
                    callback($.t("common.form.validation.IS_NUMBER_GREATER_ZERO"));
                }
            }
        },
        "validEmailAddressFormat": {
            "name": "The input value must be valid email address format",
            "dependencies": [],
            "validator": function validator(el, input, callback) {
                var val = input.val(),
                    emailFormatCheck = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(val);

                if (emailFormatCheck) {
                    callback();
                } else {
                    callback($.t("common.form.validation.VALID_EMAIL_ADDRESS_FORMAT"));
                }
            }
        },
        "validNumber": {
            "name": "The input value must be a number",
            "dependencies": [],
            "validator": function validator(el, input, callback) {
                var val = input.val(),
                    numberFormatCheck = /^\d*$|^&{.+}$/i.test(val);

                if (numberFormatCheck) {
                    callback();
                } else {
                    callback($.t("common.form.validation.VALID_NUMBER_FORMAT"));
                }
            }
        },
        /**
        * validator requires HTML: 'data-validator="bothOptionalWithValidation (number|string)"'
        * will validate that:
        *       either neither fields have values
        *       both fields have values that match the data-validator type
        *   Otherwise - appropriate validation messages will be displayed
        */
        "bothOptionalWithValidation": {
            "name": "Two Optional Fields",
            "dependencies": [],
            "validator": function validator(el, input, callback) {
                var inputs = $(el).find('input[data-validator*="bothOptionalWithValidation"]'),
                    validationTypeForFirstInput = _.without($(input).data('validator').split(" "), "bothOptionalWithValidation")[0],
                    firstInput = $(input),
                    secondInput = $(inputs.not(input)),
                    validationTypeForSecondInput = _.without(secondInput.data('validator').split(" "), "bothOptionalWithValidation")[0];

                // both empty - no validation
                if (firstInput.val() === "" && secondInput.val() === "") {
                    secondInput.attr("data-validation-status", "ok").trigger("keyup");
                    callback();
                    return;
                    // one empty - validation
                } else if (firstInput.val() === "" && secondInput.val() || secondInput.val() === "" && firstInput.val()) {
                    //add validator to other field
                    secondInput.attr("data-validation-status", "error").trigger("keyup");
                    callback([$.t("templates.scriptEditor.bothRequired")]);
                    return;
                    // both fields have values
                } else if (firstInput.val() && secondInput.val()) {
                    // validate number fields
                    if (validationTypeForFirstInput === "number" && (!_.isNumber(parseInt(firstInput.val(), 10)) || _.isNaN(parseInt(firstInput.val(), 10))) || validationTypeForSecondInput === "number" && (!_.isNumber(parseInt(secondInput.val(), 10)) || _.isNaN(parseInt(secondInput.val(), 10)))) {
                        secondInput.attr("data-validation-status", "error").trigger("keyup");
                        callback([$.t("common.form.validation.IS_NUMBER")]);
                        return;
                    }
                    // validate string fields
                    if (validationTypeForFirstInput === "string" && firstInput.val().split(" ").length > 1 || validationTypeForSecondInput === "string" && secondInput.val().split(" ").length > 1) {
                        secondInput.attr("data-validation-status", "error").trigger("keyup");
                        callback([$.t("common.form.validation.spaceNotAllowed")]);
                        return;
                    }

                    // validation success
                    secondInput.attr("data-validation-status", "ok").trigger("keyup");
                    callback();
                }
            }
        },
        "validURL": {
            "name": "the input value must be a URL",
            "dependencies": [],
            "validator": function validator(el, input, callback) {
                var v = $(input).val();
                // This regex validates the structure of the URL and allows for use of localhost
                if (v.length > 0 && !/^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/.test(v)) {
                    callback(["Not a valid URL"]);
                    return;
                }

                callback();
            }
        }
    };

    return obj;
});
