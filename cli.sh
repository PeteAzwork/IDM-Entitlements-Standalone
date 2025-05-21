#!/bin/sh
#
# Copyright 2013-2018 ForgeRock AS. All Rights Reserved
#
# Use of this code requires a commercial software license with ForgeRock AS.
# or with one of its affiliates. All use shall be exclusively subject
# to such license between the licensee and ForgeRock AS.
#

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

echo "Executing $PRG..."

# Get standard environment variables
PRGDIR=`dirname "$PRG"`

OPENIDM_HOME=${OPENIDM_HOME:-`(cd "$PRGDIR"; pwd)`}
echo "Starting shell in $OPENIDM_HOME"

if [ -z "$LOGGING_CONFIG" ]; then
  if [ -n "$PROJECT_HOME" -a -r "$PROJECT_HOME"/conf/logging.properties ]; then
    LOGGING_CONFIG="-Djava.util.logging.config.file=$PROJECT_HOME/conf/logging.properties"
  elif [ -r "$OPENIDM_HOME"/conf/logging.properties ]; then
    LOGGING_CONFIG="-Djava.util.logging.config.file=$OPENIDM_HOME/conf/logging.properties"
  else
    LOGGING_CONFIG="-Dnop"
  fi
fi

java "$LOGGING_CONFIG" $JAVA_OPTS -classpath "$OPENIDM_HOME/bin/*:$OPENIDM_HOME/bundle/*" \
     -Didm.envconfig.dirs="$OPENIDM_HOME/resolver/" \
     -Dopenidm.system.server.root="$OPENIDM_HOME" \
     org.forgerock.openidm.shell.impl.Main "$@"
