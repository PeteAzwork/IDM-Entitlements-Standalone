"use strict";

/*
 * Copyright 2011-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["underscore", "org/forgerock/commons/ui/common/main/AbstractView", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/AbstractModel", "org/forgerock/openidm/ui/admin/util/WorkflowUtils"], function (_, AbstractView, Constants, AbstractModel) {
    var ProcessModel = AbstractModel.extend({ url: Constants.context + "/workflow/processdefinition" }),
        ProcessDefinitionView = AbstractView.extend({
        template: "templates/admin/workflow/ProcessDefinitionViewTemplate.html",

        events: {},
        render: function render(args, callback) {
            this.model = new ProcessModel();

            this.model.id = args[0];

            this.model.fetch().then(_.bind(function () {

                this.data.processDefinition = this.model.toJSON();

                this.data.diagramUrl = Constants.context + "/workflow/processdefinition/" + this.model.id + "?_fields=/diagram&_mimeType=image/png";

                this.parentRender(_.bind(function () {

                    if (callback) {
                        callback();
                    }
                }, this));
            }, this));
        }
    });

    return new ProcessDefinitionView();
});
