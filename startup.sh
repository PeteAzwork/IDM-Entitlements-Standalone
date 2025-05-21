#!/bin/sh
#
# Copyright 2013-2023 ForgeRock AS. All Rights Reserved
#
# Use of this code requires a commercial software license with ForgeRock AS.
# or with one of its affiliates. All use shall be exclusively subject
# to such license between the licensee and ForgeRock AS.
#

abspath() {
    if [ -d "$1" ]; then
        # dir
        (cd "$1" >/dev/null; pwd)
    elif [ -f "$1" ]; then
        # file
        if [ "$1" = */* ]; then
            echo "$(cd "${1%/*}" >/dev/null; pwd)/${1##*/}"
        else
            echo "$(pwd)/$1"
        fi
    else
        (>&2 echo "Warning: '$1' is not a valid directory. Defaulting to $2.")
        echo "$2"
    fi
}

if which java &>/dev/null; then
    JAVA=java
elif [ -n "$JAVA_HOME" ] && [ -x "$JAVA_HOME/bin/java" ];  then
    JAVA="$JAVA_HOME/bin/java"
else
    echo JAVA_HOME not available, Java is needed to run IDM
    echo Please install Java and set JAVA_HOME accordingly
    exit 1
fi

# clean up left over pid files if necessary
cleanupPidFile() {
  if [ -f "$OPENIDM_PID_FILE" ]; then
    rm -f "$OPENIDM_PID_FILE"
  fi
  trap - EXIT
  exit
}

# resolve links - $0 may be a softlink
PRG="$0"

while [ -h "$PRG" ]; do
  ls=`ls -ld "$PRG"`
  link=`expr "$ls" : '.*-> \(.*\)$'`
  if expr "$link" : '/.*' > /dev/null; then
    PRG="$link"
  else
    PRG=`dirname "$PRG"`/"$link"
  fi
done

echo "Executing "$PRG"..."

# Get standard environment variables
PRGDIR=`dirname "$PRG"`

# Only set OPENIDM_HOME if not already set
[ -z "$OPENIDM_HOME" ] && OPENIDM_HOME=`(cd "$PRGDIR" >/dev/null; pwd)`

# Only set OPENIDM_PID_FILE if not already set
[ -z "$OPENIDM_PID_FILE" ] && OPENIDM_PID_FILE="$OPENIDM_HOME"/.openidm.pid

# Only set OPENIDM_OPTS if not already set
[ -z "$OPENIDM_OPTS" ] && OPENIDM_OPTS="-Xmx2048m -Xms2048m"

# Set JDK Logger config file if it is present and an override has not been issued
PROJECT_HOME=$OPENIDM_HOME
CLOPTS=""
JPDA=""
while [ "$1" ]; do
    if [ "$1" = "jpda" ]; then
        JPDA=$1
    else
        if [ "$1" = "-p" -o "$1" = "--project-location" ] && [ "$2" ]; then
            PROJECT_HOME=$(abspath "$2" "$OPENIDM_HOME")
            shift
        else
            CLOPTS="$CLOPTS $1"
        fi
    fi
    shift
done
if [ -z "$LOGGING_CONFIG" ]; then
  if [ -n "$PROJECT_HOME" -a -r "$PROJECT_HOME"/conf/logging.properties ]; then
    LOGGING_CONFIG="-Djava.util.logging.config.file=$PROJECT_HOME/conf/logging.properties"
  elif [ -r "$OPENIDM_HOME"/conf/logging.properties ]; then
    LOGGING_CONFIG="-Djava.util.logging.config.file=$OPENIDM_HOME/conf/logging.properties"
  else
    LOGGING_CONFIG="-Dnop"
  fi
fi

if [ "$JPDA" = "jpda" ] ; then
  if [ -z "$JPDA_TRANSPORT" ]; then
    JPDA_TRANSPORT="dt_socket"
  fi
  if [ -z "$JPDA_ADDRESS" ]; then
    JPDA_ADDRESS="5005"
  fi
  if [ -z "$JPDA_SUSPEND" ]; then
    JPDA_SUSPEND="n"
  fi
  if [ -z "$JPDA_OPTS" ]; then
    JPDA_OPTS="-Djava.compiler=NONE -Xnoagent -Xdebug -Xrunjdwp:transport=$JPDA_TRANSPORT,address=$JPDA_ADDRESS,server=y,suspend=$JPDA_SUSPEND"
  fi
  OPENIDM_OPTS="$OPENIDM_OPTS $JPDA_OPTS"
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

BC_PATHS="$BC_FIPS:$BC_PKIX:$BC_TLS"
SLF4J_PATHS="$SLF4J_API:$SLF4J_JDK14"
JACKSON_PATHS="$JACKSON_CORE:$JACKSON_DATABIND:$JACKSON_ANNOTATIONS"
OPENIDM_SYSTEM_PATH="$BUNDLE_PATH/openidm-system-7.5.0.jar"
OPENIDM_UTIL_PATH="$BUNDLE_PATH/openidm-util-7.5.0.jar"

# Optional IDM_CLASSPATH provides additional classpath rules
CLASSPATH="$OPENIDM_HOME/bin/*:$OPENIDM_HOME/framework/*:$SLF4J_PATHS:$JACKSON_PATHS:$BC_PATHS:$OPENIDM_SYSTEM_PATH:$OPENIDM_UTIL_PATH:${IDM_CLASSPATH}"

# Enable OpenIDM to run on Java 9 and up
JAVA_OPTS="-XX:+IgnoreUnrecognizedVMOptions --add-opens=java.base/jdk.internal.loader=ALL-UNNAMED --add-opens java.base/java.lang=ALL-UNNAMED --add-opens java.base/java.util=ALL-UNNAMED $JAVA_OPTS"

echo "Using OPENIDM_HOME:   $OPENIDM_HOME"
echo "Using PROJECT_HOME:   $PROJECT_HOME"
echo "Using OPENIDM_OPTS:   $OPENIDM_OPTS"
echo "Using LOGGING_CONFIG: $LOGGING_CONFIG"

# Keep track of this pid
echo $$ > "$OPENIDM_PID_FILE"

# Make the script location the current directory
cd "$PRGDIR"

# start in normal mode
exec $JAVA "$LOGGING_CONFIG" $JAVA_OPTS $OPENIDM_OPTS \
	-Djava.endorsed.dirs="$JAVA_ENDORSED_DIRS" \
	-classpath "$CLASSPATH" \
	-Dopenidm.system.server.root="$OPENIDM_HOME" \
	-Djava.awt.headless=true \
	-Djava.security.properties="${PROJECT_HOME}/conf/java.security" \
  -Dorg.bouncycastle.fips.approved_only=true \
  -Dorg.bouncycastle.jca.enable_jks=true \
	org.forgerock.openidm.launcher.Main -c "$OPENIDM_HOME"/bin/launcher.json $CLOPTS \
	-p "$PROJECT_HOME"
