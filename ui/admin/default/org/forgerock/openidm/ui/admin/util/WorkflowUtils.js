"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/openidm/ui/common/util/BootstrapDialogUtils", "org/forgerock/commons/ui/common/components/Messages", "org/forgerock/openidm/ui/common/delegates/ResourceDelegate", "org/forgerock/commons/ui/common/util/UIUtils"], function ($, _, BootstrapDialogUtils, messagesManager, ResourceDelegate, UIUtils) {
    var obj = {};

    /**
     * opens a bootstrap dialog with a selectized autocomplete field pre-populated
     * with all the taskinstance's candidate users
     *
     * @param parentView {can be any Backbone view with it's "this.model" set to the taskinstance being modified}
     * @returns {nothing}
     * @constructor
     */
    obj.showCandidateUserSelection = function (parentView) {
        var _this = parentView,
            candidateUsersQueryFilter = _.map(_this.model.get("candidates").candidateUsers, function (user) {
            return 'userName eq "' + user + '"';
        }).join(" or ");

        if (!candidateUsersQueryFilter.length) {
            candidateUsersQueryFilter = "false";
        }

        ResourceDelegate.searchResource(candidateUsersQueryFilter, "managed/user").then(function (queryResult) {
            var candidateUsers = [{ _id: "noUserAssigned", givenName: "None", sn: "", userName: "" }].concat(queryResult.result),
                select = '<select class="form-control selectize" id="candidateUsersSelect" placeholder="' + $.t("templates.taskInstance.selectUser") + '..."></select>';

            BootstrapDialogUtils.createModal({
                title: $.t("templates.taskInstance.assignTask"),
                size: 430,
                message: select,
                onshown: function onshown() {
                    $("#candidateUsersSelect").selectize({
                        valueField: "_id",
                        labelField: "userName",
                        searchField: ["userName", "givenName", "sn"],
                        create: false,
                        options: candidateUsers,
                        render: {
                            item: function item(_item) {
                                return '<div>' + _item.givenName + ' ' + _item.sn + '<br/> <span class="text-muted">' + _item.userName + '</span></div>';
                            },
                            option: function option(item) {
                                return '<div>' + item.givenName + ' ' + item.sn + '<br/> <span class="text-muted">' + item.userName + '</span></div>';
                            }
                        },
                        load: function load(query, callback) {
                            var queryFilter;

                            if (!query.length) {
                                return callback();
                            } else {
                                queryFilter = "userName sw \"" + query + "\" or givenName sw \"" + query + "\" or  sn sw \"" + query + "\"";
                            }

                            ResourceDelegate.searchResource(queryFilter, "managed/user").then(function (search) {
                                callback(search.result);
                            }, function () {
                                callback();
                            });
                        }

                    });
                },
                buttons: ["cancel", {
                    label: $.t("common.form.submit"),
                    cssClass: "btn-primary",
                    action: function action(dialogRef) {
                        var id = $("#candidateUsersSelect").val(),
                            label = $("#candidateUsersSelect option:selected").text(),
                            callback = function callback() {
                            _this.render([_this.model.id], function () {
                                messagesManager.messages.addMessage({ "message": $.t("templates.taskInstance.assignedSuccess") });
                            });
                        };

                        obj.assignTask(_this.model, id, label, callback);
                        dialogRef.close();
                    }
                }]
            }).open();
        });

        /**
         * sets the assignee attribute on a taskinstance
         *
         * @param model {a taskinstance model}
         * @id {the new assignee id to be set}
         * @label {the username text to be displayed in the nonCandidateWarning}
         * @successCallback
         * @returns {nothing}
         * @constructor
         */
        obj.assignTask = function (model, id, label, successCallback) {
            var assignNow = function assignNow() {
                model.set("assignee", label);

                if (id === "noUserAssigned") {
                    model.set("assignee", null);
                }

                // only send whitelisted task properties (see TaskInstanceResource.UPDATABLE_TASK_PROPERTIES)
                var whitelistData = _.chain(model.attributes).pick(["assignee", "description", "name", "owner", "category", "dueDate", "priority"]).omit(_.isNull).omit(_.isUndefined).value();
                model.save({}, { data: JSON.stringify(whitelistData) }).then(successCallback);
            };

            /*
             * before changing assignee alert the "assigner" that the user
             * being assigned does not exist in the list of candidate users
             */
            if (id !== "noUserAssigned" && !_.includes(model.get("candidates").candidateUsers, label)) {
                UIUtils.jqConfirm($.t("templates.taskInstance.nonCanditateWarning", { userName: label }), function () {
                    assignNow();
                });
            } else {
                assignNow();
            }
        };
    };

    return obj;
});
