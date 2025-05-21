/*
 * Copyright 2014-2017 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/*
 * This script simply returns the mapped attribute value in the target object.
 *
 * The following variables are supplied:
 *   targetObject, sourceObject, existingTargetObject, attributeName, attributeValue
 */

//Return the result object
var result = {
    "value" : targetObject[attributeName]
};

result;
