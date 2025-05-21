/*
 * Copyright 2015-2019 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

/**
 * Note: this script is no longer used by the IDM code-base. Temporal constraint enforcement on roles has been moved
 * into java as part of OPENIDM-14093. To engage the java-based functionality, add '"isTemporalConstraint" : true' to
 * the property in the role object which defines the temporal constraint value limiting role applicability.
 * Script maintained in IDM code-base for backwards-compatibility.
 *
 * If a role is sync'ed, this script will determine if users of this role needs to also
 * be sync'ed.  Users are always sync'ed, except if the only change is in the ignoreProperties.
 */
(function () {
    var _ = require('lib/lodash');

    /**
     * If shouldSyncUsers then this will call sync on all users of the role that got sync'ed
     * @param resourceName the role path.
     * @param oldValue old state of the role
     * @param newValue updated state of the role
     * @param ignoredProperties always sync except, if there's a change and the only change is the ignoreProperties,
     * then no sync is needed.
     */
    exports.syncUsersOfRoles =
        function (resourceName, oldValue, newValue, ignoredProperties) {
            logger.debug("onSync-roles script invoked for {}", resourceName.toString());
            var members;
            if (shouldSyncUsers(oldValue, newValue, ignoredProperties)) {
                members = openidm.query(resourceName.toString() + '/members',
                        {"_queryFilter": "true"}).result;
                _.each(members, function (user) {
                    logger.debug("onSync-roles will call triggerSyncCheck for {}", user._ref);
                    // Issue triggerSyncCheck action and set fields to "*" to indicate all default fields plus any
                    // virtual fields on the managed user, which will pick up changes to "effectiveAssignments" and
                    // "effectiveRoles". Also add the roles field, so that user roles are calculated, so that
                    // sync checks takes the roles field into consideration.
                    openidm.action(user._ref, "triggerSyncCheck", {}, {}, ["*", "roles"]);
                });
            } else {
                logger.debug("onSync-roles will NOT call triggerSyncCheck the users", resourceName.toString());
            }
        };

    /**
     * Returns true if the oldValue and newValue fully match, or if the only changes are in fields other than any of the
     * ignoredProperties. The rationale for this logic is as follows: if the roles are different, then the relationship
     * logic will sync the role members. If they are equal, or differ only in the ignored fields, then the sync won't
     * be propagated to the users, and thus must be triggered manually in this script.
     * @param oldValue old state of the resource
     * @param newValue updated state of the resource
     * @param ignoredProperties if only change is one of the ignoreProperties, then no sync is needed.
     * @returns {boolean} true if the oldValue and newValue fully match, or if the only changes are in fields other than
     * any of the ignoredProperties.
     */
    function shouldSyncUsers(oldValue, newValue, ignoredProperties) {
        var oldCopy, newCopy;

        // If they already match then we should sync.
        if (_.isEqual(oldValue, newValue)) {
            return true;
        }

        oldCopy = _.omit(oldValue == null ? {} : oldValue, ignoredProperties);
        newCopy = _.omit(newValue == null ? {} : newValue, ignoredProperties);

        // If we don't match, after removing ignored fields, then should sync as it means changes were on other fields.
        return !_.isEqual(oldCopy, newCopy);
    }
}());
