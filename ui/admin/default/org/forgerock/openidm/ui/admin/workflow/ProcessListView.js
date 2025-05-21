"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["underscore", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/workflow/ActiveProcessesView", "org/forgerock/openidm/ui/admin/workflow/ProcessDefinitionsView", "org/forgerock/openidm/ui/admin/workflow/ProcessHistoryView", "org/forgerock/commons/ui/common/main/AbstractCollection", "org/forgerock/commons/ui/common/util/Constants"], function (_, AdminAbstractView, ActiveProcessesView, ProcessDefinitionsView, ProcessHistoryView, AbstractCollection, Constants) {
    var ProcessListView = AdminAbstractView.extend({
        template: "templates/admin/workflow/ProcessListViewTemplate.html",
        events: {
            "change #processFilterType": "filterType"
        },
        model: {},
        render: function render(args, activeProcessCallback, processDefinitionsCallback, processHistoryCallback) {
            var processDefinition = {};

            this.parentRender(_.bind(function () {
                this.model.processDefinitions = new AbstractCollection();
                this.model.processDefinitions.url = Constants.context + "/workflow/processdefinition?_queryId=filtered-query";

                this.model.processDefinitions.getFirstPage().then(function (processDefinitions) {
                    processDefinition = _.chain(processDefinitions.result).map(function (pd) {
                        return _.pick(pd, "name", "key");
                    }).uniq(function (pdm) {
                        return pdm.name;
                    }).value();

                    ActiveProcessesView.render([processDefinition], activeProcessCallback);
                    ProcessDefinitionsView.render([], processDefinitionsCallback);
                    ProcessHistoryView.render([processDefinition], processHistoryCallback);
                });
            }, this));
        }
    });

    return new ProcessListView();
});
