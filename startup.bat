@echo off
SETLOCAL

:: Set the OpenIDM Environment Variables
call %~dp0\bin\idmenv.bat %*
if %ERRORLEVEL% == 0 goto noError
echo Failed to configure OpenIDM environment, aborting
goto end

:noError
echo "Using OPENIDM_HOME:   %OPENIDM_HOME%"
echo "Using PROJECT_HOME:   %PROJECT_HOME%"
echo "Using OPENIDM_OPTS:   %OPENIDM_OPTS%"
echo "Using LOGGING_CONFIG: %LOGGING_CONFIG%"

:: Ensure that any user defined CLASSPATH variables are not used on startup,
:: but allow them to be specified here, in rare case when it is needed.
set CLASSPATH=%IDM_CLASSPATH%

:: Set the options to be passed to the JVM
set JAVA_OPTS=%JAVA_OPTS% %LOGGING_CONFIG%

:: Set the Command Window title
if not "%OS%" == "Windows_NT" goto noTitle
if "%TITLE%" == "" set TITLE=OpenIDM
set _EXECJAVA=start "%TITLE%" %_RUNJAVA%
goto gotTitle
:noTitle
set _EXECJAVA=start %_RUNJAVA%
:gotTitle

::Set the OpenIDM Main class to be executed
set MAINCLASS=org.forgerock.openidm.launcher.Main

:: Execute Java with the applicable properties
pushd %OPENIDM_HOME%

if not "%JPDA%" == "" goto doJpda
call %_EXECJAVA% %JAVA_OPTS% %OPENIDM_OPTS% ^
 -Djava.endorsed.dirs="%JAVA_ENDORSED_DIRS%" ^
 -classpath "%CLASSPATH%" ^
 -Djava.security.properties="%PROJECT_HOME%/conf/java.security" ^
 -Dopenidm.system.server.root="%OPENIDM_HOME%" %MAINCLASS% %CMD_LINE_ARGS%
goto end

:doJpda
call %_EXECJAVA% %JAVA_OPTS% %OPENIDM_OPTS% %JPDA_OPTS% ^
 -Djava.endorsed.dirs="%JAVA_ENDORSED_DIRS%" ^
 -classpath "%CLASSPATH%" ^
 -Djava.security.properties="%PROJECT_HOME%/conf/java.security" ^
 -Dopenidm.system.server.root="%OPENIDM_HOME%" %MAINCLASS% %CMD_LINE_ARGS%
popd

:end
ENDLOCAL
exit /b 1
