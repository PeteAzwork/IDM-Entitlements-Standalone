-- -------------------------------------------
-- openidm database user (for MySQL 8 and higher)
-- ------------------------------------------
CREATE USER IF NOT EXISTS 'openidm'@'%' IDENTIFIED WITH caching_sha2_password BY 'openidm';
GRANT ALL PRIVILEGES on openidm.* TO openidm;
GRANT ALL PRIVILEGES on openidm.* TO openidm@'%';

CREATE USER IF NOT EXISTS 'openidm'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'openidm';
GRANT ALL PRIVILEGES on openidm.* TO openidm@localhost;
