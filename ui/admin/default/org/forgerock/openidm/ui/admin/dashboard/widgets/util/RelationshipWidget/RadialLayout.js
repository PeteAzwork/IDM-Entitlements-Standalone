"use strict";

/*
 * Copyright 2017-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "underscore", "d3"], function ($, _, d3) {
    var obj = {};

    /*
     Example data set:
     var nodeSet = [
     {id: "N1", name: "Smith, John", fixed: true, x: 10, y: 0, type: "Main", hlink: ""},
     {id: "N2", name: "Product 2", type: "Type", hlink: ""},
     {id: "N3", name: "Cee, Washing D", type: "Type", hlink: ""},
     {id: "N4", name: "Product 4", type: "Type", hlink: ""},
     ];
       var linkSet = [
     {sourceId: "N1", linkName: "Relationship 1", targetId: "N2"},
     {sourceId: "N3", linkName: "Relationship 2", targetId: "N1"},
     {sourceId: "N4", linkName: "Relationship 3", targetId: "N1"}
     ];
     */
    obj.setupChart = function (widget, details) {
        var focalNodeID = "mainNode",
            displayTextArray = [],
            nodeSet,
            linkSet = [],
            nodeCounter = 0,
            titleNodeId,
            getNodeData = function getNodeData(item, itemType, itemObject, resourceCollection) {
            var nameTextArr = [],
                refreshSettings = {
                searchFields: []
            },
                returnText = "";

            _.forEach(resourceCollection, function (rc) {
                var pathArr = rc.path.split("/"),
                    resourceType = pathArr[0],
                    resourceObject = pathArr[1];

                if (resourceType === itemType && resourceObject === itemObject) {
                    /*
                     * refreshSettings are for the click event on the circle which refreshes the
                     * relationship chart view with the perspective of the object being clicked
                     */
                    refreshSettings.baseObject = resourceObject;
                    refreshSettings.searchFields = rc.query.fields;
                    /*
                     * from the list of fields defined in the query.fields array for this resource collection
                     * build the nameTextArr to be used for the name property of this node
                     */
                    _.forEach(rc.query.fields, function (field) {
                        nameTextArr.push(item[field]);
                    });
                }
            });

            if (nameTextArr[0]) {
                returnText = nameTextArr.join(" / ");
            }

            return {
                refreshSettings: refreshSettings,
                text: returnText
            };
        },

        /*
         * addNode adds a node on the first level of relationship data for the item being passed in
         *
         * if displaySubRelationships is enabled it loops over all of the relationship properties of
         * whatever object the item comes from (i.e. managed/user or managed/role) and adds a subnode for
         * each of the values from that relationship
         */
        addNode = function addNode(prop, item, resourceCollection) {
            var tempRef = item._ref.split("/"),
                itemType = tempRef[0],
                itemObject = tempRef[1],
                itemId = tempRef[2],
                resourceCollections,
                secondarySourceId,
                nodeData = getNodeData(item, itemType, itemObject, resourceCollection);

            if (nodeData.text && nodeData.text.length) {
                nodeSet.push({
                    id: "N" + nodeCounter,
                    sourceId: titleNodeId,
                    name: nodeData.text,
                    type: prop.title || prop.propName,
                    hlink: "#resource/" + itemType + "/" + itemObject + "/edit/" + itemId,
                    resourceUrl: item._ref,
                    refreshSettings: nodeData.refreshSettings
                });

                secondarySourceId = "N" + nodeCounter;

                nodeCounter++;

                if (prop.items) {
                    resourceCollections = prop.items.resourceCollection;
                } else {
                    resourceCollections = prop.resourceCollection;
                }
                _.forEach(resourceCollections, function (resourceCollection) {
                    var schema = _.filter(widget.data.schema.allSchemas, { name: resourceCollection.path.split("/")[1] }),
                        relProps = [];

                    if (schema[0]) {
                        relProps = widget.getRelationshipProps(schema[0].schema.properties);
                    }

                    _.forEach(relProps, function (relProp) {
                        var addSubNode = function addSubNode(item) {
                            var subItemRef = item._ref.split("/"),
                                subItemType = subItemRef[0],
                                subItemObject = subItemRef[1],
                                subResourceCollections,
                                subNodeData;

                            if (relProp.items) {
                                subResourceCollections = relProp.items.resourceCollection;
                            } else {
                                subResourceCollections = relProp.resourceCollection;
                            }

                            subNodeData = getNodeData(item, subItemType, subItemObject, subResourceCollections);

                            nodeSet.push({
                                id: "SN" + nodeCounter,
                                sourceId: secondarySourceId,
                                name: subNodeData.text,
                                type: (prop.title || prop.propName) + "-" + (relProp.title || relProp.propName),
                                hlink: "#",
                                resourceUrl: item._ref,
                                refreshSettings: subNodeData.refreshSettings
                            });

                            nodeCounter++;
                        };

                        if (item[relProp.propName]) {
                            if (_.isArray(item[relProp.propName])) {
                                _.forEach(item[relProp.propName], function (subSubItem) {
                                    addSubNode(subSubItem);
                                });
                            } else {
                                addSubNode(item[relProp.propName]);
                            }
                        }
                    });
                });
            }
        };

        _.forEach(widget.data.searchFields, function (field) {
            if (details[field]) {
                displayTextArray.push(details[field]);
            }
        });

        /*
         * create the nodeSet with the origin being the mainNode
         */
        nodeSet = [{
            id: "mainNode",
            name: displayTextArray.join(" / "),
            x: 10,
            y: 0,
            fixed: true,
            type: widget.data.schema.title,
            hlink: "#resource/managed/" + widget.data.baseObject + "/edit/" + details._id
        }];

        widget.$el.find(".relationshipGraph").empty();
        /*
         * loop over all the relationship props and add nodes for all the property values
         * or in the case of arrays of relationships all the array item property values
         */
        _.forEach(widget.data.relationshipProps, function (prop) {
            if (details[prop.propName]) {
                if (details[prop.propName].length || prop.type === "relationship" && !_.isEmpty(details[prop.propName])) {
                    /*
                     * if the none of the values in the array of relationships come from managed/whatever then do not add a titleNode
                     */
                    if (!(prop.type === "array" && _.reject(details[prop.propName], function (item) {
                        return item._ref.indexOf("internal") === 0;
                    }).length === 0)) {
                        titleNodeId = "SN" + nodeCounter;
                        nodeSet.push({
                            id: titleNodeId,
                            sourceId: "mainNode",
                            name: prop.title || prop.propName,
                            type: prop.title || prop.propName,
                            intermediateNode: true
                        });
                    }
                }

                if (prop.type === "array") {
                    /*
                     * loop over all the the relationships in this property's data set
                     * then add a node for each of those relationships
                     */
                    _.forEach(details[prop.propName], function (item) {
                        addNode(prop, item, prop.items.resourceCollection);
                    });
                } else {
                    addNode(prop, details[prop.propName], prop.resourceCollection);
                }
            }
        });

        /*
         * loop over all the nodes that are not the mainNode and create a link for each
         */
        _.forEach(nodeSet, function (item) {
            linkSet.push({
                sourceId: item.sourceId || "mainNode",
                linkName: "", //item.type, thought this cluttered up the display
                secondaryNode: item.sourceId ? true : false,
                targetId: item.id,
                linkType: item.type
            });
        });

        //Multi layer example keep for future development
        /*
        nodeSet.push({
            id: "N20",
            name: "Create Agile Board",
            type: "Assignment",
            hlink: ""
        });
         nodeSet.push({
            id: "N21",
            name: "Order Issues",
            type: "Assignment",
            hlink: ""
        });
         nodeSet.push({
            id: "N22",
            name: "John Smith",
            type: "User",
            hlink: ""
        });
         nodeSet.push({
            id: "N23",
            name: "Steve Steveson",
            type: "User",
            hlink: ""
        });
         nodeSet.push({
            id: "N24",
            name: "Hank Hankerson",
            type: "User",
            hlink: ""
        });
         nodeSet.push({
            id: "N25",
            name: "Bilbo Baggins",
            type: "User",
            hlink: ""
        });
        */

        obj.widget = widget;

        obj.updateRoundChart(focalNodeID, nodeSet, linkSet, obj.widget.$el.find(".relationshipGraph")[0], "colorScale20c");
    };

    obj.typeMouseOver = function () {
        var thisObject = d3.select(this),
            typeValue = thisObject.attr("type_value"),
            strippedTypeValue = typeValue.replace(/ /g, "_"),
            selectedBullet = d3.selectAll(".legendBullet-" + strippedTypeValue),
            nodeSize = 12,
            //Pixel size of circles
        bulletSize = 8,
            //Pixel size for bullets in legend
        highlightColor = "#519387",
            font = "bold 12px Arial",
            legendTextSelector,
            selectedLegendText,
            nodeTextSelector,
            selectedNodeText,
            nodeCircleSelector,
            selectedCircle,
            focalNodeCircleSelector,
            selectedFocalNodeCircle,
            focalNodeType,
            focalNodeTextSelector,
            selectedFocalNodeText,
            focalNodeTextType;

        selectedBullet.style("fill", highlightColor);
        selectedBullet.attr("r", bulletSize);

        legendTextSelector = ".legendText-" + strippedTypeValue;
        selectedLegendText = d3.selectAll(legendTextSelector);
        selectedLegendText.style("font", font);
        selectedLegendText.style("fill", highlightColor);

        nodeTextSelector = ".nodeText-" + strippedTypeValue;
        selectedNodeText = d3.selectAll(nodeTextSelector);
        selectedNodeText.style("font", font);
        selectedNodeText.style("fill", highlightColor);

        nodeCircleSelector = ".nodeCircle-" + strippedTypeValue;
        selectedCircle = d3.selectAll(nodeCircleSelector);
        selectedCircle.style("fill", highlightColor);
        selectedCircle.style("stroke", highlightColor);
        selectedCircle.attr("r", nodeSize);

        focalNodeCircleSelector = ".focalNodeCircle";
        selectedFocalNodeCircle = d3.selectAll(focalNodeCircleSelector);

        focalNodeType = selectedFocalNodeCircle.attr("type_value");

        if (typeValue === focalNodeType) {
            selectedFocalNodeCircle.style("stroke", highlightColor);
            selectedFocalNodeCircle.style("fill", "White");
        }

        focalNodeTextSelector = ".focalNodeText";
        selectedFocalNodeText = d3.selectAll(focalNodeTextSelector);
        focalNodeTextType = selectedFocalNodeText.attr("type_value");

        if (typeValue === focalNodeTextType) {
            selectedFocalNodeText.style("fill", highlightColor);
            selectedFocalNodeText.style("font", font);
        }
    };
    /*
     * this function runs when checkboxes in the legend are clicked
     * to turn on and off different sets of relationships
     */
    obj.dataTypeToggle = function () {
        var thisObject = d3.select(this).select("input"),
            type_value = thisObject.attr("type_value"),
            checked = $(thisObject[0]).prop('checked'),
            nodes = $('.node[type_value|="' + type_value + '"]'),
            //circles
        links = $('.linkType-' + type_value.replace(/ /g, "_")),
            //lines connected to main node
        sublinks = $("[class|='linkType-" + type_value.replace(/ /g, "_") + "']"); //lines connected to sub nodes

        if (checked) {
            nodes.show();
            links.show();
            sublinks.show();
        } else {
            nodes.hide();
            links.hide();
            sublinks.hide();
        }
    };

    obj.typeMouseOut = function () {
        var thisObject = d3.select(this),
            typeValue = thisObject.attr("type_value"),
            colorValue = thisObject.attr("color_value"),
            strippedTypeValue = typeValue.replace(/ /g, "_"),
            selectedBullet = d3.selectAll(".legendBullet-" + strippedTypeValue),
            nodeSize = 12,
            //Pixel size of circles
        font = "normal 12px Arial",
            legendTextSelector,
            selectedLegendText,
            nodeTextSelector,
            selectedNodeText,
            nodeCircleSelector,
            selectedCircle,
            focalNodeCircleSelector,
            selectedFocalNodeCircle,
            focalNodeType,
            focalNodeTextSelector,
            selectedFocalNodeText;

        selectedBullet.style("fill", colorValue);
        selectedBullet.attr("r", 6);

        legendTextSelector = ".legendText-" + strippedTypeValue;
        selectedLegendText = d3.selectAll(legendTextSelector);
        selectedLegendText.style("font", font);
        selectedLegendText.style("fill", "");

        nodeTextSelector = ".nodeText-" + strippedTypeValue;
        selectedNodeText = d3.selectAll(nodeTextSelector);
        selectedNodeText.style("font", font);
        selectedNodeText.style("fill", "");

        nodeCircleSelector = ".nodeCircle-" + strippedTypeValue;
        selectedCircle = d3.selectAll(nodeCircleSelector);
        selectedCircle.style("fill", "White");
        selectedCircle.style("stroke", colorValue);
        selectedCircle.attr("r", nodeSize);

        focalNodeCircleSelector = ".focalNodeCircle";
        selectedFocalNodeCircle = d3.selectAll(focalNodeCircleSelector);
        focalNodeType = selectedFocalNodeCircle.attr("type_value");

        if (typeValue === focalNodeType) {
            selectedFocalNodeCircle.style("stroke", colorValue);
            selectedFocalNodeCircle.style("fill", "White");
        }

        focalNodeTextSelector = ".focalNodeText";
        selectedFocalNodeText = d3.selectAll(focalNodeTextSelector);
        selectedFocalNodeText.style("fill", "");
        selectedFocalNodeText.style("font", font);
    };

    obj.nodeMouseOver = function () {
        var thisObject = d3.select(this),
            typeValue = thisObject.attr("type_value"),
            strippedTypeValue = typeValue.replace(/ /g, "_"),
            focalNode = "mainNode",
            selectedBullet,
            legendTextSelector,
            selectedLegendText,
            highlightColor = "#519387",
            font = "bold 12px Arial",
            largeNodeSize = 65,
            smallNodeSize = 15;

        //Increase circle size for better highlight visability
        d3.select(this).select("circle").transition().duration(250).attr("r", function (d) {
            if (d.id === focalNode) {
                return largeNodeSize;
            } else {
                return smallNodeSize;
            }
        });

        d3.select(this).select("text").transition().style("font", font);

        selectedBullet = d3.selectAll(".legendBullet-" + strippedTypeValue);
        selectedBullet.style("fill", highlightColor);

        //Increase the bullet node size on highlight
        selectedBullet.attr("r", 1.2 * 6);

        legendTextSelector = ".legendText-" + strippedTypeValue;

        selectedLegendText = d3.selectAll(legendTextSelector);
        selectedLegendText.style("font", font);
        selectedLegendText.style("fill", highlightColor);
    };

    obj.nodeMouseOut = function () {
        var thisObject = d3.select(this),
            typeValue = thisObject.attr("type_value"),
            colorValue = thisObject.attr("color_value"),
            strippedTypeValue = typeValue.replace(/ /g, "_"),
            focalNode = "mainNode",
            nodeSize = 12,
            //Pixel size of circles
        centerNodeSize = 45,
            //Pixel size of circles
        selectedBullet,
            font = "normal 12px Arial",
            legendTextSelector,
            selectedLegendText;

        d3.select(this).select("circle").transition().duration(250).attr("r", function (d) {
            if (d.id === focalNode) {
                return centerNodeSize;
            } else {
                return nodeSize;
            }
        });

        d3.select(this).select("text").transition().duration(250).style("font", font).attr("fill", "Black");

        selectedBullet = d3.selectAll(".legendBullet-" + strippedTypeValue);
        selectedBullet.style("fill", colorValue);
        selectedBullet.attr("r", 6);

        legendTextSelector = ".legendText-" + strippedTypeValue;

        selectedLegendText = d3.selectAll(legendTextSelector);
        selectedLegendText.style("font", font);
        selectedLegendText.style("fill", "Black");
    };

    obj.updateRoundChart = function (focalNode, nodeSet, linkSet, chartElement) {
        var colorScale = d3.scale.category20c(),
            width = 1024,
            height = 600,
            centerNodeSize = 30,
            //Pixel size of circles
        nodeSize = 8,
            //Pixel size of circles
        color_hash = [],
            sortedKeys,
            svgCanvas,
            node_hash,
            force,
            link,
            node,
            linkText,
            mainNodeType;

        //Create a hash that maps colors to types
        nodeSet.forEach(function (d) {
            if (d.id === "mainNode") {
                mainNodeType = d.type;
            }
            color_hash[d.type] = "";
        });

        sortedKeys = _.keys(color_hash).sort();

        sortedKeys.forEach(function (d, i) {
            color_hash[d] = colorScale(i);
        });

        nodeSet.forEach(function (d) {
            d.color = color_hash[d.type];
        });

        //Create a canvas
        svgCanvas = d3.select(chartElement).append("svg:svg").attr("width", width).attr("height", height).append("svg:g").attr("class", "focalNodeCanvas").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        node_hash = [];

        //Create a hash that allows access to each node by its id
        nodeSet.forEach(function (d) {
            node_hash[d.id] = d;
        });

        //Append the source object node and the target object node to each link records...
        linkSet.forEach(function (d) {
            d.source = node_hash[d.sourceId];
            d.target = node_hash[d.targetId];

            if (d.sourceId === focalNode) {
                d.direction = "OUT";
            } else {
                d.direction = "IN";
            }
        });

        //Create a force layout and bind nodes and links
        force = d3.layout.force().nodes(nodeSet).links(linkSet).charge(-1000).gravity(0.01).friction(0.2).linkStrength(9).linkDistance(function (d) {
            if (!d.secondaryNode) {
                if (width < height) {
                    return (25 + width) * 0.25;
                } else {
                    return (25 + height) * 0.25;
                }
            } else {
                return 100;
            }
        }).on("tick", function () {
            link.attr("x1", function (d) {
                return d.source.x;
            }).attr("y1", function (d) {
                return d.source.y;
            }).attr("x2", function (d) {
                return d.target.x;
            }).attr("y2", function (d) {
                return d.target.y;
            });

            node.attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });

            linkText.attr("x", function (d) {
                if (d.target.x > d.source.x) {
                    return d.source.x + (d.target.x - d.source.x) / 2;
                } else {
                    return d.target.x + (d.source.x - d.target.x) / 2;
                }
            }).attr("y", function (d) {
                if (d.target.y > d.source.y) {
                    return d.source.y + (d.target.y - d.source.y) / 2;
                } else {
                    return d.target.y + (d.source.y - d.target.y) / 2;
                }
            });
        }).start();

        //Draw lines for links between nodes
        link = svgCanvas.selectAll(".gLink").data(force.links()).enter().append("g").attr("class", "gLink").append("line").style("stroke", "#ccc").attr("x1", function (d) {
            return d.source.x;
        }).attr("y1", function (d) {
            return d.source.y;
        }).attr("x2", function (d) {
            return d.target.x;
        }).attr("y2", function (d) {
            return d.target.y;
        }).attr("class", function (d) {
            return "linkType-" + d.linkType.replace(/ /g, "_") + " link";
        });

        //Create nodes
        node = svgCanvas.selectAll(".node").data(force.nodes()).enter().append("g").attr("class", "node").attr("type_value", function (d) {
            return d.type;
        }).attr("color_value", function (d) {
            return color_hash[d.type];
        }).on("mouseover", obj.nodeMouseOver).on("mouseout", obj.nodeMouseOut).call(force.drag);

        //Append circles to nodes
        node.append("circle").attr("r", function (d) {
            if (d.id === focalNode) {
                return centerNodeSize;
            } else {
                return nodeSize;
            }
        }).style("fill", "White") //Make the nodes hollow looking
        .attr("type_value", function (d) {
            return d.type;
        }).attr("color_value", function (d) {
            return color_hash[d.type];
        }).attr("class", function (d) {
            var str = d.type,
                strippedString = str.replace(/ /g, "_");

            if (d.id === focalNode) {
                return "focalNodeCircle";
            } else {
                return "nodeCircle-" + strippedString;
            }
        }).style("stroke-width", 5) //Give the node strokes some thickness
        .style("stroke", function (d) {
            return color_hash[d.type];
        }).call(force.drag).on("dblclick", function (d) {
            if (d.id !== "mainNode" && !d.intermediateNode) {
                obj.widget.data.baseObject = d.refreshSettings.baseObject;
                obj.widget.data.searchFields = d.refreshSettings.searchFields;
                obj.widget.data.resourceUrl = d.resourceUrl;
                obj.widget.widgetRender({});
            }
            return false;
        });

        //Append text to nodes
        node.append("text").attr("x", function (d) {
            if (d.id === focalNode) {
                return 0;
            } else {
                return 20;
            }
        }).attr("y", function (d) {
            if (d.id === focalNode) {
                return 0;
            } else {
                return -10;
            }
        }).attr("text-anchor", function (d) {
            if (d.id === focalNode) {
                return "middle";
            } else {
                return "start";
            }
        }).attr("font-family", "Arial, Helvetica, sans-serif").style("font", "normal 12px Arial").attr("fill", "Black").style("fill", function (d) {
            return color_hash[d];
        }).attr("type_value", function (d) {
            return d.type;
        }).attr("color_value", function (d) {
            return color_hash[d.type];
        }).attr("class", function (d) {
            var str = d.type,
                strippedString = str.replace(/ /g, "_");

            if (d.id === focalNode) {
                return "focalNodeText";
            } else {
                return "nodeText-" + strippedString;
            }
        }).attr("dy", ".35em").text(function (d) {
            return d.name;
        }).on("dblclick", function (d) {
            if (!d.intermediateNode) {
                location.hash = d.hlink;
            }
        });

        //Append text to link edges
        linkText = svgCanvas.selectAll(".gLink").data(force.links()).append("text").attr("font-family", "Arial, Helvetica, sans-serif").attr("x", function (d) {
            if (d.target.x > d.source.x) {
                return d.source.x + (d.target.x - d.source.x) / 2;
            } else {
                return d.target.x + (d.source.x - d.target.x) / 2;
            }
        }).attr("y", function (d) {
            if (d.target.y > d.source.y) {
                return d.source.y + (d.target.y - d.source.y) / 2;
            } else {
                return d.target.y + (d.source.y - d.target.y) / 2;
            }
        }).attr("fill", "Black").style("font", "normal 12px Arial").attr("dy", ".35em").text(function (d) {
            return d.linkName;
        });

        //Print legend title
        svgCanvas.append("text").attr("class", "region").text("Data Types:").attr("x", -1 * (width / 2 - 10)).attr("y", -height / 7 * 3).style("fill", "Black").style("font", "bold 12px Arial").attr("text-anchor", "start");

        //add checkboxes for each data type
        svgCanvas.selectAll("input.legend_checkbox").data(sortedKeys).enter().append("foreignObject").attr("x", -1 * (width / 2 - 1)).attr("y", function (d, i) {
            return i * 20 - height / 7 * 3 + 8;
        }).attr("width", 15).attr("height", 20).html(function (d) {
            var str = d,
                strippedString = str.replace(/ /g, "_"),
                id = "legendCheckbox-" + strippedString,
                type_value = d,
                parent_type = "";

            if (type_value.split("-").length > 1) {
                parent_type = type_value.split("-")[0];
            }

            if (d === mainNodeType) {
                return "";
            }

            return "<input type='checkbox' class='legendCheckbox' id='" + id + "' type_value='" + type_value + "' parent_type='" + parent_type + "' checked/>";
        }).on("click", obj.dataTypeToggle);

        //Plot the bullet circle
        svgCanvas.selectAll("focalNodeCanvas").data(sortedKeys).enter().append("svg:circle") // Append circle elements
        .attr("cx", -1 * (width / 2 - 25)).attr("cy", function (d, i) {
            return i * 20 - height / 7 * 3 + 20;
        }).attr("stroke-width", ".5").style("fill", function (d) {
            return color_hash[d];
        }).attr("r", 6).attr("color_value", function (d) {
            return color_hash[d];
        }).attr("type_value", function (d) {
            return d;
        }).attr("index_value", function (d, i) {
            return "index-" + i;
        }).attr("class", function (d) {
            var str = d,
                strippedString = str.replace(/ /g, "_");

            return "legendBullet-" + strippedString;
        }).on('mouseover', obj.typeMouseOver).on("mouseout", obj.typeMouseOut);

        //Create legend text that acts as label keys
        svgCanvas.selectAll("a.legend_link").data(sortedKeys).enter().append("svg:a").append("text").attr("text-anchor", "center").attr("x", -1 * (width / 2 - 40)).attr("y", function (d, i) {
            return i * 20 - height / 7 * 3 + 20;
        }).attr("dx", 0).attr("dy", "4px") //Controls padding to place text in alignment with bullets
        .text(function (d) {
            return d;
        }).attr("color_value", function (d) {
            return color_hash[d];
        }).attr("type_value", function (d) {
            return d;
        }).attr("index_value", function (d, i) {
            return "index-" + i;
        }).attr("class", function (d) {
            var str = d,
                strippedString = str.replace(/ /g, "_");

            return "legendText-" + strippedString;
        }).style("fill", "Black").style("font", "normal 12px Arial").on('mouseover', obj.typeMouseOver).on("mouseout", obj.typeMouseOut);
    };

    return obj;
});
