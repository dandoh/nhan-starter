/**
 * Infrastructure management utilities
 * Handles checking and managing Kafka/Kafka Connect services
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { cdcConfigSchema, type CDCConfig } from './schemas'

const CONFIG_FILE = join(process.cwd(), 'data', 'config.json')
const DATA_DIR = join(process.cwd(), 'data')
const CONNECTORS_DIR = join(process.cwd(), 'data', 'connectors')

/**
 * Ensure data directories exist
 */
function ensureDataDirectories(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!existsSync(CONNECTORS_DIR)) {
    mkdirSync(CONNECTORS_DIR, { recursive: true })
  }
}

/**
 * Get default CDC configuration
 */
function getDefaultConfig(): CDCConfig {
  return {
    projectName: 'cdc-streamer',
    kafka: {
      version: '3.3',
      containerName: 'cdc-kafka',
      port: 9092,
      clusterId: 'MkU3OEVBNTcwNTJENDM2Qk',
      dataDir: './docker-data/kafka',
    },
    kafkaConnect: {
      version: '3.3',
      containerName: 'cdc-kafka-connect',
      port: 8083,
      groupId: '1',
      topics: {
        config: 'cdc_connect_configs',
        offset: 'cdc_connect_offsets',
        status: 'cdc_connect_statuses',
      },
      dataDir: './docker-data/kafka-connect',
    },
  }
}

/**
 * Load CDC configuration from file
 * Creates default config if none exists
 */
export function loadConfig(): CDCConfig {
  ensureDataDirectories()
  
  // If config file doesn't exist, create default
  if (!existsSync(CONFIG_FILE)) {
    const defaultConfig = getDefaultConfig()
    writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf-8')
    console.log('📝 Created default CDC configuration')
    return defaultConfig
  }

  // Read and validate config
  const configContent = readFileSync(CONFIG_FILE, 'utf-8')
  const config = JSON.parse(configContent)
  
  // Validate with Zod schema
  const validated = cdcConfigSchema.parse(config)
  
  return validated
}

/**
 * Update CDC configuration file
 */
export function updateConfig(newConfig: CDCConfig): void {
  ensureDataDirectories()
  
  // Validate with Zod schema
  const validated = cdcConfigSchema.parse(newConfig)
  
  // Write to file
  writeFileSync(CONFIG_FILE, JSON.stringify(validated, null, 2), 'utf-8')
  
  console.log('✅ CDC configuration updated')
}

/**
 * Get Kafka Connect URL from config
 */
function getKafkaConnectURL(): string {
  const config = loadConfig()
  return `http://localhost:${config.kafkaConnect.port}`
}

/**
 * Get Kafka Connect port from config
 */
function getKafkaConnectPort(): string {
  const config = loadConfig()
  return config.kafkaConnect.port.toString()
}

/**
 * Check if Kafka Connect is running and healthy
 */
export async function isKafkaConnectHealthy(): Promise<boolean> {
  try {
    const url = getKafkaConnectURL()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    const response = await fetch(url, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response.ok
  } catch (error) {
    return false
  }
}

/**
 * Check if Docker is installed and running
 */
export function isDockerAvailable(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * Check if docker-compose is available
 */
export function isDockerComposeAvailable(): boolean {
  try {
    execSync('docker-compose version', { stdio: 'ignore' })
    return true
  } catch {
    // Try docker compose (v2 syntax)
    try {
      execSync('docker compose version', { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }
}

/**
 * Get the docker-compose command (handles v1 vs v2)
 */
function getDockerComposeCommand(): string {
  try {
    execSync('docker-compose version', { stdio: 'ignore' })
    return 'docker-compose'
  } catch {
    return 'docker compose'
  }
}

/**
 * Get environment variables from config for docker-compose
 */
function getDockerComposeEnv(): Record<string, string> {
  const config = loadConfig()
  
  return {
    // Kafka configuration
    KAFKA_VERSION: config.kafka.version,
    KAFKA_CONTAINER_NAME: config.kafka.containerName,
    KAFKA_PORT: config.kafka.port.toString(),
    KAFKA_CLUSTER_ID: config.kafka.clusterId,
    KAFKA_DATA_DIR: config.kafka.dataDir,
    
    // Kafka Connect configuration
    KAFKA_CONNECT_VERSION: config.kafkaConnect.version,
    KAFKA_CONNECT_CONTAINER_NAME: config.kafkaConnect.containerName,
    KAFKA_CONNECT_PORT: config.kafkaConnect.port.toString(),
    KAFKA_CONNECT_GROUP_ID: config.kafkaConnect.groupId,
    KAFKA_CONNECT_CONFIG_TOPIC: config.kafkaConnect.topics.config,
    KAFKA_CONNECT_OFFSET_TOPIC: config.kafkaConnect.topics.offset,
    KAFKA_CONNECT_STATUS_TOPIC: config.kafkaConnect.topics.status,
    KAFKA_CONNECT_DATA_DIR: config.kafkaConnect.dataDir,
  }
}

/**
 * Start CDC infrastructure (Kafka + Kafka Connect)
 */
export async function startInfrastructure(): Promise<void> {
  if (!isDockerAvailable()) {
    throw new Error('Docker is not running. Please start Docker first.')
  }

  if (!isDockerComposeAvailable()) {
    throw new Error('docker-compose is not installed.')
  }

  const config = loadConfig()
  const composeCmd = getDockerComposeCommand()
  const projectRoot = process.cwd()

  console.log(`🚀 Starting CDC infrastructure for project: ${config.projectName}`)

  // Start only kafka and kafka-connect services with config from file
  // Use -p flag to set project name (affects network and volume names)
  execSync(`${composeCmd} -p ${config.projectName} up -d kafka kafka-connect`, {
    cwd: projectRoot,
    stdio: 'ignore', // Suppress docker-compose output
    env: {
      ...process.env,
      ...getDockerComposeEnv(),
    },
  })

  console.log('⏳ Waiting for Kafka Connect to be ready...')

  // Wait for Kafka Connect to be healthy
  await waitForKafkaConnect(60) // 60 retries = ~2 minutes

  console.log('✅ CDC infrastructure is ready!')
}

/**
 * Stop CDC infrastructure
 */
export function stopInfrastructure(): void {
  const config = loadConfig()
  const composeCmd = getDockerComposeCommand()
  const projectRoot = process.cwd()

  console.log(`🛑 Stopping CDC infrastructure for project: ${config.projectName}`)

  execSync(`${composeCmd} -p ${config.projectName} stop kafka kafka-connect`, {
    cwd: projectRoot,
    stdio: 'ignore', // Suppress docker-compose output
    env: {
      ...process.env,
      ...getDockerComposeEnv(),
    },
  })

  console.log('✅ CDC infrastructure stopped')
}

/**
 * Restart CDC infrastructure
 */
export async function restartInfrastructure(): Promise<void> {
  stopInfrastructure()
  await startInfrastructure()
}

/**
 * Wait for Kafka Connect to become healthy
 */
async function waitForKafkaConnect(maxRetries: number = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const healthy = await isKafkaConnectHealthy()
    if (healthy) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error('Kafka Connect failed to start within the timeout period')
}

/**
 * Get detailed infrastructure status
 */
export async function getInfrastructureStatus() {
  const config = loadConfig()
  const dockerAvailable = isDockerAvailable()
  const dockerComposeAvailable = isDockerComposeAvailable()
  const kafkaConnectHealthy = await isKafkaConnectHealthy()
  const url = getKafkaConnectURL()
  const port = getKafkaConnectPort()

  return {
    docker: {
      available: dockerAvailable,
    },
    dockerCompose: {
      available: dockerComposeAvailable,
    },
    kafkaConnect: {
      healthy: kafkaConnectHealthy,
      url,
      port,
    },
    config: {
      projectName: config.projectName,
      kafka: {
        port: config.kafka.port,
        containerName: config.kafka.containerName,
      },
      kafkaConnect: {
        port: config.kafkaConnect.port,
        containerName: config.kafkaConnect.containerName,
      },
    },
    ready: dockerAvailable && dockerComposeAvailable && kafkaConnectHealthy,
  }
}

