import { PDFParse } from 'pdf-parse'
import { createHash } from 'node:crypto'
import { downloadS3Object } from '@/lib/s3-client'
import {
  type ChunkingOptions,
  type ChunkingResult,
  processPagesIntoChunks,
} from './chunking'

export interface PdfAnalyzerOptions extends ChunkingOptions {}

export interface PdfAnalyzerMetadata {
  contentHash: string
  fileSizeBytes: number
  pageCount: number
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creator?: string
  producer?: string
  creationDate?: string
  modificationDate?: string
}

export interface PdfAnalysisResult extends ChunkingResult {
  metadata: PdfAnalyzerMetadata
}

export interface AnalyzePdfFromS3Params {
  bucket: string
  key: string
  expectedContentHash?: string
  options?: PdfAnalyzerOptions
}

export async function analyzePdfFromS3({
  bucket,
  key,
  expectedContentHash,
  options,
}: AnalyzePdfFromS3Params): Promise<PdfAnalysisResult> {
  const { buffer, contentLength } = await downloadS3Object({ bucket, key })

  const actualHash = createHash('sha256').update(buffer).digest('hex')

  if (expectedContentHash && expectedContentHash !== actualHash) {
    throw new Error(
      `Content hash mismatch for ${key}. Expected ${expectedContentHash}, received ${actualHash}`,
    )
  }

  return analyzePdfBuffer(buffer, {
    contentHash: actualHash,
    contentLength,
    options,
  })
}

export interface AnalyzePdfBufferParams {
  contentHash?: string
  contentLength?: number
  options?: PdfAnalyzerOptions
}

export async function analyzePdfBuffer(
  buffer: Buffer,
  params: AnalyzePdfBufferParams = {},
): Promise<PdfAnalysisResult> {
  const parser = new PDFParse({
    data: buffer,
    length: params.contentLength ?? buffer.byteLength,
  })

  const infoResult = await parser.getInfo()
  const textResult = await parser.getText()

  // Extract page texts from PDF
  const pageTexts = textResult.pages
    .sort((a, b) => a.num - b.num)
    .map((page) => page.text)

  // Process pages into chunks using generic chunking logic
  const chunkingResult = processPagesIntoChunks(pageTexts, params.options)

  const contentHash =
    params.contentHash ?? createHash('sha256').update(buffer).digest('hex')
  const metadata = extractMetadata({
    info: infoResult.info ?? {},
    pageCount: pageTexts.length,
    contentHash,
    contentLength: params.contentLength ?? buffer.byteLength,
  })

  return {
    ...chunkingResult,
    metadata,
  }
}

function extractMetadata({
  info,
  pageCount,
  contentHash,
  contentLength,
}: {
  info: Record<string, unknown>
  pageCount: number
  contentHash: string
  contentLength: number
}): PdfAnalyzerMetadata {
  const creationDate = toStringOrUndefined(info.CreationDate)
  const modificationDate = toStringOrUndefined(info.ModDate)

  return {
    contentHash,
    fileSizeBytes: contentLength,
    pageCount,
    title: toStringOrUndefined(info.Title),
    author: toStringOrUndefined(info.Author),
    subject: toStringOrUndefined(info.Subject),
    keywords: toStringOrUndefined(info.Keywords),
    creator: toStringOrUndefined(info.Creator),
    producer: toStringOrUndefined(info.Producer),
    creationDate,
    modificationDate,
  }
}

function toStringOrUndefined(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }
  return undefined
}
