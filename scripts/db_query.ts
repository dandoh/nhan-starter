import { randomUUID } from 'node:crypto'
import { db } from '@/db'
import {
  users,
  aiTables,
  aiTableColumns,
  aiTableRecords,
  aiTableCells,
  aiConversations,
  type NewAiTableColumn,
  fileArtifactEmbeddings,
} from '@/db/schema'
import { asc, eq } from 'drizzle-orm'


async function main() {
  // Grab the first file artifact embedding
  const embedding = await db.query.fileArtifactEmbeddings.findFirst({
    orderBy: [asc(fileArtifactEmbeddings.createdAt)],
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})


