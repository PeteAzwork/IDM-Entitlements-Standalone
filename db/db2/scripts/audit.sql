-- -----------------------------------------------------
-- Table `openidm`.`auditauthentication`
-- -----------------------------------------------------
CREATE TABLESPACE SOIDM20 MANAGED BY AUTOMATIC STORAGE;
CREATE TABLE SOPENIDM.AUDITAUTHENTICATION (
  objectid VARCHAR(56) NOT NULL,
  transactionid VARCHAR(255) NOT NULL,
  activitydate VARCHAR(29) NOT NULL,
  userid VARCHAR(255) NULL,
  eventname VARCHAR(50) NULL,
  provider VARCHAR(255) NULL,
  method VARCHAR(25) NULL,
  result VARCHAR(255) NULL,
  principals CLOB(2M),
  context CLOB(2M),
  entries CLOB(2M),
  trackingids CLOB(2M),
  PRIMARY KEY (objectid)
) IN DOPENIDM.SOIDM20;


-- -----------------------------------------------------
-- Table openidm.auditrecon
-- -----------------------------------------------------

CREATE TABLESPACE SOIDM08 MANAGED BY AUTOMATIC STORAGE;
CREATE TABLE SOPENIDM.AUDITRECON (
    objectid VARCHAR(56) NOT NULL ,
    transactionid VARCHAR(255) NOT NULL ,
    activitydate VARCHAR(29) NOT NULL ,
    eventname VARCHAR(50) NULL ,
    userid VARCHAR(255) NULL ,
    trackingids CLOB(2M),
    activity VARCHAR(24) NULL ,
    exceptiondetail CLOB(2M) NULL ,
    linkqualifier VARCHAR(255) NULL ,
    mapping VARCHAR(511) NULL ,
    message CLOB(2M) NULL ,
    messagedetail CLOB(2M) NULL ,
    situation VARCHAR(24) NULL ,
    sourceobjectid VARCHAR(511) NULL ,
    status VARCHAR(20) NULL ,
    targetobjectid VARCHAR(511) NULL ,
    reconciling VARCHAR(12) NULL ,
    ambiguoustargetobjectids CLOB(2M) NULL ,
    reconaction VARCHAR(36) NULL ,
    entrytype VARCHAR(7) NULL ,
    reconid VARCHAR(56) NULL ,
    PRIMARY KEY (OBJECTID)
) IN DOPENIDM.SOIDM08;
COMMENT ON TABLE SOPENIDM.AUDITRECON IS 'OPENIDM - Reconciliation Audit Log';

CREATE INDEX SOPENIDM.IDX_AUDITRECON_RECONID ON SOPENIDM.AUDITRECON (reconid ASC);
CREATE INDEX SOPENIDM.IDX_AUDITRECON_ENTRYTYPE ON SOPENIDM.AUDITRECON (entrytype ASC);

-- -----------------------------------------------------
-- Table openidm.auditsync
-- -----------------------------------------------------

CREATE TABLESPACE SOIDM13 MANAGED BY AUTOMATIC STORAGE;
CREATE TABLE SOPENIDM.AUDITSYNC (
    objectid                VARCHAR(56) NOT NULL ,
    transactionid           VARCHAR(255) NOT NULL ,
    activitydate            VARCHAR(29) NOT NULL ,
    eventname               VARCHAR(50) NULL ,
    userid VARCHAR(255) NULL ,
    trackingids CLOB(2M),
    activity                VARCHAR(24) NULL ,
    exceptiondetail         CLOB(2M) NULL ,
    linkqualifier           VARCHAR(255) NULL ,
    mapping                 VARCHAR(511) NULL ,
    message                 CLOB(2M) NULL ,
    messagedetail           CLOB(2M) NULL ,
    situation               VARCHAR(24) NULL ,
    sourceobjectid          VARCHAR(511) NULL ,
    status                  VARCHAR(20) NULL ,
    targetobjectid          VARCHAR(511) NULL ,
    PRIMARY KEY (objectid) )
IN DOPENIDM.SOIDM13;
COMMENT ON TABLE SOPENIDM.AUDITSYNC IS 'OPENIDM - Sync Audit Log';

-- -----------------------------------------------------
-- Table `openidm`.`auditconfig`
-- -----------------------------------------------------
CREATE TABLESPACE SOIDM21 MANAGED BY AUTOMATIC STORAGE;
CREATE  TABLE SOPENIDM.AUDITCONFIG (
  objectid VARCHAR(56) NOT NULL ,
  activitydate VARCHAR(29) NOT NULL,
  eventname VARCHAR(255) NULL ,
  transactionid VARCHAR(255) NOT NULL ,
  userid VARCHAR(255) NULL ,
  trackingids CLOB(2M),
  runas VARCHAR(255) NULL ,
  configobjectid VARCHAR(255) NULL ,
  operation VARCHAR(255) NULL ,
  beforeObject CLOB(2M) NULL ,
  afterObject CLOB(2M) NULL ,
  changedfields CLOB(2M) NULL ,
  rev VARCHAR(255) NULL,
  PRIMARY KEY (objectid)
) IN DOPENIDM.SOIDM21;


-- -----------------------------------------------------
-- Table openidm.auditactivity
-- -----------------------------------------------------

CREATE TABLESPACE SOIDM09 MANAGED BY AUTOMATIC STORAGE;
CREATE TABLE SOPENIDM.AUDITACTIVITY (
    objectid VARCHAR(56) NOT NULL ,
    activitydate VARCHAR(29) NOT NULL,
    eventname VARCHAR(255) NULL ,
    transactionid VARCHAR(255) NOT NULL ,
    userid VARCHAR(255) NULL ,
    trackingids CLOB(2M),
    runas VARCHAR(255) NULL ,
    activityobjectid VARCHAR(255) NULL ,
    operation VARCHAR(255) NULL ,
    subjectbefore CLOB(2M) NULL ,
    subjectafter CLOB(2M) NULL ,
    changedfields CLOB(2M) NULL ,
    subjectrev VARCHAR(255) NULL ,
    passwordchanged VARCHAR(5) NULL ,
    message CLOB(2M) NULL,
    provider VARCHAR(255) NULL,
    context VARCHAR(25) NULL,
    status VARCHAR(20) ,
    PRIMARY KEY (objectid)
) IN DOPENIDM.SOIDM09;
COMMENT ON TABLE SOPENIDM.AUDITACTIVITY IS 'OPENIDM - Activity Audit Logs';
CREATE INDEX SOPENIDM.IDX_AUDITACTIVITY_TRANSACTIONID ON SOPENIDM.AUDITACTIVITY (transactionid ASC);

-- -----------------------------------------------------
-- Table openidm.auditaccess
-- -----------------------------------------------------

CREATE TABLESPACE SOIDM10 MANAGED BY AUTOMATIC STORAGE;
CREATE TABLE SOPENIDM.AUDITACCESS (
    objectid VARCHAR(56) NOT NULL ,
    activitydate VARCHAR(29) NOT NULL,
    eventname VARCHAR(255) ,
    transactionid VARCHAR(255) NOT NULL ,
    userid VARCHAR(255) ,
    trackingids CLOB(2M),
    server_ip VARCHAR(40) ,
    server_port VARCHAR(5) ,
    client_ip VARCHAR(40) ,
    client_port VARCHAR(5) ,
    request_protocol VARCHAR(255) NULL ,
    request_operation VARCHAR(255) NULL ,
    request_detail CLOB(2M) NULL ,
    http_request_secure VARCHAR(255) NULL ,
    http_request_method VARCHAR(255) NULL ,
    http_request_path VARCHAR(255) NULL ,
    http_request_queryparameters CLOB(2M) NULL ,
    http_request_headers CLOB(2M) NULL ,
    http_request_cookies CLOB(2M) NULL ,
    http_response_headers CLOB(2M) NULL ,
    response_status VARCHAR(255) NULL ,
    response_statuscode VARCHAR(255) NULL ,
    response_elapsedtime VARCHAR(255) NULL ,
    response_elapsedtimeunits VARCHAR(255) NULL ,
    response_detail CLOB(2M) NULL ,
    roles CLOB(2M) NULL ,
    PRIMARY KEY (OBJECTID)
) IN DOPENIDM.SOIDM10;
COMMENT ON TABLE SOPENIDM.AUDITACCESS IS 'OPENIDM - Audit Access';