-- -----------------------------------------------------
-- Table `openidm`.`managed_user`
-- -----------------------------------------------------
PROMPT Creating "openidm.managed_user".
CREATE TABLE openidm.managed_user
(
    objectid VARCHAR(58) NOT NULL PRIMARY KEY,
    rev VARCHAR(38) NOT NULL ,
    username VARCHAR(255),
    password VARCHAR(511),
    accountstatus VARCHAR(255),
    postalcode VARCHAR(255),
    stateprovince VARCHAR(255),
    postaladdress VARCHAR(255),
    country VARCHAR(255),
    city VARCHAR(255),
    givenname VARCHAR(255),
    description VARCHAR(255),
    sn VARCHAR(255),
    telephonenumber VARCHAR(255),
    mail VARCHAR(255),
    kbainfo CLOB,
    lastsync CLOB,
    preferences CLOB,
    consentedmappings CLOB,
    effectiveassignments CLOB,
    effectiveroles CLOB,
    activedate VARCHAR(29),
    inactivedate VARCHAR(29),
    expireaccount CLOB,
    activateaccount CLOB
);
CREATE UNIQUE INDEX idx_managed_user_userName ON openidm.managed_user (username ASC);
CREATE INDEX idx_managed_user_givenName ON openidm.managed_user (givenname ASC);
CREATE  INDEX idx_managed_user_sn ON openidm.managed_user (sn ASC);
CREATE  INDEX idx_managed_user_mail ON openidm.managed_user (mail ASC);
CREATE  INDEX idx_managed_user_accountStatus ON openidm.managed_user (accountstatus ASC);
