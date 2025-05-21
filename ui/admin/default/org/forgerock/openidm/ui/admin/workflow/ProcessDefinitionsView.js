"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/commons/ui/common/main/AbstractModel", "org/forgerock/commons/ui/common/main/AbstractCollection", "backgrid", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/commons/ui/common/util/Constants"], function ($, _, AdminAbstractView, AbstractModel, AbstractCollection, Backgrid, BackgridUtils, Constants) {
    var ProcessDefinitionsView = AdminAbstractView.extend({
        template: "templates/admin/workflow/ProcessDefinitionsViewTemplate.html",
        events: {},
        model: {},
        element: "#processDefinitions",
        render: function render(args, callback) {
            this.parentRender(_.bind(function () {
                this.parentRender(_.bind(function () {
                    var processDefinitionGrid,
                        ProcessDefinitionModel = AbstractModel.extend({ "url": Constants.context + "/workflow/processdefinition" }),
                        Process = AbstractCollection.extend({ model: ProcessDefinitionModel });

                    this.model.processes = new Process();
                    this.model.processes.url = Constants.context + "/workflow/processdefinition?_queryId=filtered-query";
                    this.model.processes.state.pageSize = null;

                    processDefinitionGrid = new Backgrid.Grid({
                        className: "table backgrid",
                        emptyText: $.t("templates.workflows.processes.noProcessesDefinitions"),
                        columns: BackgridUtils.addSmallScreenCell([{
                            name: "name",
                            label: $.t("templates.processInstance.definition"),
                            cell: Backgrid.Cell.extend({
                                render: function render() {
                                    this.$el.html('<a href="#workflow/processdefinition/' + this.model.id + '">' + this.model.get("name") + '<small class="text-muted"> (' + this.model.id + ')</small></a>');

                                    this.delegateEvents();
                                    return this;
                                }
                            }),
                            sortable: true,
                            editable: false
                        }], true),
                        collection: this.model.processes
                    });

                    this.$el.find("#processDefinitionGridHolder").append(processDefinitionGrid.render().el);

                    this.model.processes.getFirstPage();

                    if (callback) {
                        callback();
                    }
                }, this));
            }, this));
        }
    });

    return new ProcessDefinitionsView();
});
