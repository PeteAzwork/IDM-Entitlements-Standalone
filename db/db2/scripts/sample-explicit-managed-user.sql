CONNECT TO DOPENIDM;
-- -----------------------------------------------------
-- Table `openidm`.`managed_user`
-- -----------------------------------------------------
CREATE TABLESPACE SOIDM_MU MANAGED BY AUTOMATIC STORAGE;
CREATE  TABLE SOPENIDM.MANAGED_USER (
    objectid VARCHAR(38) NOT NULL,
    rev VARCHAR(38) NOT NULL,
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
    activateaccount CLOB,
    PRIMARY KEY (objectid)
) IN DOPENIDM.SOIDM_MU;

CREATE UNIQUE INDEX idx_managed_user_userName ON SOPENIDM.MANAGED_USER (username ASC);
CREATE INDEX idx_managed_user_givenName ON SOPENIDM.MANAGED_USER (givenname ASC);
CREATE INDEX idx_managed_user_sn ON SOPENIDM.MANAGED_USER (sn ASC);
CREATE INDEX idx_managed_user_mail ON SOPENIDM.MANAGED_USER (mail ASC);
CREATE INDEX idx_managed_user_accountStatus ON SOPENIDM.MANAGED_USER (accountstatus ASC);

