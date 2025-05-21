"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/commons/ui/common/main/EventManager", "org/forgerock/commons/ui/common/util/Constants"], function ($, _, AdminAbstractView, ConfigDelegate, EventManager, Constants) {

    var auditDataChanges = {},
        AuditAdminAbstractView = AdminAbstractView.extend({
        retrieveAuditData: function retrieveAuditData(callback) {
            ConfigDelegate.readEntity("audit").then(_.bind(function (data) {
                auditDataChanges = _.cloneDeep(data);
                if (callback) {
                    callback();
                }
            }, this));
        },

        getAuditData: function getAuditData() {
            return _.cloneDeep(auditDataChanges);
        },

        getTopics: function getTopics() {
            return _.union(_.keys(_.cloneDeep(auditDataChanges.eventTopics)), ["authentication", "access", "activity", "recon", "sync", "config"]);
        },

        setProperties: function setProperties(properties, object) {
            _.forEach(properties, function (prop) {
                if (_.isEmpty(object[prop]) && !_.isNumber(object[prop]) && !_.isBoolean(object[prop])) {
                    delete auditDataChanges[prop];
                } else {
                    auditDataChanges[prop] = object[prop];
                }
            });
        },

        setCaseInsensitiveFields: function setCaseInsensitiveFields(caseInsensitiveFields) {
            auditDataChanges.auditServiceConfig.caseInsensitiveFields = caseInsensitiveFields;
        },

        setFilterPolicies: function setFilterPolicies(policies) {
            auditDataChanges.auditServiceConfig.filterPolicies = policies;
        },

        setUseForQueries: function setUseForQueries(event) {
            // event handler used for queries must be enabled
            _.find(auditDataChanges.eventHandlers, function (eventHandler) {
                return eventHandler.config.name === event;
            }).config.enabled = true;
            auditDataChanges.auditServiceConfig.handlerForQueries = event;
        },

        saveAudit: function saveAudit(callback) {
            ConfigDelegate.updateEntity("audit", auditDataChanges).then(_.bind(function () {
                EventManager.sendEvent(Constants.EVENT_DISPLAY_MESSAGE_REQUEST, "auditSaveSuccess");

                if (callback) {
                    callback();
                }
            }, this));
        },

        isValid: _.noop,

        keydownHandler: function keydownHandler(event) {
            var _map = ["Tab", "Enter"].map(_.partial(_.isEqual, event.key)),
                _map2 = _slicedToArray(_map, 2),
                tabKey = _map2[0],
                enterKey = _map2[1],
                nearestSelect = function nearestSelect(el) {
                var parentMatch = $(el).parent().find("select.selectized");
                return _.isEmpty(parentMatch) ? nearestSelect($(el).parent()) : _.first(parentMatch);
            },
                selectizeInput = nearestSelect($(event.target)).selectize,
                targetInSelectize = $(event.target).parent().hasClass("selectize-input"),
                formValidated = this.isValid();

            if (tabKey && targetInSelectize) {
                selectizeInput.close();
                $(event.target).closest(".selectize-input").removeClass("focus").removeClass("input-active");
            } else if (enterKey && formValidated && !targetInSelectize) {
                this.$el.parentsUntil(".model-content").find(".save-button").click();
            }
        }

    });

    return AuditAdminAbstractView;
});
