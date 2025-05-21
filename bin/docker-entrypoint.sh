#!/bin/sh
#
# Copyright 2019-2023 ForgeRock AS. All Rights Reserved
#

PROJECT_HOME="${PROJECT_HOME:-/opt/openidm}"

LOGGING_PROPERTIES="${LOGGING_PROPERTIES:-/opt/openidm/conf/logging.properties}"

JAVA_OPTS="${JAVA_OPTS:- -XX:MaxRAMPercentage=65 -XX:InitialRAMPercentage=65 -XX:MaxTenuringThreshold=1 -Djava.security.egd=file:/dev/urandom -XshowSettings:vm -XX:+PrintFlagsFinal}"

OPENIDM_HOME=/opt/openidm

# In IDM 6.0+, property files are picked up using commons config.
export IDM_ENVCONFIG_DIRS="${IDM_ENVCONFIG_DIRS:-/opt/openidm/resolver/}"

if [ "$1" = 'openidm' ]; then

    HOSTNAME=`hostname`
    NODE_ID=${HOSTNAME}

    # If secrets keystore is present copy files from the secrets directory to the standard location.
    if [ -r secrets/keystore.jceks ]; then
        echo "Copying Keystores"
	    cp -L secrets/*  security
    fi

    # Bundle directory
    BUNDLE_PATH="$OPENIDM_HOME/bundle"

    # Find any file in the bundle directory based on a wildcard
    find_bundle_file () {
        echo "$(find "${BUNDLE_PATH}" -name $1)"
    }

    SLF4J_API=$(find_bundle_file "slf4j-api-[0-9]*.jar")
    SLF4J_JDK14=$(find_bundle_file "slf4j-jdk14-[0-9]*.jar")
    JACKSON_CORE=$(find_bundle_file "jackson-core-[0-9]*.jar")
    JACKSON_DATABIND=$(find_bundle_file "jackson-databind-[0-9]*.jar")
    JACKSON_ANNOTATIONS=$(find_bundle_file "jackson-annotations-[0-9]*.jar")
    BC_FIPS=$(find_bundle_file "bc-fips-[0-9]*.jar")
    BC_PKIX=$(find_bundle_file "bcpkix-fips-[0-9]*.jar")
    BC_TLS=$(find_bundle_file "bctls-fips-[0-9]*.jar")

    SLF4J_PATHS="$SLF4J_API:$SLF4J_JDK14"
    JACKSON_PATHS="$JACKSON_CORE:$JACKSON_DATABIND:$JACKSON_ANNOTATIONS"
    BC_PATHS="$BC_FIPS:$BC_PKIX:$BC_TLS"
    OPENIDM_SYSTEM_PATH=$(echo $BUNDLE_PATH/openidm-system-*.jar)
    OPENIDM_UTIL_PATH=$(echo $BUNDLE_PATH/openidm-util-*.jar)

    # Optional IDM_CLASSPATH provides additional classpath rules
    CLASSPATH="$OPENIDM_HOME/bin/*:$OPENIDM_HOME/framework/*:$SLF4J_PATHS:$JACKSON_PATHS:$BC_PATHS:$OPENIDM_SYSTEM_PATH:$OPENIDM_UTIL_PATH:${IDM_CLASSPATH}"

    exec java ${JAVA_OPTS} \
        --add-opens java.base/java.lang=ALL-UNNAMED \
        --add-opens java.base/java.util=ALL-UNNAMED \
        -Djava.util.logging.config.file="${LOGGING_PROPERTIES}" \
        -Djava.endorsed.dirs="${JAVA_ENDORSED_DIRS}" \
        -classpath "${CLASSPATH}" \
        -Dopenidm.system.server.root=/opt/openidm \
        -Djava.awt.headless=true \
        -Dopenidm.node.id="${NODE_ID}" \
        -Djava.security.properties="${PROJECT_HOME}/conf/java.security" \
        -Dorg.bouncycastle.fips.approved_only=true \
        -Dorg.bouncycastle.jca.enable_jks=true \
        -XX:+ExitOnOutOfMemoryError \
        org.forgerock.openidm.launcher.Main -c /opt/openidm/bin/launcher.json \
        -p "${PROJECT_HOME}"
fi

# Else - exec the arguments passed to the entry point.
exec  "$@"