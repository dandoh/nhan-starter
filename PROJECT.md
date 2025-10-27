# AI Workbook Platform

A computational notebook meets intelligent spreadsheet - where you can combine data tables, text, code, and AI analysis in one collaborative workspace. Think Hex + Notion + Airtable, powered by AI.

## Product Vision

Build and sell a SaaS product centered around **Workbooks** - smart documents that combine multiple types of content blocks (tables, text, visualizations, code) with an AI assistant that understands your entire workspace context.

Users work in workbooks where AI helps analyze data, generate content, answer questions, and automate workflows - all while seeing the full context of tables, notes, and previous analyses.

## Core Product

### What It Does

**Workbooks** are the main working unit. Each workbook contains:

1. **Multiple Blocks** - Different content types working together:
   - **AI Tables** - Smart tables with AI-generated columns based on custom prompts
   - **Text Blocks** - Markdown/rich text for notes, documentation, and analysis
   - **More Coming** - Code cells, visualizations, charts, embeds, etc.

2. **AI Chat Assistant** - Positioned on the right side of every workbook:
   - Understands context from all blocks in the workbook
   - Can analyze table data, answer questions, generate insights
   - Helps fill in AI columns, suggest next steps, create new blocks
   - Conversational interface for exploring data and ideas

3. **Smart AI Tables** - One of the core block types:
   - **Manual Columns** - Regular user-editable columns (like Subject, Name, Description)
   - **AI Columns** - Smart columns that auto-generate content using AI prompts
   - AI reads full row context to generate intelligent, context-aware values

4. **External Integrations** - Connect to external data sources (MCP integrations, APIs, databases) to automatically pull data into your workbooks and take actions based on AI analysis.

## Use Case Examples

Each workbook combines tables, text documentation, and AI assistance to solve complete workflows:

### 📊 Stock Portfolio Analysis Workbook

**Blocks:**
- **Text:** "Q4 2025 Portfolio Review - Analyzing tech sector holdings"
- **AI Table:** Stock data with columns:
  - Ticker (manual) - AAPL, GOOGL, TSLA
  - Sentiment (AI) - "Analyze recent news sentiment for this stock"
  - Company Size (AI) - "Determine market cap category (small/mid/large)"
  - P/E Ratio (AI) - "Get current P/E ratio and compare to industry average"
  - Investment Signal (AI) - "Based on all data, suggest Buy/Hold/Sell with reasoning"
  - Risk Level (AI) - "Assess risk level (Low/Medium/High) and explain why"
- **Text:** Key findings and recommendations
- **AI Chat:** "Which stocks show the strongest momentum? Compare AAPL vs GOOGL risk profiles"

### 🐛 GitHub Issues Dashboard Workbook

**Blocks:**
- **Text:** "Sprint 12 Planning - Prioritizing backlog for next 2 weeks"
- **AI Table:** Issues pulled from GitHub via MCP:
  - Issue Title (auto-imported)
  - Status (auto-imported)
  - Category (AI) - "Categorize as Bug/Feature/Documentation/Question"
  - Priority (AI) - "Assign priority based on title and description"
  - Complexity (AI) - "Estimate complexity (Simple/Medium/Complex)"
  - Suggested Action (AI) - "What should I do first? Provide specific next steps"
  - Estimated Time (AI) - "Estimate time to resolve in hours"
- **Text:** Sprint goals and team capacity notes
- **AI Chat:** "Show me all high-priority bugs. Which issues can be finished this week?"

### 💬 Customer Support Analysis Workbook

**Blocks:**
- **Text:** "Week of Oct 20-26: Support Ticket Analysis"
- **AI Table:** Tickets from Zendesk:
  - Customer Message (imported)
  - Sentiment (AI) - "Analyze customer sentiment and urgency"
  - Category (AI) - "Categorize: Billing/Technical/Feature Request/Other"
  - Priority (AI) - "Low/Medium/High/Critical with reasoning"
  - Root Cause (AI) - "Identify likely root cause"
  - Draft Response (AI) - "Write empathetic response"
- **Text:** "Trends: 60% billing issues due to unclear pricing page"
- **AI Chat:** "What are the top 3 issues this week? Draft a response for ticket #156"

### 🛍️ Product Launch Planning Workbook

**Blocks:**
- **Text:** "Fall 2025 Product Launch - SEO Optimization"
- **AI Table:** Product catalog:
  - Product Name (manual)
  - Current Description (manual)
  - SEO Title (AI) - "Generate SEO-optimized title under 60 chars"
  - Meta Description (AI) - "Write compelling meta description"
  - Target Keywords (AI) - "Suggest 5 relevant keywords"
  - Price Analysis (AI) - "Compare to market, suggest optimal price"
- **Text:** "Launch strategy: Focus on keywords with <40 difficulty score"
- **AI Chat:** "Which products need the most SEO work? Suggest pricing for Product X"

### 📝 Content Calendar Workbook

**Blocks:**
- **Text:** "Q4 Content Strategy - Healthcare AI Series"
- **AI Table:** Content ideas:
  - Topic (manual)
  - Target Audience (AI) - "Identify ideal reader persona"
  - SEO Difficulty (AI) - "Rate keyword difficulty"
  - Content Angle (AI) - "Suggest unique angle"
  - Outline (AI) - "Generate article outline"
  - Social Copy (AI) - "Write Twitter, LinkedIn posts"
- **Text:** Publishing schedule and performance goals
- **AI Chat:** "Which topics have the best SEO opportunity? Write an outline for the healthcare AI article"

### 💼 Sales Prospecting Workbook

**Blocks:**
- **Text:** "Q4 2025 Outbound Campaign - Enterprise SaaS"
- **AI Table:** Lead list from LinkedIn:
  - Company Name (manual)
  - Website (manual)
  - Industry (AI) - "Identify industry and sub-sector"
  - Company Size (AI) - "Estimate employee count"
  - Tech Stack (AI) - "Research technologies they use"
  - Pain Points (AI) - "Identify likely pain points"
  - Personalized Pitch (AI) - "Write custom outreach email"
- **Text:** Campaign results and A/B test notes
- **AI Chat:** "Which companies are the best fit? Rewrite the pitch for Company X to focus on cost savings"

### How It Works

1. **Create a Workbook** - Start with a blank workbook for your project/analysis
2. **Add Blocks** - Insert tables, text, and other content blocks as needed
3. **Build AI Tables** - Add manual and AI columns with custom prompts
4. **Use the AI Assistant** - Chat with AI on the right side:
   - Ask questions about your data
   - Get help writing AI column prompts
   - Generate insights and summaries
   - Request new analyses or visualizations
5. **Compute & Analyze** - Click "Compute All" on tables or let AI assistant trigger computations
6. **Document & Share** - Add text blocks to explain findings, document processes, tell the story
7. **Connect External Data** - Pull from APIs, databases, or trigger actions based on AI results

**The Power of Context**: The AI assistant sees everything in your workbook - all your tables, text blocks, and previous conversations - making it incredibly smart about your specific use case.

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

✅ **Workbooks** - Create unlimited workbooks as your main workspace
✅ **AI Tables** - Add tables with manual and AI columns
✅ **AI Chat Assistant** - Context-aware chat on the right side of workbooks
✅ **Custom AI Prompts** - Write your own logic for AI columns
✅ **Context-Aware AI** - AI reads full row context when computing columns
✅ **Background Processing** - No waiting for AI responses, works async
✅ **Real-time Status** - See pending → computing → completed states
✅ **User Authentication** - Secure login and data isolation
✅ **Local-First UI** - Optimistic updates and instant feedback

🚧 **In Progress:**
- Text blocks for documentation and notes
- Multi-block workbook layout
- AI assistant understanding full workbook context

## Roadmap

### Phase 1: Workbook Foundation (Current)
- ✅ Workbook CRUD and management
- ✅ AI Tables with manual and AI columns
- ✅ AI Chat Assistant per workbook
- ✅ Claude integration
- ✅ Background computation with Inngest
- 🚧 Text blocks (Markdown/rich text)
- 🚧 Multi-block workbook layout
- 🚧 Block reordering and organization

### Phase 2: Enhanced Blocks & UX
- 🎯 **More Block Types:**
  - Code cells (Python, SQL, JavaScript)
  - Visualization blocks (charts, graphs)
  - Embed blocks (web pages, images, videos)
  - Query blocks (SQL, API calls)
- 🎯 **Table Improvements:**
  - Cell-level compute triggers
  - Column reordering and resizing
  - Better error handling and retry
  - Export to CSV/Excel
- 🎯 **AI Assistant Upgrades:**
  - Understands all blocks in workbook
  - Can generate and edit blocks via chat
  - Suggest next steps and analyses

### Phase 3: External Integrations (MCP)
- 🎯 MCP (Model Context Protocol) integrations
- 🎯 Connect to data sources (GitHub, Linear, Notion, Google Sheets, databases)
- 🎯 Pull data automatically into workbooks
- 🎯 Take actions from workbooks (create tickets, send emails, update records)
- 🎯 Batch import from CSV/Excel
- 🎯 Webhook triggers for automation
- 🎯 Scheduled workbook runs

### Phase 4: Power Features
- 🎯 **Advanced AI:**
  - AI columns that read from other AI columns
  - Multiple AI models (GPT-4, Gemini, Claude, Llama)
  - Custom AI model configurations
  - AI-generated visualizations
- 🎯 **Computation:**
  - Formula columns (spreadsheet-like)
  - Code execution in blocks
  - Query results as data sources
- 🎯 **Versioning:**
  - Cell history and rollback
  - Workbook version history
  - Block-level undo/redo

### Phase 5: Collaboration & Sharing
- 🎯 Team workspaces
- 🎯 Share workbooks with view/edit permissions
- 🎯 Comments on blocks and cells
- 🎯 Real-time collaboration
- 🎯 Publish workbooks as public pages
- 🎯 Workbook templates and marketplace

### Phase 6: Monetization
- 🎯 Free tier: 3 workbooks, 100 AI computations/month
- 🎯 Pro tier: Unlimited workbooks, usage-based AI pricing
- 🎯 Team tier: Collaboration features, shared workspaces
- 🎯 Enterprise: Advanced AI models, priority support, custom integrations
- 🎯 API access and embedding

## Target Customers

- **Data Analysts** - Explore datasets, generate insights, document findings in one place
- **Product Managers** - Track features, analyze feedback, maintain product specs with AI assistance
- **Marketing Teams** - Plan campaigns, analyze performance, generate content with contextual AI
- **Customer Support** - Analyze tickets, identify trends, draft responses with full context
- **Content Creators** - Plan editorial calendars, generate SEO content, track performance
- **Sales Teams** - Enrich leads, personalize outreach, track pipeline with AI insights
- **Researchers** - Organize papers, extract insights, document methodology
- **Consultants** - Deliver client analyses, combine data with recommendations, professional reports
- **Operations Teams** - Process tracking, automation workflows, documentation
- **Anyone** who works with data and needs to document their thinking, analysis, and decisions

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

- **Workbooks:** Created per user, active workbooks, workbook retention
- **Blocks:** Total blocks, blocks per workbook, block type distribution
- **AI Usage:** Computations per workbook, chat messages, most common prompts
- **Engagement:** Daily active users, time spent in workbooks, blocks created per session
- **Success Metrics:** Computation success/failure rates, AI accuracy feedback
- **Growth:** User retention curves, feature adoption, referral rates
- **Monetization:** Conversion to paid, compute usage per tier, expansion revenue

## Competitive Edge

### vs. Traditional Spreadsheets (Excel, Google Sheets)
- **AI-Native** - Built-in AI for data generation, not just formulas
- **Documentation Built-In** - Combine data and narrative in one place
- **Conversational Interface** - Chat with AI about your data instead of complex formulas

### vs. Notebooks (Jupyter, Observable)
- **No Coding Required** - Natural language AI instead of Python/JavaScript
- **User-Friendly** - Beautiful UI designed for non-developers
- **Background Processing** - No waiting for cell execution

### vs. Data Tools (Airtable, Notion Databases)
- **Flexible AI Prompting** - Users write custom logic, not pre-defined formulas
- **Full Workbook Context** - AI understands entire workspace, not just one table
- **Analysis + Documentation** - Complete workflow in one tool

### vs. AI Chat Tools (ChatGPT, Claude)
- **Structured Data** - Tables with persistent, computed columns
- **Reproducible Workflows** - Reuse prompts across rows automatically
- **Context Management** - Workbooks maintain context better than chat history

### Core Advantages
- ✅ **Hybrid Interface** - Structured tables + flexible text + conversational AI
- ✅ **Context-Aware AI** - Understands full workbook, not just isolated queries
- ✅ **External Integrations** - Connect to any data source via MCP
- ✅ **Fast & Responsive** - Local-first architecture with background processing
- ✅ **Transparent** - See exactly what AI is computing in real-time
- ✅ **Action-Oriented** - Trigger real workflows, not just analysis
- ✅ **No Lock-In** - Export data, own your prompts and workflows
