#!/bin/bash
# MySQL initialization script for Debezium CDC
# This script sets up binary logging and grants necessary permissions
# to the database user specified in docker-compose.yml

set -e

DB_USER="${MYSQL_USER}"

echo "Setting up MySQL for Debezium CDC..."
echo "Granting permissions to user: $DB_USER"

mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
    -- Ensure binary logging format is ROW (required for Debezium)
    SET GLOBAL binlog_format = 'ROW';
    SET GLOBAL binlog_row_image = 'FULL';

    -- Grant necessary permissions for Debezium CDC
    GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO '${DB_USER}'@'%';
    FLUSH PRIVILEGES;

    SELECT 'Debezium CDC permissions granted successfully!' AS status;
EOSQL

echo "✓ MySQL initialization complete"

