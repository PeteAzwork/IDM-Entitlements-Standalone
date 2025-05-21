SET NUMERIC_ROUNDABORT OFF
GO
SET ANSI_PADDING,ANSI_WARNINGS,CONCAT_NULL_YIELDS_NULL,ARITHABORT,QUOTED_IDENTIFIER,ANSI_NULLS ON
GO

IF (NOT EXISTS (SELECT name FROM master.dbo.sysdatabases WHERE (name = N'openidm')))
-- -----------------------------------------------------
-- Database OpenIDM - case-sensitive and accent-sensitive
-- -----------------------------------------------------
CREATE DATABASE [openidm] COLLATE Latin1_General_100_CS_AS
GO
ALTER DATABASE [openidm] SET READ_COMMITTED_SNAPSHOT ON
GO
USE [openidm]
GO

-- -----------------------------------------------------
-- Login openidm
-- -----------------------------------------------------
IF (NOT EXISTS (select loginname from master.dbo.syslogins where name = N'openidm' and dbname = N'openidm'))
CREATE LOGIN [openidm] WITH PASSWORD=N'openidm', DEFAULT_DATABASE=[openidm], CHECK_EXPIRATION=OFF, CHECK_POLICY=OFF
GO

-- -----------------------------------------------------
-- User openidm - Database owner user
-- -----------------------------------------------------
IF (NOT EXISTS (select name from dbo.sysusers where name = N'openidm'))
CREATE USER [openidm]		  FOR LOGIN [openidm] WITH DEFAULT_SCHEMA = [openidm]
GO

-- -----------------------------------------------------
-- Schema openidm
-- -----------------------------------------------------
IF (NOT EXISTS (SELECT name FROM sys.schemas WHERE name = N'openidm'))
EXECUTE sp_executesql N'CREATE SCHEMA [openidm] AUTHORIZATION [openidm]'

EXEC sp_addrolemember N'db_owner', N'openidm'
GO

BEGIN TRANSACTION

-- -----------------------------------------------------
-- Table `openidm`.`objecttypes`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='objecttypes' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[objecttypes]
(
  id NUMERIC(19,0) NOT NULL IDENTITY ,
  objecttype NVARCHAR(255) NOT NULL ,
  PRIMARY KEY CLUSTERED (id) ,
);
CREATE UNIQUE INDEX idx_objecttypes_objecttype ON [openidm].[objecttypes] (objecttype ASC);
END

-- -----------------------------------------------------
-- Table `openidm`.`genericobjects`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='genericobjects' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[genericobjects]
(
  id NUMERIC(19,0) NOT NULL IDENTITY ,
  objecttypes_id NUMERIC(19,0) NOT NULL ,
  objectid NVARCHAR(255) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  fullobject NVARCHAR(MAX) NULL ,

  CONSTRAINT fk_genericobjects_objecttypes
  	FOREIGN KEY (objecttypes_id)
  	REFERENCES [openidm].[objecttypes] (id)
  	ON DELETE CASCADE
  	ON UPDATE NO ACTION,
  PRIMARY KEY CLUSTERED (id),
);
CREATE UNIQUE INDEX idx_genericobjects_object ON [openidm].[genericobjects] (objecttypes_id ASC, objectid ASC);
CREATE INDEX fk_genericobjects_objecttypes ON [openidm].[genericobjects] (objecttypes_id ASC);
END

-- -----------------------------------------------------
-- Table `openidm`.`genericobjectproperties`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='genericobjectproperties' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[genericobjectproperties]
(
  genericobjects_id NUMERIC(19,0) NOT NULL ,
  propkey NVARCHAR(255) NOT NULL ,
  proptype NVARCHAR(32) NULL ,
  propvalue NVARCHAR(195) NULL ,
  propindex NUMERIC(19,0) NOT NULL DEFAULT 0,
  PRIMARY KEY CLUSTERED (genericobjects_id, propkey, propindex),
  CONSTRAINT fk_genericobjectproperties_genericobjects
    FOREIGN KEY (genericobjects_id)
    REFERENCES [openidm].[genericobjects] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);
CREATE INDEX fk_genericobjectproperties_genericobjects ON [openidm].[genericobjectproperties] (genericobjects_id ASC);
CREATE INDEX idx_genericobjectproperties_propkey ON [openidm].[genericobjectproperties] (propkey ASC);
CREATE INDEX idx_genericobjectproperties_propvalue ON [openidm].[genericobjectproperties] (propvalue ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`managedobjects`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='managedobjects' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[managedobjects]
(
  id NUMERIC(19,0) NOT NULL IDENTITY ,
  objecttypes_id NUMERIC(19,0) NOT NULL ,
  objectid NVARCHAR(255) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  fullobject NVARCHAR(MAX) NULL ,
  CONSTRAINT fk_managedobjects_objectypes
    FOREIGN KEY (objecttypes_id)
    REFERENCES [openidm].[objecttypes] (id )
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  PRIMARY KEY CLUSTERED (id),
);
CREATE UNIQUE INDEX idx_managedobjects_object ON [openidm].[managedobjects] (objecttypes_id ASC, objectid ASC);
CREATE INDEX fk_managedobjects_objectypes ON [openidm].[managedobjects] (objecttypes_id ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`managedobjectproperties`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='managedobjectproperties' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[managedobjectproperties]
(
  managedobjects_id NUMERIC(19,0) NOT NULL ,
  propkey NVARCHAR(255) NOT NULL ,
  proptype NVARCHAR(32) NULL ,
  propvalue NVARCHAR(195) NULL ,
  propindex NUMERIC(19,0) NOT NULL DEFAULT 0,
  PRIMARY KEY CLUSTERED (managedobjects_id, propkey, propindex),
  CONSTRAINT fk_managedobjectproperties_managedobjects
    FOREIGN KEY (managedobjects_id)
    REFERENCES [openidm].[managedobjects] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);
CREATE INDEX fk_managedobjectproperties_managedobjects ON [openidm].[managedobjectproperties] (managedobjects_id ASC);
CREATE INDEX idx_managedobjectproperties_propkey ON [openidm].[managedobjectproperties] (propkey ASC);
CREATE INDEX idx_managedobjectproperties_propvalue ON [openidm].[managedobjectproperties] (propvalue ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`configobjects`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='configobjects' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[configobjects]
(
  id NUMERIC(19,0) NOT NULL IDENTITY ,
  objecttypes_id NUMERIC(19,0) NOT NULL ,
  objectid NVARCHAR(255) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  fullobject NVARCHAR(MAX) NULL ,
  CONSTRAINT fk_configobjects_objecttypes
    FOREIGN KEY (objecttypes_id)
    REFERENCES [openidm].[objecttypes] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  PRIMARY KEY CLUSTERED (id),
);
CREATE INDEX fk_configobjects_objecttypes ON [openidm].[configobjects] (objecttypes_id ASC);
CREATE UNIQUE INDEX idx_configobjects_object ON [openidm].[configobjects] (objecttypes_id ASC, objectid ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`configobjectproperties`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='configobjectproperties' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[configobjectproperties] (
  configobjects_id NUMERIC(19,0) NOT NULL ,
  propkey NVARCHAR(255) NOT NULL ,
  proptype NVARCHAR(255) NULL ,
  propvalue NVARCHAR(195) NULL ,
  propindex NUMERIC(19,0) NOT NULL DEFAULT 0,
  PRIMARY KEY CLUSTERED (configobjects_id, propkey, propindex),
  CONSTRAINT fk_configobjectproperties_configobjects
    FOREIGN KEY (configobjects_id)
    REFERENCES [openidm].[configobjects] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);
CREATE INDEX fk_configobjectproperties_configobjects ON [openidm].[configobjectproperties] (configobjects_id ASC);
CREATE INDEX idx_configobjectproperties_propkey ON [openidm].[configobjectproperties] (propkey ASC);
CREATE INDEX idx_configobjectproperties_propvalue ON [openidm].[configobjectproperties] (propvalue ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`notificationobjects`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='notificationobjects' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[notificationobjects]
(
  id NUMERIC(19,0) NOT NULL IDENTITY ,
  objecttypes_id NUMERIC(19,0) NOT NULL ,
  objectid NVARCHAR(255) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  fullobject NVARCHAR(MAX) NULL ,
  CONSTRAINT fk_notificationobjects_objecttypes
    FOREIGN KEY (objecttypes_id)
    REFERENCES [openidm].[objecttypes] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  PRIMARY KEY CLUSTERED (id),
);
CREATE INDEX fk_notificationobjects_objecttypes ON [openidm].[notificationobjects] (objecttypes_id ASC);
CREATE UNIQUE INDEX idx_notificationobjects_object ON [openidm].[notificationobjects] (objecttypes_id ASC, objectid ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`notificationobjectproperties`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='notificationobjectproperties' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[notificationobjectproperties] (
  notificationobjects_id NUMERIC(19,0) NOT NULL ,
  propkey NVARCHAR(255) NOT NULL ,
  proptype NVARCHAR(255) NULL ,
  propvalue NVARCHAR(195) NULL ,
  propindex NUMERIC(19,0) NOT NULL DEFAULT 0,
  PRIMARY KEY CLUSTERED (notificationobjects_id, propkey, propindex),
  CONSTRAINT fk_notificationobjectproperties_notificationobjects
    FOREIGN KEY (notificationobjects_id)
    REFERENCES [openidm].[notificationobjects] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);
CREATE INDEX fk_notificationobjectproperties_notificationobjects ON [openidm].[notificationobjectproperties] (notificationobjects_id ASC);
CREATE INDEX idx_notificationobjectproperties_propkey ON [openidm].[notificationobjectproperties] (propkey ASC);
CREATE INDEX idx_notificationobjectproperties_propvalue ON [openidm].[notificationobjectproperties] (propvalue ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`relationships`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='relationships' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[relationships]
(
  id NUMERIC(19,0) NOT NULL IDENTITY ,
  objecttypes_id NUMERIC(19,0) NOT NULL ,
  objectid NVARCHAR(255) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  fullobject NVARCHAR(MAX) NULL ,
  firstresourcecollection NVARCHAR(120) ,
  firstresourceid NVARCHAR(56) ,
  firstpropertyname NVARCHAR(90) ,
  secondresourcecollection NVARCHAR(120) ,
  secondresourceid NVARCHAR(56) ,
  secondpropertyname NVARCHAR(90) ,
  CONSTRAINT fk_relationships_objecttypes
    FOREIGN KEY (objecttypes_id)
    REFERENCES [openidm].[objecttypes] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  PRIMARY KEY CLUSTERED (id),
);
CREATE INDEX idx_relationships_first_object ON [openidm].[relationships] (firstresourcecollection ASC, firstresourceid ASC, firstpropertyname ASC);
CREATE INDEX idx_relationships_second_object ON [openidm].[relationships] (secondresourcecollection ASC, secondresourceid ASC, secondpropertyname ASC);
CREATE INDEX idx_relationships_originFirst ON [openidm].[relationships] (firstresourceid ASC, firstresourcecollection ASC, firstpropertyname ASC, secondresourceid ASC, secondresourcecollection ASC);
CREATE INDEX idx_relationships_originSecond ON [openidm].[relationships] (secondresourceid ASC, secondresourcecollection ASC, secondpropertyname ASC, firstresourceid ASC, firstresourcecollection ASC);
CREATE UNIQUE INDEX idx_relationships_object ON [openidm].[relationships] (objectid ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`relationshipproperties`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='relationshipproperties' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[relationshipproperties] (
  relationships_id NUMERIC(19,0) NOT NULL ,
  propkey NVARCHAR(255) NOT NULL ,
  proptype NVARCHAR(255) NULL ,
  propvalue NVARCHAR(195) NULL ,
  propindex NUMERIC(19,0) NOT NULL DEFAULT 0,
  PRIMARY KEY CLUSTERED (relationships_id, propkey, propindex),
  CONSTRAINT fk_relationshipproperties_relationships
    FOREIGN KEY (relationships_id)
    REFERENCES [openidm].[relationships] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);
CREATE INDEX fk_relationshipproperties_relationships ON [openidm].[relationshipproperties] (relationships_id ASC);
CREATE INDEX idx_relationshipproperties_propkey ON [openidm].[relationshipproperties] (propkey ASC);
CREATE INDEX idx_relationshipproperties_propvalue ON [openidm].[relationshipproperties] (propvalue ASC);
END

-- -----------------------------------------------------
-- Table `openidm`.`links`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='links' AND xtype='U')
BEGIN
CREATE  TABLE  [openidm].[links]
(
  objectid NVARCHAR(38) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  linktype NVARCHAR(127) NOT NULL ,
  linkqualifier NVARCHAR(50) NOT NULL ,
  firstid NVARCHAR(255) NOT NULL ,
  secondid NVARCHAR(255) NOT NULL ,
  PRIMARY KEY CLUSTERED (objectid)
);
CREATE UNIQUE INDEX idx_links_first ON [openidm].[links] (linktype ASC, linkqualifier ASC, firstid ASC);
CREATE UNIQUE INDEX idx_links_second ON [openidm].[links] (linktype ASC, linkqualifier ASC, secondid ASC);
CREATE INDEX idx_links_firstid ON [openidm].[links] (firstid ASC);
CREATE INDEX idx_links_secondid ON [openidm].[links] (secondid ASC);

END


-- -----------------------------------------------------
-- Table `openidm`.`internaluser`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='internaluser' and xtype='U')
BEGIN
CREATE  TABLE [openidm].[internaluser]
(
  objectid NVARCHAR(255) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  pwd NVARCHAR(510) NULL ,
  PRIMARY KEY CLUSTERED (objectid)
);
END


-- -----------------------------------------------------
-- Table `openidm`.`internalrole`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='internalrole' and xtype='U')
BEGIN
CREATE  TABLE [openidm].[internalrole]
(
  objectid NVARCHAR(255) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  name NVARCHAR(64) ,
  description NVARCHAR(510) NULL ,
  temporalConstraints NVARCHAR(1024) NULL ,
  condition NVARCHAR(1024) NULL ,
  privs NVARCHAR(MAX) NULL ,
  PRIMARY KEY CLUSTERED (objectid)
);
END

-- -----------------------------------------------------
-- Table `openidm`.`schedulerobjects`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='schedulerobjects' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[schedulerobjects]
(
  id NUMERIC(19,0) NOT NULL IDENTITY ,
  objecttypes_id NUMERIC(19,0) NOT NULL ,
  objectid NVARCHAR(255) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  fullobject NVARCHAR(MAX) NULL ,
  CONSTRAINT fk_schedulerobjects_objecttypes
    FOREIGN KEY (objecttypes_id)
    REFERENCES [openidm].[objecttypes] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  PRIMARY KEY CLUSTERED (id),
);
CREATE INDEX fk_schedulerobjects_objecttypes ON [openidm].[schedulerobjects] (objecttypes_id ASC);
CREATE UNIQUE INDEX idx_schedulerobjects_object ON [openidm].[schedulerobjects] (objecttypes_id ASC, objectid ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`schedulerobjectproperties`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='schedulerobjectproperties' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[schedulerobjectproperties] (
  schedulerobjects_id NUMERIC(19,0) NOT NULL ,
  propkey NVARCHAR(255) NOT NULL ,
  proptype NVARCHAR(32) NULL ,
  propvalue NVARCHAR(195) NULL ,
  propindex NUMERIC(19,0) NOT NULL DEFAULT 0,
  PRIMARY KEY CLUSTERED (schedulerobjects_id, propkey, propindex),
  CONSTRAINT fk_schedulerobjectproperties_schedulerobjects
    FOREIGN KEY (schedulerobjects_id)
    REFERENCES [openidm].[schedulerobjects] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);
CREATE INDEX fk_schedulerobjectproperties_schedulerobjects ON [openidm].[schedulerobjectproperties] (schedulerobjects_id ASC);
CREATE INDEX idx_schedulerobjectproperties_propkey ON [openidm].[schedulerobjectproperties] (propkey ASC);
CREATE INDEX idx_schedulerobjectproperties_propvalue ON [openidm].[schedulerobjectproperties] (propvalue ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`clusterobjects`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='clusterobjects' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[clusterobjects]
(
  id NUMERIC(19,0) NOT NULL IDENTITY ,
  objecttypes_id NUMERIC(19,0) NOT NULL ,
  objectid NVARCHAR(255) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  fullobject NVARCHAR(MAX) NULL ,
  CONSTRAINT fk_clusterobjects_objecttypes
    FOREIGN KEY (objecttypes_id)
    REFERENCES [openidm].[objecttypes] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  PRIMARY KEY CLUSTERED (id),
);
CREATE INDEX fk_clusterobjects_objecttypes ON [openidm].[clusterobjects] (objecttypes_id ASC);
CREATE UNIQUE INDEX idx_clusterobjects_object ON [openidm].[clusterobjects] (objecttypes_id ASC, objectid ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`clusterobjectproperties`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='clusterobjectproperties' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[clusterobjectproperties] (
  clusterobjects_id NUMERIC(19,0) NOT NULL ,
  propkey NVARCHAR(255) NOT NULL ,
  proptype NVARCHAR(32) NULL ,
  propvalue NVARCHAR(195) NULL ,
  propindex NUMERIC(19,0) NOT NULL DEFAULT 0,
  PRIMARY KEY CLUSTERED (clusterobjects_id, propkey, propindex),
  CONSTRAINT fk_clusterobjectproperties_clusterobjects
    FOREIGN KEY (clusterobjects_id)
    REFERENCES [openidm].[clusterobjects] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);
CREATE INDEX fk_clusterobjectproperties_clusterobjects ON [openidm].[clusterobjectproperties] (clusterobjects_id ASC);
CREATE INDEX idx_clusterobjectproperties_propkey ON [openidm].[clusterobjectproperties] (propkey ASC);
CREATE INDEX idx_clusterobjectproperties_propvalue ON [openidm].[clusterobjectproperties] (propvalue ASC);
END

-- -----------------------------------------------------
-- Table `openidm`.`clusteredrecontargetids`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='clusteredrecontargetids' AND xtype='U')
BEGIN
CREATE  TABLE  [openidm].[clusteredrecontargetids]
(
  objectid NVARCHAR(38) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  reconid NVARCHAR(255) NOT NULL ,
  targetids NVARCHAR(MAX) NOT NULL ,
  PRIMARY KEY CLUSTERED (objectid)
);
CREATE INDEX idx_clusteredrecontargetids_reconid ON [openidm].[clusteredrecontargetids] (reconid ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`uinotification`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='uinotification' and xtype='U')
BEGIN
CREATE  TABLE [openidm].[uinotification] (
  objectid NVARCHAR(38) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  notificationtype NVARCHAR(255) NOT NULL ,
  createdate NVARCHAR(38) NOT NULL ,
  message NVARCHAR(MAX) NOT NULL ,
  requester NVARCHAR(255) NULL ,
  receiverid NVARCHAR(255) NOT NULL ,
  requesterid NVARCHAR(255) NULL ,
  notificationsubtype NVARCHAR(255) NULL ,
  PRIMARY KEY CLUSTERED (objectid)
);
CREATE INDEX idx_uinotification_receiverid ON [openidm].[uinotification] (receiverid ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`updateobjects`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='updateobjects' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[updateobjects]
(
  id NUMERIC(19,0) NOT NULL IDENTITY ,
  objecttypes_id NUMERIC(19,0) NOT NULL ,
  objectid NVARCHAR(255) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  fullobject NVARCHAR(MAX) NULL ,

  CONSTRAINT fk_updateobjects_objecttypes
  	FOREIGN KEY (objecttypes_id)
  	REFERENCES [openidm].[objecttypes] (id)
  	ON DELETE CASCADE
  	ON UPDATE NO ACTION,
  PRIMARY KEY CLUSTERED (id),
);
CREATE UNIQUE INDEX idx_updateobjects_object ON [openidm].[updateobjects] (objecttypes_id ASC, objectid ASC);
CREATE INDEX fk_updateobjects_objecttypes ON [openidm].[updateobjects] (objecttypes_id ASC);
END

-- -----------------------------------------------------
-- Table `openidm`.`updateobjectproperties`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='updateobjectproperties' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[updateobjectproperties]
(
  updateobjects_id NUMERIC(19,0) NOT NULL ,
  propkey NVARCHAR(255) NOT NULL ,
  proptype NVARCHAR(32) NULL ,
  propvalue NVARCHAR(195) NULL ,
  propindex NUMERIC(19,0) NOT NULL DEFAULT 0,
  PRIMARY KEY CLUSTERED (updateobjects_id, propkey, propindex),
  CONSTRAINT fk_updateobjectproperties_updateobjects
    FOREIGN KEY (updateobjects_id)
    REFERENCES [openidm].[updateobjects] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);
CREATE INDEX fk_updateobjectproperties_updateobjects ON [openidm].[updateobjectproperties] (updateobjects_id ASC);
CREATE INDEX idx_updateobjectproperties_propkey ON [openidm].[updateobjectproperties] (propkey ASC);
CREATE INDEX idx_updateobjectproperties_propvalue ON [openidm].[updateobjectproperties] (propvalue ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`importobjects`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='importobjects' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[importobjects]
(
  id NUMERIC(19,0) NOT NULL IDENTITY ,
  objecttypes_id NUMERIC(19,0) NOT NULL ,
  objectid NVARCHAR(255) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  fullobject NVARCHAR(MAX) NULL ,

  CONSTRAINT fk_importobjects_objecttypes
  	FOREIGN KEY (objecttypes_id)
  	REFERENCES [openidm].[objecttypes] (id)
  	ON DELETE CASCADE
  	ON UPDATE NO ACTION,
  PRIMARY KEY CLUSTERED (id),
);
CREATE UNIQUE INDEX idx_importobjects_object ON [openidm].[importobjects] (objecttypes_id ASC, objectid ASC);
CREATE INDEX fk_importobjects_objecttypes ON [openidm].[importobjects] (objecttypes_id ASC);
END

-- -----------------------------------------------------
-- Table `openidm`.`importobjectproperties`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='importobjectproperties' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[importobjectproperties]
(
  importobjects_id NUMERIC(19,0) NOT NULL ,
  propkey NVARCHAR(255) NOT NULL ,
  proptype NVARCHAR(32) NULL ,
  propvalue NVARCHAR(195) NULL ,
  propindex NUMERIC(19,0) NOT NULL DEFAULT 0,
  PRIMARY KEY CLUSTERED (importobjects_id, propkey, propindex),
  CONSTRAINT fk_importobjectproperties_importobjects
    FOREIGN KEY (importobjects_id)
    REFERENCES [openidm].[importobjects] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);
CREATE INDEX fk_importobjectproperties_importobjects ON [openidm].[importobjectproperties] (importobjects_id ASC);
CREATE INDEX idx_importobjectproperties_propkey ON [openidm].[importobjectproperties] (propkey ASC);
CREATE INDEX idx_importobjectproperties_propvalue ON [openidm].[importobjectproperties] (propvalue ASC);
END


-- -----------------------------------------------------
-- Table `openidm`.`syncqueue`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='syncqueue' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[syncqueue]
(
  objectid NVARCHAR(38) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  syncAction NVARCHAR(38) NOT NULL ,
  resourceCollection NVARCHAR(38) NOT NULL ,
  resourceId NVARCHAR(255) NOT NULL ,
  mapping NVARCHAR(127) NOT NULL ,
  objectRev NVARCHAR(38) NULL ,
  oldObject NVARCHAR(MAX) NULL ,
  newObject NVARCHAR(MAX) NULL ,
  context NVARCHAR(MAX) NOT NULL ,
  state NVARCHAR(38) NOT NULL ,
  nodeId NVARCHAR(255) NULL,
  createDate NVARCHAR(255) NOT NULL ,
  PRIMARY KEY CLUSTERED (objectid) ,
);
CREATE INDEX idx_syncqueue_mapping_state_createdate ON [openidm].[syncqueue] (mapping ASC, state ASC, createDate ASC);
END

-- -----------------------------------------------------
-- Table `openidm`.`locks`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='locks' AND xtype='U')
BEGIN
CREATE  TABLE  [openidm].[locks]
(
  objectid NVARCHAR(255) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  nodeid NVARCHAR(255),
  PRIMARY KEY CLUSTERED (objectid)
);
CREATE INDEX idx_locks_nodeid ON [openidm].[locks] (nodeid ASC);
END

-- -----------------------------------------------------
-- Table `openidm`.`files`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='files' AND xtype='U')
BEGIN
CREATE  TABLE  [openidm].[files]
(
  objectid NVARCHAR(38) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  content NVARCHAR(MAX) NULL,
  PRIMARY KEY CLUSTERED (objectid)
);
END


-- -----------------------------------------------------
-- Table `openidm`.`metaobjects`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='metaobjects' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[metaobjects]
(
  id NUMERIC(19,0) NOT NULL IDENTITY ,
  objecttypes_id NUMERIC(19,0) NOT NULL ,
  objectid NVARCHAR(255) NOT NULL ,
  rev NVARCHAR(38) NOT NULL ,
  fullobject NVARCHAR(MAX) NULL ,

  CONSTRAINT fk_metaobjects_objecttypes
  	FOREIGN KEY (objecttypes_id)
  	REFERENCES [openidm].[objecttypes] (id)
  	ON DELETE CASCADE
  	ON UPDATE NO ACTION,
  PRIMARY KEY CLUSTERED (id),
);
CREATE UNIQUE INDEX idx_metaobjects_object ON [openidm].[metaobjects] (objecttypes_id ASC, objectid ASC);
CREATE INDEX fk_metaobjects_objecttypes ON [openidm].[metaobjects] (objecttypes_id ASC);
END

-- -----------------------------------------------------
-- Table `openidm`.`metaobjectproperties`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='metaobjectproperties' AND xtype='U')
BEGIN
CREATE  TABLE [openidm].[metaobjectproperties]
(
  metaobjects_id NUMERIC(19,0) NOT NULL ,
  propkey NVARCHAR(255) NOT NULL ,
  proptype NVARCHAR(32) NULL ,
  propvalue NVARCHAR(195) NULL ,
  propindex NUMERIC(19,0) NOT NULL DEFAULT 0,
  PRIMARY KEY CLUSTERED (metaobjects_id, propkey, propindex),
  CONSTRAINT fk_metaobjectproperties_metaobjects
    FOREIGN KEY (metaobjects_id)
    REFERENCES [openidm].[metaobjects] (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);
CREATE INDEX fk_metaobjectproperties_metaobjects ON [openidm].[metaobjectproperties] (metaobjects_id ASC);
CREATE INDEX idx_metaobjectproperties_propkey ON [openidm].[metaobjectproperties] (propkey ASC);
CREATE INDEX idx_metaobjectproperties_propvalue ON [openidm].[metaobjectproperties] (propvalue ASC);
END

-- -----------------------------------------------------
-- Table `openidm`.`reconassoc`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='reconassoc' AND xtype='U')
BEGIN
CREATE TABLE [openidm].[reconassoc]
(
  objectid NVARCHAR(255) NOT NULL,
  rev NVARCHAR(38)  NOT NULL,
  mapping NVARCHAR(255) NOT NULL,
  sourceResourceCollection NVARCHAR(255) NOT NULL,
  targetResourceCollection NVARCHAR(255) NOT NULL,
  isAnalysis NVARCHAR(5) NOT NULL,
  finishTime NVARCHAR(38) NULL,
  PRIMARY KEY CLUSTERED (objectid)
);
CREATE INDEX idx_reconassoc_mapping ON [openidm].[reconassoc] (mapping ASC);
END

-- -----------------------------------------------------
-- Table `openidm`.`reconassocentry`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='reconassocentry' AND xtype='U')
BEGIN
CREATE TABLE [openidm].[reconassocentry] (
     objectid NVARCHAR(38) NOT NULL ,
     rev NVARCHAR(38) NOT NULL ,
     reconId NVARCHAR(255) NOT NULL ,
     situation NVARCHAR(38) NULL ,
     action NVARCHAR(38) NULL ,
     phase NVARCHAR(38) NULL ,
     linkQualifier NVARCHAR(38) NOT NULL ,
     sourceObjectId NVARCHAR(255) NULL ,
     targetObjectId NVARCHAR(255) NULL ,
     status NVARCHAR(38) NOT NULL ,
     exception NVARCHAR(MAX) NULL ,
     message NVARCHAR(MAX) NULL ,
     messagedetail NVARCHAR(MAX) NULL ,
     ambiguousTargetObjectIds NVARCHAR(MAX) NULL ,
     PRIMARY KEY CLUSTERED (objectid) ,
     CONSTRAINT fk_reconassocentry_reconassoc_id
       FOREIGN KEY (reconId)
       REFERENCES [openidm].[reconassoc] (objectid)
       ON DELETE CASCADE
       ON UPDATE NO ACTION
);
CREATE INDEX idx_reconassocentry_situation ON [openidm].[reconassocentry] (situation ASC);
END
GO

-- -----------------------------------------------------
-- View `openidm`.`reconassocentryview`
-- GO will dispatch all of the previous table creation commands - view creation must be in its own batch, so
-- GO precedes view creation. And also, view creation cannot exist in a procedure - i.e. bracketed by
-- BEGIN and END as in table creation - so the view must be dropped if it exists, which is a slightly different
-- semantic than for table creation.
-- -----------------------------------------------------
IF EXISTS (SELECT name FROM sysobjects where name='reconassocentryview' AND xtype='V')
  DROP VIEW [openidm].[reconassocentryview]
GO

CREATE VIEW [openidm].[reconassocentryview] AS
  SELECT
    assoc.objectid AS reconId,
    assoc.mapping AS mapping,
    assoc.sourceResourceCollection AS sourceResourceCollection,
    assoc.targetResourceCollection AS targetResourceCollection,
    entry.objectid AS objectid,
    entry.rev AS rev,
    entry.action AS action,
    entry.situation AS situation,
    entry.linkQualifier AS linkQualifier,
    entry.sourceObjectId AS sourceObjectId,
    entry.targetObjectId AS targetObjectId,
    entry.status AS status,
    entry.exception AS exception,
    entry.message AS message,
    entry.messagedetail AS messagedetail,
    entry.ambiguousTargetObjectIds AS ambiguousTargetObjectIds
  FROM [openidm].[reconassocentry] entry, [openidm].[reconassoc] assoc
  WHERE assoc.objectid = entry.reconId ;
GO

-- -----------------------------------------------------
-- Table `openidm`.`relationshipresources`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='relationshipresources' AND xtype='U')
BEGIN
CREATE TABLE [openidm].[relationshipresources] (
     id NVARCHAR(255) NOT NULL,
     originresourcecollection NVARCHAR(120) NOT NULL,
     originproperty NVARCHAR(90) NOT NULL,
     refresourcecollection NVARCHAR(120) NOT NULL,
     originfirst TINYINT NOT NULL,
     reverseproperty NVARCHAR(90),
     PRIMARY KEY CLUSTERED (originresourcecollection, originproperty, refresourcecollection, originfirst)
);
END
GO

USE [master]
COMMIT;
