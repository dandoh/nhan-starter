#!/usr/bin/env tsx

/**
 * Test script for Kafka CDC consumer (callback-based API)
 * 
 * Usage: tsx scripts/test-kafka-consumer.ts [broker]
 * 
 * Example:
 *   tsx scripts/test-kafka-consumer.ts localhost:9092
 */

import { 
  createCDCConsumer, 
  type CDCConsumer,
} from '../src/lib/kafka-cdc-consumer'

const broker = process.argv[2] || 'localhost:9092'
let messageCount = 0
let consumer: CDCConsumer | null = null

// Handle graceful shutdown
async function shutdown() {
  if (consumer) {
    await consumer.disconnect()
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

function getOperationName(op: string): string {
  const operations: Record<string, string> = {
    'c': 'CREATE (INSERT)',
    'u': 'UPDATE',
    'd': 'DELETE',
    'r': 'READ (snapshot)',
    't': 'TRUNCATE',
  }
  return operations[op] || 'UNKNOWN'
}

async function runTest() {
  try {
    // Create consumer with automatic parsing
    consumer = await createCDCConsumer(
      async (event) => {
        messageCount++
        
        // Handle parsed vs unknown events with type discrimination
        if (event.type === 'parsed') {
          const p = event.value.payload
          const keyId = event.key?.payload?.id || 'no-key'
          
          // Compact one-line format for parsed events
          console.log(
            `[${messageCount}] ${getOperationName(p.op).padEnd(10)} ${p.source.table.padEnd(20)} ` +
            `key=${String(keyId).substring(0, 8)} ${p.after ? 'after=' + JSON.stringify(p.after) : ''}`
          )
        } else {
          // Show unknown events with error
          console.log(
            `[${messageCount}] ⚠️  UNKNOWN ${event.topic} - ${event.parseError}`
          )
        }
      },
      {
        broker,
        groupId: `test-consumer-${Date.now()}`,
        fromBeginning: true,
      }
    )

    console.log('✅ Connected to Kafka')
    console.log('⏳ Waiting for CDC events...\n')

    // Keep the process running
    await new Promise(() => {})
  } catch (error) {
    console.error('\n❌ Error:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

runTest().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})

