"use strict";

/*
* Copyright 2016-2021 ForgeRock AS. All Rights Reserved
*
* Use of this code requires a commercial software license with ForgeRock AS.
* or with one of its affiliates. All use shall be exclusively subject
* to such license between the licensee and ForgeRock AS.
*/

define(["jquery", "lodash", "handlebars", "org/forgerock/openidm/ui/admin/util/AdminAbstractView", "org/forgerock/openidm/ui/admin/role/util/TemporalConstraintsUtils", "org/forgerock/openidm/ui/admin/dashboard/widgets/util/TimezoneUtil", "bootstrap-datetimepicker"], function ($, _, Handlebars, AdminAbstractView, TemporalConstraintsUtils, TimezoneUtil) {
    var TemporalConstraintsFormView = AdminAbstractView.extend({
        template: "templates/admin/role/TemporalConstraintsFormView.html",
        events: {
            "change .enableTemporalConstraintsCheckbox": "toggleForm",
            "change .timezone-group input": "adjustDateToTimezone",
            "change .timezone-group select": "adjustDateToTimezone",
            "click .local-offset": "setLocalOffset"
        },
        partials: ["partials/role/_temporalConstraint.html", "partials/dashboard/widget/_timezoneGroup.html"],
        data: {},
        model: {},
        /*
        * the args object passed to this render function include these properties:
        *    element: the id of the form's container element
        *    temporalConstraints: an array of temporalConstraint objects produced by looping over temporal constraint
        *                         duration strings and passing each one of them TemporalConstraintsUtils.convertFromIntervalString
        *    toggleCallback: a function to call when the enable temporal constraints toggle switch is changed
        *    dialogView: a boolean value telling the view whether the display is in a dialog or notAssigned
        *
        * example of how to call this view:
        *    temporalConstraintsView.render({
        *        element: "#" + formContainerId,
        *        temporalConstraints: temporalConstraints,
        *        toggleCallback: function() {
        *            _this.showPendingChanges();
        *        },
        *        dialogView: false
        *    });
        */
        render: function render(args, callback) {
            var _this = this;

            this.element = args.element;
            this.toggleCallback = args.toggleCallback;
            this.data.temporalConstraints = args.temporalConstraints;
            this.data.hasTemporalConstraints = args.temporalConstraints.length > 0;
            this.data.timezone = JSON.parse(decodeURIComponent(localStorage.getItem("temporalConstraintsDefaultTimezone")));

            //if there is no default timezone set use the local timezone offset
            if (!this.data.timezone) {
                this.data.timezone = TimezoneUtil.getLocalOffset();
                //set the default timezone
                localStorage.setItem("temporalConstraintsDefaultTimezone", encodeURIComponent(JSON.stringify(this.data.timezone)));
            }

            //if the view is displayed in a dialog this flag tells
            //the template to change the column sizes to fit the dialog's form
            this.data.dialogView = args.dialogView;

            this.parentRender(function () {
                _this.showForm(true);

                if (callback) {
                    callback();
                }
            });
        },

        showForm: function showForm(isOnRender) {
            var _this2 = this;

            var temporalConstraintsContent;

            //if there are any temporalConstraints already on the dom get rid of them
            this.$el.find(".temporalConstraintsFields").empty();

            //if there were multiple constraints we would loop over all of them here
            //since there is only one we directly access [0] in the array
            temporalConstraintsContent = Handlebars.compile("{{> role/_temporalConstraint}}")({
                temporalConstraint: this.data.temporalConstraints[0],
                timezone: this.data.timezone
            });

            this.$el.find(".temporalConstraintsFields").append(temporalConstraintsContent);

            this.$el.find('.datetimepicker').datetimepicker({
                sideBySide: true,
                useCurrent: false,
                icons: {
                    time: 'fa fa-clock-o',
                    date: 'fa fa-calendar',
                    up: 'fa fa-chevron-up',
                    down: 'fa fa-chevron-down',
                    previous: 'fa fa-chevron-left',
                    next: 'fa fa-chevron-right',
                    today: 'fa fa-crosshairs',
                    clear: 'fa fa-trash',
                    close: 'fa fa-remove'
                }
            });

            //set the endDate datepicker to only allow for dates after the startDate
            this.$el.find('.temporalConstraintStartDate').on("dp.change", function (event) {
                var startInput = $(event.target),
                    endInput = _this2.$el.find('.temporalConstraintEndDate');

                //if the startDate is set to a later date than endDate
                //set endDate to an empty string
                if (endInput.val().length && new Date(startInput.val()) > new Date(endInput.val())) {
                    endInput.val("");
                }

                endInput.data("DateTimePicker").minDate(event.date);
            });

            //adjust the timezone offset column width
            this.$el.find(".timezone-group label").removeClass("col-sm-3").addClass("col-sm-2");

            //set the previousTimezone attribute
            this.$el.find(".timezone-group").data("previousTimezone", this.data.timezone);

            if (isOnRender && this.data.temporalConstraints && this.data.temporalConstraints.length) {
                this.toggleForm();
            }
        },

        toggleForm: function toggleForm(event) {
            if (event) {
                event.preventDefault();
            }

            if (this.$el.find(".enableTemporalConstraintsCheckbox").prop("checked")) {
                this.$el.find(".temporalConstraintsFields").show();
            } else {
                this.$el.find(".temporalConstraintsFields").find(".datetimepicker").val("");
                this.$el.find(".temporalConstraintsFields").hide();
            }

            if (this.toggleCallback) {
                this.toggleCallback();
            }
        },

        adjustDateToTimezone: function adjustDateToTimezone(event) {
            var _this3 = this;

            var newTimezone = TimezoneUtil.getTimezoneOffset(this),
                constraint = $(event.target).closest(".temporalConstraint"),
                startDate = constraint.find(".temporalConstraintStartDate"),
                endDate = constraint.find(".temporalConstraintEndDate"),
                startVal = startDate.val(),
                endVal = endDate.val(),
                formValue;

            this.data.timezone = newTimezone;

            //set the defaultTimezone for this browser in localStorage
            localStorage.setItem("temporalConstraintsDefaultTimezone", encodeURIComponent(JSON.stringify(this.data.timezone)));
            //get the form's value with the previousTimezone applied
            formValue = TemporalConstraintsUtils.getTemporalConstraintsValue(this.$el.find('.temporalConstraintsForm'), true);
            //loop over the formValue array and return new temporal constraint objects based on the newTimezone selection
            this.data.temporalConstraints = _.map(formValue, function (constraint) {
                // if no start or end value is entered - leave fields with current values
                if (startVal === "" || endVal === "") {
                    return { "start": startVal, "end": endVal };
                } else {
                    return TemporalConstraintsUtils.convertFromIntervalString(constraint.duration, _this3.data.timezone);
                }
            });
            //set the previousTimezone attribute to the newly selected timezone
            $(event.target).closest(".timezone-group").data("previousTimezone", this.data.timezone);

            this.showForm();
        },

        setLocalOffset: function setLocalOffset(event) {
            TimezoneUtil.setLocalOffset(this);
            this.adjustDateToTimezone(event);
        }
    });

    return TemporalConstraintsFormView;
});
