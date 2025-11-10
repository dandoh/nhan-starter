import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import type { PdfAnalyzerMetadata } from './analyzers/pdf-analyzer'
import type { DocumentChunk } from './analyzers/chunking'
import type { AiTableOutputType } from '@/db/schema'
import { getTracer } from '@lmnr-ai/lmnr'
import { db } from '@/db'
import { fileArtifacts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { downloadS3Object } from '@/lib/s3-client'
import { env } from '@/env'

// Confidence levels for column suggestions
export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number]

// Zod schemas for structured LLM output
const columnSuggestionSchema = z.object({
  name: z.string().describe('The column name'),
  whyUseful: z
    .string()
    .describe('A brief explanation of why this column is useful'),
  confidence: z
    .enum(CONFIDENCE_LEVELS)
    .describe('Confidence level: high, medium, or low'),
  extractedValue: z
    .string()
    .describe(
      'The actual value extracted from the document. Must be a real value found in the document, not a placeholder like "N/A" or "Not found". Only suggest the column if you can extract a clear value.',
    ),
})

const llmResponseSchema = z.object({
  inferredDocumentType: z
    .string()
    .describe(
      'The inferred document type (e.g., "Resume", "Invoice", "Contract")',
    ),
  rationale: z
    .string()
    .describe(
      'Brief explanation of why the document was classified as this type',
    ),
  columnSuggestions: z
    .array(columnSuggestionSchema)
    .describe('3-6 suggested columns for this document type'),
})

export type ColumnSuggestion = z.infer<typeof columnSuggestionSchema>
export type LLMColumnSuggestionResponse = z.infer<typeof llmResponseSchema>

export type SuggestColumnsResult = {
  suggestions: EnrichedColumnSuggestion[]
  inferredDocumentType: string
  rationale: string
  promptVersion: string
  model: string
}

// Extended column suggestion with provenance for persistence
export interface EnrichedColumnSuggestion {
  name: string
  outputType: AiTableOutputType
  autoPopulate: boolean
  primary: boolean
  provenance: 'llm-global'
  confidence: ConfidenceLevel
  rationale: string
  whyUseful: string
  extractedValue: string // The actual value extracted from the document (for a specific file)
}

/**
 * Generate column suggestions using LLM with tool support
 * Takes fileArtifactId, loads artifact from DB/S3, and uses ToolLoopAgent with chunk reading tool
 */
export async function suggestColumns(
  fileArtifactId: string,
  existingColumns?: Array<{ name: string; outputType: string }>,
): Promise<SuggestColumnsResult> {
  const model = 'claude-sonnet-4-0'
  const promptVersion = 'v1.0.0'

  // Load artifact from database
  const artifact = await db.query.fileArtifacts.findFirst({
    where: eq(fileArtifacts.id, fileArtifactId),
  })

  if (!artifact) {
    throw new Error(`Artifact ${fileArtifactId} not found`)
  }

  // Download artifact from S3
  const { buffer } = await downloadS3Object({
    bucket: env.AWS_S3_BUCKET,
    key: artifact.artifactPointer,
  })

  const parsed = JSON.parse(buffer.toString('utf-8')) as {
    chunks?: DocumentChunk[]
    metadata?: PdfAnalyzerMetadata
  }

  const chunks = parsed.chunks ?? []
  const metadata: PdfAnalyzerMetadata = {
    contentHash: artifact.contentHash,
    fileSizeBytes: (artifact.analyzerMetadata as any)?.fileSizeBytes ?? 0,
    pageCount: (artifact.analyzerMetadata as any)?.pageCount ?? chunks.length,
    title: (artifact.analyzerMetadata as any)?.title,
    author: (artifact.analyzerMetadata as any)?.author,
    ...(parsed.metadata || {}),
  }

  if (chunks.length === 0) {
    throw new Error(`No chunks found for artifact ${fileArtifactId}`)
  }

  // Get first and last chunks
  const firstChunk = chunks[0]
  const lastChunk = chunks.length > 1 ? chunks[chunks.length - 1] : null

  // Build initial prompt with first and last chunks
  const metadataSummary = [
    metadata.title && `Title: ${metadata.title}`,
    metadata.author && `Author: ${metadata.author}`,
    `Pages: ${metadata.pageCount ?? chunks.length}`,
    metadata.fileSizeBytes &&
      `Size: ${Math.round(metadata.fileSizeBytes / 1024)}KB`,
    metadata.creationDate && `Created: ${metadata.creationDate}`,
  ]
    .filter(Boolean)
    .join('\n')

  const chunksSummary = [
    `### First Chunk (Beginning of document, page ${firstChunk.pageRange.startIndex + 1}):\n${firstChunk.text}`,
    lastChunk &&
      lastChunk.index !== firstChunk.index &&
      `### Last Chunk (End of document, page ${lastChunk.pageRange.startIndex + 1}):\n${lastChunk.text}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const existingColumnsSummary =
    existingColumns && existingColumns.length > 0
      ? `\n\nExisting columns already suggested:\n${existingColumns.map((col) => `- ${col.name} (${col.outputType})`).join('\n')}`
      : ''

  const prompt = `Analyze this document and suggest columns for a table that will store information extracted from this and similar documents.

## Document Metadata:
${metadataSummary}

## Document Content (First and Last Chunks):
${chunksSummary}
${existingColumnsSummary}

## Your Task:
1. **Infer the document type** on the fly based on the content and structure. Examples: Resume, Invoice, Receipt, Contract, Research Paper, Report, etc. Be specific and accurate.

2. **Provide a brief rationale** (1-2 sentences) explaining why you classified it as this document type.

3. **Suggest columns ONLY if you can clearly extract a value from this document**. This is critical:
   - **DO NOT suggest a column** if you cannot find a clear, extractable value in the document
   - **DO NOT use placeholders** like "N/A", "Not found", "Unknown", or similar
   - **ONLY suggest columns** where you can provide an actual extracted value from the document content
   - The \`extractedValue\` field must contain the actual value found in the document, verbatim or normalized appropriately

Focus on columns that would be valuable for organizing and extracting information from this type of document:
   - **Identifiers**: Names, IDs, reference numbers
   - **Key facts**: Important data points specific to this document type
   - **Totals/Amounts**: Financial figures, quantities
   - **Parties**: People, organizations involved
   - **Dates**: Key dates relevant to the document
   - **Status/Categories**: Document state, type classifications
   - **Relationships**: Links to other documents or entities

For each column:
- Give it a clear, descriptive name
- Provide the actual extracted value from this document (required - do not suggest if you cannot extract it)
- Explain why this column would be useful (1 sentence)
- Rate your confidence: high (very confident this is useful and extractable), medium (probably useful and extractable), or low (might be useful but extraction is uncertain)

**Important**: Only suggest columns where you can provide a real extracted value. If a value is not clearly present in the document, do not suggest that column. Quality over quantity - it's better to suggest fewer columns with clear values than many columns with missing or unclear values.

**Note**: All columns will use the 'text' output type for now. If you need more context, the document has ${chunks.length} total chunks available.

Avoid suggesting columns that are already in the existing columns list unless you have high confidence they should be reconsidered.`

  // Generate structured output using generateObject
  // Note: generateObject doesn't support tools directly, but the prompt mentions the tool availability
  // The model can request additional chunks if needed through the prompt
  const { object: validated } = await generateObject({
    model: anthropic(model),
    schema: llmResponseSchema,
    prompt,
    system:
      'You are an expert document analyzer specialized in extracting structured data and suggesting useful database columns.',
    temperature: 0.2,
    experimental_telemetry: {
      isEnabled: true,
      tracer: getTracer(),
    },
  })

  // Normalize and enrich suggestions - force outputType to 'text'
  const enrichedSuggestions: EnrichedColumnSuggestion[] =
    validated.columnSuggestions.map((suggestion) => ({
      name: normalizeColumnName(suggestion.name),
      outputType: 'text' as AiTableOutputType, // Force to 'text' for now
      autoPopulate: false, // Phase 1: Detection only, no auto-population yet
      primary: false,
      provenance: 'llm-global' as const,
      confidence: suggestion.confidence,
      rationale: validated.rationale,
      whyUseful: suggestion.whyUseful,
      extractedValue: suggestion.extractedValue,
    }))

  return {
    suggestions: enrichedSuggestions,
    inferredDocumentType: validated.inferredDocumentType,
    rationale: validated.rationale,
    promptVersion,
    model,
  }
}

/**
 * Normalize column name to consistent format
 */
function normalizeColumnName(name: string): string {
  // Trim and convert to sentence case
  const trimmed = name.trim()
  if (!trimmed) return 'Untitled Column'

  // Convert to sentence case: capitalize first letter, lowercase rest unless it's an acronym
  const words = trimmed.split(/\s+/)
  const normalized = words
    .map((word) => {
      // Keep all-caps acronyms (2+ chars) as-is
      if (word.length > 1 && word === word.toUpperCase()) {
        return word
      }
      // Capitalize first letter, lowercase rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')

  return normalized
}
