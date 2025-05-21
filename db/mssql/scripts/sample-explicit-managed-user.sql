USE [openidm]
GO
-- -----------------------------------------------------
-- Table `openidm`.`managed_user`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='managed_user' AND xtype='U')
BEGIN
CREATE TABLE [openidm].[managed_user]
(
    objectid NVARCHAR(58) NOT NULL ,
    rev NVARCHAR(38) NOT NULL ,
    username NVARCHAR(255),
    password NVARCHAR(511),
    accountstatus NVARCHAR(255),
    postalcode NVARCHAR(255),
    stateprovince NVARCHAR(255),
    postaladdress NVARCHAR(255),
    country NVARCHAR(255),
    city NVARCHAR(255),
    givenname NVARCHAR(255),
    description NVARCHAR(255),
    sn NVARCHAR(255),
    telephonenumber NVARCHAR(255),
    mail NVARCHAR(255),
    kbainfo NVARCHAR(MAX),
    lastsync NVARCHAR(MAX),
    preferences NVARCHAR(MAX),
    consentedmappings NVARCHAR(MAX),
    effectiveassignments NVARCHAR(MAX),
    effectiveroles NVARCHAR(MAX),
    activedate NVARCHAR(29),
    inactivedate NVARCHAR(29),
    expireaccount NVARCHAR(MAX),
    activateaccount NVARCHAR(MAX),
    PRIMARY KEY CLUSTERED (objectid)
);
CREATE UNIQUE INDEX idx_managed_user_userName ON [openidm].[managed_user] (username ASC);
CREATE  INDEX idx_managed_user_givenName ON [openidm].[managed_user] (givenname ASC);
CREATE  INDEX idx_managed_user_sn ON [openidm].[managed_user] (sn ASC);
CREATE  INDEX idx_managed_user_mail ON [openidm].[managed_user] (mail ASC);
CREATE  INDEX idx_managed_user_accountStatus ON [openidm].[managed_user] (accountstatus ASC);
END
