/**
 * Test script for column suggestion engine
 * Usage: tsx scripts/test-column-suggestions.ts
 */
import { suggestColumns } from '../src/lib/file-table-workflows/column-suggestions'
import type { PdfAnalyzerMetadata } from '../src/lib/file-table-workflows/analyzers/pdf-analyzer'
import type { DocumentChunk } from '../src/lib/file-table-workflows/analyzers/chunking'
import { readFileSync } from 'fs'
import { join } from 'path'
import { db } from '../src/db'
import { fileArtifacts, users } from '../src/db/schema'
import { s3Client } from '../src/lib/s3-client'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { env } from '../src/env'
import { createHash } from 'node:crypto'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'

const TEST_USER_EMAIL = 'test@example.com'

async function testColumnSuggestions() {
  console.log('🔍 Testing Column Suggestion Engine...\n')

  // Get or create test user
  let testUser = await db.query.users.findFirst({
    where: eq(users.email, TEST_USER_EMAIL),
  })

  if (!testUser) {
    const [newUser] = await db
      .insert(users)
      .values({
        email: TEST_USER_EMAIL,
        name: 'Test User',
        id: randomUUID().toString(),
        emailVerified: true,
      })
      .returning()
    testUser = newUser
    console.log('✅ Created test user:', testUser.email)
  }

  // Load the demo resume analysis
  const analysisPath = join(
    process.cwd(),
    'test_data_local/demo_resume.analysis.json',
  )

  let analysisData: {
    metadata: PdfAnalyzerMetadata
    chunks: DocumentChunk[]
  }

  try {
    const fileContent = readFileSync(analysisPath, 'utf-8')
    analysisData = JSON.parse(fileContent)
  } catch (error) {
    console.error('❌ Error loading analysis file:', error)
    console.log(
      '\nMake sure test_data_local/demo_resume.analysis.json exists.',
    )
    console.log('Run: tsx scripts/dump-demo-resume-analysis.ts')
    process.exit(1)
  }

  console.log('📄 Document Metadata:')
  console.log(`  Title: ${analysisData.metadata.title || 'N/A'}`)
  console.log(`  Author: ${analysisData.metadata.author || 'N/A'}`)
  console.log(`  Pages: ${analysisData.metadata.pageCount}`)
  console.log(`  Chunks: ${analysisData.chunks.length}`)
  console.log()

  // Create a test artifact in the database and S3
  console.log('📦 Creating test artifact...')
  const contentHash = analysisData.metadata.contentHash || createHash('sha256').update(JSON.stringify(analysisData)).digest('hex')
  const artifactKey = `test-artifacts/${contentHash}-v1.0.0.json`

  // Upload analysis data to S3
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: artifactKey,
      Body: Buffer.from(JSON.stringify(analysisData)),
      ContentType: 'application/json',
    }),
  )

  // Create artifact record in database
  const [artifact] = await db
    .insert(fileArtifacts)
    .values({
      userId: testUser.id,
      contentHash,
      analyzerVersion: '1.0.0',
      artifactPointer: artifactKey,
      analyzerMetadata: {
        pageCount: analysisData.metadata.pageCount,
        title: analysisData.metadata.title,
        author: analysisData.metadata.author,
        fileSizeBytes: analysisData.metadata.fileSizeBytes,
      },
    })
    .returning()

  console.log(`✅ Created artifact: ${artifact.id}\n`)

  // Test 1: Generate suggestions without existing columns
  console.log('🤖 Test 1: Generating column suggestions (no existing columns)...')
  try {
    const result1 = await suggestColumns(artifact.id)

    console.log(`\n✅ Success! Generated ${result1.suggestions.length} suggestions\n`)
    console.log(`📋 Inferred Document Type: ${result1.inferredDocumentType}`)
    console.log(`💭 Rationale: ${result1.rationale}`)
    console.log(`🔧 Model: ${result1.model}`)
    console.log(`📌 Prompt Version: ${result1.promptVersion}`)
    console.log('\n📊 Column Suggestions:')
    console.log('═'.repeat(80))

    result1.suggestions.forEach((suggestion, index) => {
      console.log(`\n${index + 1}. ${suggestion.name}`)
      console.log(`   Type: ${suggestion.outputType}`)
      console.log(`   Confidence: ${suggestion.confidence}`)
      console.log(`   Primary: ${suggestion.primary}`)
      console.log(`   Provenance: ${suggestion.provenance}`)
      console.log(`   Why Useful: ${suggestion.whyUseful}`)
    })

    console.log('\n═'.repeat(80))

    // Test 2: Generate suggestions with existing columns
    console.log('\n🤖 Test 2: Generating suggestions with existing columns...')
    const existingColumns = [
      { name: 'Candidate Name', outputType: 'text' },
      { name: 'Email', outputType: 'text' },
    ]

    const result2 = await suggestColumns(artifact.id, existingColumns)

    console.log(
      `\n✅ Success! Generated ${result2.suggestions.length} suggestions (excluding existing)\n`,
    )
    console.log('📊 New Column Suggestions (not duplicates):')
    console.log('═'.repeat(80))

    result2.suggestions.forEach((suggestion, index) => {
      console.log(`\n${index + 1}. ${suggestion.name}`)
      console.log(`   Type: ${suggestion.outputType}`)
      console.log(`   Confidence: ${suggestion.confidence}`)
    })

    console.log('\n═'.repeat(80))
    console.log('\n✅ All tests passed!')
    
    // Cleanup: Optionally delete the test artifact
    console.log(`\n💡 Test artifact ID: ${artifact.id}`)
    console.log('   You can manually delete this artifact if needed.')
  } catch (error) {
    console.error('\n❌ Error during testing:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

// Run the tests
testColumnSuggestions().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

