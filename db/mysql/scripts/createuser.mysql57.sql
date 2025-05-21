-- -------------------------------------------
-- openidm database user (for MySQL 5.7)
-- ------------------------------------------
CREATE USER IF NOT EXISTS 'openidm'@'%' IDENTIFIED BY 'openidm';
GRANT ALL PRIVILEGES on openidm.* TO openidm;
GRANT ALL PRIVILEGES on openidm.* TO openidm@'%';
CREATE USER IF NOT EXISTS 'openidm'@'localhost' IDENTIFIED BY 'openidm';
GRANT ALL PRIVILEGES on openidm.* TO openidm@localhost;
