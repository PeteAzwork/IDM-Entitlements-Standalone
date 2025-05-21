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
    This is a Schema script for Active Directory 

.DESCRIPTION
	The script defines user and group schema for Active Directory
	and then build the proper OpenICF Schema

.INPUTS
	The connector injects a Hashmap into the Sync script context with the following items:
	("Connector" is the default name for <prefix>)
	- <prefix>.Configuration : handler to the connector's configuration object
	- <prefix>.Operation: an OperationType corresponding to the operation ("SCHEMA" here)
	- <prefix>.SchemaBuilder: an instance of SchemaBuilder that must be used to build the schema.
	  See: https://forgerock.org/openicf/doc/apidocs/org/identityconnectors/framework/common/objects/SchemaBuilder.html

.OUTPUTS
	Nothing. Connector will finalize the schema build.

.NOTES
    File Name      : ADSchema.ps1
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

try
{
	# Use the AttributeInfoBuilder to define attribute properties
	# See: https://forgerock.org/openicf/doc/apidocs/org/identityconnectors/framework/common/objects/AttributeInfoBuilder.html
	$AttributeInfoBuilder = [Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder]

	# Since one script can be used for multiple actions, it is safe to check the operation first.
	if ($Connector.Operation -eq "SCHEMA")
	{
		Write-Verbose "This is the Schema Script"

		###########################
 		# __GROUP__ object class  #
		###########################
		Write-Verbose "__GROUP__ schema"
		$ocib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ObjectClassInfoBuilder
		$ocib.ObjectType = "__GROUP__"

		# Standard attributes - single valued, creatable, updateable
		@("mail","displayName","managedBy","info","groupCategory","groupScope",
		"wWWHomePage","description") | foreach {
			$ocib.AddAttributeInfo($AttributeInfoBuilder::Build($_,[string]))
		}

		# Standard attributes - multi valued
		@("member") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[string]);
			$ocib.AddAttributeInfo($caib.SetMultiValued($TRUE).Build())
		}

		### CREATE-ONLY

		# samAccountName attribute - creatable only (as advised by MS)
		@("samAccountName") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[string]);
			$ocib.AddAttributeInfo($caib.SetUpdateable($FALSE).Build())
		}

		### UPDATE-ONLY

		# Name attribute - updateable only (rename case)
		@("name") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[string]);
			$ocib.AddAttributeInfo($caib.SetCreatable($FALSE).Build())
		}

		### READ-ONLY:

		# Standard attributes, single valued integer - read only
		@("instanceType","sDRightsEffective","sAMAccountType") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[int]);
			$ocib.AddAttributeInfo($caib.SetCreatable($FALSE).SetUpdateable($FALSE).Build())
		}

		# Standard attributes - multi valued - readonly back link
		@("memberOf") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[string]);
			$ocib.AddAttributeInfo($caib.SetMultiValued($TRUE).SetCreatable($FALSE).SetUpdateable($FLASE).Build())
		}

		# Technical attributes, read only string
		@("objectGUID","cn","uSNCreated","uSNChanged","canonicalName", "created","modified",,"lastKnownParent") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[string]);
			$ocib.AddAttributeInfo($caib.SetCreatable($FALSE).SetUpdateable($FALSE).Build())
		}

		# Technical attributes - read only boolean
		@("deleted","protectedFromAccidentalDeletion") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[bool]);
			$ocib.AddAttributeInfo($caib.SetCreatable($FALSE).SetUpdateable($FLASE).Build())
		}

		$Connector.SchemaBuilder.DefineObjectClass($ocib.Build())

		###########################
 		# __ACCOUNT__ object class
		###########################
		Write-Verbose "__ACCOUNT__ schema"
		$ocib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ObjectClassInfoBuilder
		$ocib.ObjectType = "__ACCOUNT__"

		# Required Attributes
		@() | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[string]);
			$ocib.AddAttributeInfo($caib.SetREquired($TRUE).Build())
		}

		# Standard attributes - single valued
		@("assistant","co","comment","company","department","description","displayName","division",
		"employeeID","employeeNumber","employeeType","facsimileTelephoneNumber","givenName","homeDirectory",
		"homeDrive","homePhone","homePostalAddress","info","initials","ipPhone","l","mail","manager",
		"middleName","mobile","pager","personalTitle","physicalDeliveryOfficeName","postalCode",
		"profilePath","roomNumber","scriptPath","secretary","sn","st","street","telephoneNumber",
		"title","userPrincipalName","userWorkstations","wWWHomePage") | foreach {
			$ocib.AddAttributeInfo($AttributeInfoBuilder::Build($_,[string]))
		}

		# Standard attributes - multi valued
		@("certificates","otherMailbox","otherLoginWorkstations","otherFacsimileTelephoneNumber",
		"otherIpPhone","otherTelephone","otherMobile","seeAlso","url","o","ou","postalAddress",
		"otherHomePhone","internationalISDNNumber","postOfficeBox","streetAddress","userCertificate") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[string]);
			$ocib.AddAttributeInfo($caib.SetMultiValued($TRUE).Build())
		}

		# Technical attributes, boolean
		@("accountNotDelegated","allowReversiblePasswordEncryption","cannotChangePassword",
		"enabled","passwordNeverExpires","passwordNotRequired","smartcardLogonRequired",
		"trustedForDelegation") | foreach {
			$ocib.AddAttributeInfo($AttributeInfoBuilder::Build($_,[bool]))
		}

		# Technical attributes, integer
		@("codePage","countryCode") | foreach {
			$ocib.AddAttributeInfo($AttributeInfoBuilder::Build($_,[int]))
		}

		# Technical attributes, dates - we convert them to string
		@("accountExpirationDate") | foreach {
			$ocib.AddAttributeInfo($AttributeInfoBuilder::Build($_,[string]))
		}

 		# Operational attributes as well
		# Special attribute for Create/Update only
		$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder("changePasswordAtLogon",[bool]);
		$ocib.AddAttributeInfo($caib.SetReadable($FALSE).SetReturnedByDefault($FALSE).Build())

		$opAttrs = [Org.IdentityConnectors.Framework.Common.Objects.OperationalAttributeInfos]
		$ocib.AddAttributeInfo($opAttrs::PASSWORD)
		$ocib.AddAttributeInfo($opAttrs::CURRENT_PASSWORD)

		### CREATE-ONLY

		# samAccountName attribute - creatable only (as advised by MS)
		@("samAccountName") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[string]);
			$ocib.AddAttributeInfo($caib.SetUpdateable($FALSE).Build())
		}

		### UPDATE-ONLY

		# Name attribute - updateable only (rename case)
		@("name") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[string]);
			$ocib.AddAttributeInfo($caib.SetCreatable($FALSE).Build())
		}

		# Technical attributes, boolean
		@("lockedOut") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[bool]);
			$ocib.AddAttributeInfo($caib.SetCreatable($FALSE).Build())
		}
		# Standard attributes - multi valued - update only
		@("memberOf") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[string]);
			$ocib.AddAttributeInfo($caib.SetMultiValued($TRUE).SetCreatable($FALSE).Build())
		}

		### READ-ONLY:

		# Standard attributes - multi valued - readonly back link
		@("directReports") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[string]);
			$ocib.AddAttributeInfo($caib.SetMultiValued($TRUE).SetCreatable($FALSE).SetUpdateable($FALSE).Build())
		}

		# Technical attributes, read only (some are long type, convert it to string)
		@("accountLockoutTime","badPasswordTime","objectGUID","cn","created","uSNCreated","uSNChanged","lastLogonTimestamp",
		"lastBadPasswordAttempt","lastLogonDate","lastLogoff","modified","passwordLastSet") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[string]);
			$ocib.AddAttributeInfo($caib.SetCreatable($FALSE).SetUpdateable($FALSE).Build())
		}

		# Technical attributes, boolean read-only
		@("deleted","doesNotRequirePreAuth", "homedirRequired","passwordExpired",
		"protectedFromAccidentalDeletion","trustedToAuthForDelegation","useDESKeyOnly") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[bool]);
			$ocib.AddAttributeInfo($caib.SetCreatable($FALSE).SetUpdateable($FALSE).Build())
		}

		# Technical attributes, integer read only
		@("badLogonCount","badPwdCount","logonCount","instanceType","userAccountControl","sAMAccountType") | foreach {
			$caib = New-Object Org.IdentityConnectors.Framework.Common.Objects.ConnectorAttributeInfoBuilder($_,[int]);
			$ocib.AddAttributeInfo($caib.SetCreatable($FALSE).SetUpdateable($FALSE).Build())
		}

		$Connector.SchemaBuilder.DefineObjectClass($ocib.Build())
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
