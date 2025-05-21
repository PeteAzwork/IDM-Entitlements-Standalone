@echo off
setlocal
:: Copyright 2021-2023 ForgeRock AS. All Rights Reserved
::
:: Use of this code requires a commercial software license with ForgeRock AS.
:: or with one of its affiliates. All use shall be exclusively subject
:: to such license between the licensee and ForgeRock AS.
::

:: Script Working Directory
set SCRIPT_DIR=%~dp0

:: Determine whether we are installing or uninstalling the service
if "%1" == "/install" (
    shift
    set commandLabel=install
    goto commandOk
)
if "%1" == "/uninstall" (
    shift
    set commandLabel=uninstall
    goto commandOk
)
goto errUsage

:commandOk
:: Validate the Service name
set "SERVICE_NAME=%1"
if "%SERVICE_NAME%" == "" (
    echo Service name must be specified for command: "%commandLabel%"
    goto errUsage
)
shift

:: Extract any additional parameters
for /f "tokens=2,* delims= " %%a in ("%*") do set ENV_PARAMS=%%b

:: Set the OpenIDM Environment Variables
call %SCRIPT_DIR%\idmenv.bat %ENV_PARAMS%
if %ERRORLEVEL% == 1 goto error

:: Ensure that any user defined CLASSPATH variables are not used on startup,
:: but allow them to be specified here, in rare case when it is needed.
set "CLASSPATH=%IDM_CLASSPATH%"

:: LAUNCHER_START_PARAMS  will be fed to the prunmgr.exe which requires all semi-colon delimiters
:: Make sure to remove any spaces and replace with semi-colon
if "%CMD_LINE_ARGS%" == "" goto noCmdLineArgs
set "LAUNCHER_START_PARAMS=%CMD_LINE_ARGS: =;%"

:noCmdLineArgs
:: JAVA_OPTS_SERVICE will be fed to the prunmgr.exe which requires all semi-colon delimiters
:: Make sure to remove any spaces and replace with semi-colon
if "%OPENIDM_OPTS%" == "" goto noIdmOpts
set "OPENIDM_OPTS_SERVICE=%OPENIDM_OPTS%"

:: Concatenate all variables together and replace all whitespace with semi-colons later
:noIdmOpts
set "JAVA_OPTS_SERVICE=%JAVA_OPTS%%LOGGING_CONFIG%%OPENIDM_OPTS_SERVICE%"

:: Architecture, can be i386 or amd64 or ia64 (it is basically the directory name
:: where the binaries are stored, if not set this script will try to 
:: find the value automatically based on environment variables)
set ARCH=
:: find out the architecture
if "%ARCH%" == "" (
  set ARCH=i386
  if "%PROCESSOR_ARCHITECTURE%" == "AMD64" set ARCH=amd64
  if "%PROCESSOR_ARCHITECTURE%" == "IA64"  set ARCH=ia64
)

:: Enable debugging uncomment the line below
:: set "JAVA_OPTS_SERVICE=%JAVA_OPTS_SERVICE%;-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"

::Set the OpenIDM Main class to be executed
set MAIN_CLASS=org.forgerock.openidm.launcher.Main

goto %commandLabel%

:install
"%OPENIDM_HOME%\bin\%ARCH%\prunsrv.exe" //IS//%SERVICE_NAME% ^
 --Install="%OPENIDM_HOME%\bin\%ARCH%\prunsrv.exe" ^
 --Description="ForgeRock Identity Manager" ^
 --Jvm=%_JAVADLL% ^
 --Classpath="%CLASSPATH%" ^
 --JvmOptions="%JAVA_OPTS_SERVICE: =;%" ^
 --StartPath="%OPENIDM_HOME%" ^
 --StartMode=jvm ^
 --StartClass=%MAIN_CLASS% ^
 --StartMethod=start ^
 --StartParams="%LAUNCHER_START_PARAMS%" ^
 --ServiceUser=LocalSystem ^
 --StopMode=jvm ^
 --StopClass=%MAIN_CLASS% ^
 --StopMethod=stop ^
 --LogPath="%OPENIDM_HOME%\logs" ^
 --LogPrefix=launcher ^
 --StdOutput=auto ^
 --StdError=auto ^
 --LogLevel=INFO
if not %errorlevel% == 0 goto error
echo ForgeRock Identity Management Server successfully installed as "%SERVICE_NAME%" service
goto :EOF

:uninstall
"%OPENIDM_HOME%\bin\%ARCH%\prunsrv.exe" //DS//%SERVICE_NAME%
if not %errorlevel% == 0 goto error
echo Service "%SERVICE_NAME%" removed successfully
goto :EOF

:errUsage
:: -------------------------------------------------------------
echo.
echo Usage: service.bat ^<command^> ^<serviceName^>
echo command:
echo    /install ^<serviceName^> - Installs the service.
echo    /uninstall ^<serviceName^> - Uninstalls the service.
echo.
goto error

:error
endlocal
exit /b 1
