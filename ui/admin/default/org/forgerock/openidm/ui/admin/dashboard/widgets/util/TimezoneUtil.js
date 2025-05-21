"use strict";

/*
* Copyright 2017-2020 ForgeRock AS. All Rights Reserved
*
* Use of this code requires a commercial software license with ForgeRock AS.
* or with one of its affiliates. All use shall be exclusively subject
* to such license between the licensee and ForgeRock AS.
*/

define(["jquery", "underscore", "moment"], function ($, _, moment) {

    var obj = {};

    /**
     * Given a number this function will convert it to a two digit string.
     * For example 7 becomes "07"
     *
     * @param num
     * @returns {string}
     */
    obj.formatNumber = function (num) {
        if (num.toString().length === 2) {
            return num.toString();
        } else {
            return "0" + num;
        }
    };

    /**
     * To be invoked manually when a widget that utilizes timezone offsets calls "customSettingsLoad"
     *
     * This function will ensure that if no timezone is set a default one is set.
     * It also binds the button controlling the local offset setter.
     *
     * @param dialogRef
     */
    obj.setupOffsetInputs = function (dialogRef, widget) {
        var _this = this;

        if (!_.has(widget, "timezone")) {
            this.setLocalOffset(dialogRef);
        }

        dialogRef.$modalBody.find(".local-offset").bind("click", function (e) {
            e.preventDefault();

            _this.setLocalOffset(dialogRef);
        });
    };

    /**
     * Given a container reference with a .timezone-group this will set the group of inputs
     * to reflect the offset of the browser.
     *
     * @param container
     */
    obj.setLocalOffset = function (container) {
        var el = container.$modalBody || container.$el || container;

        if (el.find(".timezone-group").length > 0) {

            var offset = this.getLocalOffset();
            el.find(".offset-minutes").val(offset.minutes);
            el.find(".offset-hours").val(offset.hours);

            if (offset.negative) {
                el.find(".plus-minus").val("-");
            } else {
                el.find(".plus-minus").val("+");
            }
        }
    };

    /**
     * Using the locale of the browser returns an object representing the offset
     * in hours and minutes, and whether or not the offset is negative
     *
     * @returns {{negative: boolean, hours: string, minutes: string}}
     */
    obj.getLocalOffset = function () {
        var zone = moment().zone() * -1,
            minutes = Math.abs(zone % 60),
            hours = (zone - minutes) / 60,
            offset = {
            "negative": false,
            "hours": this.formatNumber(hours),
            "minutes": this.formatNumber(minutes)
        };

        if (hours < 0) {
            offset.negative = true;
            offset.hours = this.formatNumber(Math.abs(hours));
        }

        return offset;
    };

    /**
     * Given a container reference with a .timezone-group this will retrieve an object representing
     * the offset in hours and minutes, and whether or not the offset is negative.
     *
     * If the values are not number the browsers current offset will be returned instead.
     *
     * @param container
     * @returns {{negative: boolean, hours: string, minutes: string}}
     */
    obj.getTimezoneOffset = function (container) {
        var el = container.$modalBody || container.$el || container;

        if (el.find(".timezone-group").length > 0) {
            var minutes = parseInt(el.find(".offset-minutes").val(), 10),
                hours = parseInt(el.find(".offset-hours").val(), 10),
                negative = el.find(".plus-minus").val() === "-";

            if (_.isNaN(hours) || _.isNaN(minutes)) {
                return this.getLocalOffset();
            } else {
                return {
                    "negative": negative,
                    "hours": this.formatNumber(hours),
                    "minutes": this.formatNumber(minutes)
                };
            }
        }
    };

    /**
     * Given an offset object this will return a 4 of 5 length string.  Length of 5 for a negative offset.
     * @param offsetObj
     * @returns {string}
     */
    obj.getOffsetString = function (offsetObj, colon) {
        var offset = "";
        if (offsetObj.negative) {
            offset = "-";
        }
        offset += offsetObj.hours;
        if (colon) {
            offset += ":";
        }
        offset += offsetObj.minutes;
        return offset;
    };

    /**
     * Given an offset object this will return the number of minutes that the offset converts to.
     * @param offsetObj
     * @returns {number}
     */
    obj.getOffsetMinutes = function (offsetObj) {
        var offsetMinutes = parseInt(offsetObj.hours, 10) * 60 + parseInt(offsetObj.minutes, 10);
        if (offsetObj.negative) {
            offsetMinutes *= -1;
        }
        return offsetMinutes;
    };

    /**
     * The unix timestamps are all in zulu, to view them relative to the user defined offset
     * the implied browser offset must be removed, and the user defined offset must be applied.
     * These calculations will happen no more than data points displayed on a given chart.
     * @param unixTimestamp {number} - the current datapoint in seconds
     * @param offsetMinutes {number} - the user defined offset for the widget
     * @return {number}
     */
    obj.adjustUnixTimestamp = function (unixTimestamp, offsetMinutes) {
        var momentTime = moment(unixTimestamp, "X");

        // Time is in Zulu, add the browser offset to get browser rendering in the same timezone
        momentTime = momentTime.subtract(moment(unixTimestamp, "X").zone() * -1, "minutes");

        // Account for user manual adjustments
        momentTime = momentTime.add(offsetMinutes, "minutes");

        return momentTime.unix();
    };

    return obj;
});
