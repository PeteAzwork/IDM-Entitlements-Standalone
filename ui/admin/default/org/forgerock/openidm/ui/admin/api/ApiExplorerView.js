"use strict";

/*
 * Copyright 2016-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "org/forgerock/commons/ui/common/main/AbstractView"], function ($, AbstractView) {
    var ApiExplorerView = AbstractView.extend({
        template: "templates/admin/util/IframeViewTemplate.html",
        render: function render(args, callback) {
            this.data.iframeSrc = "/api";
            this.data.iframeClass = "api-explorer-iframe";
            this.parentRender(function () {
                var iframe = this.$el.find("." + this.data.iframeClass);

                iframe[0].style.height = iframe[0].contentWindow.document.body.scrollHeight + 'px';

                if (callback) {
                    callback();
                }
            });
        }
    });

    return new ApiExplorerView();
});
