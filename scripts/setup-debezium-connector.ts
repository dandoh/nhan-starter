#!/usr/bin/env tsx

/**
 * Script to configure Debezium MySQL connector for Kafka Connect
 * 
 * IMPORTANT: This script configures Kafka Connect (running in Docker) to connect to MySQL.
 * Since both services are in the same Docker network, we use Docker service names (mysql, kafka)
 * instead of localhost. The credentials come from environment variables or Docker Compose defaults.
 */

const KAFKA_CONNECT_URL = 'http://localhost:8083'

// Get database credentials from environment (same as docker-compose.yml defaults)
const MYSQL_DATABASE = process.env.MYSQL_DATABASE
const MYSQL_USER = process.env.MYSQL_USER
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD

const connectorConfig = {
  name: 'nhan-starter-mysql-connector',
  config: {
    'connector.class': 'io.debezium.connector.mysql.MySqlConnector',
    'tasks.max': '1',
    // Use Docker service name, not localhost - Kafka Connect runs inside Docker
    'database.hostname': 'mysql',
    // Use Docker port, not localhost port - Kafka Connect runs inside Docker
    'database.port': '3306',
    'database.user': MYSQL_USER,
    'database.password': MYSQL_PASSWORD,
    'database.server.id': '184054',
    'topic.prefix': 'dbserver1',
    'database.include.list': MYSQL_DATABASE,
    // Monitor all tables in the database (including newly created ones)
    'table.include.list': `${MYSQL_DATABASE}.*`,
    // Kafka is also a Docker service name - use internal listener
    'schema.history.internal.kafka.bootstrap.servers': 'kafka:29092',
    'schema.history.internal.kafka.topic': `schemahistory.${MYSQL_DATABASE}`,
    'include.schema.changes': 'true',
    // Route all table changes into a single topic
    'transforms': 'route',
    'transforms.route.type': 'org.apache.kafka.connect.transforms.RegexRouter',
    'transforms.route.regex': '([^.]+)\\.([^.]+)\\.([^.]+)',
    'transforms.route.replacement': '$1.all-changes',
  },
}

async function deleteConnectorIfExists(connectorName: string) {
  try {
    console.log(`Checking if connector '${connectorName}' exists...`)
    
    const checkResponse = await fetch(`${KAFKA_CONNECT_URL}/connectors/${connectorName}`)
    
    if (checkResponse.ok) {
      console.log(`Connector '${connectorName}' exists. Deleting...`)
      
      const deleteResponse = await fetch(`${KAFKA_CONNECT_URL}/connectors/${connectorName}`, {
        method: 'DELETE',
      })
      
      if (deleteResponse.status === 204 || deleteResponse.ok) {
        console.log(`✅ Connector '${connectorName}' deleted successfully!`)
      } else {
        const errorData = await deleteResponse.text()
        console.error(`❌ Failed to delete connector: ${deleteResponse.status} ${deleteResponse.statusText}`)
        console.error(errorData)
        process.exit(1)
      }
    } else if (checkResponse.status === 404) {
      console.log(`Connector '${connectorName}' does not exist. Skipping deletion.`)
    } else {
      console.error(`❌ Error checking connector: ${checkResponse.status} ${checkResponse.statusText}`)
      const errorData = await checkResponse.text()
      console.error(errorData)
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error checking/deleting connector:', error)
    process.exit(1)
  }
}

async function setupConnector() {
  try {
    // Delete existing connector if it exists
    await deleteConnectorIfExists(connectorConfig.name)
    
    console.log('\nSetting up Debezium connector...')
    console.log(`Connector config:`, JSON.stringify(connectorConfig, null, 2))

    const response = await fetch(`${KAFKA_CONNECT_URL}/connectors/`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(connectorConfig),
    })

    console.log(`\nResponse status: ${response.status} ${response.statusText}`)

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Connector created successfully!')
      console.log(JSON.stringify(data, null, 2))
    } else {
      console.error('❌ Failed to create connector')
      console.error(JSON.stringify(data, null, 2))
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error setting up connector:', error)
    process.exit(1)
  }
}

setupConnector()
