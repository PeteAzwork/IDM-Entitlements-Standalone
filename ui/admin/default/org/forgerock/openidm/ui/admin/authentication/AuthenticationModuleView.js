"use strict";

/*
 * Copyright 2016-2021 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "backbone", "backgrid", "handlebars", "org/forgerock/openidm/ui/admin/authentication/AuthenticationAbstractView", "org/forgerock/openidm/ui/admin/authentication/AuthenticationModuleDialogView", "org/forgerock/openidm/ui/common/util/BackgridUtils", "org/forgerock/commons/ui/common/util/Constants"], function ($, _, Backbone, Backgrid, Handlebars, AuthenticationAbstractView, AuthenticationModuleDialogView, BackgridUtils, Constants) {

    var AuthenticationModuleView = AuthenticationAbstractView.extend({
        template: "templates/admin/authentication/AuthenticationModuleTemplate.html",
        element: "#modulesContainer",
        noBaseTemplate: true,
        events: {
            "click .add-auth-module": "addAuthModule",
            "change #moduleType": "checkAddButton"
        },
        partials: ["partials/authentication/_authenticationModuleRow.html", "partials/_alert.html"],
        data: {
            module_types: [{ "key": "STATIC_USER", "value": "" }, { "key": "CLIENT_CERT", "value": "" }, { "key": "IWA", "value": "" }, { "key": "MANAGED_USER", "value": "" }, { "key": "INTERNAL_USER", "value": "" }, { "key": "SOCIAL_PROVIDERS", "value": "" }, { "key": "PASSTHROUGH", "value": "" }, { "key": "TRUSTED_ATTRIBUTE", "value": "" }],
            "docHelpUrl": Constants.DOC_URL
        },

        /**
         * @param configs {object}
         * @param configs.addedOpenAM {function}
         * @param callback
         */
        render: function render(showWarning, callback) {
            var self = this;

            this.data.hideWarning = !(showWarning || false);
            this.model = _.assignIn({}, this.getAuthenticationData());

            this.model.authModulesClean = _.cloneDeep(this.model.authModules);

            // Translate the name of the modules
            _.forEach(this.data.module_types, _.bind(function (module, index) {
                this.data.module_types[index].value = $.t("templates.auth.modules." + this.data.module_types[index].key + ".name");
            }, this));
            this.data.module_types = _.sortBy(this.data.module_types, "key");

            this.parentRender(_.bind(function () {
                this.model.authModulesCollection = new Backbone.Collection();

                _.forEach(this.model.authModules, _.bind(function (module) {
                    this.model.authModulesCollection.add(module);
                }, this));

                var authModuleGrid = new Backgrid.Grid({
                    className: "table backgrid",
                    row: BackgridUtils.ClickableRow.extend({
                        callback: _.bind(function (e) {
                            e.preventDefault();
                            self.editAuthModule(e);
                        }, this)
                    }),
                    columns: BackgridUtils.addSmallScreenCell([{
                        label: $.t("templates.auth.modules.gridLabel"),
                        cell: Backgrid.Cell.extend({
                            className: "col-sm-9",
                            render: function render() {
                                this.$el.html(Handlebars.compile("{{> authentication/_authenticationModuleRow}}")({
                                    "disabled": this.model.get("enabled") === false,
                                    "name": $.t("templates.auth.modules." + this.model.get("name") + ".name"),
                                    "resource": this.model.get("properties").queryOnResource,
                                    "msg": $.t("templates.auth.modules." + this.model.get("name") + ".msg")
                                }));
                                return this;
                            }
                        }),
                        sortable: true,
                        editable: false
                    }, {
                        label: "",
                        sortable: false,
                        editable: false,
                        cell: BackgridUtils.ButtonCell([{
                            className: "fa fa-times grid-icon col-sm-1 pull-right",
                            callback: function callback(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                self.model.authModules.splice(self.getClickedRowIndex(e), 1);
                                self.saveChanges();
                                self.render();
                            }
                        }, {
                            // No callback necessary, the row click will trigger the edit
                            className: "fa fa-pencil grid-icon col-sm-1 pull-right"
                        }, {
                            className: "dragToSort fa fa-arrows grid-icon col-sm-1 pull-right"
                        }], function () {
                            // OAUTH_CLIENT modules are not editable in the UI
                            if (this.model.get("name") === "OAUTH_CLIENT") {
                                this.$el.find(".fa-pencil").addClass("hidden");
                            }
                        })
                    }]),
                    collection: this.model.authModulesCollection
                });

                this.$el.find("#authModuleGrid").append(authModuleGrid.render().el);

                this.makeSortable();

                this.$el.find(".auth-message").popover({
                    content: function content() {
                        return $(this).attr("data-title");
                    },
                    placement: 'top',
                    container: 'body',
                    html: 'true',
                    title: ''
                });

                this.$el.find("#moduleType").selectize({
                    render: {
                        option: function option(item, selectizeEscape) {
                            var element = $('<div class="fr-search-option"></div>');

                            $(element).append('<div class="fr-search-primary">' + selectizeEscape(item.text) + '</div>');
                            $(element).append('<div class="fr-search-secondary text-muted">' + $.t("templates.auth.modules." + item.value + ".msg") + '</div>');

                            return element.prop('outerHTML');
                        }
                    }
                });

                if (callback) {
                    callback();
                }
            }, this));
        },

        makeSortable: function makeSortable() {
            BackgridUtils.sortable({
                "containers": [this.$el.find("#authModuleGrid tbody")[0]],
                "rows": _.cloneDeep(this.model.authModules)
            }, _.bind(function (newOrder) {
                this.model.authModules = newOrder;
                this.saveChanges();
            }, this));
        },

        saveChanges: function saveChanges() {
            var _this = this;

            this.setProperties(["authModules"], { "authModules": this.model.authModules });
            this.saveAuthentication().then(function () {
                _this.render(true);
            });
        },

        editAuthModule: function editAuthModule(e) {
            AuthenticationModuleDialogView.render({
                "config": this.model.authModules[this.getClickedRowIndex(e)],
                "saveCallback": _.bind(function (config) {
                    this.model.authModules[this.getClickedRowIndex(e)] = config;
                    this.saveChanges();
                }, this)
            }, _.noop);
        },

        addAuthModule: function addAuthModule(e) {
            if (e) {
                e.preventDefault();
            }

            var newModule = this.$el.find("#moduleType").val();

            if (!_.isNull(newModule)) {
                AuthenticationModuleDialogView.render({
                    "config": {
                        "name": newModule,
                        "enabled": true,
                        "properties": {}
                    },
                    "newModule": true,
                    "saveCallback": _.bind(function (config) {
                        this.model.authModules.push(config);
                        this.saveChanges();
                    }, this)
                }, _.noop);
            }
        },

        checkAddButton: function checkAddButton(e) {
            if (e) {
                e.preventDefault();
            }
            var newModule = this.$el.find("#moduleType").val();
            this.$el.find(".add-auth-module").prop("disabled", _.isNull(newModule));
        },

        getClickedRowIndex: function getClickedRowIndex(e) {
            var index = -1;

            _.forEach($(e.currentTarget).closest("table tbody").find("tr"), function (tr, i) {
                if (tr === $(e.currentTarget).closest("tr")[0]) {
                    index = i;
                }
            });

            return index;
        }
    });

    return new AuthenticationModuleView();
});
