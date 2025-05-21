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
    This is a Create script for Active Directory

.DESCRIPTION
	This script leverages Create-NewUser and Create-NewGroup cmdlets from Active Directory module.

.INPUTS
	The connector injects a Hashmap into the Create script context with the following items:
	("Connector" is the default name for <prefix>)
	- <prefix>.Configuration : handler to the connector's configuration object
	- <prefix>.Options: a handler to the Operation Options
	- <prefix>.Operation: an OperationType corresponding to the operation ("CREATE" here)
	- <prefix>.ObjectClass: the Object class object (__ACCOUNT__ / __GROUP__ / other)
	- <prefix>.Attributes: A collection of ConnectorAttributes representing the entry attributes
	- <prefix>.Id: Corresponds to the OpenICF __NAME__ attribute if it is provided as part of the attribute set,
	 otherwise null

.OUTPUTS
	Must return the object's unique ID (OpenICF __UID__).
	To do so, set the <prefix>.Result.Uid property either as a String or as an OpenICF Uid object.

.NOTES
    File Name      : ADCreate.ps1
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

# Put your code for the Create User logic here.
# Make sure to return the newly created user unique identifier.
# Be careful, a PowerShell function captures all output
# and returns it in an array once done or call to 'return'.
# So, make sure your code captures any output of cmdlet calls
# and return only the new user unique identifier.
function Create-NewUser ($param, $attributes)
{
	$accessor = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributesAccessor($attributes)
	$basic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::GetBasicAttributes($attributes)
	$dic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::ToMap($basic)

	# New-ADUser
	# See http://technet.microsoft.com/en-us/library/ee617253.aspx
	# Name is required

	# __NAME__ is the entry distinguished name
	($rdn,$path) = $Connector.Id.Split(',',2)
	($cn,$rdn) = $rdn.Split('=',2)

	$param.Add("Name",$rdn.Trim())
	$param.Add("Path",$path.Trim())

	# Password
	# [-AccountPassword <SecureString>]
	$password = $accessor.GetPassword()
	If ($password)
	{
		$param.Add("AccountPassword",$password.ToSecureString())
	}

	# There is a bunch of technical booleans attributes related to User Account Control (UAC)
	# that are actual parameters to New_ADUser cmdlet.
	#
	# AccountNotDelegated (ADS_UF_NOT_DELEGATED)
	# AllowReversiblePasswordEncryption (ADS_UF_ENCRYPTED_TEXT_PASSWORD_ALLOWED)
	# CannotChangePassword (ADS_UF_PASSWD_CANT_CHANGE)
	# ChangePasswordAtLogon (specific to the cmdlet)
	# Enabled (ADS_UF_ACCOUNTDISABLE)
	# PasswordNeverExpires (ADS_UF_DONT_EXPIRE_PASSWD)
	# PasswordNotRequired (ADS_UF_PASSWD_NOTREQD)
	# SmartcardLogonRequired (ADS_UF_SMARTCARD_REQUIRED)
	# TrustedForDelegation (ADS_UF_TRUSTED_FOR_DELEGATION)
	# compoundIdentitySupported
	@("accountNotDelegated","allowReversiblePasswordEncryption","cannotChangePassword"
	,"changePasswordAtLogon","enabled","passwordNeverExpires","passwordNotRequired",
	"smartcardLogonRequired","trustedForDelegation","useDESKeyOnly","compoundIdentitySupported") | foreach {
		$value = $accessor.FindBoolean($_)
		$dic.Remove($_) | Out-Null
		if ($value -ne $null)
		{
			$param.Add($_,$value)
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

	# SamAccountName has to be specified as a parameter as well
	$val = $accessor.FindString("samAccountName")
	$dic.Remove("samAccountName") | Out-Null
	if ($val)
	{
		$param.Add("SamAccountName",$val)
	}

	# we put the remaining attributes here
	$otherAttrs = @{}
	foreach($h in $dic.GetEnumerator())
	{
		if ($h.Value -ne $null)
		{
			$vals = @()
			foreach($val in $h.Value.Value)
			{
				$vals += $val
			}
			$otherAttrs.Add($h.Key,$vals)
		}
	}
	if ($otherAttrs.Count -gt 0)
	{
		$param.Add("OtherAttributes",$otherAttrs)
	}
	$param.Add("PassThru",$true)

	$aduser = New-ADUser @param
	Write-Verbose "User $rdn created in $path"

    $homeDrive = $accessor.FindString("homeDrive")
    $homeDir = $accessor.FindString("homeDirectory")
    if (($homeDir -ne $null) -and ($homeDrive -ne $null)) {
        Write-Verbose "Creating home directory $homeDrive $homeDir"

        $samAccountName = $accessor.FindString("samAccountName")
        $User = Get-ADUser -Identity $samAccountName

        Set-ADUser $User -HomeDrive $homeDrive -HomeDirectory $homeDir -ea Stop
        $homeShare = New-Item -path $homeDir -ItemType Directory -force -ea Stop

        # set permissions

        Write-Verbose "Setting permissions"

        $acl = Get-Acl $homeShare

        $FileSystemRights = [System.Security.AccessControl.FileSystemRights]"Modify"
        $AccessControlType = [System.Security.AccessControl.AccessControlType]::Allow

        $InheritanceFlags = [System.Security.AccessControl.InheritanceFlags]"ContainerInherit, ObjectInherit"
        $PropagationFlags = [System.Security.AccessControl.PropagationFlags]"None"

        Write-Verbose "Get user"

        $SID = $User.SID

        Write-Verbose "User SID $SID "

        $AccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule ($SID, $FileSystemRights, $InheritanceFlags, $PropagationFlags, $AccessControlType)

        Write-Verbose "Adding access rule"

        $acl.AddAccessRule($AccessRule)

        Write-Verbose "Writing acl"

        Set-Acl -Path $homeShare -AclObject $acl -ea Stop

        Write-Verbose "Added access rule"
    }
	$aduser.ObjectGUID.ToString()
}

function Create-NewGroup ($param, $attributes)
{
	$accessor = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributesAccessor($attributes)
	$basic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::GetBasicAttributes($attributes)
	$dic = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeUtil]::ToMap($basic)

	# New-ADGroup
	# See http://technet.microsoft.com/en-us/library/ee617258.aspx
	# Name and GroupScope are required

	# __NAME__ is the entry distinguished name
	($rdn,$path) = $Connector.Id.Split(',',2)
	($cn,$rdn) = $rdn.Split('=',2)

	$param.Add("Name",$rdn.Trim())
	$param.Add("Path",$path.Trim())
	$param.Add("GroupScope","Global")

	# group scope is either 'DomainLocal', 'Universal', 'Global'
	$val = $accessor.FindString("groupScope")
	$dic.Remove("groupScope") | Out-Null
	if ($val)
	{
		$param.Set_Item("GroupScope",$val)
	}

	# group category is either 'security' (default) or 'distribution'
	$val = $accessor.FindString("groupCategory")
	$dic.Remove("groupCategory") | Out-Null
	if ($val)
	{
		$param.Add("GroupCategory",$val)
	}

	# If defined, SamAccountName has to be passed as a parameter
	$val = $accessor.FindString("samAccountName")
	$dic.Remove("samAccountName") | Out-Null
	if ($val)
	{
		$param.Add("SamAccountName",$val)
	}

	# we put the remaining attributes here
	$otherAttrs = @{}
	foreach($h in $dic.GetEnumerator())
	{
		if ($h.Value -ne $null)
		{
			$vals = @()
			foreach($val in $h.Value.Value)
			{
				$vals += $val
			}
			$otherAttrs.Add($h.Key,$vals)
		}
	}
	if ($otherAttrs.Count -gt 0)
	{
		$param.Add("OtherAttributes",$otherAttrs)
	}
	$param.Add("PassThru",$true)

	$adgroup = New-ADGroup @param
	Write-Verbose "Group $rdn created in $path"
	$adgroup.ObjectGUID.ToString()
}


# The script code should always be enclosed within a try/catch block.
# If any exception is thrown, it is good practice to catch the original exception
# message and re-throw it within an OpenICF connector exception
try
{
	# Since one script can be used for multiple actions, it is safe to check the operation first.
	if ($Connector.Operation -eq "CREATE")
	{
		Write-Verbose "This is the Create Script"
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

		# Switch on the different ObjectClass
		switch ($Connector.ObjectClass.Type)
		{
			# Since the Create operation may be a bit complex, it is good
			# practice to put the logic in a dedicated function.
			# The set of attributes is passed to that function.
			# The function MUST return the unique identifier of the created
			# object to set $Connector.Result.Uid.
			"__ACCOUNT__"
			{
				$Connector.Result.Uid = Create-NewUser $param $Connector.Attributes
			}
			"__GROUP__"
			{
				$Connector.Result.Uid = Create-NewGroup $param $Connector.Attributes
			}
		}
	}
	else
	{
		$error = "CreateScript can not handle operation: $($Connector.Operation)"
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