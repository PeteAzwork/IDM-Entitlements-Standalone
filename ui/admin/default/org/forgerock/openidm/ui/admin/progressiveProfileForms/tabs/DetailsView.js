"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/openidm/ui/admin/util/AdminAbstractView"], function ($, _, AdminAbstractView) {
    var DetailsView = AdminAbstractView.extend({
        template: "templates/admin/progressiveProfileForms/tabs/DetailsViewTemplate.html",
        events: {
            "keydown :input": "update",
            "change :input": "update"
        },

        render: function render(args, callback) {
            if (args.element) {
                this.element = args.element;
            }

            if (args.uiConfig) {
                var _args$uiConfig = args.uiConfig,
                    displayName = _args$uiConfig.displayName,
                    purpose = _args$uiConfig.purpose,
                    buttonText = _args$uiConfig.buttonText;


                this.data.uiConfig = { displayName: displayName, purpose: purpose, buttonText: buttonText || $.t("common.form.save") };
            } else {
                this.data.uiConfig = {
                    displayName: "",
                    purpose: "",
                    buttonText: $.t("common.form.save")
                };
            }

            this.parentRender(function () {
                if (callback) {
                    callback();
                }
            });
        },

        update: function update(event) {
            var name = event.target.name,
                value = event.target.type === "checkbox" ? event.target.checked : event.target.value;

            this.data.uiConfig[name] = value;
        },

        getValue: function getValue() {
            return this.data.uiConfig;
        }

    });

    return new DetailsView();
});
