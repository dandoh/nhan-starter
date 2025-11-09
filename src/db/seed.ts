import { randomUUID } from 'node:crypto'
import { db, client } from './index'
import {
  users,
  aiTables,
  aiTableColumns,
  aiTableRecords,
  aiTableCells,
  aiConversations,
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

  // Delete all conversations
  await db.delete(aiConversations).where(eq(aiConversations.userId, user.id))

  // Delete all tables
  await db.delete(aiTables).where(eq(aiTables.userId, user.id))

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

  // 4. Create columns - one example of each output type (insert one by one to maintain createdAt order)
  const columnDefinitions = [
    // Column: Ticker (text)
    {
      tableId: table.id,
      name: 'Ticker',
      description: 'Stock ticker symbol',
      outputType: 'text',
      aiPrompt: '',
      outputTypeConfig: null,
      primary: true,
    },
    // Column: Sentiment (single_select)
    {
      tableId: table.id,
      name: 'Sentiment',
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
    },
    // Column: Tags (multi_select)
    {
      tableId: table.id,
      name: 'Tags',
      description: 'Multiple tags for categorization',
      outputType: 'multi_select',
      aiPrompt:
        'Generate relevant tags for this stock based on industry, sector, and characteristics. Choose from: Technology, Finance, Healthcare, Energy, Consumer, Industrial, or leave empty for free-form suggestions.',
      outputTypeConfig: {
        options: [
          { value: 'Technology' },
          { value: 'Finance' },
          { value: 'Healthcare' },
          { value: 'Energy' },
          { value: 'Consumer' },
          { value: 'Industrial' },
        ],
      },
    },
    // Column: Risk Analysis (long_text)
    {
      tableId: table.id,
      name: 'Risk Analysis',
      description: 'Detailed risk assessment',
      outputType: 'long_text',
      aiPrompt:
        'Provide a detailed risk analysis for this stock, covering market volatility, sector risks, company-specific factors, and overall risk level (Low/Medium/High). Be specific and analytical.',
      outputTypeConfig: null,
    },
    // Column: Recommendation (single_select)
    {
      tableId: table.id,
      name: 'Recommendation',
      description: 'Investment recommendation for this stock',
      outputType: 'single_select',
      aiPrompt:
        'Based on the stock analysis, provide an investment recommendation. Choose one: Strong Buy, Buy, Hold, Sell, or Strong Sell.',
      outputTypeConfig: {
        options: [
          { value: 'Strong Buy' },
          { value: 'Buy' },
          { value: 'Hold' },
          { value: 'Sell' },
          { value: 'Strong Sell' },
        ],
      },
    },
    // Column: Price (text)
    {
      tableId: table.id,
      name: 'Price',
      description: 'Current stock price',
      outputType: 'text',
      aiPrompt:
        'Provide the current stock price for this ticker. Format as a number with up to 2 decimal places (e.g., 150.25).',
      outputTypeConfig: null,
    },
    // Column: Market Cap (text)
    {
      tableId: table.id,
      name: 'Market Cap',
      description: 'Market capitalization in billions',
      outputType: 'text',
      aiPrompt:
        'Provide the market capitalization for this stock. Format as a number in billions with 2 decimal places followed by "B" (e.g., 2.5B, 150.75B).',
      outputTypeConfig: null,
    },
    // Column: Sector (single_select)
    {
      tableId: table.id,
      name: 'Sector',
      description: 'Industry sector classification',
      outputType: 'single_select',
      aiPrompt:
        'Identify the primary industry sector for this stock. Choose one: Technology, Healthcare, Financial Services, Consumer Discretionary, Consumer Staples, Energy, Industrials, Materials, Real Estate, Utilities, or Communication Services.',
      outputTypeConfig: {
        options: [
          { value: 'Technology' },
          { value: 'Healthcare' },
          { value: 'Financial Services' },
          { value: 'Consumer Discretionary' },
          { value: 'Consumer Staples' },
          { value: 'Energy' },
          { value: 'Industrials' },
          { value: 'Materials' },
          { value: 'Real Estate' },
          { value: 'Utilities' },
          { value: 'Communication Services' },
        ],
      },
    },
    // Column: Analyst Rating (single_select)
    {
      tableId: table.id,
      name: 'Analyst Rating',
      description: 'Consensus analyst rating',
      outputType: 'single_select',
      aiPrompt:
        'Based on recent analyst reports and consensus, provide the analyst rating. Choose one: Overweight, Equal Weight, Underweight, or Not Rated.',
      outputTypeConfig: {
        options: [
          { value: 'Overweight' },
          { value: 'Equal Weight' },
          { value: 'Underweight' },
          { value: 'Not Rated' },
        ],
      },
    },
  ]

  const columns = []
  for (const columnDef of columnDefinitions) {
    const [column] = await db
      .insert(aiTableColumns)
      .values(columnDef)
      .returning()
    columns.push(column)
  }

  console.log('✅ Created columns:', columns.length)

  // 5. Create sample records with tickers
  const tickers = ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN']

  for (const ticker of tickers) {
    const [record] = await db
      .insert(aiTableRecords)
      .values({
        tableId: table.id,
      })
      .returning()

    // Create cells for each column
    const cells = columns.map((column, index) => ({
      recordId: record.id,
      columnId: column.id,
      value: index === 0 ? { value: ticker } : {},
      computeStatus: 'idle' as const,
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
  console.log(`   Columns: ${columns.length}`)
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
