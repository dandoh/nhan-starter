import { randomUUID } from 'crypto'
import { db, client } from './index'
import {
  users,
  aiTables,
  aiTableColumns,
  aiTableRecords,
  aiTableCells,
} from './schema'
import { eq } from 'drizzle-orm'

const SEED_USER_EMAIL = 'dainhan605@gmail.com'
const SEED_TABLE_ID = '637cce78-5494-475c-865e-953e24d88490'

async function seed() {
  console.log('🌱 Starting database seed...')

  // 1. Create or get user
  let user = await db.query.users.findFirst({
    where: eq(users.email, SEED_USER_EMAIL),
  })

  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({
        email: SEED_USER_EMAIL,
        name: 'Dan Nhan',
        id: randomUUID().toString(),
        emailVerified: true,
      })
      .returning()
    user = newUser
    console.log('✅ Created user:', user.email)
  } else {
    console.log('✅ User already exists:', user.email)
  }

  // Delete all tables
  await db.delete(aiTables).where(eq(aiTables.userId, user.id))

  // 2. Delete existing table if it exists
  const existingTable = await db.query.aiTables.findFirst({
    where: eq(aiTables.id, SEED_TABLE_ID),
  })

  if (existingTable) {
    await db.delete(aiTables).where(eq(aiTables.id, SEED_TABLE_ID))
    console.log('🗑️  Deleted existing table:', SEED_TABLE_ID)
  }

  // 3. Create new Stock Portfolio Analysis table
  const [table] = await db
    .insert(aiTables)
    .values({
      id: SEED_TABLE_ID,
      userId: user.id,
      name: '📊 Stock Portfolio Analysis',
    })
    .returning()

  console.log('✅ Created table:', table.name)

  // 4. Create columns
  const columns = await db
    .insert(aiTableColumns)
    .values([
      // Manual column: Ticker
      {
        tableId: table.id,
        name: 'Ticker',
        type: 'manual',
        description: 'Stock ticker symbol',
        outputType: 'text',
        aiPrompt: '',
        outputTypeConfig: null,
        position: 0,
      },
      // AI column 1: Sentiment (single_select)
      {
        tableId: table.id,
        name: 'Sentiment',
        type: 'ai',
        description: 'Market sentiment analysis',
        outputType: 'single_select',
        aiPrompt:
          'Analyze the recent market sentiment and news for this stock. Choose one: Positive, Negative, or Neutral.',
        outputTypeConfig: {
          options: [
            { value: 'Positive' },
            { value: 'Neutral' },
            { value: 'Negative' },
          ],
        },
        position: 1,
      },
      // AI column 2: Company Size (single_select)
      {
        tableId: table.id,
        name: 'Company Size',
        type: 'ai',
        description: 'Market capitalization category',
        outputType: 'single_select',
        aiPrompt:
          'Determine the market cap category for this company. Choose: Small Cap, Mid Cap, or Large Cap.',
        outputTypeConfig: {
          options: [
            { value: 'Small Cap' },
            { value: 'Mid Cap' },
            { value: 'Large Cap' },
          ],
        },
        position: 2,
      },
      // AI column 3: Investment Signal (single_select)
      {
        tableId: table.id,
        name: 'Investment Signal',
        type: 'ai',
        description: 'Investment recommendation',
        outputType: 'single_select',
        aiPrompt:
          'Based on current market conditions and company fundamentals, provide an investment recommendation.',
        outputTypeConfig: {
          options: [
            { value: 'Strong Buy' },
            { value: 'Buy' },
            { value: 'Hold' },
            { value: 'Sell' },
            { value: 'Strong Sell' },
          ],
        },
        position: 3,
      },
      // AI column 4: Risk Analysis (long_text)
      {
        tableId: table.id,
        name: 'Risk Analysis',
        type: 'ai',
        description: 'Detailed risk assessment',
        outputType: 'long_text',
        aiPrompt:
          'Provide a detailed risk analysis for this stock, covering market volatility, sector risks, company-specific factors, and overall risk level (Low/Medium/High). Be specific and analytical.',
        outputTypeConfig: null,
        position: 4,
      },
    ])
    .returning()

  console.log('✅ Created columns:', columns.length)

  // 5. Create sample records with tickers
  const tickers = ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN']

  for (const ticker of tickers) {
    const [record] = await db
      .insert(aiTableRecords)
      .values({
        tableId: table.id,
        position: tickers.indexOf(ticker),
      })
      .returning()

    // Create cells for each column
    const cells = columns.map((column, index) => ({
      recordId: record.id,
      columnId: column.id,
      value: index === 0 ? ticker : null, // Only set value for Ticker (manual column)
      computeStatus: column.type === 'ai' ? ('idle' as const) : ('idle' as const),
    }))

    await db.insert(aiTableCells).values(cells)

    console.log(`✅ Created record for ${ticker}`)
  }

  console.log('🎉 Database seeded successfully!')
  console.log('')
  console.log('📋 Summary:')
  console.log(`   User: ${user.email}`)
  console.log(`   Table ID: ${table.id}`)
  console.log(`   Table Name: ${table.name}`)
  console.log(`   Columns: ${columns.length} (1 manual + 4 AI)`)
  console.log(`   Records: ${tickers.length}`)
  console.log('')
  console.log(
    '💡 Next: Run "Compute All" in the UI to generate AI values for all cells',
  )
}

seed()
  .catch((error) => {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  })
  .finally(async () => {
    await client.end()
  })
