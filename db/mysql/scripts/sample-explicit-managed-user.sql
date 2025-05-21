-- -----------------------------------------------------
-- Table `openidm`.`managed_user`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `openidm`.`managed_user` (
    `objectid` VARCHAR(38) NOT NULL,
    `rev` VARCHAR(38) NOT NULL,
    `username` VARCHAR(255),
    `password` VARCHAR(511),
    `accountstatus` VARCHAR(255),
    `postalcode` VARCHAR(255),
    `stateprovince` VARCHAR(255),
    `postaladdress` VARCHAR(255),
    `country` VARCHAR(255),
    `city` VARCHAR(255),
    `givenname` VARCHAR(255),
    `description` VARCHAR(255),
    `sn` VARCHAR(255),
    `telephonenumber` VARCHAR(255),
    `mail` VARCHAR(255),
    `kbainfo` TEXT,
    `lastsync` TEXT,
    `preferences` TEXT,
    `consentedmappings` TEXT,
    `effectiveassignments` TEXT,
    `effectiveroles` TEXT,
    `activedate` VARCHAR(29),
    `inactivedate` VARCHAR(29),
    `expireaccount` TEXT,
    `activateaccount` TEXT,
    PRIMARY KEY (`objectid`),
    UNIQUE INDEX `idx_managed_user_userName` (`username` ASC),
    INDEX `idx_managed_user_givenName` (`givenname` ASC),
    INDEX `idx_managed_user_sn` (`sn` ASC),
    INDEX `idx_managed_user_mail` (`mail` ASC),
    INDEX `idx_managed_user_accountStatus` (`accountstatus` ASC)
)
ENGINE = InnoDB;
