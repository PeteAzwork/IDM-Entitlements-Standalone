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
    This is the Update script for Active directory users and groups

.DESCRIPTION
	This script leverages Set-ADUser and Set-ADGroup cmdlets from Active Directory module.
	An update can be done in 3 ways:
	- add values to attributes
	- remove values from attributes
	- replace values from attributes.
	See: https://forgerock.org/openicf/doc/apidocs/org/identityconnectors/framework/spi/operations/UpdateAttributeValuesOp.html
	To figure out what kind of update needs to be done, the script relies on the Operation type.

.INPUTS
	The connector injects a Hashmap into the Update script context with the following items:
	("Connector" is the default name for <prefix>)
	- <prefix>.Configuration : handler to the connector's configuration object
	- <prefix>.Options: a handler to the Operation Options
	- <prefix>.Operation: an OperationType corresponding to the operation ("UPDATE"/"ADD_ATTRIBUTE_VALUES"/"REMOVE_ATTRIBUTE_VALUES")
	- <prefix>.ObjectClass: the Object class object (__ACCOUNT__ / __GROUP__ / other)
	- <prefix>.Attributes: A collection of ConnectorAttributes to update.
	- <prefix>.Uid: Corresponds to the OpenICF __UID__ attribute for the entry to update

.OUTPUTS
	Must return the user unique ID (__UID__) of the modified entry.
	To do so, set the <prefix>.Result.Uid property either as a String or as an OpenICF Uid object.

.NOTES
    File Name      : ADUpdate.ps1
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

# Script may need to decrypt OpenICF GuardedString attributes.
# See: https://forgerock.org/openicf/doc/apidocs/org/identityconnectors/common/security/SecurityUtil.html
$secutil = [Org.IdentityConnectors.Common.Security.SecurityUtil]

# Put your code for the Update User logic here.
# Make sure to return the object unique identifier.
# Be careful, a PowerShell function captures all output
# and returns it in an array once done or call to 'return'.
# So, make sure your code captures any output of cmdlet calls
# and return only the object unique identifier.

function Update-User ($param, $attributes)
{
	# Attributes Accessor has convenient methods for accessing attributes
	# See: https://forgerock.org/openicf/doc/apidocs/org/identityconnectors/framework/common/objects/AttributesAccessor.html
	$accessor = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributesAccessor($attributes)
	$basic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::GetBasicAttributes($attributes)
	$dic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::ToMap($basic)

	Write-Verbose "Attributes to updates: $($dic.Keys)"

	# Change of Name - Needs the special Rename-Object cmdlet
	# See http://technet.microsoft.com/en-us/library/ee617225.aspx
	$val = $accessor.FindString("name")
	$dic.Remove("name") | Out-Null
	if ($val)
	{
		Rename-ADObject @param -NewName $val
		Write-Verbose "User renamed to $val"
	}

	# Change of DistinguishedName (__NAME__). We need to move the object
	# with the special Move-ADObject cmdlet
	# See http://technet.microsoft.com/en-us/library/ee617248.aspx
	if ($accessor.GetName())
	{
		($rdn,$path) = $accessor.GetName().GetNameValue().Split(',',2)
		Move-ADObject @param -TargetPath $path.Trim()
		Write-Verbose -verbose "User $rdn moved to $path"
	}

	# Unlock an account - it has its special cmdlet
	# See: https://technet.microsoft.com/en-us/library/ee617234.aspx
	$val = $accessor.FindBoolean("lockedOut")
	$dic.Remove("lockedOut") | Out-Null
	if ($val -eq $false)
	{
		Unlock-ADAccount @param
		Write-Verbose "User unlocked"
	}

	# Password change - it has its special cmdlet
	# See https://technet.microsoft.com/en-us/library/ee617261.aspx
	$password = $accessor.GetPassword()
	If ($password -ne $null)
	{
		$localParam = $param.Clone()
		$localParam.Add("NewPassword",$password.ToSecureString())

		$currentName = [Org.IdentityConnectors.Framework.Common.Objects.OperationalAttributes]::CURRENT_PASSWORD_NAME
		$currentPassword = $accessor.FindGuardedString($currentName)
		if ($currentPassword) # old password is provided
		{
			$localParam.Add("OldPassword",$currentPassword.ToSecureString())
		}
		else # password reset
		{
			$localParam.Add("Reset",$true)
		}
		Set-ADAccountPassword @localParam
		Write-Verbose "Password updated"
	}

	# Membership update - it has its special servlets
	# See https://technet.microsoft.com/en-us/library/ee617259.aspx
	# See https://technet.microsoft.com/en-us/library/ee617203.aspx
	# See https://technet.microsoft.com/en-us/library/ee617243.aspx
	$memberOf = $accessor.FindStringList("memberOf")
	$dic.Remove("memberOf") | Out-Null
	if ($null -ne $memberOf)
	{
		# Get the current membership
		$current = @()
		Get-ADPrincipalGroupMembership @param | where {! $_.distinguishedName.StartsWith("CN=Domain Users,")} |foreach { $current += $_.distinguishedName.ToLower() }

		$toAdd = @{}
		foreach ($m in $memberOf)
		{
			# try to normalize what is passed.
			$dn = ""
			$m.ToLower().Split(',') | foreach { ($left,$right) = $_.Trim().Split('=') ; $dn += $left.Trim()+'='+$right.Trim()+','}
			$toAdd.Add($dn.TrimEnd(','),$true)
		}

		# Calculate the diff
		$toRemove = @()
		foreach($h in $current)
		{
			if ($toAdd.Contains($h))
			{
				$toAdd.Remove($h) | Out-Null
			}
			else
			{
				$toRemove += $h
			}
		}

		$newMembership = @()
		foreach($h in $toAdd.GetEnumerator())
		{
			$newMembership += $h.Key
		}

		if ($newMembership.Count -gt 0)
		{
			Add-ADPrincipalGroupMembership @param -MemberOf $newMembership -Confirm:$false
			Write-Verbose "[$newMembership] added to user groups"
		}
		if ($toRemove.Count -gt 0)
		{
			Remove-ADPrincipalGroupMembership @param -MemberOf $toRemove -Confirm:$false
			Write-Verbose "[$toRemove] removed from user groups"
		}
	}

	# used to track if any changes to apply
	$paramCount = $param.Count

	# SamAccountName has to be specified as a parameter as well
	$val = $accessor.FindString("samAccountName")
	$dic.Remove("samAccountName") | Out-Null
	if ($val)
	{
		$param.Add("SamAccountName",$val)
	}

	# TODO: use Set-ADAccountControl
	#
	# There is a bunch of technical booleans attributes related to User Account Control (UAC)
	# that are actual parameters to Set_ADUser cmdlet. They can only be updated in a "replace"
	# context.
	# AccountNotDelegated (ADS_UF_NOT_DELEGATED)
	# AllowReversiblePasswordEncryption (ADS_UF_ENCRYPTED_TEXT_PASSWORD_ALLOWED)
	# CannotChangePassword (ADS_UF_PASSWD_CANT_CHANGE)
	# ChangePasswordAtLogon (specific to the cmdlet)
	# Enabled (ADS_UF_ACCOUNTDISABLE)
	# PasswordNeverExpires (ADS_UF_DONT_EXPIRE_PASSWD)
	# PasswordNotRequired (ADS_UF_PASSWD_NOTREQD)
	# SmartcardLogonRequired (ADS_UF_SMARTCARD_REQUIRED)
	# TrustedForDelegation (ADS_UF_TRUSTED_FOR_DELEGATION)
	@("accountNotDelegated","allowReversiblePasswordEncryption","cannotChangePassword",
	"changePasswordAtLogon","enabled","passwordNeverExpires","passwordNotRequired",
	"smartcardLogonRequired","trustedForDelegation","useDESKeyOnly") | foreach {
		$value = $accessor.FindBoolean($_)
		$dic.Remove($_) | Out-Null
		if ($value -ne $null)
		{
			$param.Add($_,$value)
			Write-Verbose "Updating $_ to $value"
		}
	}

	# [-AccountExpirationDate <System.Nullable[System.DateTime]>]
	# This corresponds to the AccountExpires attribute
	# 0 means never expire
	# other values must be in the format of System.DateTime
	# like: "05/06/2014 17:02:23"
	$val = $accessor.FindString("accountExpirationDate")
	$dic.Remove("accountExpirationDate") | Out-Null
	if ($val -ne $null)
	{
		if (($val -eq "0") -or ($val -eq ""))
		{
			$val = $null
		}
		$param.Add("AccountExpirationDate",$val)
	}

 Write-Verbose "Checking for update to homeDirectory"

    # check if first name or last name updated (or just the homedir attr)

    $val = $accessor.FindString("homeDirectory")
	$dic.Remove("homeDirectory") | Out-Null
	if ($val)
	{
        Write-Verbose "homeDirectory attribute has changed"
        $User = Get-ADUser $Connector.Uid.GetUidValue() -Properties *
        $olddir = $User.HomeDirectory
        Write-Verbose "Got user original dir $olddir"
        Write-Verbose "Got user new dir $val"
        Rename-Item -path "$olddir" -newName "$val"
        $param.Add("homeDirectory",$val)
	}

	# Attributes to "clear", meaning: null value or empty list
	$clearAttrs = Get-AttributesToClear $dic
	if ($clearAttrs.Count -gt 0)
	{
		$param.Add("Clear",$clearAttrs)
		Write-Verbose "$($clearAttrs.Count) attribute(s) to clear value(s)"
	}

	# the rest of the attributes changes is stored as a Hashtable with the "Replace" parameter
	$replaceAttrs = Get-OtherAttributes $dic

	if ($replaceAttrs.Count -gt 0)
	{
		$param.Add("Replace",$replaceAttrs)
		Write-Verbose "$($replaceAttrs.Count) attribute(s) to replace value(s)"
	}

	# Do the update if param has more entries than the initial Identity
	if ($param.Count -gt $paramCount )
	{
		Set-ADUser @param
		Write-Verbose "User has been updated (Replace values)"
	}

	# If the object UID has not been modified, return the original Uid.
	$Connector.Uid
}


function Add-Attributes-User ($param, $attributes)
{
	$accessor = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributesAccessor($attributes)
	$basic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::GetBasicAttributes($attributes)
	$dic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::ToMap($basic)

	$addAttrs = Get-OtherAttributes $dic

	if ($addAttrs["memberOf"] -ne $null) # Group membership update
	{
		Add-ADPrincipalGroupMembership @param -MemberOf $addAttrs["memberOf"] -Confirm:$false
		Write-Verbose "Membership added"
	}
	$addAttrs.Remove("memberOf") | Out-Null

	if ($addAttrs.Count -gt 0)
	{
		$param.Add("Add",$addAttrs)
		Write-Verbose "$($addAttrs.Count) attribute(s) to add value(s)"
		Set-ADUser @param
		Write-Verbose "User has been updated (Add values)"
	}
	$Connector.Uid
}

function Remove-Attributes-User ($param, $attributes)
{
	$accessor = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributesAccessor($attributes)
	$basic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::GetBasicAttributes($attributes)
	$dic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::ToMap($basic)

	$removeAttrs = Get-OtherAttributes $dic

	if ($removeAttrs["memberOf"] -ne $null) # Group membership update
	{
		Remove-ADPrincipalGroupMembership @param -MemberOf $removeAttrs["memberOf"] -Confirm:$false
		Write-Verbose "Membership removed"
	}
	$removeAttrs.Remove("memberOf") | Out-Null

	if ($removeAttrs.Count -gt 0)
	{
		$param.Add("Remove",$removeAttrs)
		Write-Verbose "$($removeAttrs.Count) attribute(s) to remove value(s)"
		Set-ADUser @param
		Write-Verbose "User has been updated (Remove values)"
	}
	$Connector.Uid
}

function Update-Group ($param, $attributes)
{
	$accessor = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributesAccessor($attributes)
	$basic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::GetBasicAttributes($attributes)
	$dic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::ToMap($basic)

	# Change of Name - Needs the special Rename-Object cmdlet
	# See http://technet.microsoft.com/en-us/library/ee617225.aspx
	$val = $accessor.FindString("name")
	$dic.Remove("name") | Out-Null
	if ($val)
	{
		Rename-ADObject @param -NewName $val
		Write-Verbose "Group renamed to $val"
	}

	# Change of DistinguishedName (__NAME__). We need to move the object
	# with the special Move-ADObject cmdlet
	# See http://technet.microsoft.com/en-us/library/ee617248.aspx
	if ($accessor.GetName())
	{
		($rdn,$path) = $accessor.GetName().GetNameValue().Split(',',2)
		Move-ADObject @param -TargetPath $path.Trim()
		Write-Verbose -verbose "Group $rdn moved to $path"
	}

	# used to track if any changes to apply
	$paramCount = $param.Count

	# group scope and category are changed in a replace context. Has to be a named parameters
	$val = $accessor.FindString("groupScope")
	$dic.Remove("groupScope") | Out-Null
	if ($val)
	{
		$param.Add("GroupScope",$val)
	}

	$val = $accessor.FindString("groupCategory")
	$dic.Remove("groupCategory")  | Out-Null
	if ($val)
	{
		$param.Add("GroupCategory",$val)
	}

	# If defined, SamAccountName has to be passed as a named parameter
	$val = $accessor.FindString("samAccountName")
	$dic.Remove("samAccountName") | Out-Null
	if ($val)
	{
		$param.Add("SamAccountName",$val)
	}

	# Attributes to "clear", meaning: null value or empty list
	$clearAttrs = Get-AttributesToClear $dic
	if ($clearAttrs.Count -gt 0)
	{
		$param.Add("Clear",$clearAttrs)
		Write-Verbose "$($clearAttrs.Count) attribute(s) to clear value(s)"
	}

	# the rest of the attributes changes is stored as a Hashtable with the "Replace" parameter
	$replaceAttrs = Get-OtherAttributes $dic
	if ($replaceAttrs.Count -gt 0)
	{
		$param.Add("Replace",$replaceAttrs)
		Write-Verbose "$($replaceAttrs.Count) attribute(s) to replace value(s)"
	}

	# Do the update if param has more entries than the initial Identity
	if ($param.Count -gt $paramCount )
	{
		Set-ADGroup @param
		Write-Verbose "Group has been updated (Replace values)"
	}
	$Connector.Uid
}

function Add-Attributes-Group ($param, $attributes)
{
	$accessor = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributesAccessor($attributes)
	$basic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::GetBasicAttributes($attributes)
	$dic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::ToMap($basic)

	$addAttrs = Get-OtherAttributes $dic

	if ($addAttrs.Count -gt 0)
	{
		$param.Add("Add",$addAttrs)
		Write-Verbose "$($addAttrs.Count) attribute(s) to add value(s)"
		Set-ADGroup @param
		Write-Verbose "Group has been updated (Add values)"
	}
	$Connector.Uid
}

function Remove-Attributes-Group ($param, $attributes)
{
	$accessor = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributesAccessor($attributes)
	$basic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::GetBasicAttributes($attributes)
	$dic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::ToMap($basic)

	$removeAttrs = Get-OtherAttributes $dic

	if ($removeAttrs.Count -gt 0)
	{
		$param.Add("Remove",$removeAttrs)
		Write-Verbose "$($removeAttrs.Count) attribute(s) to remove value(s)"
		Set-ADGroup @param
		Write-Verbose "Group has been updated (Remove values)"
	}
	$Connector.Uid
}

function Get-OtherAttributes ($dico)
{
	$otherAttrs = @{};
	# $dico is a Map of <String,ConnectorAttribute>
	foreach($attr in $dico.GetEnumerator())
	{
		$attrValue = $attr.Value.Value
		if ($attrValue -ne $null)
		{
			if ($attrValue.Count -eq 1)
			{
				$otherAttrs.Add($attr.Key, $attrValue[0].ToString())
			}
			else
			{
				$values = @();
				foreach($val in $attrValue)
				{
					$values += $val.ToString()
				}
				if ($values.Count -gt 0)
				{
					$otherAttrs.Add($attr.Key, $values)
				}
			}
		}
	}
	return $otherAttrs
}

function Get-AttributesToClear ($dico)
{
	$clearAttrs = @()
	# Need to spot the null attributes or empty list attributes
	foreach($attr in $dico.GetEnumerator())
	{
		$attrValue = $attr.Value.Value
		if ($null -ne $attrValue)
		{
			if ($attrValue.Count -eq 0)
			{
				$clearAttrs += $attr.Key
			}
		}
		else
		{
			$clearAttrs += $attr.Key
		}
	}
	return $clearAttrs
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

	# Object GUID
	$param.Add("Identity",$Connector.Uid.GetUidValue())

	switch ($Connector.Operation)
	{
		"UPDATE"
		{
			Write-Verbose "This is the Update Script (UPDATE action)"
			switch ($Connector.ObjectClass.Type)
			{
				# Since the Update operation may be a bit complex, it is good
				# practice to put the logic in a dedicated function.
				# The set of attributes to update is passed to that function.
				# The function MUST return the unique identifier of the updated
				# object to set $Connector.Result.Uid.

				"__ACCOUNT__"
				{
					$Connector.Result.Uid = Update-User $param $Connector.Attributes
				}
				"__GROUP__"
				{
					$Connector.Result.Uid = Update-Group $param $Connector.Attributes
				}
			}

		}
		"ADD_ATTRIBUTE_VALUES"
		{
			Write-Verbose "This is the Update Script (ADD_ATTRIBUTE_VALUES action)"
			switch ($Connector.ObjectClass.Type)
			{
				"__ACCOUNT__"
				{
					$Connector.Result.Uid = Add-Attributes-User $param $Connector.Attributes
				}
				"__GROUP__"
				{
					$Connector.Result.Uid = Add-Attributes-Group $param $Connector.Attributes
				}
			}
		}
		"REMOVE_ATTRIBUTE_VALUES"
		{
			Write-Verbose "This is the Update Script (REMOVE_ATTRIBUTE_VALUES action)"
			switch ($Connector.ObjectClass.Type)
			{
				"__ACCOUNT__"
				{
					$Connector.Result.Uid = Remove-Attributes-User $param $Connector.Attributes
				}
				"__GROUP__"
				{
					$Connector.Result.Uid = Remove-Attributes-Group $param $Connector.Attributes
				}
			}
		}
		default
		{
			$error = "UpdateScript can not handle operation: $($Connector.Operation)"
			Write-Verbose $error
			throw New-Object Org.IdentityConnectors.Framework.Common.Exceptions.ConnectorException($error)
		}
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