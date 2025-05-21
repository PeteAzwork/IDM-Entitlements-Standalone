#
# Copyright 2016-2020 ForgeRock AS. All Rights Reserved
#
# Use of this code requires a commercial software license with ForgeRock AS.
# or with one of its affiliates. All use shall be exclusively subject
# to such license between the licensee and ForgeRock AS.
#
#REQUIRES -Version 2.0

<#
.SYNOPSIS
    This is a Delete script for Active Directory

.DESCRIPTION
	The script uses the Remove-ADUser and Remove-ADGroup cmdlets to delete users and groups

.INPUTS
	The connector injects a Hashmap into the Delete script context with the following items:
	("Connector" is the default name for <prefix>)
	- <prefix>.Configuration : handler to the connector's configuration object
	- <prefix>.Options: a handler to the Operation Options
	- <prefix>.Operation: an OperationType corresponding to the operation ("DELETE" here)
	- <prefix>.ObjectClass: the Object class object (__ACCOUNT__ / __GROUP__ / other)
	- <prefix>.Uid: the Uid (__UID__) of the object to delete

.OUTPUTS
	Nothing expected.

.NOTES
    File Name      : ADDelete.ps1
    Author         : Gael Allioux (gael.allioux@forgerock.com)
    Prerequisite   : PowerShell V2 and later
    Copyright      : 2016 - ForgeRock AS    

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
	if ($Connector.Operation -eq "DELETE")
	{
		Write-Verbose "This is the Delete Script"

		# PowerShell Splatting
		$param = @{"Identity" = $Connector.Uid.GetUidValue(); "Confirm" = $false}

		# Check if server is specified
		if ($Connector.Configuration.Host)
		{
			$param.Add("Server",$Connector.Configuration.Host)
		}

		# Check if credentials are supplied
		if ($Connector.Configuration.Login -and $Connector.Configuration.Password)
		{
			$credentials = New-object System.Management.Automation.PSCredential $Connector.Configuration.Login, $Connector.Configuration.Password.ToSecureString()
			$param.Add("Credential",$credentials)
		}

		# Switch on the different ObjectClass
		switch ($Connector.ObjectClass.Type)
		{
			"__ACCOUNT__"
			{
				Remove-ADUser @param
				Write-Verbose "Account $($Connector.Uid.GetUidValue()) deleted"
			}
			"__GROUP__"
			{
				Remove-ADGroup @param
				Write-Verbose "Group $($Connector.Uid.GetUidValue()) deleted"
			}
			# Throw an exception if the ObjectClass is not handled by the script
			default
			{
				$err = "Unsupported type: $($Connector.ObjectClass.Type)"
				Write-Verbose $err
				throw New-Object Org.IdentityConnectors.Framework.Common.Exceptions.ConnectorException($err)
			}
		}
	}
	else
	{
		$err = "DeleteScript can not handle operation: $($Connector.Operation)"
		Write-Verbose $err
		throw New-Object Org.IdentityConnectors.Framework.Common.Exceptions.ConnectorException($err)
	}
}
catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException]
{ # Not Found
	Write-Verbose $_.Exception.Message
	throw New-Object Org.IdentityConnectors.Framework.Common.Exceptions.UnknownUidException($_.Exception.Message)
}
catch #Re-throw the original exception message within a connector exception
{
	# Before re-throwing, clean up may be done (close file, connections etc...).

	# See https://forgerock.org/openicf/doc/apidocs/org/identityconnectors/framework/common/exceptions/package-frame.html
	# for the list of OpenICF exceptions
	Write-Verbose $_.Exception.Message
	throw New-Object Org.IdentityConnectors.Framework.Common.Exceptions.ConnectorException($_.Exception.Message)
}