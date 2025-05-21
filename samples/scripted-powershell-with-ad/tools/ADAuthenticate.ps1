#
# Copyright 2016-2018 ForgeRock AS. All Rights Reserved
#
# Use of this code requires a commercial software license with ForgeRock AS.
# or with one of its affiliates. All use shall be exclusively subject
# to such license between the licensee and ForgeRock AS.
#
#REQUIRES -Version 2.0

<#  
.SYNOPSIS  
    This is an Authenticate script for Active Directory

.DESCRIPTION
	The script uses the ADSI directoryentry cmdlet to authenticate the user/password

.INPUTS
	The connector injects a Hashmap into the Authenticate script context with the following items:
	("Connector" is the default name for <prefix>)
	- <prefix>.Configuration : handler to the connector's configuration object
	- <prefix>.Options: a handler to the Operation Options
	- <prefix>.Operation: an OperationType corresponding to the operation ("AUTHENTICATE" here)
	- <prefix>.ObjectClass: the Object class object (__ACCOUNT__ / __GROUP__ / other)
	- <prefix>.Username: Username String
	- <prefix>.Password: Password in GuardedString format
	
.OUTPUTS
	Must return the object's unique ID (__UID__).
	To do so, set the <prefix>.Result.Uid property either as a String or as an OpenICF Uid object.

.NOTES  
    File Name      : ADAuthenticate.ps1  
    Author         : Gael Allioux (gael.allioux@forgerock.com)
    Prerequisite   : PowerShell V2 and later
	Copyright      : 2016-2018 - ForgeRock AS

.LINK  
    OpenICF
    http://openicf.forgerock.org
	
	OpenICF Javadoc
	https://forgerock.org/openicf/doc/apidocs/
#>

# Preferences variables can be set here.
# See https://technet.microsoft.com/en-us/library/hh847796.aspx
$ErrorActionPreference = "Stop"
$VerbosePreference     = "Continue"

# The script code should always be enclosed within a try/catch block.
# If any exception is thrown, it is good practice to catch the original exception
# message and re-throw it within an OpenICF connector exception
try
{
	# Since one script can be used for multiple actions, it is safe to check the operation first.
	if ($Connector.Operation -eq "AUTHENTICATE")
	{
		Write-Verbose "This is the Authenticate Script"

		# PowerShell Splatting
		$param = @{"SearchBase" = $Connector.Configuration.PropertyBag.baseContext}

		# Most of the time only users needs authenticate
		if ($Connector.ObjectClass.Type -eq "__ACCOUNT__")
		{
			$param.Filter = "(|(samAccountName=$($Connector.Username))(cn=$($Connector.Username)))"
			# First get the user.
			$res = Get-FRAduser $param

			if ($res -ne $null -and $res.samAccountName -ne $null)
			{
				$DomainDN = $(([adsisearcher]"").Searchroot.path)
				$password = [Org.IdentityConnectors.Common.Security.SecurityUtil]::Decrypt($Connector.Password)
				if ((new-object directoryservices.directoryentry $DomainDN,$res.samAccountName, $password).psbase.name -ne $null)
				{
					Write-Verbose "$($Connector.Username) has been authenticated as $($res.DistinguishedName)"
					$Connector.Result.Uid = $res.ObjectGUID.ToString()
				}
				else
				{
					throw New-Object Org.IdentityConnectors.Framework.Common.Exceptions.InvalidCredentialException("Invalid Credentials")
				}
			}
			else
			{
				throw New-Object Org.IdentityConnectors.Framework.Common.Exceptions.InvalidCredentialException("User not found")
			}
		}
		else
		{
			$error = "$($Connector.Operation) operation on type: $($Connector.ObjectClass.Type) is not supported"
			Write-Verbose $error
			throw New-Object System.NotSupportedException($error)
		}
	}
	else
	{
		$error = "Authenticate Script can not handle operation: $($Connector.Operation)"
		Write-Verbose $error
		throw New-Object Org.IdentityConnectors.Framework.Common.Exceptions.ConnectorException($error)
	}
}
catch #Re-throw the original exception message within a connector exception
{
	# Before re-throwing, clean up may be done (close file, connections etc...).

	# See https://forgerock.org/openicf/doc/apidocs/org/identityconnectors/framework/common/exceptions/package-frame.html
	# for the list of OpenICF exceptions
	Write-Verbose $_.Exception.Message
	#throw New-Object Org.IdentityConnectors.Framework.Common.Exceptions.ConnectorException($_.Exception.Message)

	# InvalidCredential is probably more appropiate
	throw New-Object org.identityconnectors.framework.common.exceptions.InvalidCredentialException($_.Exception.Message)
}