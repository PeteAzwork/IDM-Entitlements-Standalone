-- -----------------------------------------------------
-- Table `openidm`.`auditrecon`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='auditrecon' AND xtype='U')
BEGIN
CREATE  TABLE  [openidm].[auditrecon]
(
  objectid NVARCHAR(56) NOT NULL ,
  transactionid NVARCHAR(255) NOT NULL ,
  activitydate NVARCHAR(29) NOT NULL ,
  eventname NVARCHAR(50) NULL ,
  userid NVARCHAR(255) NULL ,
  trackingids NVARCHAR(MAX) ,
  activity NVARCHAR(24) NULL ,
  exceptiondetail NVARCHAR(MAX) NULL ,
  linkqualifier NVARCHAR(255) NULL ,
  mapping NVARCHAR(511) NULL ,
  message NVARCHAR(MAX) NULL ,
  messagedetail NVARCHAR(MAX) NULL ,
  situation NVARCHAR(24) NULL ,
  sourceobjectid NVARCHAR(511) NULL ,
  status NVARCHAR(20) NULL ,
  targetobjectid NVARCHAR(511) NULL ,
  reconciling NVARCHAR(12) NULL ,
  ambiguoustargetobjectids NVARCHAR(MAX) NULL ,
  reconaction NVARCHAR(36) NULL ,
  entrytype NVARCHAR(7) NULL ,
  reconid NVARCHAR(56) NULL ,
  PRIMARY KEY CLUSTERED (objectid)
);
CREATE INDEX idx_auditrecon_reconid ON [openidm].[auditrecon] (reconid ASC);
CREATE INDEX idx_auditrecon_entrytype ON [openidm].[auditrecon] (entrytype ASC);
EXEC sp_addextendedproperty 'MS_Description', 'Date format: 2011-09-09T14:58:17.654+02:00', 'SCHEMA', openidm, 'TABLE', auditrecon, 'COLUMN', activitydate;
END


-- -----------------------------------------------------
-- Table `openidm`.`auditsync`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='auditsync' AND xtype='U')
BEGIN
CREATE  TABLE  [openidm].[auditsync]
(
  objectid NVARCHAR(56) NOT NULL ,
  transactionid NVARCHAR(255) NOT NULL ,
  activitydate NVARCHAR(29) NOT NULL ,
  eventname NVARCHAR(50) NULL ,
  userid NVARCHAR(255) NULL ,
  trackingids NVARCHAR(MAX) ,
  activity NVARCHAR(24) NULL ,
  exceptiondetail NVARCHAR(MAX) NULL ,
  linkqualifier NVARCHAR(255) NULL ,
  mapping NVARCHAR(511) NULL ,
  message NVARCHAR(MAX) NULL ,
  messagedetail NVARCHAR(MAX) NULL ,
  situation NVARCHAR(24) NULL ,
  sourceobjectid NVARCHAR(511) NULL ,
  status NVARCHAR(20) NULL ,
  targetobjectid NVARCHAR(511) NULL ,
  PRIMARY KEY CLUSTERED (objectid)
);
EXEC sp_addextendedproperty 'MS_Description', 'Date format: 2011-09-09T14:58:17.654+02:00', 'SCHEMA', openidm, 'TABLE', auditsync, 'COLUMN', activitydate;
END

-- -----------------------------------------------------
-- Table `openidm`.`auditconfig`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='auditconfig' and xtype='U')
  BEGIN
    CREATE  TABLE [openidm].[auditconfig]
    (
      objectid NVARCHAR(56) NOT NULL,
      activitydate NVARCHAR(29) NOT NULL,
      eventname NVARCHAR(255) NULL,
      transactionid NVARCHAR(255) NOT NULL,
      userid NVARCHAR(255) NULL,
      trackingids NVARCHAR(MAX),
      runas NVARCHAR(255) NULL,
      configobjectid NVARCHAR(255) NULL ,
      operation NVARCHAR(255) NULL ,
      beforeObject NVARCHAR(MAX),
      afterObject NVARCHAR(MAX),
      changedfields NVARCHAR(MAX) NULL,
      rev NVARCHAR(255) NULL,
      PRIMARY KEY CLUSTERED (objectid),
    );
    EXEC sp_addextendedproperty 'MS_Description', 'Date format: 2011-09-09T14:58:17.654+02:00', 'SCHEMA', openidm, 'TABLE', auditconfig, 'COLUMN', activitydate;
  END


-- -----------------------------------------------------
-- Table `openidm`.`auditactivity`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='auditactivity' and xtype='U')
BEGIN
CREATE  TABLE [openidm].[auditactivity]
(
  objectid NVARCHAR(56) NOT NULL,
  activitydate NVARCHAR(29) NOT NULL,
  eventname NVARCHAR(255) NULL,
  transactionid NVARCHAR(255) NOT NULL,
  userid NVARCHAR(255) NULL,
  trackingids NVARCHAR(MAX),
  runas NVARCHAR(255) NULL,
  activityobjectid NVARCHAR(255) NULL ,
  operation NVARCHAR(255) NULL ,
  subjectbefore NVARCHAR(MAX),
  subjectafter NVARCHAR(MAX),
  changedfields NVARCHAR(MAX) NULL,
  subjectrev NVARCHAR(255) NULL,
  passwordchanged NVARCHAR(5) NULL,
  message NVARCHAR(MAX),
  provider NVARCHAR(255) NULL,
  context NVARCHAR(MAX) NULL,
  status NVARCHAR(20),
  PRIMARY KEY CLUSTERED (objectid),
);
EXEC sp_addextendedproperty 'MS_Description', 'Date format: 2011-09-09T14:58:17.654+02:00', 'SCHEMA', openidm, 'TABLE', auditactivity, 'COLUMN', activitydate;
END

-- -----------------------------------------------------
-- Table `openidm`.`auditaccess`
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='auditaccess' and xtype='U')
BEGIN
CREATE  TABLE [openidm].[auditaccess] (
  objectid NVARCHAR(56) NOT NULL ,
  activitydate NVARCHAR(29) NOT NULL ,
  eventname NVARCHAR(255) NULL ,
  transactionid NVARCHAR(255) NOT NULL ,
  userid NVARCHAR(255) NULL,
  trackingids NVARCHAR(MAX),
  server_ip NVARCHAR(40) ,
  server_port NVARCHAR(5) ,
  client_ip NVARCHAR(40) ,
  client_port NVARCHAR(5) ,
  request_protocol NVARCHAR(255) NULL ,
  request_operation NVARCHAR(255) NULL ,
  request_detail NVARCHAR(MAX) NULL ,
  http_request_secure NVARCHAR(255) NULL ,
  http_request_method NVARCHAR(255) NULL ,
  http_request_path NVARCHAR(255) NULL ,
  http_request_queryparameters NVARCHAR(MAX) NULL ,
  http_request_headers NVARCHAR(MAX) NULL ,
  http_request_cookies NVARCHAR(MAX) NULL ,
  http_response_headers NVARCHAR(MAX) NULL ,
  response_status NVARCHAR(255) NULL ,
  response_statuscode NVARCHAR(255) NULL ,
  response_elapsedtime NVARCHAR(255) NULL ,
  response_elapsedtimeunits NVARCHAR(255) NULL ,
  response_detail NVARCHAR(MAX) NULL ,
  roles NVARCHAR(MAX) NULL ,
  PRIMARY KEY CLUSTERED (objectid)
);
EXEC sp_addextendedproperty 'MS_Description', 'Date format: 2011-09-09T14:58:17.654+02:00', 'SCHEMA', openidm, 'TABLE', auditaccess, 'COLUMN', activitydate;
END

-- -----------------------------------------------------
-- Table openidm.auditauthentication
-- -----------------------------------------------------
IF NOT EXISTS (SELECT name FROM sysobjects where name='auditauthentication' and xtype='U')
BEGIN
CREATE TABLE [openidm].[auditauthentication] (
  objectid NVARCHAR(56) NOT NULL ,
  transactionid NVARCHAR(255) NOT NULL ,
  activitydate NVARCHAR(29) NOT NULL ,
  userid NVARCHAR(255) NULL ,
  eventname NVARCHAR(50) NULL ,
  provider NVARCHAR(255) NULL ,
  method NVARCHAR(25) NULL ,
  result NVARCHAR(255) NULL ,
  principals NVARCHAR(MAX) NULL ,
  context NVARCHAR(MAX) NULL ,
  entries NVARCHAR(MAX) NULL ,
  trackingids NVARCHAR(MAX),
  PRIMARY KEY CLUSTERED (objectid)
);
EXEC sp_addextendedproperty 'MS_Description', 'Date format: 2011-09-09T14:58:17.654+02:00', 'SCHEMA', openidm, 'TABLE', auditauthentication, 'COLUMN', activitydate;
END