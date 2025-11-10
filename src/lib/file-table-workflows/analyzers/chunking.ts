const DEFAULT_CHUNK_SIZE_TOKENS = 1200
const DEFAULT_CHUNK_OVERLAP_RATIO = 0.1
const AVG_CHARS_PER_TOKEN = 4

export interface ChunkingOptions {
  chunkSizeTokens?: number
  chunkOverlapRatio?: number
}

export interface PageSummary {
  index: number
  text: string
  charCount: number
  tokenEstimate: number
}

export interface DocumentChunk {
  index: number
  text: string
  tokenEstimate: number
  charRange: {
    start: number
    end: number
  }
  byteRange: {
    start: number
    end: number
  }
  pageRange: {
    startIndex: number
    endIndex: number
    indices: number[]
  }
}

export interface ChunkingResult {
  pages: PageSummary[]
  chunks: DocumentChunk[]
  fullText: string
}

/**
 * Estimate token count for text (rough approximation)
 */
export function estimateTokens(text: string): number {
  if (!text.length) {
    return 0
  }
  return Math.max(1, Math.round(text.length / AVG_CHARS_PER_TOKEN))
}

/**
 * Compute byte offsets for each character position in text
 * Handles multibyte characters correctly
 */
export function computeCharToByteOffsets(text: string): number[] {
  const offsets = new Array<number>(text.length + 1)
  const encoder = new TextEncoder()
  let byteCount = 0
  let i = 0

  while (i < text.length) {
    offsets[i] = byteCount
    const codePoint = text.codePointAt(i)
    if (codePoint === undefined) {
      break
    }
    const asString = String.fromCodePoint(codePoint)
    const byteLength = encoder.encode(asString).length
    byteCount += byteLength
    const codePointLength = codePoint > 0xffff ? 2 : 1
    i += codePointLength
  }

  offsets[text.length] = byteCount

  for (let index = 1; index < offsets.length; index++) {
    if (offsets[index] === undefined) {
      offsets[index] = offsets[index - 1]
    }
  }

  return offsets
}

/**
 * Assemble full document text from page texts
 */
export function assembleDocumentText(pageTexts: string[]): string {
  return pageTexts.filter(Boolean).join('\n\n')
}

/**
 * Normalize page text (collapse whitespace)
 */
export function normalizePageText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

interface PageBoundary {
  index: number
  start: number
  end: number
}

/**
 * Compute page boundaries in the assembled document text
 */
function computePageBoundaries(pageTexts: string[]): PageBoundary[] {
  const separator = '\n\n'
  const boundaries: PageBoundary[] = []
  let cursor = 0

  pageTexts.forEach((pageText, index) => {
    const trimmed = pageText ?? ''
    const start = cursor
    const end = start + trimmed.length

    boundaries.push({
      index,
      start,
      end,
    })

    cursor = end
    if (index < pageTexts.length - 1) {
      cursor += separator.length
    }
  })

  return boundaries
}

/**
 * Determine which page indices a character range spans
 */
function determinePageIndices(
  charRange: { start: number; end: number },
  boundaries: PageBoundary[],
): number[] {
  const indices: number[] = []

  for (const boundary of boundaries) {
    if (charRange.end <= boundary.start) {
      break
    }
    if (charRange.start >= boundary.end) {
      continue
    }

    indices.push(boundary.index)
  }

  return indices
}

/**
 * Create page summaries from page texts
 */
export function createPageSummaries(pageTexts: string[]): PageSummary[] {
  return pageTexts.map((text, index) => ({
    index,
    text,
    charCount: text.length,
    tokenEstimate: estimateTokens(text),
  }))
}

/**
 * Chunk document text with overlapping windows and page range tracking
 */
export function chunkDocumentText(
  text: string,
  {
    chunkSizeTokens,
    chunkOverlapRatio,
    byteOffsets,
    pageTexts,
  }: {
    chunkSizeTokens: number
    chunkOverlapRatio: number
    byteOffsets: number[]
    pageTexts: string[]
  },
): DocumentChunk[] {
  if (!text.length) {
    return []
  }

  const chunkSizeChars = Math.max(
    500,
    Math.round(chunkSizeTokens * AVG_CHARS_PER_TOKEN),
  )
  const overlapChars = Math.round(chunkSizeChars * chunkOverlapRatio)
  const boundaries = computePageBoundaries(pageTexts)

  const chunks: DocumentChunk[] = []
  let start = 0
  let index = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSizeChars, text.length)
    const chunkText = text.slice(start, end)
    const tokenEstimate = estimateTokens(chunkText)
    const charRange = { start, end }
    const byteRange = {
      start: byteOffsets[start],
      end: byteOffsets[end],
    }
    const pageIndices = determinePageIndices(charRange, boundaries)
    const pageRange = {
      startIndex: pageIndices[0] ?? 0,
      endIndex: pageIndices[pageIndices.length - 1] ?? 0,
      indices: pageIndices,
    }

    chunks.push({
      index,
      text: chunkText,
      tokenEstimate,
      charRange,
      byteRange,
      pageRange,
    })

    if (end >= text.length) {
      break
    }

    start = Math.max(0, end - overlapChars)
    index += 1
  }

  return chunks
}

/**
 * Process page texts into chunks with default options
 */
export function processPagesIntoChunks(
  pageTexts: string[],
  options: ChunkingOptions = {},
): ChunkingResult {
  const chunkSizeTokens =
    options.chunkSizeTokens ?? DEFAULT_CHUNK_SIZE_TOKENS
  const chunkOverlapRatio =
    options.chunkOverlapRatio ?? DEFAULT_CHUNK_OVERLAP_RATIO

  const normalizedPages = pageTexts.map(normalizePageText)
  const fullText = assembleDocumentText(normalizedPages)
  const byteOffsets = computeCharToByteOffsets(fullText)
  const pages = createPageSummaries(normalizedPages)
  const chunks = chunkDocumentText(fullText, {
    chunkSizeTokens,
    chunkOverlapRatio,
    byteOffsets,
    pageTexts: normalizedPages,
  })

  return {
    pages,
    chunks,
    fullText,
  }
}

