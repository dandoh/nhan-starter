# AI Tables Platform

An intelligent spreadsheet platform powered by AI - where you can create tables with AI-generated columns based on custom prompts. Think Airtable meets AI, with natural language logic instead of formulas.

## Product Vision

Build and sell a SaaS product centered around **AI Tables** - smart spreadsheets where AI columns automatically generate content based on custom prompts you write. No complex formulas, no coding - just describe what you want in natural language and AI does the work.

Users create tables with a mix of manual columns (for data they input) and AI columns (for data AI generates). The AI reads full row context to generate intelligent, context-aware values for each cell.

## Core Product

### What It Does

**AI Tables** are smart spreadsheets with two types of columns:

1. **Manual Columns** - Regular user-editable columns (like Ticker, Name, Description, Email)
2. **AI Columns** - Smart columns that auto-generate content using AI prompts you write

The AI reads the full row context when computing each cell, making it incredibly smart about your specific use case.

### Key Features

- **Custom AI Prompts** - Write your own logic for AI columns in natural language
- **Context-Aware AI** - AI reads full row context when computing columns
- **Background Processing** - No waiting for AI responses, works async
- **Real-time Status** - See pending → computing → completed states
- **AI Chat Assistant** - Context-aware chat on the right side of each table
- **Multiple Output Types** - Text, long text, single select, multi select, date
- **User Authentication** - Secure login and data isolation
- **Local-First UI** - Optimistic updates and instant feedback

## Use Case Examples

### 📊 Stock Portfolio Analysis

**AI Table:** Stock data with columns:
- Ticker (manual) - AAPL, GOOGL, TSLA
- Sentiment (AI) - "Analyze recent news sentiment for this stock"
- Company Size (AI) - "Determine market cap category (small/mid/large)"
- Investment Signal (AI) - "Based on current market conditions, suggest Buy/Hold/Sell"
- Risk Analysis (AI) - "Assess risk level (Low/Medium/High) and explain why"

**AI Chat:** "Which stocks show the strongest momentum? Compare AAPL vs GOOGL risk profiles"

### 🐛 GitHub Issues Dashboard

**AI Table:** Issues pulled from GitHub:
- Issue Title (manual)
- Status (manual)
- Category (AI) - "Categorize as Bug/Feature/Documentation/Question"
- Priority (AI) - "Assign priority based on title and description"
- Complexity (AI) - "Estimate complexity (Simple/Medium/Complex)"
- Suggested Action (AI) - "What should I do first? Provide specific next steps"
- Estimated Time (AI) - "Estimate time to resolve in hours"

**AI Chat:** "Show me all high-priority bugs. Which issues can be finished this week?"

### 💬 Customer Support Analysis

**AI Table:** Support tickets:
- Customer Message (manual)
- Sentiment (AI) - "Analyze customer sentiment and urgency"
- Category (AI) - "Categorize: Billing/Technical/Feature Request/Other"
- Priority (AI) - "Low/Medium/High/Critical with reasoning"
- Root Cause (AI) - "Identify likely root cause"
- Draft Response (AI) - "Write empathetic response"

**AI Chat:** "What are the top 3 issues this week? Draft a response for ticket #156"

### 🛍️ Product Catalog SEO

**AI Table:** Product catalog:
- Product Name (manual)
- Current Description (manual)
- SEO Title (AI) - "Generate SEO-optimized title under 60 chars"
- Meta Description (AI) - "Write compelling meta description"
- Target Keywords (AI) - "Suggest 5 relevant keywords"
- Price Analysis (AI) - "Compare to market, suggest optimal price"

**AI Chat:** "Which products need the most SEO work? Suggest pricing for Product X"

### 📝 Content Calendar

**AI Table:** Content ideas:
- Topic (manual)
- Target Audience (AI) - "Identify ideal reader persona"
- SEO Difficulty (AI) - "Rate keyword difficulty"
- Content Angle (AI) - "Suggest unique angle"
- Outline (AI) - "Generate article outline"
- Social Copy (AI) - "Write Twitter, LinkedIn posts"

**AI Chat:** "Which topics have the best SEO opportunity? Write an outline for the healthcare AI article"

### 💼 Sales Prospecting

**AI Table:** Lead list:
- Company Name (manual)
- Website (manual)
- Industry (AI) - "Identify industry and sub-sector"
- Company Size (AI) - "Estimate employee count"
- Tech Stack (AI) - "Research technologies they use"
- Pain Points (AI) - "Identify likely pain points"
- Personalized Pitch (AI) - "Write custom outreach email"

**AI Chat:** "Which companies are the best fit? Rewrite the pitch for Company X to focus on cost savings"

### How It Works

1. **Create a Table** - Start with a blank table for your project/analysis
2. **Add Manual Columns** - Create columns for data you'll input manually
3. **Add AI Columns** - Create columns with custom AI prompts
4. **Add Records** - Insert rows with manual data
5. **Compute AI Cells** - Click "Compute All" to generate AI values for all cells
6. **Use the AI Assistant** - Chat with AI on the right side:
   - Ask questions about your data
   - Get help writing AI column prompts
   - Generate insights and summaries
   - Request new analyses
7. **Export & Share** - Export to CSV/Excel or share with your team

**The Power of Context**: The AI reads the entire row when computing each cell, making it incredibly smart about your specific use case.

### External Integrations (Future Vision)

The power multiplies when you connect external data sources:

**Pull Data:**
- GitHub issues, PRs, and code
- Linear/Jira tickets
- Notion pages and databases
- Google Sheets
- CRM data (Salesforce, HubSpot)
- Email threads (Gmail, Outlook)
- Social media mentions
- Analytics data
- And any API via MCP (Model Context Protocol)

**Take Actions:**
- Create/update GitHub issues
- Send emails or Slack messages
- Update CRM records
- Schedule calendar events
- Post to social media
- Trigger webhooks
- Update databases
- And more via MCP

This makes it the **simplest way to connect AI analysis to your actual work** - no more copy-paste between tools.

### Current Features

✅ **AI Tables** - Create tables with manual and AI columns
✅ **AI Chat Assistant** - Context-aware chat on the right side of tables
✅ **Custom AI Prompts** - Write your own logic for AI columns
✅ **Context-Aware AI** - AI reads full row context when computing columns
✅ **Background Processing** - No waiting for AI responses, works async
✅ **Real-time Status** - See pending → computing → completed states
✅ **Multiple Output Types** - Text, long text, single select, multi select, date
✅ **User Authentication** - Secure login and data isolation
✅ **Local-First UI** - Optimistic updates and instant feedback

🚧 **In Progress:**
- Export to CSV/Excel
- Column reordering and resizing
- Better error handling and retry
- Cell-level compute triggers

## Roadmap

### Phase 1: Core Table Features (Current)
- ✅ AI Tables with manual and AI columns
- ✅ AI Chat Assistant per table
- ✅ Claude integration
- ✅ Background computation with Inngest
- ✅ Multiple output types (text, long text, single select, multi select, date)
- 🚧 Export to CSV/Excel
- 🚧 Column reordering and resizing
- 🚧 Cell-level compute triggers
- 🚧 Better error handling and retry

### Phase 2: Enhanced Table & UX
- 🎯 **Table Improvements:**
  - Column reordering and resizing
  - Better error handling and retry
  - Export to CSV/Excel
  - Cell-level compute triggers
  - Bulk operations
  - Table templates
- 🎯 **AI Assistant Upgrades:**
  - Can generate and edit columns via chat
  - Suggest next steps and analyses
  - Help refine AI prompts
  - Generate insights and summaries

### Phase 3: External Integrations (MCP)
- 🎯 MCP (Model Context Protocol) integrations
- 🎯 Connect to data sources (GitHub, Linear, Notion, Google Sheets, databases)
- 🎯 Pull data automatically into tables
- 🎯 Take actions from tables (create tickets, send emails, update records)
- 🎯 Batch import from CSV/Excel
- 🎯 Webhook triggers for automation
- 🎯 Scheduled table updates

### Phase 4: Power Features
- 🎯 **Advanced AI:**
  - AI columns that read from other AI columns
  - Multiple AI models (GPT-4, Gemini, Claude, Llama)
  - Custom AI model configurations
  - AI-generated visualizations
- 🎯 **Computation:**
  - Formula columns (spreadsheet-like)
  - Query results as data sources
- 🎯 **Versioning:**
  - Cell history and rollback
  - Table version history
  - Undo/redo

### Phase 5: Collaboration & Sharing
- 🎯 Team workspaces
- 🎯 Share tables with view/edit permissions
- 🎯 Comments on cells
- 🎯 Real-time collaboration
- 🎯 Publish tables as public pages
- 🎯 Table templates and marketplace

### Phase 6: Monetization
- 🎯 Free tier: 3 tables, 100 AI computations/month
- 🎯 Pro tier: Unlimited tables, usage-based AI pricing
- 🎯 Team tier: Collaboration features, shared workspaces
- 🎯 Enterprise: Advanced AI models, priority support, custom integrations
- 🎯 API access and embedding

## Target Customers

- **Data Analysts** - Explore datasets, generate insights with AI assistance
- **Product Managers** - Track features, analyze feedback with AI
- **Marketing Teams** - Plan campaigns, analyze performance, generate content
- **Customer Support** - Analyze tickets, identify trends, draft responses
- **Content Creators** - Plan editorial calendars, generate SEO content
- **Sales Teams** - Enrich leads, personalize outreach, track pipeline
- **Researchers** - Organize data, extract insights with AI
- **Consultants** - Deliver client analyses with AI-powered insights
- **Operations Teams** - Process tracking, automation workflows
- **Anyone** who works with data and needs AI-powered analysis

## Tech Stack

**Frontend:** React + TanStack Router/Query  
**Backend:** PostgreSQL + Redis  
**AI:** Anthropic Claude (via Vercel AI SDK)  
**Jobs:** Inngest (background processing)  
**UI:** shadcn/ui components  
**Auth:** better-auth

## Development Setup

```bash
# Install dependencies
pnpm install

# Start databases (Docker)
pnpm run setup-db-local

# Setup database
pnpm run db:push

# Start dev server
pnpm run dev
```

Visit `http://localhost:3000`

## Environment Variables

Required in `.env.local`:
```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=nhan_starter_dev

# AI
ANTHROPIC_API_KEY=your_key_here

# Auth
GITHUB_CLIENT_ID=your_id
GITHUB_CLIENT_SECRET=your_secret

# Inngest
INNGEST_SIGNING_KEY=your_key
INNGEST_EVENT_KEY=your_key
```

## Business Metrics to Track

- **Tables:** Created per user, active tables, table retention
- **Columns:** Total columns, AI vs manual columns, column usage
- **AI Usage:** Computations per table, chat messages, most common prompts
- **Engagement:** Daily active users, time spent in tables, records created per session
- **Success Metrics:** Computation success/failure rates, AI accuracy feedback
- **Growth:** User retention curves, feature adoption, referral rates
- **Monetization:** Conversion to paid, compute usage per tier, expansion revenue

## Competitive Edge

### vs. Traditional Spreadsheets (Excel, Google Sheets)
- **AI-Native** - Built-in AI for data generation, not just formulas
- **Natural Language Logic** - Describe what you want instead of writing formulas
- **Conversational Interface** - Chat with AI about your data instead of complex formulas

### vs. Data Tools (Airtable, Notion Databases)
- **Flexible AI Prompting** - Users write custom logic, not pre-defined formulas
- **Full Row Context** - AI understands entire row when computing cells
- **No Setup Required** - Start analyzing immediately, no schema planning needed

### vs. AI Chat Tools (ChatGPT, Claude)
- **Structured Data** - Tables with persistent, computed columns
- **Reproducible Workflows** - Reuse prompts across rows automatically
- **Persistent Context** - Tables maintain context better than chat history

### Core Advantages
- ✅ **Hybrid Approach** - Structured tables + conversational AI
- ✅ **Context-Aware AI** - Understands full row context
- ✅ **External Integrations** - Connect to any data source via MCP
- ✅ **Fast & Responsive** - Local-first architecture with background processing
- ✅ **Transparent** - See exactly what AI is computing in real-time
- ✅ **Action-Oriented** - Trigger real workflows, not just analysis
- ✅ **No Lock-In** - Export data, own your prompts and workflows
