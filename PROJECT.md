# AI Table Builder

A smart spreadsheet application that uses AI to automatically generate column data based on your prompts. Think Airtable meets ChatGPT.

## Product Vision

Build and sell a SaaS product that lets users create intelligent tables where AI does the heavy lifting. Users can define what each column should contain using natural language, and the AI generates the data automatically based on context from other columns.

## Core Product

### What It Does

Users can create tables with two types of columns:

1. **Manual Columns** - Regular user-editable columns (like Subject, Name, Description)
2. **AI Columns** - Smart columns that auto-generate content using AI prompts

Plus, connect to external data sources (MCP integrations, APIs, databases) to automatically pull data into your tables and take actions based on AI analysis.

## Use Case Examples

### 📊 Stock Portfolio Analysis
```
Data Source: Manual entry or pull from finance API
Columns:
- Ticker (manual) - AAPL, GOOGL, TSLA
- Sentiment (AI) - "Analyze recent news sentiment for this stock"
- Company Size (AI) - "Determine market cap category (small/mid/large)"
- P/E Ratio (AI) - "Get current P/E ratio and compare to industry average"
- Investment Signal (AI) - "Based on all data, suggest Buy/Hold/Sell with reasoning"
- Risk Level (AI) - "Assess risk level (Low/Medium/High) and explain why"
```

### 🐛 GitHub Issues Dashboard
```
Data Source: Pull from GitHub via MCP
Columns:
- Issue Title (auto-imported) - From GitHub
- Status (auto-imported) - Open/Closed
- Category (AI) - "Categorize as Bug/Feature/Documentation/Question"
- Priority (AI) - "Assign priority based on title and description"
- Complexity (AI) - "Estimate complexity (Simple/Medium/Complex)"
- Suggested Action (AI) - "What should I do first? Provide specific next steps"
- Estimated Time (AI) - "Estimate time to resolve in hours"
```

### 💬 Customer Support Tickets
```
Data Source: Pull from Zendesk/Intercom or manual entry
Columns:
- Customer Message (manual/imported)
- Sentiment (AI) - "Analyze customer sentiment and urgency"
- Category (AI) - "Categorize: Billing/Technical/Feature Request/Other"
- Priority (AI) - "Low/Medium/High/Critical with reasoning"
- Root Cause (AI) - "Identify likely root cause of the issue"
- Draft Response (AI) - "Write an empathetic, helpful response"
- Escalation Needed (AI) - "Yes/No and why"
```

### 🛍️ E-commerce Product Optimization
```
Data Source: Import from Shopify/WooCommerce
Columns:
- Product Name (manual)
- Current Description (manual)
- SEO Title (AI) - "Generate SEO-optimized title under 60 chars"
- Meta Description (AI) - "Write compelling meta description under 160 chars"
- Target Keywords (AI) - "Suggest 5 relevant keywords"
- Price Analysis (AI) - "Compare to market, suggest optimal price point"
- Product Tags (AI) - "Generate relevant tags for better discoverability"
```

### 📝 Content Calendar Planning
```
Data Source: Manual entry or pull from CMS
Columns:
- Topic (manual) - "AI in healthcare"
- Target Audience (AI) - "Identify ideal reader persona"
- SEO Difficulty (AI) - "Rate keyword difficulty and search volume"
- Content Angle (AI) - "Suggest unique angle to stand out"
- Outline (AI) - "Generate article outline with H2/H3 structure"
- Social Copy (AI) - "Write Twitter, LinkedIn posts for promotion"
- Best Publish Time (AI) - "Suggest optimal day/time based on audience"
```

### 💼 Sales Lead Enrichment
```
Data Source: Import from CSV or pull from LinkedIn/CRM
Columns:
- Company Name (manual)
- Website (manual)
- Industry (AI) - "Identify industry and sub-sector"
- Company Size (AI) - "Estimate employee count range"
- Tech Stack (AI) - "Research and list technologies they use"
- Pain Points (AI) - "Identify likely pain points based on industry"
- Personalized Pitch (AI) - "Write custom outreach email"
- Decision Maker (AI) - "Suggest job titles of key decision makers"
```

### 🔬 Research Paper Analysis
```
Data Source: Manual entry or pull from academic databases
Columns:
- Paper Title (manual)
- Abstract (manual)
- Key Findings (AI) - "Summarize main findings in 2-3 bullet points"
- Methodology (AI) - "Describe research methodology used"
- Relevance Score (AI) - "Rate relevance to my research (1-10) with explanation"
- Citation Style (AI) - "Generate citation in APA, MLA, Chicago formats"
- Related Papers (AI) - "Suggest related papers to read next"
```

### 📧 Email Campaign Planning
```
Data Source: Manual or import contact list
Columns:
- Contact Name (manual)
- Company (manual)
- Previous Interactions (manual)
- Personalization Angle (AI) - "Find unique angle based on their background"
- Email Subject Line (AI) - "Write 3 compelling subject line options"
- Email Body (AI) - "Draft personalized email with clear CTA"
- Follow-up Timing (AI) - "When to follow up and what to say"
- Expected Response (AI) - "Predict likely response and objections"
```

### How It Works

1. User creates a table and adds manual columns
2. User adds AI columns with custom prompts
3. User fills in manual column data (or pulls from external sources)
4. Click "Compute All" - AI reads the row context and generates values for AI columns
5. Results appear in real-time as they're computed
6. Optionally trigger actions based on AI results (create tickets, send emails, update systems)

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

✅ Create unlimited tables
✅ Add manual and AI columns to any table
✅ Custom AI prompts for each column
✅ AI reads context from all manual columns in the same row
✅ Background processing (no waiting for AI responses)
✅ Real-time status updates (pending → computing → completed)
✅ User authentication and data isolation
✅ Local caching for instant UI

## Roadmap

### Phase 1: Core Product (Current)
- ✅ Basic table CRUD
- ✅ Manual and AI columns
- ✅ Claude integration
- ✅ Background computation

### Phase 2: Polish & UX
- 🎯 Better error handling and retry logic
- 🎯 Cell-level compute triggers (compute single cells)
- 🎯 Column reordering and resizing
- 🎯 Table templates (common use cases)
- 🎯 Export to CSV/Excel

### Phase 3: External Integrations
- 🎯 MCP (Model Context Protocol) integrations
- 🎯 Connect to external data sources (GitHub, Linear, Notion, etc.)
- 🎯 Pull data automatically from APIs
- 🎯 Take actions from tables (create tickets, send emails, update databases)
- 🎯 Batch import from CSV/Excel
- 🎯 Webhook triggers for automation

### Phase 4: Power Features
- 🎯 AI columns that read from other AI columns
- 🎯 Multiple AI models (GPT-4, Gemini, Llama)
- 🎯 Formula columns (like spreadsheets)
- 🎯 Cell history and version tracking
- 🎯 Custom functions and scripts

### Phase 5: Collaboration
- 🎯 Team workspaces
- 🎯 Share tables with view/edit permissions
- 🎯 Comments on cells
- 🎯 Real-time collaboration

### Phase 6: Monetization
- 🎯 Usage-based pricing (per AI computation)
- 🎯 Workspace seats
- 🎯 Advanced AI models as premium tier
- 🎯 API access

## Target Customers

- **Marketing teams** - Analyze customer feedback, categorize leads
- **Customer support** - Auto-classify tickets, draft responses
- **Content creators** - Generate metadata, SEO descriptions, translations
- **Researchers** - Extract insights, categorize data
- **Sales teams** - Enrich lead data, generate outreach templates
- **Product managers** - Analyze user requests, prioritize features

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

- Tables created per user
- AI computations per table
- Most common AI prompts (template opportunities)
- Computation success/failure rates
- User retention and active usage
- Time saved vs manual data entry

## Competitive Edge

- **Flexible prompting** - Users write their own AI logic, no pre-defined templates
- **Context-aware AI** - AI sees all row data, not just isolated cells
- **External integrations** - Connect to any data source (MCP, APIs, databases) and take actions automatically
- **Fast UI** - Local-first architecture with background processing, no lag
- **Transparent status** - Users see exactly what's computing in real-time
- **Action-oriented** - Not just data analysis, but take actions (create tickets, send emails, update records)
- **No vendor lock-in** - Export your data anytime, own your prompts and logic
