# Debezium Setup and Testing Guide

This guide will help you test the Debezium setup for MySQL Change Data Capture (CDC).

## Architecture Overview

Based on the [Debezium Tutorial](https://debezium.io/documentation/reference/3.3/tutorial.html), the setup includes:

- **MySQL 8.0** - Source database with binary logging enabled
- **Kafka** - Message broker for streaming change events (KRaft mode, no Zookeeper needed)
- **Kafka Connect** - Debezium connector runtime

## Prerequisites

1. Docker and Docker Compose installed
2. Ports available: 3306 (MySQL), 9092 (Kafka), 8083 (Kafka Connect)

## Step 1: Clean Start (Recommended)

Since we're setting up CDC, it's best to start with a fresh MySQL database:

```bash
# Stop all services
docker-compose down

# Remove old MySQL data (CAUTION: This deletes all data!)
rm -rf ./docker-data/mysql

# Optional: Clean all Debezium data
rm -rf ./docker-data/kafka ./docker-data/kafka-connect
```

## Step 2: Start Services

```bash
# Start all services
docker-compose up -d

# Watch logs to ensure everything starts properly
docker-compose logs -f
```

Wait for all health checks to pass (about 30-60 seconds). You should see:
- `nhan-starter-mysql` healthy
- `kafka` running
- `nhan-starter-kafka-connect` healthy

```bash
# Check service status
docker-compose ps
```

## Step 3: Verify MySQL Configuration

Verify that binary logging is enabled:

```bash
docker exec -it nhan-starter-mysql mysql -u root -prootpassword -e "SHOW VARIABLES LIKE 'binlog_format';"
```

Expected output: `ROW`

```bash
docker exec -it nhan-starter-mysql mysql -u root -prootpassword -e "SHOW VARIABLES LIKE 'binlog_row_image';"
```

Expected output: `FULL`

## Step 4: Create Test Table and Data

```bash
# Connect to MySQL
docker exec -it nhan-starter-mysql mysql -u nhan_user -pnhan_password nhan_starter_dev

# In the mysql prompt, create a test table:
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE
);

# Insert test data
INSERT INTO customers (first_name, last_name, email) VALUES
  ('John', 'Doe', '[email protected]'),
  ('Jane', 'Smith', '[email protected]'),
  ('Bob', 'Johnson', '[email protected]');

# Verify data
SELECT * FROM customers;

# Exit mysql
exit;
```

## Step 5: Verify Kafka Connect is Running

```bash
# Check Kafka Connect status
curl http://localhost:8083/

# List available connector plugins (should include MySQL)
curl http://localhost:8083/connector-plugins | jq
```

You should see `io.debezium.connector.mysql.MySqlConnector` in the list.

## Step 6: Register Debezium MySQL Connector

Create a connector configuration file:

```bash
cat > /tmp/register-mysql-connector.json <<EOF
{
  "name": "nhan-starter-mysql-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "tasks.max": "1",
    "database.hostname": "mysql",
    "database.port": "3306",
    "database.user": "nhan_user",
    "database.password": "nhan_password",
    "database.server.id": "184054",
    "topic.prefix": "nhan_starter",
    "database.include.list": "nhan_starter_dev",
    "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",
    "schema.history.internal.kafka.topic": "schema-changes.nhan_starter_dev"
  }
}
EOF
```

Register the connector:

```bash
curl -i -X POST -H "Content-Type: application/json" \
  --data @/tmp/register-mysql-connector.json \
  http://localhost:8083/connectors
```

## Step 7: Verify Connector Status

```bash
# List all connectors
curl http://localhost:8083/connectors

# Check connector status
curl http://localhost:8083/connectors/nhan-starter-mysql-connector/status | jq

# View connector configuration
curl http://localhost:8083/connectors/nhan-starter-mysql-connector | jq
```

Expected status: `"state": "RUNNING"`

## Step 8: View Kafka Topics

List topics created by Debezium:

```bash
docker exec -it kafka /kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --list
```

You should see topics like:
- `nhan_starter.nhan_starter_dev.customers` (your table's change events)
- `my_connect_configs` (Kafka Connect internal)
- `my_connect_offsets` (Kafka Connect internal)
- `my_connect_statuses` (Kafka Connect internal)
- `schema-changes.nhan_starter_dev` (MySQL schema history)

## Step 9: Watch Change Events

Open a terminal to watch the customers topic:

```bash
docker exec -it kafka /kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic nhan_starter.nhan_starter_dev.customers \
  --from-beginning \
  --property print.key=true \
  --property key.separator=":"
```

You should see initial snapshot events for the 3 existing records.

## Step 10: Test Live Change Data Capture

In another terminal, make changes to the database:

```bash
docker exec -it nhan-starter-mysql mysql -u nhan_user -pnhan_password nhan_starter_dev
```

**INSERT:**
```sql
INSERT INTO customers (first_name, last_name, email) VALUES 
  ('Alice', 'Williams', '[email protected]');
```

**UPDATE:**
```sql
UPDATE customers SET email = '[email protected]' WHERE first_name = 'John';
```

**DELETE:**
```sql
DELETE FROM customers WHERE first_name = 'Bob';
```

Switch back to the Kafka consumer terminal - you should see change events for each operation in real-time!

## Event Structure

Each event contains:
- **before**: Previous row state (null for INSERT, populated for UPDATE/DELETE)
- **after**: New row state (populated for INSERT/UPDATE, null for DELETE)
- **op**: Operation type (`c`=create, `u`=update, `d`=delete, `r`=read/snapshot)
- **source**: Metadata (database, table, timestamp, transaction info)

## Useful Commands

### Restart a Connector
```bash
curl -X POST http://localhost:8083/connectors/nhan-starter-mysql-connector/restart
```

### Pause a Connector
```bash
curl -X PUT http://localhost:8083/connectors/nhan-starter-mysql-connector/pause
```

### Resume a Connector
```bash
curl -X PUT http://localhost:8083/connectors/nhan-starter-mysql-connector/resume
```

### Delete a Connector
```bash
curl -X DELETE http://localhost:8083/connectors/nhan-starter-mysql-connector
```

### View MySQL Binary Log Status
```bash
docker exec -it nhan-starter-mysql mysql -u root -prootpassword \
  -e "SHOW BINARY LOGS;"
```

### View MySQL Binary Log Position
```bash
docker exec -it nhan-starter-mysql mysql -u root -prootpassword \
  -e "SHOW MASTER STATUS;"
```

### View Connector Logs
```bash
docker logs nhan-starter-kafka-connect -f
```

## Troubleshooting

### Connector fails to start

1. Check MySQL binary logging is enabled:
   ```bash
   docker exec nhan-starter-mysql mysql -u root -prootpassword -e "SHOW VARIABLES LIKE 'log_bin';"
   ```

2. Check connector logs:
   ```bash
   docker logs nhan-starter-kafka-connect
   ```

### No events in Kafka topic

1. Verify connector is running:
   ```bash
   curl http://localhost:8083/connectors/nhan-starter-mysql-connector/status
   ```

2. Check if topic exists:
   ```bash
   docker exec kafka /kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list
   ```

3. Verify binary log position:
   ```bash
   docker exec nhan-starter-mysql mysql -u root -prootpassword \
     -e "SHOW MASTER STATUS;"
   ```

### Port conflicts

If ports are already in use, override them in `.env` file:
```bash
MYSQL_PORT=3307
KAFKA_PORT=9093
KAFKA_CONNECT_PORT=8084
```

## Cleanup

```bash
# Stop all services
docker-compose down

# Remove all data (optional)
rm -rf ./docker-data/mysql ./docker-data/kafka ./docker-data/kafka-connect
```

## References

- [Debezium Tutorial](https://debezium.io/documentation/reference/3.3/tutorial.html)
- [Debezium MySQL Connector Documentation](https://debezium.io/documentation/reference/3.3/connectors/mysql.html)
- [MySQL Binary Log](https://dev.mysql.com/doc/refman/8.0/en/binary-log.html)

