"use strict";

/*
 * Copyright 2017-2022 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

define(["jquery", "lodash"], function ($, _) {
    var obj = {};
    obj.relationshipPropertyTemplate = {
        "description": "",
        "title": "",
        "viewable": true,
        "searchable": false,
        "userEditable": false,
        "returnByDefault": false,
        "type": "relationship",
        "reverseRelationship": false,
        "reversePropertyName": "",
        "validate": true,
        "notifySelf": false,
        "properties": {
            "_ref": {
                "type": "string"
            },
            "_refProperties": {
                "type": "object",
                "properties": {
                    "_id": {
                        "type": "string"
                    }
                }
            }
        },
        "resourceCollection": []
    };

    obj.resourceTemplate = {
        "path": "",
        "label": "",
        "notify": false,
        "query": {
            "queryFilter": "true",
            "fields": [],
            "sortKeys": []
        }
    };

    obj.relationshipBaseProperties = ["type", "reverseRelationship", "reversePropertyName", "validate", "properties", "resourceCollection"];

    obj.otherProperties = ["description", "nullable", "title", "viewable", "searchable", "userEditable", "policies", "returnByDefault", "minLength", "pattern", "notifySelf"];

    /**
     * A managed object schema property that is of type "relationship" or is of type
     * "array" with items of type "relationship"
     * @typedef {Object} RelationshipProperty
     */

    /**
     * helper function for converting relationship type (has one/has many)
     * @param {RelationshipProperty} relationshipProperty
     * @returns {Object} key value pairs of the base properties for a RelationshipProperty
     * (e.g. {type: relationship, resourceCollection: [] ... } )
     */
    obj.getBaseValues = _.partialRight(_.pick, obj.relationshipBaseProperties);

    /**
     * generate a blank relationship property
     * @param {Object} props -- base relationship values that should be added
     * to the resulting property
     * @return {RelationshipProperty}
     */
    obj.blankProperty = function (props) {
        var property = _.cloneDeep(obj.relationshipPropertyTemplate);
        if (props) {
            return _.transform(props, function (result, value, key) {
                if (_.includes(obj.relationshipBaseProperties, key)) {
                    result = obj.setRelationshipValue(property, key, value);
                }
                return result;
            }, property);
        }
    };

    /**
     * An item inside a RelationshipProperty's resource collection
     * @typedef {Object} ResourceItem
     * @property {String} path
     * @property {Boolean} notify
     * @property {String} label
     * @property {Object} query
     * @property {String} [query.queryFilter="true"]
     * @property {Array} query.fields
     * @property {Array} query.sortKeys
     */

    /**
     * generate a blank resourceCollection item
     * @return {ResourceItem}
     */
    obj.blankResource = function () {
        return _.cloneDeep(obj.resourceTemplate);
    };

    /**
     * return a copy of the first object in collection that has
     * a property "name" with given value
     * @param  {String} objectName
     * @param  {Object} managedConfig
     * @return {(ManagedObject|undefined)}
     */
    obj.getObjectByName = function (objectName, managedConfig) {
        return _.cloneDeep(_.find(managedConfig.objects, { "name": objectName }));
    };

    /**
     * return true if ObjectProperty has element "type" with value "relationship"j
     * @param  {ObjectProperty}  objectProperty -- schema property from a managed object
     * @return {Boolean}
     */
    obj.hasRelationshipType = function (objectProperty) {
        var type = objectProperty.type;

        if (_.isString(type)) {
            return type === "relationship";
        } else if (_.isArray(type)) {
            return _.includes(type, "relationship");
        } else {
            return false;
        }
    };

    /**
     * Return true if property has element "items/type" with value "relationship"
     * @param  {ObjectProperty}  objectProperty
     * @return {Boolean}
     */
    obj.hasRelationshipItemsType = function (objectProperty) {
        return _.matchesProperty("items.type", "relationship")(objectProperty);
    };

    /**
     * Return true if ObjectProperty has "type: relationship" or "items/type: relationship".
     * @param  {schemaProperty}  schemaProperty
     * @return {Boolean}
     */
    obj.isRelationship = function (schemaProperty) {
        return obj.hasRelationshipType(schemaProperty) || obj.hasRelationshipItemsType(schemaProperty);
    };

    /**
     * @typedef {Object} Relationship
     * @property {RelationshipItem[]}
     * @property {RelationshipItem[]}
     */

    /**
     * Returns true if the there is a member of the relationship with the
     * specified object and property names
     * @param  {String}  objectName
     * @param  {String}  propertyName
     * @param  {Relationship}  relationship
     * @return {Boolean}
     */
    obj.isInRelationship = function (objectName, propertyName, relationship) {
        return _.includes(relationship[propertyName], _.find(relationship[propertyName], { objectName: objectName, propertyName: propertyName }));
    };

    /**
     * Helper method for grabbing a relationship property value no matter if it's
     * an array type relationship or a single
     * @param  {String} propertyName
     * @param  {RelationshipProperty} relationshipProperty
     * @return {Value|Undefined}
     */
    obj.getRelationshipValue = function (relationshipProperty, propertyName) {
        // It is possible for this to be undefined in the case where a prop was deleted on one side and not updated on the other
        // This check will make sure the UI doesn't fail in the case of that odd/bad configuration
        if (_.isUndefined(relationshipProperty) || _.isNull(relationshipProperty)) {
            return undefined;
        } else if (obj.hasRelationshipItemsType(relationshipProperty)) {
            return _.get(relationshipProperty, "items." + propertyName);
        } else if (obj.hasRelationshipType(relationshipProperty)) {
            return _.get(relationshipProperty, propertyName);
        } else {
            return undefined;
        }
    };

    /**
     * Helper method for setting a relationship base property regargless of whether
     * the property is type relationship or type array/items.type relationship
     * @param {RelationshipProperty} relationshipProperty
     * @param {String} propertyName
     * @param {Value} propertyValue -- value that you want to set
     * @returns {RelationshipProperty}
     */
    obj.setRelationshipValue = function (relationshipProperty, propertyName, propertyValue) {
        // Similar to above this catch is needed to handle odd configuration in the schema
        if (_.isUndefined(relationshipProperty) || _.isNull(relationshipProperty)) {
            return undefined;
        } else if (obj.hasRelationshipItemsType(relationshipProperty)) {
            return _.set(relationshipProperty, "items." + propertyName, propertyValue);
        } else if (obj.hasRelationshipType(relationshipProperty)) {
            return _.set(relationshipProperty, "" + propertyName, propertyValue);
        } else {
            return relationshipProperty;
        }
    };

    /**
     * Return the value of reverseRelationship on the property
     * @param  {RelationshipProperty} relationshipProperty
     * @return {Boolean}
     */
    obj.isReverseRelationship = function (relationshipProperty) {
        return obj.getRelationshipValue(relationshipProperty, "reverseRelationship");
    };

    /**
     * Returns a copy of relationship property with it's sideType changed from
     * many to one. Will throw a TypeError for non relationship properties
     * @param  {RelationshipProperty} relationshipProperty
     * @return {RelationshipProperty}
     */
    obj.toHasOne = function (relationshipProperty) {
        if (obj.hasRelationshipItemsType(relationshipProperty)) {
            return _(_.cloneDeep(relationshipProperty)).omit(["items", "type"]).merge(obj.getBaseValues(relationshipProperty.items)).value();
        } else {
            return _.cloneDeep(relationshipProperty);
        }
    };

    /**
     * Returns a copy of relationship property with it's sideType changed from
     * one to many. Will throw a TypeError for non relationship properties
     * @param  {RelationshipProperty} relationshipProperty
     * @return {RelationshipProperty}
     */
    obj.toHasMany = function (relationshipProperty) {
        if (obj.hasRelationshipType(relationshipProperty)) {
            return _(_.cloneDeep(relationshipProperty)).omit(obj.relationshipBaseProperties).set("type", "array").set("items", obj.getBaseValues(relationshipProperty)).value();
        } else {
            return _.cloneDeep(relationshipProperty);
        }
    };

    /**
     * Change side type of relationship to specified type
     * @param  {String} type
     * @param  {RelationshipPropery} relationshipProperty
     * @return {RelationshipProperty}
     */
    obj.toSideType = function (relationshipProperty, type) {
        if (type === "one") {
            return obj.toHasOne(relationshipProperty);
        } else if (type === "many") {
            return obj.toHasMany(relationshipProperty);
        } else {
            return relationshipProperty;
        }
    };

    /**
     * determine whether property exist on passed relationship and add item to that
     * list of items, or create a new list and add the item
     * @param {Relationship} relationship
     * @param {String} propertyName
     * @param {RelationshipItem} item
     * @return {Relationship}
     */
    obj.addItemToRelationship = function (relationship, propertyName, item) {
        if (_.has(relationship, propertyName) && _.isArray(relationship[propertyName])) {
            return _.set(relationship, propertyName, _.get(relationship, propertyName).concat(item));
        } else {
            return _.set(relationship, propertyName, [item]);
        }
    };
    /**
     * Walk through the resources of an object and grab all the corresponding
     * properties
     * @param  {Object} managedConfig list of all available objects
     * @param  {ObjectName} objectName the name of starting object
     * @param  {PropertyName} propertyName the property we're starting with
     * @return {Relationship}
     */
    obj.populate = function (managedConfig, objectName, propertyName) {
        var relationship = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

        var object = obj.getObjectByName(objectName, managedConfig),
            properties = object && _.has(object, "schema") ? object.schema.properties : {},
            relationshipProp = properties[propertyName] || obj.blankProperty();

        if (!obj.isReverseRelationship(relationshipProp)) {
            return obj.addItemToRelationship(relationship, propertyName, { objectName: objectName, propertyName: propertyName, property: relationshipProp, object: object });
        } else {
            var reversePropertyName = obj.getRelationshipValue(relationshipProp, "reversePropertyName");

            // add the current object/property to the relationship
            if (!obj.isInRelationship(objectName, propertyName, relationship)) {
                relationship = obj.addItemToRelationship(relationship, propertyName, {
                    objectName: objectName,
                    propertyName: propertyName,
                    property: relationshipProp,
                    object: object
                });
            }

            // check through the resource collection and add the thingy to the relationship
            return obj.getRelationshipValue(relationshipProp, "resourceCollection").reduce(function (relationship, resource) {
                // get the name portion of the resource path (e.g. "managed/user")
                var resourceName = obj.pathToName(resource.path);
                // if it's not already in there, add it
                if (!obj.isInRelationship(resourceName, reversePropertyName, relationship)) {
                    return obj.populate(managedConfig, resourceName, reversePropertyName, relationship);
                } else {
                    // if it's already in the list, just return the relationship
                    return relationship;
                }
            }, relationship);
        }
    };

    /**
     * Helper method for converting a resource path to the name of the resource
     * @param  {String} path
     * @return {String}
     */
    obj.pathToName = function (path) {
        return _.last(path.split("/"));
    };

    /**
     * Determine the type of a relationship (has many)
     * @param  {RelationshipProperty} relationshipProperty
     * @return {String}
     */
    obj.propertyToType = function (relationshipProperty) {
        return obj.hasRelationshipItemsType(relationshipProperty) ? "many" : "one";
    };

    /**
     * Apply propertyToType to each item in a passed list, and return "one" if all
     * results are "one" or return "many" if any results are "many"
     * @param  {RelationshipItem[]} items
     * @return {String}
     */
    obj.relationshipItemsToType = function (items) {
        var result = _.uniq(items.map(function (item) {
            return obj.propertyToType(item.property);
        }));
        if (_.includes(result, "many")) {
            return "many";
        } else {
            return "one";
        }
    };

    /**
     * Determine the side types of the relationship. Will check current property (head of Relationship list)
     * for "reverseRelationship" to determine whether the reverse side is type "none"
     * @param  {Relationship} relationship -- list of relationship items
     * @return {Array} -- first element of array will be current side type (i.e. "one", "many")
     * and the second element will be the reverse side type (i.e. "one", "many", "none")
     */
    obj.getRelationshipType = function (relationship, propertyName) {
        var currentType = obj.relationshipItemsToType(relationship[propertyName]),
            keys = _.keys(relationship);
        if (keys.length === 1) {
            return [currentType, "none"];
        } else {
            return [currentType, obj.relationshipItemsToType(relationship[_.last(keys)])];
        }
    };

    /**
     * grab the first property from an objects schema properties that could be used
     * as a display property
     * @param  {ManagedObject} managedObject
     * @return {String} name of the property to be used for display
     */
    obj.getDefaultDisplayProperty = function (managedObject) {
        var defaultProp;
        _.forEach(managedObject.schema.order, function (propName) {
            var prop = managedObject.schema.properties[propName];
            if (prop.type === "string" && prop.scope !== "private" && prop.viewable && !prop.encryption && !prop.isVirtual) {
                defaultProp = propName;
                return false;
            }
        });

        return defaultProp;
    };

    /**
     * apply function to all RelationshipItems in either side of the relationship
     * @param  {Relationship} relationship
     * @param  {Function} fn
     * @return {Relationship}
     */
    obj.mapAllItems = function (relationship, fn) {
        return _.transform(relationship, function (result, items, key) {
            return _.set(result, key, items.map(fn));
        }, {});
    };

    /**
     * determine whether the given schemaProperty is a relationship and is compatible with the current property
     * @param {String} propertyName
     * @param {SchemaProperty}
     * @return {Boolean}
     */
    obj.isReverseCompatible = function (propertyName, schemaProperty) {
        var isRelationship = obj.isRelationship,
            isReverseRelationship = obj.isReverseRelationship,
            hasReversePropertyName = function hasReversePropertyName(relProp) {
            return obj.getRelationshipValue(relProp, "reversePropertyName") === propertyName;
        };

        return isRelationship(schemaProperty) && isReverseRelationship(schemaProperty) && hasReversePropertyName(schemaProperty);
    };

    /*
     * Add an item as the head of the specified side of a relationship, and add the resource for the item to
     * each member of the other side of the relationship
     * @param {Relationship} relationship
     * @param {String} side -- the name of the side we'll add to
     * @param {RelationshipItem} relationshipItem -- the item to be added
     * @param {Resource} resource -- the resource that will be added to the reverse side's resource collection
     * @return {Relationship}
     */
    obj.addItemToSide = function (relationship, side, relationshipItem, resource) {
        var sideItem = _.first(relationship[side]),
            baseProperties = obj.relationshipBaseProperties,
            reverseSideName = obj.getRelationshipValue(sideItem.property, "reversePropertyName");

        relationshipItem.property = baseProperties.reduce(function (property, prop) {
            var propVal = obj.getRelationshipValue(sideItem.property, prop);

            property = obj.setRelationshipValue(property, prop, propVal);
            return property;
        }, relationshipItem.property);

        relationshipItem.property = obj.toSideType(relationshipItem.property, obj.propertyToType(sideItem.property));

        relationship[reverseSideName] = relationship[reverseSideName].map(function (relItem) {
            var resourceCollection = obj.getRelationshipValue(relItem.property, "resourceCollection");

            resourceCollection.push(resource);
            relItem.property = obj.setRelationshipValue(relItem.property, "resourceCollection", resourceCollection);
            return relItem;
        });

        relationship[side] = [relationshipItem].concat(relationship[side]);

        return relationship;
    };

    /**
     * list of relationships that a resource property belongs to where one side has the current property's name
     * @typedef {Pair} CompatibleRelationship
     * @property {First} Name -- The name of the property
     * @property {Second} Relationship -- the fully populated relationship for the property
     */

    /**
     * generate a list of relationships with a side that matches the current property
     * @param {ManagedConfig} managedConfig
     * @param {String} resourceName
     * @param {String} propertyName
     * @return {Array<CompatibleRelationship>}
    */
    obj.getCompatibleRelationships = function (managedConfig, resourceName, propertyName) {
        var resourceObject = obj.getObjectByName(resourceName, managedConfig),

        // create a reverse compatibility filter paritially applied with the specified propertyName
        isReverseCompatible = _.partial(obj.isReverseCompatible, propertyName),

        // use filter to grab the schema properties off the specified object
        compatibleProps = _.pick(resourceObject.schema.properties, isReverseCompatible),

        // transform the resulting object into a list of [ propName, relationship ] pairs
        compatibleRelationships = _.transform(compatibleProps, function (result, prop, propName) {
            var relationship = obj.populate(managedConfig, resourceName, propName);

            return result.push([propName, relationship]);
        }, []);

        return compatibleRelationships;
    };

    return obj;
});
