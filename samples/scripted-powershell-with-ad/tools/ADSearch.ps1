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
    This is a Search script for Active Directory

.DESCRIPTION
	This script leverages ADSI to search for users and groups.

.INPUTS
	The connector injects a Hashmap into the Sync script context with the following items:
	("Connector" is the default name for <prefix>)
	- <prefix>.Configuration : handler to the connector's configuration object
	- <prefix>.Options: a handler to the Operation Options
	- <prefix>.Operation: an OperationType corresponding to the operation ("SEARCH" here)
	- <prefix>.ObjectClass: the Object class object (__ACCOUNT__ / __GROUP__ / other)
	- <prefix>.Query: a handler to the Query.

.OUTPUTS
	Results of the search should be returned to the connector by calling Connector.Results.Process(Hashtable|ConnectorObject).
	The callback Connector.Results.Complete(void|string|SearchResult) can be used as well to complete the results of a search.
	See: https://forgerock.org/openicf/doc/apidocs/org/identityconnectors/framework/common/objects/SearchResult.html
#>

# Preferences variables can be set here.
# See https://technet.microsoft.com/en-us/library/hh847796.aspx
$ErrorActionPreference = "Stop"
$VerbosePreference     = "SilentlyContinue"
#$VerbosePreference     = "Continue"

# We need this global Boolean to handle the case where the search handler returns false
# and we don't want to break the pipe because of https://bugster.forgerock.org/jira/browse/OPENIDM-2650
$proceed = $TRUE

# This global counter helps determine if a new cookie is needed on a paged search
$global:count = 0

# We define a filter to process results through a pipe and feed the result handler
# The special $_ is used. It contains the object passed to the filter.
filter Process-Results {
	if ($proceed)
	{
		$object = $_
		$object.Add("__UID__",$_.objectGUID)
		$object.Add("__NAME__",$_.distinguishedName)
		$proceed = $Connector.Result.Process($object)
		$global:count++
	}
}

# The script code should always be enclosed within a try/catch block.
# If any exception is thrown, it is good practice to catch the original exception
# message and re-throw it within an OpenICF connector exception
try
{
	# Since one script can be used for multiple actions, it is safe to check the operation first.
	if ($Connector.Operation -eq "SEARCH")
	{
		Write-Verbose "This is the Search Script"
		

		# PowerShell Splatting
		$param = @{"SearchBase" = $Connector.Configuration.PropertyBag.baseContext; "ResultPageSize" = 100}

		# Check the Query
		if ($Connector.Query)
		{
			$param.Set_Item("Filter",$Connector.Query)
			Write-Verbose "Query is: $($Connector.Query)"
		}

		# Attributes to get
		if ($Connector.Options.AttributesToGet)
		{
			# Skip ICF special attributes
			$properties = $Connector.Options.AttributesToGet -notlike "__*__"
			if ($properties)
			{
				$param.Add("Properties",$properties)
				Write-Verbose "Attributes to get: $properties"
			}
		}

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

		# Check if the ResultPageSize is defined
		if ($Connector.Configuration.PropertyBag.resultPageSize)
		{
			$param.Set_Item("ResultPageSize", $Connector.Configuration.PropertyBag.resultPageSize)
			Write-Verbose "ResultPageSize set to $($Connector.Configuration.PropertyBag.resultPageSize)"
		}

		# Check if Sorting is defined
		if ($Connector.Options.SortKeys -and $Connector.Options.SortKeys.Count -gt 0)
		{
			# Deal with first key only
			$sortKey = $Connector.Options.SortKeys[0]

			# Make sure dn or distinguishedName is not used
			if ($sortKey.Field -eq "distinguishedName" -or $sortKey.Field -eq "dn")
			{
				$param.Set_Item("SortKey", "displayName")
			}
			else
			{
				$param.Set_Item("SortKey", $sortKey.Field)
			}

			if ($sortKey.IsAscendingOrder())
			{
				$param.Set_Item("SortDirection", [System.DirectoryServices.SortDirection]::Ascending)
				Write-Verbose "Sorting key is $($sortKey.Field), direction Ascending"
			}
			else
			{
				$param.Set_Item("SortDirection", [System.DirectoryServices.SortDirection]::Descending)
				Write-Verbose "Sorting key is $($sortKey.Field), direction Descending"
			}
		}

		# Check if Paging is defined
		$paging = $FALSE
		$cookie = $null
		if ($Connector.Options.PageSize -and $Connector.Options.PageSize -gt 0)
		{
			$param.Add("PageSize", $Connector.Options.PageSize - 1)
			Write-Verbose "Page size is set to $($Connector.Options.PageSize)"

			# Define a default offset of 1
			$param.Add("Offset", 1)

			# Offset and cookie are mutually exclusive
			# Check if Offset is defined
			if ($Connector.Options.PagedResultsOffset -and $Connector.Options.PagedResultsOffset -gt 1)
			{
				$param.Set_Item("Offset", $Connector.Options.PagedResultsOffset)
				Write-Verbose "Offset is set to $($Connector.Options.PagedResultsOffset)"
			}
			# Check if there is a cookie defined
			elseif ($Connector.Options.PagedResultsCookie -and $Connector.Options.PagedResultsCookie -gt 1)
			{
				$param.Set_Item("Offset", [int]$Connector.Options.PagedResultsCookie)
				Write-Verbose "Cookie is set to $($Connector.Options.PagedResultsCookie)"
			}

			$paging = $TRUE
			$cookie = $param.Offset + $Connector.Options.PageSize
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

		if ($paging -and $Connector.Options.PageSize -eq $global:count)
		{
			$Connector.Result.Complete($cookie)
		}
	}
	else
	{
		$error = "Search script can not handle operation: $($Connector.Operation)"
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
	throw New-Object Org.IdentityConnectors.Framework.Common.Exceptions.ConnectorException($_.Exception.Message)
}
