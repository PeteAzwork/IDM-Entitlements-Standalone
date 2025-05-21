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
    This is a Sync script for Active Directory users and groups

.DESCRIPTION
	This script leverages the uSNChanged attribute to find entries that have been
	modified since last invoke

.INPUTS
	The connector injects a Hashmap into the Sync script context with the following items:
	("Connector" is the default name for <prefix>)
	- <prefix>.Configuration : handler to the connector's configuration object
	- <prefix>.Options: a handler to the Operation Options
	- <prefix>.Operation: an OperationType corresponding to the operation ("SYNC" or "GET_LATEST_SYNC_TOKEN" here)
	- <prefix>.ObjectClass: the Object class object (__ACCOUNT__ / __GROUP__ / other)
	- <prefix>.Token: The current sync token value

.OUTPUTS
	if Operation is "GET_LATEST_SYNC_TOKEN":
	Must return an object representing the last known sync token for the corresponding ObjectClass

	if Operation is "SYNC":
    Changes should be returned to the connector by calling Connector.Results.Process(Hashtable|SyncDelta)

.NOTES
    File Name      : ADSync.ps1
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

# We need this global Boolean to handle the case where the sync handler returns false
# and we don't want to break the pipe because of https://bugster.forgerock.org/jira/browse/OPENIDM-2650
$proceed = $TRUE

# We define a filter to process results through a pipe and feed the result handler
# The special $_ is used. It contains the object passed to the filter.
filter Process-Results {
	if ($proceed)
	{
		$object = @{"__UID__" = $_.ObjectGUID.ToString(); "__NAME__" = $_.DistinguishedName}
		$object += $_
		$syncObject = @{"SyncToken" = $_.uSNChanged; "DeltaType" = "CREATE_OR_UPDATE"; "Uid" = $_.ObjectGUID.ToString(); "Object" = $object}
		$proceed = $Connector.Result.Process($syncObject)
	}
}

# The script code should always be enclosed within a try/catch block.
# If any exception is thrown, it is good practice to catch the original exception
# message and re-throw it within an OpenICF connector exception
try
{
	# PowerShell Splatting
	$param = @{}

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

	if ($Connector.Operation -eq "GET_LATEST_SYNC_TOKEN")
	{
		Write-Verbose "This is the Sync (GetLatestSyncToken) Script"
		$dse = Get-ADRootDSE @param
		$token = New-Object Org.IdentityConnectors.Framework.Common.Objects.SyncToken($dse.highestCommittedUSN);
		Write-Verbose "Latest SyncToken is $($dse.highestCommittedUSN)"

		$Connector.Result.SyncToken = $token;
	}
	elseif ($Connector.Operation -eq "SYNC")
	{
		Write-Verbose "This is the Sync Script"

		# Filter
		$filter = "(uSNChanged>={0})" -f ($Connector.Token + 1)
		Write-Verbose "Filter is: $filter"
		$param.Add("Filter",$filter)

		# SearchBase property
		if ($Connector.Configuration.PropertyBag.baseContext)
		{
			$param.Add("SearchBase",$Connector.Configuration.PropertyBag.baseContext)
		}

		# Attributes to get
		if ($Connector.Options.AttributesToGet)
		{
			# Skip ICF special attributes
			$properties = $Connector.Options.AttributesToGet -notlike "__*__"
			if ($properties)
			{
				Write-Verbose "Attributes to get: $properties"
				$param.Add("Properties",$properties)
			}
		}

		switch ($Connector.ObjectClass.Type)
		{
			"__ACCOUNT__"
			{
				Get-FRADUser $param | Process-Results
			}
			"__GROUP__"
			{
				Get-FRADGroup $param | Process-Results
			}
		}
	}
	else
	{
		$error = "Sync Script can not handle operation: $($Connector.Operation)"
		Write-Verbose $error
		throw new Org.IdentityConnectors.Framework.Common.Exceptions.ConnectorException($error)
	}
}
catch #Re-throw the original exception message within a connector exception
{
	# Before re-throwing, clean up may be done (close file, connections etc...).

	# See https://forgerock.org/openicf/doc/apidocs/org/identityconnectors/framework/common/exceptions/package-frame.html
	# for the list of OpenICF exceptions
	Write-Verbose $_.Exception.Message
	throw New-Object Org.IdentityConnectors.Framework.Common.Exceptions.ConnectorException($_.Exception.Message)
}
