#!/bin/bash
#
# Copyright 2020 ForgeRock AS. All Rights Reserved
#
# Use of this code requires a commercial software license with ForgeRock AS.
# or with one of its affiliates. All use shall be exclusively subject
# to such license between the licensee and ForgeRock AS.
#

# change these IDM defaults accordingly
IDM_ADMIN_USER=openidm-admin
IDM_ADMIN_PASS=openidm-admin
IDM_ENDPOINT_ROOT="http://localhost:8080/openidm"

JQ=$(which jq)
if [[ -z ${JQ} ]]; then
    echo "This script requires the jq utility - it can be found for your platform at https://stedolan.github.io/jq/"
    exit
fi

CURL=$(which curl)
if [[ -z ${CURL} ]]; then
	echo "This script requires the curl utility - it can be found for your platform at https://curl.haxx.se/"
	exit
fi

queryFilter="firstResourceCollection+eq+\"internal/role\"+and+firstResourceId+eq+\"openidm-authorized\"+or+secondResourceCollection+eq+\"internal/role\"+and+secondResourceId+eq+\"openidm-authorized\""

total=0

while read _id; do
    ${CURL} -k -s -u "$IDM_ADMIN_USER":"$IDM_ADMIN_PASS" -X DELETE "${IDM_ENDPOINT_ROOT}/repo/relationships/$_id"
    echo
    ((total++))
done < <(${CURL} -k -s -u "$IDM_ADMIN_USER":"$IDM_ADMIN_PASS" -X GET ${IDM_ENDPOINT_ROOT}'/repo/relationships?_queryFilter='${queryFilter}'&_fields=_id' | jq -r '.result[]._id')

echo "$total openidm-authorized relationship records removed"
