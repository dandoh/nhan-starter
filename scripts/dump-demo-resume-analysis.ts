import { writeFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { analyzePdfBuffer } from '@/lib/file-table-workflows/analyzers/pdf-analyzer'

async function main() {
  const root = process.cwd()
  const inputPath = resolve(root, 'test_data_local/demo_resume.pdf')
  const outputPath = resolve(root, 'test_data_local/demo_resume.analysis.json')

  const pdfBuffer = await readFile(inputPath)
  const analysis = await analyzePdfBuffer(pdfBuffer, {
    options: {
      chunkSizeTokens: 12,
      chunkOverlapRatio: 0.1,
    },
  })

  await writeFile(
    outputPath,
    JSON.stringify(analysis, null, 2),
    'utf8',
  )

  console.log(`Analysis written to ${outputPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

