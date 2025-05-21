#
# Copyright 2017-2022 ForgeRock AS. All Rights Reserved
#
# Use of this code requires a commercial software license with ForgeRock AS.
# or with one of its affiliates. All use shall be exclusively subject
# to such license between the licensee and ForgeRock AS.
#
#REQUIRES -Version 2.0

<#
.SYNOPSIS
    This module contains two helper functions for Active Directory searches

.DESCRIPTION
	This module leverages ADSI to search for users and groups.

.INPUTS
	A HashMap containing the parameters for the connection
	- Filter : an LDAP filter
	- ResultPageSize: The page size. Defaults to 256
	- SearchBase: The search base suffix on AD.
	- Properties: A list of attributes to fetch.

.OUTPUTS
	Results of the search are returned to the caller as a list of HashMap.
	Each map contains the entry attributes names as the key and the attribute
	value(s) as the value.

.NOTES
    File Name      : ADSISearch.ps1
    Author         : Gael Allioux (gael.allioux@forgerock.com)
    Prerequisite   : PowerShell V2 and later
    Copyright      : 2017-2022 - ForgeRock AS
#>


Function Get-FRADUser {
Param(
	$config
	)

	# User Account Control Bitmask
	$ACCOUNTDISABLE	            = 0x000002
	$HOMEDIR_REQUIRED	        = 0x000008
	$LOCKOUT	                = 0x000010
	$PASSWD_NOTREQD	            = 0x000020
	$PASSWD_CANT_CHANGE	        = 0x000040
	$ENCRYPTED_TEXT_PWD_ALLOWED	= 0x000080
	$DONT_EXPIRE_PASSWORD	    = 0x010000
	$SMARTCARD_REQUIRED	        = 0x040000
	$PASSWORD_EXPIRED	        = 0x800000

	# The default search filter
	$filter = "(&(objectCategory=person)(objectClass=User))"

	# A default list of properties
	$properties = @("cn","description","displayName","givenName","mail",
					"memberOf","name","samAccountName","sn","userPrincipalName"
					)

	# Search Root
	$base = "LDAP://"

	# Search filter
	if ($config.Filter)
	{
		$filter = -join("(&", $config.Filter, "(objectCategory=person)(objectClass=User))")
	}

	# Get the ADSI searcher
	##Write-Verbose -Verbose "Creating ADSI Searcher with filter: $filter"
	$searcher = [adsisearcher]$filter

	# Page size
	if ($config.ResultPageSize)
	{
		$searcher.PageSize = $config.ResultPageSize
	}
	else
	{
		$searcher.PageSize = 256
	}

	# Server specified
	if ($config.Server)
	{
		$base = -join($base, $config.Server, "/")
	}

	# Search context
	if ($config.SearchBase)
	{
		$base = -join($base, $config.SearchBase)
		$searcher.SearchRoot = [adsi]$base
		#Write-Verbose -Verbose "Context is: $base"
	}

	# Specific credentials
	if ($config.Credential)
	{
		$creds = $config.Credential
		$domain = New-Object -TypeName System.DirectoryServices.DirectoryEntry `
			-ArgumentList $searcher.Searchroot.path, $($creds.UserName), $($creds.GetNetworkCredential().password)
		$searcher.SearchRoot = $domain
	}

	# Attributes to Get
	if ($config.Properties)
	{
		$properties = $config.Properties
	}

	foreach($prop in $properties)
	{
		$searcher.PropertiesToLoad.Add($prop) |Out-Null
	}
	# Add the UAC, DN, SID and GUID
	$searcher.PropertiesToLoad.Add("userAccountControl") |Out-Null
	$searcher.PropertiesToLoad.Add("objectGUID") |Out-Null
	$searcher.PropertiesToLoad.Add("objectSid") |Out-Null
	$searcher.PropertiesToLoad.Add("distinguishedName") |Out-Null

	# Sorting
	if ($config.SortKey)
	{
		$searcher.Sort.PropertyName = $config.SortKey
		$searcher.Sort.Direction = $config.SortDirection
	}

	# Paging
	if ($config.PageSize)
	{
		# Sorting is mandatory if paging is required
		# Default to displayName
		if ($config.SortKey -eq $null)
		{
			$searcher.Sort.PropertyName = "displayName"
		}

		# Define a new VLV object for paging
		$vlv = New-Object System.DirectoryServices.DirectoryVirtualListView
		$vlv.BeforeCount = 0
		$vlv.Offset = $config.Offset
		$vlv.AfterCount = $config.PageSize
		$searcher.VirtualListView = $vlv

		# Make sure the page size is not set
		# That would break the VLV search
		$searcher.PageSize = 0
	}

	# Do the Search
	$result = $searcher.FindAll()
	$result | % {
		$entry = $_.Properties
		$user = EntryToMap -entry $entry -properties $properties

		#Refine specific properties

		# GUID
		$guid = New-Object Guid @(,$entry.objectguid[0])
		$user.Set_Item("objectGUID", $guid.ToString())
		# SID
		$sid = New-Object System.Security.Principal.SecurityIdentifier($entry.objectsid[0],0)
		$user.Set_Item("objectSid",$sid.Value)
		# DN
		$user.Set_Item("distinguishedName", $entry.distinguishedname[0])

		# Dates
		#$user.Add("passwordLastSet", [DateTime]::FromFileTime($user.pwdlastset[0]))

		#Account controls
		$user.Set_Item("enabled", -not [bool]($entry.useraccountcontrol[0] -band $ACCOUNTDISABLE))
		$user.Set_Item("homedirRequired", [bool]($entry.useraccountcontrol[0] -band $HOMEDIR_REQUIRED))
		$user.Set_Item("lockedOut", [bool]($entry.useraccountcontrol[0] -band $LOCKOUT))
		$user.Set_Item("passwordNotRequired", [bool]($entry.useraccountcontrol[0] -band $PASSWD_NOTREQD))
		$user.Set_Item("cannotChangePassword", [bool]($entry.useraccountcontrol[0] -band $PASSWD_CANT_CHANGE))
		$user.Set_Item("allowReversiblePasswordEncryption", [bool]($entry.useraccountcontrol[0] -band $ENCRYPTED_TEXT_PWD_ALLOWED))
		$user.Set_Item("passwordNeverExpires", [bool]($entry.useraccountcontrol[0] -band $DONT_EXPIRE_PASSWORD))
		$user.Set_Item("smartcardLogonRequired", [bool]($entry.useraccountcontrol[0] -band $SMARTCARD_REQUIRED))
		$user.Set_Item("passwordExpired", [bool]($entry.useraccountcontrol[0] -band $PASSWORD_EXPIRED))
		$user
	}
	$result.Dispose()
	$searcher.Dispose()
}

#################################################################################################################

Function Get-FRADGroup {
Param(
	$config
	)
	# A group defaults to Global security
	# Scope
    $SCOPE_GLOBAL       = 0x00000002;
    $SCOPE_DOMAIN_LOCAL = 0x00000004;
    $SCOPE_UNIVERSAL    = 0x00000008;

    # Type
	$TYPE_SECURITY = 0x80000000;

	# The default search filter
	$filter = "(objectClass=Group)"

	# A default list of properties
	$properties = @("cn","description","displayName","member","name","samAccountName")

	# Search filter
	if ($config.Filter)
	{
		$filter = -join("(&", $config.Filter, "(objectClass=Group))")
	}

	# Get the ADSI searcher
	##Write-Verbose -Verbose "Creating ADSI Searcher with filter: $filter"
	$searcher = [adsisearcher]$filter

	# Page size
	if ($config.ResultPageSize)
	{
		$searcher.PageSize = $config.ResultPageSize
	}
	else
	{
		$searcher.PageSize = 256
	}

	# Search context
	if ($config.SearchBase)
	{
		$base = -join("LDAP://", $config.SearchBase)
		$searcher.SearchRoot = [adsi]$base
		#Write-Verbose -Verbose "Context is: $base"
	}

	# Specific credentials
	if ($config.Credential)
	{
		$creds = $config.Credential
		$domain = New-Object -TypeName System.DirectoryServices.DirectoryEntry `
			-ArgumentList $searcher.Searchroot.path, $($creds.UserName), $($creds.GetNetworkCredential().password)
		$searcher.SearchRoot = $domain
	}

	# Attributes to Get
	if ($config.Properties)
	{
		$properties = $config.Properties
	}

	foreach($prop in $config.Properties)
	{
		$searcher.PropertiesToLoad.Add($prop) |Out-Null
	}
	# Add the type, DN, SID and GUID
	$searcher.PropertiesToLoad.Add("objectGUID") |Out-Null
	$searcher.PropertiesToLoad.Add("distinguishedName") |Out-Null
	$searcher.PropertiesToLoad.Add("objectSid") |Out-Null
	$searcher.PropertiesToLoad.Add("groupType") |Out-Null

	# Do the Search
	$result = $searcher.FindAll()
	$result | % {
		$entry = $_.Properties
		$group = EntryToMap -entry $entry -properties $properties

		#Refine specific properties

		# GUID
		$guid = New-Object Guid @(,$entry.objectguid[0])
		$group.Set_Item("objectGUID", $guid)

		# SID
		$sid = New-Object System.Security.Principal.SecurityIdentifier($entry.objectsid[0],0)
		$group.Set_Item("objectSid",[string]$sid.Value)

		# DN
		$group.Set_Item("distinguishedName", $entry.distinguishedname[0])

		# Group Scope
		$group.Set_Item("groupScope","Global")
		if ([bool]($entry.grouptype[0] -band $SCOPE_UNIVERSAL))
		{
			$group.Set_Item("groupScope","Universal")
		}
		elseif ([bool]($entry.grouptype[0] -band $SCOPE_DOMAIN_LOCAL))
		{
			$group.Set_Item("groupScope","DomainLocal")
		}

		# Group Type
		if ([bool]($entry.grouptype[0] -band $TYPE_SECURITY))
		{
			$group.Set_Item("groupCategory","Security")
		}
		else
		{
			$group.Set_Item("groupCategory","Distribution")
		}
		$group
	}
	$result.Dispose()
	$searcher.Dispose()
}

##########################################################
Function EntryToMap {
Param(
	$entry,
	$properties
	)

	$result = @{}
	# Fetch all the properties
	foreach($prop in $properties)
	{
		# Each value is of type System.DirectoryServices.ResultPropertyValueCollection
		# which is a collection that holds the attribute value(s)
		$value = $entry[$prop.ToLower()]
		# Ignore null values
		if ($value.Count -gt 0)
		{
			# Single value
			if ($value.Count -eq 1)
			{
				# byte[], int, long are not converted to string
				$type = $value[0].GetType()
				if ( $type -eq [byte[]] -or $type -eq [int] -or $type -eq [long])
				{
					$result.Add($prop, $value[0])
				}
				else
				{
					$result.Add($prop, $value[0].ToString())
				}
			}
			else
			{
				$values = @();
				foreach($val in $value)
				{
					$type = $val.GetType()
					if ($type -eq [byte[]] -or $type -eq [int] -or $type -eq [long])
					{
						$values += $val
					}
					else
					{
						$values += $val.ToString()
					}
				}
				if ($values.Count -gt 0)
				{
					$result.Add($prop, $values)
				}
			}
		}
	}
	return $result
}
#############################################################
export-modulemember -function Get-FRADUser, Get-FRADGroup