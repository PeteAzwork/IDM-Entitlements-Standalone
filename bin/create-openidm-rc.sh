#!/bin/sh

PRGDIR=$(dirname $0)

cd $PRGDIR/..

OPENIDM_HOME=$(pwd)
OPENIDM_USER=$(id -un)

if which java > /dev/null 2>&1; then
    JAVA_BIN=java
elif [ -n "$JAVA_HOME" ] && [ -x "$JAVA_HOME/bin/java" ];  then
    JAVA_BIN="$JAVA_HOME/bin/java"
else
    echo "\`java\` command not found." >&2
    echo >&2
    echo "Please install a supported JRE and try again." >&2
    exit 1
fi

JAVA_BIN_PATH=$(dirname $JAVA_BIN)

SYSTEMD_EXAMPLE=$(cat << EOF
    $0 --systemd | sudo tee /etc/systemd/system/openidm.service
    systemctl enable openidm
    systemctl start openidm
EOF
)

USAGE=$(cat << EOF
Usage: $0 --[systemd|chkconfig|lsb]
Outputs OpenIDM init file to stdout for the given system

    --systemd    Generate Systemd init script. This is preferred for all modern distros.
    --chkconfig  Generate SysV init script with chkconfig headers (RedHat/CentOS)
    --lsb        Generate SysV init script with LSB headers (Debian/Ubuntu)

Example:
$SYSTEMD_EXAMPLE
EOF
)

print_usage_and_exit() {
    echo "$USAGE" >&2
    exit 1
}

if [ $# != 1 ]; then
    print_usage_and_exit
fi

LSB_HEADERS=$(cat << EOF
### BEGIN INIT INFO
# Provides:          openidm
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: ForgeRock OpenIDM
### END INIT INFO
EOF
)

CHKCONFIG_HEADERS=$(cat << EOF
# chkconfig: 345 95 5
# description: start/stop openidm
EOF
)

output_sysv_init() {
    echo "#!/bin/sh"
    echo
    echo "$1"
    echo
    cat << EOF
# clean up left over pid files if necessary
cleanupPidFile() {
  if [ -f \$OPENIDM_PID_FILE ]; then
    rm -f "\$OPENIDM_PID_FILE"
  fi
  trap - EXIT
  exit
}

JAVA_BIN_PATH="${JAVA_BIN_PATH}"
OPENIDM_HOME="${OPENIDM_HOME}"
OPENIDM_USER="${OPENIDM_USER}"
OPENIDM_PID_FILE="\${OPENIDM_HOME}/.openidm.pid"
OPENIDM_OPTS="${OPENIDM_OPTS}"

# Only set OPENIDM_OPTS if not already set
[ -z "\$OPENIDM_OPTS" ] && OPENIDM_OPTS="\-Xmx2048m -Xms2048m -Dfile.encoding=UTF-8"

cd \${OPENIDM_HOME}

# Set JDK Logger config file if it is present and an override has not been issued
if [ -z "\$LOGGING_CONFIG" ]; then
  if [ -r "\$OPENIDM_HOME"/conf/logging.properties ]; then
    LOGGING_CONFIG="-Djava.util.logging.config.file=\$OPENIDM_HOME/conf/logging.properties"
  else
    LOGGING_CONFIG="-Dnop"
  fi
fi

CLASSPATH="\$OPENIDM_HOME"/bin/*

START_CMD="PATH=\$JAVA_BIN_PATH:\$PATH;nohup \$OPENIDM_HOME/startup.sh >\$OPENIDM_HOME/logs/server.out 2>&1 &"

case "\${1}" in
start)
    su \$OPENIDM_USER -c "\$START_CMD"
      exit \${?}
  ;;
stop)
    ./shutdown.sh > /dev/null
    exit \${?}
  ;;
restart)
    ./shutdown.sh > /dev/null
    su \$OPENIDM_USER -c "\$START_CMD"
      exit \${?}
  ;;
*)
  echo "Usage: \$0 { start | stop | restart }"
  exit 1
  ;;
esac
EOF
}

case $1 in
    --systemd)
        cat << EOF
[Unit]
Description=ForgeRock OpenIDM
After=network.target auditd.target

[Service]
Type=simple
SuccessExitStatus=143
Environment=JAVA_HOME=$JAVA_HOME
User=${OPENIDM_USER}
ExecStart=${OPENIDM_HOME}/startup.sh
ExecStop=${OPENIDM_HOME}/shutdown.sh

[Install]
WantedBy=multi-user.target
EOF
        echo >&2
        echo >&2
        echo >&2
        echo "You can either copy the above output to /etc/systemd/system/openidm.service" >&2
        echo "or redirect stdout there. The service can then" >&2
        echo "be enabled and started via systemctl:" >&2
        echo >&2
        echo "$SYSTEMD_EXAMPLE" >&2
        ;;
    --chkconfig)
        output_sysv_init "$CHKCONFIG_HEADERS"
        echo >&2
        echo >&2
        echo >&2
        echo "You can either copy the above output to /etc/init.d/openidm" >&2
        echo "or redirect stdout there. The service can then" >&2
        echo "be enabled and started via chkconfig:" >&2
        echo "    chkconfig --add openidm" >&2
        echo >&2
        echo "To remove the service, run the following command:" >&2
        echo "    chkconfig --del openidm" >&2
        ;;
    --lsb)
        output_sysv_init "$LSB_HEADERS"
        echo >&2
        echo >&2
        echo >&2
        echo "You can either copy the above output to /etc/init.d/openidm" >&2
        echo "or redirect stdout there. The service can then" >&2
        echo "be enabled and started via update-rc.d:" >&2
        echo "    update-rc.d openidm defaults && invoke-rc.d openidm start" >&2
        echo >&2
        echo "To remove the service, run the following command:" >&2
        echo "    invoke-rc.d openidm stop && update-rc.d openidm remove" >&2
        ;;
    *)
        echo "Unrecognized parameter '$1'" >&2
        echo >&2
        print_usage_and_exit
        ;;
esac
