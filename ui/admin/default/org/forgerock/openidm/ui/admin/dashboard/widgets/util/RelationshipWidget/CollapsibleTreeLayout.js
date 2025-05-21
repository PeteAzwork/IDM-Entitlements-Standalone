"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "d3", "org/forgerock/openidm/ui/common/delegates/ResourceDelegate"], function ($, _, d3, ResourceDelegate) {
    var obj = {};
    /**
     * @param widget {object} - parent widget view
     * @param objectDetails {object} - details of the object being charted
     */
    obj.setupChart = function (widget, objectDetails) {
        var displayTextArray = [];

        //nodeCounter is incremented on the addition of any node and used in node id's
        obj.nodeCounter = 0;
        obj.widget = widget;

        _.forEach(widget.data.searchFields, function (fieldName) {
            if (objectDetails[fieldName]) {
                displayTextArray.push(objectDetails[fieldName]);
            }
        });

        obj.chartData = {
            name: displayTextArray.join(" / "),
            id: "mainNode",
            children: []
        };

        widget.$el.find(".relationshipGraph").empty();

        obj.buildNodeTree(obj.chartData, widget.data.relationshipProps, objectDetails);

        obj.generateChartDisplay();
    };

    /**
     * This function loops over a set of relationship properties, adds an intermediate node representing
     * each property, then for each of the property values a sub node is added to the intermediate node
     * @param chartData {object} - object representing data for the full tree being generated
     * @param relationshipProps {array} - array of schema relationship properties
     * @param objectDetails {object} - an object representing the data to be represented in the tree
     */
    obj.buildNodeTree = function (chartData, relationshipProps, objectDetails) {
        _.forEach(relationshipProps, function (prop) {
            var parentNode = void 0,
                propDetails = objectDetails[prop.propName];

            //if there are no propDetails then skip over this relationship property and do nothing
            if (propDetails) {
                if (propDetails.length || prop.type === "relationship" && !_.isEmpty(propDetails)) {
                    var validArrayItems = function validArrayItems() {
                        return _.reject(propDetails, function (item) {
                            return item._ref.indexOf("internal") === 0;
                        });
                    };
                    /*
                     * if any of the values in the array of relationships come from internal
                     * then do not add an intermediate node for this property
                     */
                    if (!(prop.type === "array" && validArrayItems().length === 0)) {
                        chartData.children = obj.addIntermediateNode(chartData.children, prop, "mainNode");
                    }
                }

                parentNode = _.find(chartData.children, { name: prop.title || prop.propName });

                if (prop.type === "array" && parentNode) {
                    /*
                     * loop over all the the relationships in this property's data set
                     * then add a node for each of those relationships
                     */
                    _.forEach(propDetails, function (item) {
                        obj.addNode(parentNode, item, prop.items.resourceCollection);
                    });
                } else if (parentNode) {
                    obj.addNode(parentNode, propDetails, prop.resourceCollection);
                }
            }
        });
    };

    /**
     * This function adds an intermediate node representing the property name
     * to an array of other intermediate nodes
     * @param siblings {array} - array of intermediate nodes
     * @param prop {object} - schema property object
     * @param sourceId {string} - id of the parenNode
     */
    obj.addIntermediateNode = function (siblings, prop, sourceId) {
        var propTitle,
            newSiblings = _.cloneDeep(siblings);

        if (prop) {
            propTitle = prop.title || prop.propName;
        } else {
            propTitle = "";
        }

        obj.titleNodeId = "SN" + obj.nodeCounter;
        newSiblings.push({
            id: obj.titleNodeId,
            sourceId: sourceId,
            name: propTitle,
            type: propTitle,
            intermediateNode: true,
            children: []
        });

        return newSiblings;
    };

    /**
     * This function adds a single node to the children array of the parentNode being passed in.
     * @param parentNode {object} - the parent node which will have this new node added to it's children
     * @param item {object} - an object representing the actual data to be displayed in the node
     * @param resourceCollection {array} - an array of resourceCollections associated with parent node's property schema
     */
    obj.addNode = function (parentNode, item, resourceCollection) {
        var resourcePathArray = item._ref.split("/"),
            nodeText,
            resource;

        //remove the id from the resourcePath
        resourcePathArray.pop();

        resource = _.find(resourceCollection, { path: resourcePathArray.join("/") });

        nodeText = obj.getNodeText(item, resource);

        if (nodeText && nodeText.length) {
            parentNode.children.push({
                id: "N" + obj.nodeCounter,
                sourceId: obj.titleNodeId,
                name: nodeText,
                resourceUrl: item._ref
            });

            obj.nodeCounter++;
        }
    };

    /**
    * This function builds the text to be used for the name property for a node
    * @param nodeData {object} - object representing node data
    * @param resource {object} - resource from a resourceCollection
    */
    obj.getNodeText = function (nodeData, resource) {
        var textArr = [],
            nodeText = "",
            fields = [];

        /*
            If resource is not defined look into the nodeData and extrapolate the fields to use from the keys available
        */
        if (!resource) {
            _.forEach(_.omit(nodeData, "_id", "_rev", "_ref", "_refProperties"), function (val, key) {
                if (typeof val === "string") {
                    fields.push(key);
                }
            });

            //if fields is still empty use _ref because that will always be there
            if (!fields.length) {
                fields.push("_ref");
            }
        } else {
            fields = resource.query.fields;
        }

        _.forEach(fields, function (field) {
            textArr.push(nodeData[field]);
        });

        if (textArr[0]) {
            nodeText = textArr.join(" / ");
        }

        return nodeText;
    };

    /**
     * This function is called on the click of a subNode. It takes in info from a parentNode,
     * does a read on the parentNode's data object then dynamically populates a sub tree
     * for all relationships related to that object.
     * @param parentNode {object} - node object
     */
    obj.populateSubNode = function (parentNode) {
        var resourceObjectName = parentNode.resourceUrl.split("/")[1],
            resourceSchema = _.find(obj.widget.data.schema.allSchemas, { name: resourceObjectName }).schema,
            relationshipProps = obj.widget.getRelationshipProps(resourceSchema.properties),
            fields = "?_fields=*";

        _.forEach(relationshipProps, function (prop) {
            fields += "," + prop.propName + "/*";
        });

        parentNode.resourceUrl += fields;

        parentNode.children = [{
            id: "dynamic-sub-node-" + obj.nodeCounter,
            sourceId: parentNode.id,
            name: "",
            type: "",
            intermediateNode: true,
            hideMe: true,
            children: []
        }];

        obj.nodeCounter++;

        return ResourceDelegate.getResource(parentNode.resourceUrl).then(function (response) {
            obj.buildNodeTree(parentNode.children[0], relationshipProps, response);
        });
    };

    /**
     * This function uses previously defined obj.chartData to build the tree view. All d3 code is wrapped
     * here in this function which includes many locally scoped helper functions.
     */
    obj.generateChartDisplay = function () {
        var chartElement = obj.widget.$el.find(".relationshipGraph")[0],
            duration = 750,
            svgWidth = obj.widget.$el.find(".relationshipGraph").width(),
            svgHeight = obj.widget.$el.find(".relationshipGraph").height(),
            svgCenter = [svgWidth / 2, svgHeight / 2],
            tree = d3.layout.tree().size([svgHeight, svgWidth]),

        //d3 diagonal projection for use by node paths
        setDiagonal = d3.svg.diagonal().projection(function (node) {
            return [node.y, node.x];
        }),

        // define the baseSvg
        baseSvg = d3.select(chartElement).append("svg").attr("width", svgWidth).attr("height", svgHeight).attr("class", "overlay"),

        // Append a group to baseSvg which contains all nodes for zoomListener to can act upon
        svgGroup = baseSvg.append("g"),

        // default zoom function called on scroll
        doDefaultZoom = function doDefaultZoom() {
            svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        },
            zoomListener = d3.behavior.zoom().scaleExtent([0.5, 2.5]).on("zoom", doDefaultZoom),

        // button zoom called on click of the + and - buttons
        doButtonZoom = function doButtonZoom() {
            d3.event.preventDefault();
            var extent = zoomListener.scaleExtent(),
                translate = zoomListener.translate(),
                scale = zoomListener.scale(),
                x = translate[0],
                y = translate[1],
                factor = this.id === 'zoom-in' ? 1.2 : 1 / 1.2,
                target_scale = scale * factor,
                clamped_target_scale;

            // already at an extent
            if (target_scale === extent[0] || target_scale === extent[1]) {
                return false;
            }
            // if the factor is too much, scale it down to reach the extent exactly
            clamped_target_scale = Math.max(extent[0], Math.min(extent[1], target_scale));
            if (clamped_target_scale !== target_scale) {
                target_scale = clamped_target_scale;
                factor = target_scale / scale;
            }

            // center each vector, stretch, then put back
            x = (x - svgCenter[0]) * factor + svgCenter[0];
            y = (y - svgCenter[1]) * factor + svgCenter[1];

            // transition to the new view over 200ms
            d3.transition().duration(200).tween("zoom", function () {
                var interpolate_scale = d3.interpolate(scale, target_scale),
                    interpolate_trans = d3.interpolate(translate, [x, y]);
                return function (t) {
                    zoomListener.scale(interpolate_scale(t)).translate(interpolate_trans(t));
                    svgGroup.attr("transform", "translate(" + zoomListener.translate() + ")scale(" + zoomListener.scale() + ")");
                };
            });
        },
            updateChart = _.noop,
            clickNode,
            focusNode,
            toggleChildren,
            addZoomButtons;

        /**
         * this function brings the node being expanded to the left and middle of the chart
         */
        focusNode = function focusNode(source) {
            var scale = zoomListener.scale(),
                x = -source.y0,
                y = -source.x0;

            x = x * scale + svgWidth / 7;
            y = y * scale + svgHeight / 2;
            d3.select('g').transition().duration(duration).attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
            zoomListener.scale(scale);
            zoomListener.translate([x, y]);
        };
        /**
         * this function toggles node children on and off
         */
        toggleChildren = function toggleChildren(node) {
            if (node.children) {
                if (!node.intermediateNode && node.sourceId) {
                    delete node.children;
                    delete node._children;
                } else {
                    node._children = node.children;
                    node.children = null;
                }
            } else if (node._children) {
                node.children = node._children;
                node._children = null;
            }
            return node;
        };
        /**
         * this function is called on the node click event and either calls toggleChildren or obj.populateSubNode
         */
        clickNode = function clickNode(node) {
            if (d3.event.defaultPrevented) {
                return; // click suppressed
            }

            if (node.children || node._children) {
                node = toggleChildren(node);
                updateChart(node);
            } else {
                obj.populateSubNode(node).then(function () {
                    updateChart(node);
                    focusNode(node);
                });
            }
        };

        updateChart = function updateChart(sourceNode) {
            var levelWidth = [1],

            //recursively set level widths for each node
            setLevelWidth = function setLevelWidth(level, node) {
                if (node.children && node.children.length > 0) {
                    if (levelWidth.length <= level + 1) {
                        levelWidth.push(0);
                    }

                    levelWidth[level + 1] += node.children.length;
                    _.forEach(node.children, function (d) {
                        setLevelWidth(level + 1, d);
                    });
                }
            },
                treeHeight,
                treeNodes,
                treeLinks,
                chartNode,
                nodeEnter,
                nodeUpdate,
                nodeExit,
                link;

            setLevelWidth(0, obj.chartData);
            treeHeight = d3.max(levelWidth) * 25; // 25 pixels per line
            tree = tree.size([treeHeight, svgWidth]);

            // create the new tree layout
            treeNodes = tree.nodes(obj.chartData).reverse();
            treeLinks = tree.links(treeNodes);

            //define "y" on all the treeNodes for spacing purposes
            _.forEach(treeNodes, function (node) {
                node.y = node.depth * 300;
            });

            // set all the nodes
            chartNode = svgGroup.selectAll("g.node").data(treeNodes, function (node) {
                return node.id;
            });

            // enter new nodes at the parent's previous position
            nodeEnter = chartNode.enter().append("g").attr("class", "node").attr("transform", function () {
                return "translate(" + sourceNode.y0 + "," + sourceNode.x0 + ")";
            }).on('click', clickNode);

            nodeEnter.append("circle").attr('class', 'nodeCircle').attr("r", 10).style("fill", function (d) {
                return d._children ? "lightsteelblue" : "#fff";
            }).style("display", function (d) {
                return d.hideMe ? "none" : "inline";
            });

            nodeEnter.append("text").attr("x", function (d) {
                return d.children || d._children ? -10 : 10;
            }).attr("dy", ".35em").attr('class', 'nodeText').attr("text-anchor", function (d) {
                return d.children || d._children ? "end" : "start";
            }).text(function (d) {
                return d.name;
            }).style("fill-opacity", 0);

            // update the text to reflect whether node has children or not.
            chartNode.select('text').attr("x", function (d) {
                return d.children || d._children ? -10 : 10;
            }).attr("text-anchor", function (d) {
                return d.children || d._children ? "end" : "start";
            }).text(function (d) {
                return d.name;
            });

            // change the circle fill depending on whether it has children and is collapsed
            chartNode.select("circle.nodeCircle").attr("r", 4.5).style("fill", function (d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

            // transition nodes to their new positions
            nodeUpdate = chartNode.transition().duration(duration).attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

            // fade in text
            nodeUpdate.select("text").style("fill-opacity", 1);

            // transition exiting nodes to the parent's new position
            nodeExit = chartNode.exit().transition().duration(duration).attr("transform", function () {
                return "translate(" + sourceNode.y + "," + sourceNode.x + ")";
            }).remove();

            nodeExit.select("circle").attr("r", 0);

            nodeExit.select("text").style("fill-opacity", 0);

            // update the links
            link = svgGroup.selectAll("path.link").data(treeLinks, function (node) {
                return node.target.id;
            });

            // enter any new links at the parent's previous position
            link.enter().insert("path", "g").attr("class", "link").attr("d", function () {
                var o = {
                    x: sourceNode.x0,
                    y: sourceNode.y0
                };
                return setDiagonal({
                    source: o,
                    target: o
                });
            });

            // transition links to their new positions
            link.transition().duration(duration).attr("d", setDiagonal);

            // transition exiting nodes to the parent's new position
            link.exit().transition().duration(duration).attr("d", function () {
                var o = {
                    x: sourceNode.x,
                    y: sourceNode.y
                };
                return setDiagonal({
                    source: o,
                    target: o
                });
            }).remove();

            // stash the old positions for use in transition
            _.forEach(treeNodes, function (node) {
                node.x0 = node.x;
                node.y0 = node.y;
            });
        };

        addZoomButtons = function addZoomButtons() {
            baseSvg.selectAll(".button").data(['zoom_in', 'zoom_out']).enter().append("rect").attr("y", function (d, i) {
                return 5 + 35 * i;
            }).attr({ x: 4, width: 30, height: 30, "class": "zoom-button" }).attr("id", function (d) {
                return d;
            }).attr('rx', 5).attr('ry', 5);

            baseSvg.append("text").attr("x", 11).attr({ y: 26, "class": "zoom-button-label" }).attr("id", "zoom-in").text("+").on('click', doButtonZoom);

            baseSvg.append("text").attr("x", 14).attr({ y: 62, "class": "zoom-button-label" }).attr("id", "zoom-out").text("-").on('click', doButtonZoom);
        };

        //add the zoomListener to baseSvg and remove the dblclick.zoom function
        baseSvg.call(zoomListener).on("dblclick.zoom", null);

        addZoomButtons();

        // sort the tree by node name
        tree.sort(function (a, b) {
            return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
        });

        //set x0 and y0 for the mainNode
        obj.chartData.x0 = svgHeight / 2;
        obj.chartData.y0 = 0;

        // layout the tree initially and focus on the root node
        updateChart(obj.chartData);
        focusNode(obj.chartData);
    };

    return obj;
});
