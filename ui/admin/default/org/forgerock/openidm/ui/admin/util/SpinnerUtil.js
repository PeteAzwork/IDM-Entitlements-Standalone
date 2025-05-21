"use strict";

/*
 * Copyright 2015-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
define(["jquery", "lodash", "spin"], function ($, _, Spinner) {
    var obj = {
        spinners: []
    };

    /**
     * SpinnerUtil will center a spinner on the provided element until hideSpinner is called.
     * Use this util when manual invocation is required because of prolonged render times.
     * The Spinner manager will still handle spinners in cases of prolonged rest calls.
     *
     * @param element
     */
    obj.showSpinner = function (element) {
        var index = _.findIndex(obj.spinners, { el: element });

        if (index > -1) {
            obj.hideSpinner(element);
        }

        obj.spinners.push({
            el: element,
            spinner: new Spinner().spin(element[0])
        });

        $(".spinner").position({
            of: element,
            my: "center center",
            at: "center center"
        });

        $(element).attr("aria-busy", true);
    };

    obj.hideSpinner = function (element) {
        var index = _.findIndex(obj.spinners, { el: element });
        if (index > -1) {
            obj.spinners[index].spinner.stop();
            obj.spinners.splice(obj.spinners[index], 1);
        }

        $(element).attr("aria-busy", false);
    };

    return obj;
});
