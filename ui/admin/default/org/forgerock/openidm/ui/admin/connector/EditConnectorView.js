"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/*
 * Copyright 2015-2023 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
define(["jquery", "lodash", "form2js", "org/forgerock/openidm/ui/admin/connector/AbstractConnectorView", "org/forgerock/openidm/ui/common/delegates/ConfigDelegate", "org/forgerock/openidm/ui/admin/delegates/ConnectorDelegate", "org/forgerock/openidm/ui/admin/connector/ConnectorRegistry", "org/forgerock/openidm/ui/admin/connector/ConnectorObjectTypesView", "org/forgerock/openidm/ui/admin/util/ConnectorUtils", "org/forgerock/commons/ui/common/util/Constants", "org/forgerock/commons/ui/common/main/Router", "org/forgerock/commons/ui/common/main/ValidatorsManager", "org/forgerock/commons/ui/common/util/ModuleLoader", "org/forgerock/commons/ui/common/main/EventManager", "bootstrap-tabdrop"], function ($, _, form2js, AbstractConnectorView, ConfigDelegate, ConnectorDelegate, ConnectorRegistry, ConnectorObjectTypesView, connectorUtils, constants, router, validatorsManager, ModuleLoader, eventManager) {

    var AddEditConnectorView = AbstractConnectorView.extend({
        template: "templates/admin/connector/EditConnectorTemplate.html",
        events: {
            "change #connectorType": "loadConnectorTemplate",
            "click #connectorTabs li": "reRoute",
            "keypress #connectorForm": "enterHandler",
            "click #deleteResource": "deleteResource"
        },
        data: {},
        model: {},
        connectorList: null,
        connectorTypeRef: null,
        oAuthConnector: false,

        render: function render(args, callback) {
            var _this = this;

            this.model.args = _.cloneDeep(args);
            this.data = {};
            this.data.docHelpUrl = constants.DOC_URL;
            this.data.versionDisplay = {};
            this.data.currentMainVersion = null;
            this.data.objectTypes = null;
            this.data.versionCheck = null;
            this.oAuthConnector = false;
            this.connectorTypeRef = null;
            this.connectorList = null;
            this.userDefinedObjectTypes = null;
            this.data.connectorHostRef = '';
            this.data.showDataFor = args[1];

            //Get available list of connectors
            $.when(ConnectorDelegate.availableConnectors()).then(function (connectors) {
                _this.data.connectors = connectors.connectorRef;

                //Build Connector type selection
                _this.data.versionDisplay = _.chain(_this.data.connectors).groupBy(function (connectorRef) {
                    return connectorRef.displayName;
                }).toPairs().sortBy(function (connectorRef) {
                    return connectorRef[0];
                }).map(function (connectorRef) {
                    connectorRef[1].displayName = connectorRef[0];

                    return {
                        "groupName": connectorRef[0],
                        "versions": connectorRef[1]
                    };
                }).value();

                var splitDetails = args[0].match(/(.*?)_(.*)/).splice(1),
                    urlArgs = router.convertCurrentUrlToJSON(),
                    version = void 0;

                _this.data.editState = true;
                _this.data.systemType = splitDetails[0];
                _this.data.connectorId = splitDetails[1];
                _this.data.availableObjectTypes = {};

                //Get current connector details
                _this.getConnectorInfo().then(function (connectorInfo) {
                    var tempVersion = void 0,
                        data = connectorInfo.data,
                        nameParts = data.connectorRef.connectorName.split(".");

                    var VERSION_THRESHOLD = 1.4;

                    if (connectorInfo.testResult) {
                        //availableObjectTypes are objectTypes that exist in the connector schema
                        _this.data.availableObjectTypes = ConnectorObjectTypesView.sortAvailableObjectTypes(connectorInfo.testResult.objectTypes);
                        _this.data.hasAvailableObjectTypes = !_.isEmpty(_this.data.availableObjectTypes);
                    }

                    _this.data.connectorIcon = connectorUtils.getIcon(data.connectorRef.connectorName);
                    _this.currentObjectTypeLoaded = "savedConfig";
                    _this.data.connectorName = nameParts[nameParts.length - 2];
                    _this.data.connectorTypeName = data.connectorRef.connectorName;
                    _this.data.connectorHostRef = data.connectorRef.connectorHostRef;
                    _this.data.enabled = data.enabled;

                    //Need a check here in the instances where connectors do not have enable
                    if (_.isUndefined(_this.data.enabled)) {
                        _this.data.enabled = true;
                    }

                    _this.data.poolConfigOption = data.poolConfigOption;
                    _this.data.resultsHandlerConfig = data.resultsHandlerConfig;
                    _this.data.operationTimeout = data.operationTimeout;

                    if (_this.data.resultsHandlerConfig) {
                        _this.data.resultsHandlerConfig.enableAttributesToGetSearchResultsHandler = _this.data.resultsHandlerConfig.enableAttributesToGetSearchResultsHandler === "true" || _this.data.resultsHandlerConfig.enableAttributesToGetSearchResultsHandler === true;
                        _this.data.resultsHandlerConfig.enableCaseInsensitiveFilter = _this.data.resultsHandlerConfig.enableCaseInsensitiveFilter === "true" || _this.data.resultsHandlerConfig.enableCaseInsensitiveFilter === true;
                        _this.data.resultsHandlerConfig.enableFilteredResultsHandler = _this.data.resultsHandlerConfig.enableFilteredResultsHandler === "true" || _this.data.resultsHandlerConfig.enableFilteredResultsHandler === true;
                        _this.data.resultsHandlerConfig.enableNormalizingResultsHandler = _this.data.resultsHandlerConfig.enableNormalizingResultsHandler === "true" || _this.data.resultsHandlerConfig.enableNormalizingResultsHandler === true;
                    }

                    //Store in memory version of connector details. This is to ensure we can move around tabs and keep the correct data state.
                    _this.setConnectorConfig(data);

                    //Build a version object
                    _.forEach(_this.data.versionDisplay, _.bind(function (group) {
                        group.versions = _.map(group.versions, _.bind(function (v) {
                            v.selected = v.connectorName === this.data.connectorTypeName && v.bundleVersion === data.connectorRef.bundleVersion && v.systemType === this.data.systemType;
                            return v;
                        }, this));
                    }, _this));

                    _this.previousObjectType = data.objectTypes;
                    _this.data.objectTypes = data.objectTypes;

                    //Filter down to the current edited connector Type
                    _this.data.versionDisplay = _.filter(_this.data.versionDisplay, function (connector) {
                        return data.connectorRef.connectorName === connector.versions[0].connectorName;
                    });

                    var _versionRangeCheck = _this.versionRangeCheck(data.connectorRef.bundleVersion);

                    var _versionRangeCheck2 = _slicedToArray(_versionRangeCheck, 2);

                    _this.data.fullversion = _versionRangeCheck2[0];
                    _this.data.currentMainVersion = _versionRangeCheck2[1];

                    data.connectorRef.bundleVersion = _this.data.fullversion;

                    //Filter the connector types down to the current major version
                    _this.data.versionDisplay[0].versions = _.filter(_this.data.versionDisplay[0].versions, function (version) {
                        tempVersion = _this.findMainVersion(version.bundleVersion);

                        return parseFloat(_this.data.currentMainVersion) === parseFloat(tempVersion);
                    });

                    version = _this.data.fullversion;

                    if (version.indexOf("(") !== -1 || version.indexOf(")") !== -1 || version.indexOf("[") !== -1 || version.indexOf("]") !== -1) {
                        version = version.replace(/\[|\)|\(|\]/g, '');
                        version = version.split(",");
                        version = version[0].split(".");
                        version = version[0] + "." + version[1];
                    } else {
                        version = version.split(".");
                        version = version[0] + "." + version[1];
                    }

                    if (version >= VERSION_THRESHOLD) {
                        _this.data.versionCheck = true;
                    } else {
                        _this.data.versionCheck = false;
                    }

                    //Get the connector type for top header display
                    _this.data.displayConnectorType = _this.data.versionDisplay[0].versions[0].displayName;

                    //OAuth branch
                    if (urlArgs.params && urlArgs.params.code) {
                        _this.oAuthCode = urlArgs.params.code;

                        ConnectorRegistry.getConnectorModule(_this.data.connectorTypeName + "_" + _this.data.currentMainVersion).then(function (connectorTypeRef) {
                            _this.connectorTypeRef = connectorTypeRef;
                            _this.connectorTypeRef.getToken(data, _this.oAuthCode).then(function (tokenDetails) {
                                _this.connectorTypeRef.setToken(tokenDetails, data, _this.data.systemType + "/" + _this.data.connectorId, urlArgs);
                            });
                        });
                    } else {
                        _this.parentRender(function () {
                            //alert if a connector is currently set to a bundle version that is outside the bundleVersion range
                            if (_this.data.rangeFound) {
                                _this.$el.find("#connectorWarningMessage .message").append('<div class="pending-changes connector-version">' + $.t("config.messages.ConnectorMessages.connectorVersionChange", { "range": _this.data.oldVersion, "version": data.connectorRef.bundleVersion }) + '</div>');
                                _this.$el.find("#connectorWarningMessage").show();
                            }

                            //set validation for the connector form
                            validatorsManager.bindValidators(_this.$el.find("#connectorForm"));

                            _this.updateTab();

                            if (callback) {
                                callback();
                            }
                        });
                    }
                });
            });
        },

        deleteResource: function deleteResource(event) {
            var connectorPath = "config/" + this.data.systemType + "/" + this.data.connectorId;

            event.preventDefault();

            connectorUtils.deleteConnector(this.data.connectorName, connectorPath, function () {
                eventManager.sendEvent(constants.EVENT_CHANGE_VIEW, { route: router.configuration.routes.connectorListView });
            });
        },

        enterHandler: function enterHandler(event) {
            if (event.keyCode === constants.ENTER_KEY && this.$el.find("#submitConnector").is(":enabled")) {
                this.$el.find("#submitConnector").trigger("click");
            }
        },

        getConnectorInfo: function getConnectorInfo() {
            var _this2 = this;

            return ConfigDelegate.readEntity(this.data.systemType + "/" + this.data.connectorId).then(function (data) {
                return _this2.doConnectorTest(data).then(function (testResult) {
                    return { data: data, testResult: testResult };
                });
            }).then(function (results) {
                return results;
            });
        },

        updateConnector: function updateConnector(objectTypes, hasObjectTypes, connector) {
            this.data.availableObjectTypes = ConnectorObjectTypesView.sortAvailableObjectTypes(objectTypes);
            this.data.hasAvailableObjectTypes = hasObjectTypes;

            this.model.connectorDetails = connector;
            this.setConnectorConfig(connector);
        },

        doConnectorTest: function doConnectorTest(provisionerConfig) {
            var promise = $.Deferred(),
                provisionerConfigClone = $.extend(true, {}, provisionerConfig);

            ConnectorDelegate.testConnector(ConfigDelegate.convertEsvObjectStringsToObjects(provisionerConfigClone)).done(function (connectorTestResult) {
                promise.resolve(connectorTestResult);
            }).fail(function () {
                promise.resolve(undefined);
            });

            return promise;
        },

        //This function is to find the newest version of a connector and verify that it falls within a user provided range
        versionRangeCheck: function versionRangeCheck(version) {
            var _this3 = this;

            var cleanVersion = null,
                tempVersion,
                tempMinorVersion,
                mainVersion,
                minorVersion;

            //Checks to see if there is a range
            if (version.indexOf("(") !== -1 || version.indexOf(")") !== -1 || version.indexOf("[") !== -1 || version.indexOf("]") !== -1) {
                if (this.data.versionDisplay[0].versions.length === 1) {
                    cleanVersion = this.data.versionDisplay[0].versions[0].bundleVersion;
                    mainVersion = this.findMainVersion(cleanVersion);
                } else {
                    _.forEach(this.data.versionDisplay[0].versions, function (versions) {
                        if (cleanVersion === null) {
                            cleanVersion = versions.bundleVersion;
                        } else {
                            tempVersion = _this3.findMainVersion(versions.bundleVersion);
                            tempMinorVersion = _this3.findMinorVersion(versions.bundleVersion);

                            mainVersion = _this3.findMainVersion(cleanVersion);
                            minorVersion = _this3.findMinorVersion(cleanVersion);

                            //Parse float is used to convert the returned string version to a number to allow basic comparison of greater / lesser value
                            if (parseFloat(mainVersion) < parseFloat(tempVersion)) {
                                cleanVersion = versions.bundleVersion;
                            } else if (parseFloat(mainVersion) === parseFloat(tempVersion)) {
                                if (parseFloat(minorVersion) < parseFloat(tempMinorVersion)) {
                                    cleanVersion = versions.bundleVersion;
                                }
                            }
                        }
                    });
                }
                if (this.isRangeValid(cleanVersion, version)) {
                    this.data.rangeFound = false;
                    cleanVersion = version;
                } else {
                    this.data.rangeFound = true;
                    this.data.oldVersion = version;
                }
            } else {
                this.data.rangeFound = false;
                cleanVersion = version;
                mainVersion = this.findMainVersion(cleanVersion);
            }

            return [cleanVersion, mainVersion];
        },

        // make sure current connector version falls within bundleVersion range
        isRangeValid: function isRangeValid(mainVersion, range) {
            var startRange, endRange;

            var _range$split = range.split(",");

            var _range$split2 = _slicedToArray(_range$split, 2);

            startRange = _range$split2[0];
            endRange = _range$split2[1];

            startRange = this.findMainVersion(startRange.slice(1));
            endRange = this.findMainVersion(endRange.slice(0, -1));

            return mainVersion >= startRange && mainVersion < endRange;
        },

        //Since we are using tab panels we need custom validate to correctly enable / disable the connector submit
        validationSuccessful: function validationSuccessful(event) {
            AbstractConnectorView.prototype.validationSuccessful(event);

            this.$el.find("#submitConnector").attr("disabled", false);
        },

        validationFailed: function validationFailed(event, details) {
            AbstractConnectorView.prototype.validationFailed(event, details);

            this.$el.find("#submitConnector").attr("disabled", true);
        },

        reRoute: function reRoute(e) {
            var route = $(e.currentTarget).attr("data-route-name");
            if (route) {
                eventManager.sendEvent(constants.EVENT_CHANGE_VIEW, {
                    route: router.configuration.routes[route], args: this.model.args,
                    callback: _.bind(this.updateTab, this)
                });
            }
        },

        updateTab: function updateTab() {
            var tabId,
                route = router.getCurrentHash().split("/")[1];

            if (route === "edit") {
                route = "details";
            }

            tabId = "#connector" + _.capitalize(route) + "Tab";

            if (this.$el.find(tabId).length > 0) {
                this.$el.find("#connectorTabs li").toggleClass("active", false);
                this.$el.find(tabId + "Header").toggleClass("active", true);
                this.$el.find(tabId).toggleClass("active", true);
            }

            ModuleLoader.load(router.currentRoute.childView).then(_.bind(function (child) {
                if (child) {
                    child.render({ "data": this.data, "model": this.model });
                    this.$el.find(".nav-tabs").tabdrop();
                }
            }, this));
        }
    });

    return new AddEditConnectorView();
});
