import { writeFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { analyzePdfBuffer } from '@/lib/file-table-workflows/analyzers/pdf-analyzer'

async function main() {
  const filename = process.argv[2]
  
  if (!filename) {
    console.error('Usage: tsx scripts/dump-demo-resume-analysis.ts <filename>')
    console.error('Example: tsx scripts/dump-demo-resume-analysis.ts demo_resume.pdf')
    process.exitCode = 1
    return
  }

  const root = process.cwd()
  const inputPath = resolve(root, 'test_data_local', filename)
  
  // Derive output filename: replace .pdf with .analysis.json, or append .analysis.json
  const outputFilename = filename.endsWith('.pdf')
    ? filename.replace(/\.pdf$/, '.analysis.json')
    : `${filename}.analysis.json`
  const outputPath = resolve(root, 'test_data_local', outputFilename)

  const pdfBuffer = await readFile(inputPath)
  const analysis = await analyzePdfBuffer(pdfBuffer, {
    options: {
      chunkSizeTokens: 12,
      chunkOverlapRatio: 0.1,
    },
  })

  await writeFile(outputPath, JSON.stringify(analysis, null, 2))
  console.log(`Analysis saved to: ${outputPath}`)
  console.log(analysis)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

