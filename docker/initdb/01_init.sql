-- MySQL initialization script
-- Binary logging is enabled by default in MySQL 8.0 for Debezium CDC
-- This file can be used for other database initialization tasks if needed

-- Ensure binary logging format is ROW (required for Debezium)
SET GLOBAL binlog_format = 'ROW';
SET GLOBAL binlog_row_image = 'FULL';
