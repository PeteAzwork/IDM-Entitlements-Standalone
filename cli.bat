@echo off
SETLOCAL
rem Copyright 2012-2021 ForgeRock AS. All Rights Reserved
::
:: Use of this code requires a commercial software license with ForgeRock AS.
:: or with one of its affiliates. All use shall be exclusively subject
:: to such license between the licensee and ForgeRock AS.
::

:: Clear errorlevel
set ERRORLEVEL=

:: Set the OpenIDM Environment Variables
call %~dp0\bin\idmenv.bat %*
if %ERRORLEVEL% == 0 goto noError
echo Failed to configure OpenIDM environment, aborting
ENDLOCAL
exit /b 1

:noError

:: Clear errorlevel
set ERRORLEVEL=

::Set the OpenIDM Main class to be executed
set MAINCLASS=org.forgerock.openidm.shell.impl.Main

:: Execute Java with the applicable properties
pushd %OPENIDM_HOME%

java %LOGGING_CONFIG% -classpath "%OPENIDM_HOME%\bin\*;%OPENIDM_HOME%\bundle\*" -Didm.envconfig.dirs="%OPENIDM_HOME%/resolver/" %MAINCLASS% %*
popd

ENDLOCAL
exit /b %ERRORLEVEL%
