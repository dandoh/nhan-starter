import { describe, expect, it } from 'vitest'

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { analyzePdfBuffer } from './pdf-analyzer'
import {
  chunkDocumentText,
  computeCharToByteOffsets,
} from './chunking'

describe('chunkDocumentText', () => {
  it('creates overlapping chunks with page ranges', () => {
    const pageTexts = [
      'Invoice 123 total $3,200.00 issued on 2024-09-01 for ACME Corporation. '.repeat(
        40,
      ),
      'Payment due within 30 days. Contact billing@example.com for questions. '.repeat(
        40,
      ),
    ]
    const fullText = pageTexts.join('\n\n')
    const byteOffsets = computeCharToByteOffsets(fullText)

    const chunks = chunkDocumentText(fullText, {
      chunkSizeTokens: 16,
      chunkOverlapRatio: 0.1,
      byteOffsets,
      pageTexts,
    })

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].pageRange.indices).toContain(0)
    expect(chunks[chunks.length - 1].pageRange.indices).toContain(1)
    expect(chunks[0].charRange.start).toBe(0)
    expect(chunks[1].charRange.start).toBeLessThan(chunks[0].charRange.end)
    expect(chunks[0].byteRange.start).toBe(0)
    expect(chunks[1].byteRange.start).toBeGreaterThanOrEqual(0)
  })
})

describe('computeCharToByteOffsets', () => {
  it('handles multibyte characters correctly', () => {
    const text = 'Résumé 😊'
    const offsets = computeCharToByteOffsets(text)

    expect(offsets[0]).toBe(0)
    expect(offsets[text.length]).toBe(Buffer.byteLength(text, 'utf8'))
    // Ensure the byte length difference for accented characters is greater than one
    expect(offsets[2] - offsets[1]).toBeGreaterThan(1)
  })
})

describe('analyzePdfBuffer', () => {
  it(
    'parses resume fixture and produces chunks',
    async () => {
      const fixturePath = resolve(
        process.cwd(),
        'test_data_local/demo_resume.pdf',
      )
      const pdfBuffer = await readFile(fixturePath)

      const analysis = await analyzePdfBuffer(pdfBuffer, {
        options: {
          chunkSizeTokens: 256,
          chunkOverlapRatio: 0.1,
        },
      })

      expect(analysis.metadata.pageCount).toBeGreaterThan(0)
      expect(analysis.pages.length).toBe(analysis.metadata.pageCount)
      expect(analysis.fullText.length).toBeGreaterThan(0)
      expect(analysis.chunks.length).toBeGreaterThan(0)
      expect(analysis.chunks[0].text.length).toBeGreaterThan(0)

      for (const chunk of analysis.chunks) {
        expect(chunk.charRange.start).toBeGreaterThanOrEqual(0)
        expect(chunk.charRange.end).toBeGreaterThan(chunk.charRange.start)
        expect(chunk.byteRange.start).toBeGreaterThanOrEqual(0)
        expect(chunk.byteRange.end).toBeGreaterThan(chunk.byteRange.start)
        expect(chunk.pageRange.indices.length).toBeGreaterThan(0)
      }
    },
    {
      timeout: 20_000,
    },
  )
})
