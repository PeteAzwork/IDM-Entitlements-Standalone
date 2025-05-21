"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "handlebars", "org/forgerock/openidm/ui/admin/util/AdminAbstractView"], function ($, _, handlebars, AdminAbstractView) {

    var quickMappingInstance = {},
        QuickMappingView = AdminAbstractView.extend({
        template: "templates/admin/util/QuickMappingViewTemplate.html",
        partials: ["partials/util/_quickMappingRow.html"],
        noBaseTemplate: true,
        events: {
            "click .fr-remove-mapping": "removeQuickMapping",
            "drag .fr-list-item": "dragItem",
            "drop .fr-list-item": "dropItem",
            "dragstart .fr-list-item": "dragStartItem",
            "dragleave .fr-list-item": "dragLeaveItem",
            "dragover .fr-list-item": "checkDropItem",
            "dragend .fr-list-item": "dragEndItem"
        },
        model: {
            "element": "#quickMappingBody",
            "quickMappingList": [],
            "draggedElement": null
        },
        data: {
            "leftSideEmpty": false,
            "rightSideEmpty": false,
            "leftTitle": "Left List",
            "rightTitle": "Right List",
            "quickMappingTitle": "Mappings"
        },

        /**
         * Properties that can be configured through args
         *
         * leftSide (array) - Array of strings used for the left side of the quick mapping
         * rightSide (array) - Array of strings used for the right side of the quick mapping
         * leftTitle (string) - Title string for the left quick mapping
         * rightTitle (string) - Title string for the right quick mapping
         * quickMappingTitle (string) - Title for the quick mapping display
         * leftSideEmpty (boolean) - Allows for the left side to have an empty quick mapping value
         * rightSideEmpty (boolean) - Allows for the right side to have an empty quick mapping value
         * alphabetized (boolean) - Sorts both quick mapping groups by alphabetical order
         */
        render: function render(args) {
            _.assignIn(this.model, args);

            this.element = this.model.element;

            this.data = _.pick(this.model, 'leftSide', 'rightSide', 'leftTitle', 'rightTitle', "quickMappingTitle", 'leftSideEmpty', "rightSideEmpty");

            if (this.model.alphabetized) {
                this.data.leftSide.sort();
                this.data.rightSide.sort();
            }

            this.parentRender(function () {});
        },

        dragStartItem: function dragStartItem(event) {
            event.stopPropagation();

            //Needed to make firefox respect drag/drop
            event.originalEvent.dataTransfer.setData('text/plain', 'some_dummy_data');
        },

        dragItem: function dragItem(event) {
            event.stopPropagation();

            this.model.draggedElement = $(event.target);
        },

        dropItem: function dropItem(event) {
            event.preventDefault();
            event.stopPropagation();

            var drop = $(event.target),
                leftCorrelation,
                rightCorrelation;

            drop.toggleClass("fr-no-drop", false);
            drop.toggleClass("fr-drop", false);

            if (drop.attr("data-group") === "left") {
                leftCorrelation = drop.text();
                rightCorrelation = this.model.draggedElement.text();
            } else {
                leftCorrelation = this.model.draggedElement.text();
                rightCorrelation = drop.text();
            }

            this.addCorrelation(leftCorrelation, rightCorrelation);
        },

        dragEndItem: function dragEndItem(event) {
            event.stopPropagation();

            this.model.draggedElement = null;
        },

        checkDropItem: function checkDropItem(event) {
            event.stopPropagation();

            var drop = $(event.target);

            if (this.model.draggedElement.attr("data-group") === drop.attr("data-group")) {
                drop.toggleClass("fr-no-drop", true);
            } else {
                event.preventDefault();
                drop.toggleClass("fr-drop", true);
            }
        },

        dragLeaveItem: function dragLeaveItem(event) {
            event.stopPropagation();

            var drop = $(event.target);

            drop.toggleClass("fr-no-drop", false);
            drop.toggleClass("fr-drop", false);
        },

        addCorrelation: function addCorrelation(left, right) {
            var template = $(handlebars.compile("{{> util/_quickMappingRow}}")({
                "left": left,
                "right": right
            }));

            this.model.quickMappingList.push({
                "left": left,
                "right": right
            });

            this.$el.find(".fr-quick-mapping-props .fr-empty-list").hide();

            this.$el.find(".fr-quick-mapping-props .list-group").append(template);
        },

        removeQuickMapping: function removeQuickMapping(event) {
            var quickMappingRow = $(event.target).parents(".fr-quick-mapping-row"),
                index = this.$el.find(".fr-quick-mapping-row").index(quickMappingRow);

            this.model.quickMappingList.splice(index, 1);

            quickMappingRow.remove();

            if (this.$el.find(".fr-quick-mapping-row").length === 0) {
                this.$el.find(".fr-quick-mapping-props .fr-empty-list").show();
            }
        },

        getResults: function getResults() {
            return this.model.quickMappingList;
        }
    });

    quickMappingInstance.generateCorrelation = function (loadingObject, callback) {
        var quickMapping = {};

        $.extend(true, quickMapping, new QuickMappingView());

        quickMapping.render(loadingObject, callback);

        return quickMapping;
    };

    return quickMappingInstance;
});
