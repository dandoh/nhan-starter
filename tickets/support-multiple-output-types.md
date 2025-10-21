# Support Multiple Output Types for AI Columns

## 📋 MVP Summary

Implement **5 output types** for AI columns based on real usage analysis:

1. **🏷️ Single Select** (40% of use cases) - One choice, displayed as pill/badge
2. **🏷️ Multi Select** (20%) - Multiple choices, displayed as multiple pills
3. **📝 Text** (25%) - Brief single-line text
4. **📄 Long Text** (10%) - Multi-paragraph detailed responses
5. **📅 Date** (5%) - Date values with formatted display

**Key Features:**
- Options are **optional** for select types - can be predefined OR free-form (AI suggests new values)
- Pills/badges for visual appeal and easy scanning
- Smart date parsing and formatting

These 5 types cover **80%+ of all real-world AI column use cases** from PROJECT.md examples.

---

## Why This Matters

1. **Better AI outputs** - When AI knows the expected type, it can format responses correctly
2. **Validation** - We can validate that AI returns data in the expected format
3. **Better UI** - Different types can have specialized renderers (pills, formatted text, dates)
4. **Easier to scan** - Visual pills make it easy to quickly scan table data
5. **Actions ready** - Typed data makes it easier to use outputs for automation later

---

## MVP Type Details

### 1. 🏷️ Single Select (40% usage)

**What it is**: AI chooses one value, displayed as a colored pill/badge

**Use cases from examples:**
- Stock Analysis: Sentiment (Positive/Negative/Neutral), Company Size (Small/Mid/Large), Investment Signal (Buy/Hold/Sell)
- GitHub Issues: Category (Bug/Feature/Documentation), Priority (Low/Medium/High), Complexity (Simple/Medium/Complex)
- Support Tickets: Sentiment, Category, Priority
- Yes/No decisions (replaces boolean type)

**Two modes:**
- **With predefined options**: AI must choose from list, validated
  - Example: Priority → Options: Low, Medium, High, Critical
  - Each option can have a color: green, yellow, orange, red
- **Free-form (no options)**: AI suggests any value
  - Example: Industry → AI returns "Healthcare", "Finance", etc.
  - Displayed as gray pill

### 2. 🏷️ Multi Select (20% usage)

**What it is**: AI chooses multiple values, displayed as multiple colored pills

**Use cases from examples:**
- SEO: Keywords, Product tags
- Sales: Tech stack (React, Node.js, PostgreSQL), Pain points
- Research: Key findings (multiple bullet points)
- Content: Multiple categories or topics

**Two modes:**
- **With predefined options**: AI chooses from list, each validated
  - Example: Tech Stack → Options: React, Vue, Angular, Node, Python
  - Can set max selections limit
- **Free-form (no options)**: AI generates appropriate tags
  - Example: Keywords → AI returns "AI, machine learning, healthcare"
  - All displayed as gray pills

**Display**: Multiple pills that wrap to next line if needed

### 3. 📝 Text (25% usage)

**What it is**: Brief single-line text response

**Use cases:**
- Names, titles
- Brief explanations
- Short descriptions
- Category names
- Single-line outputs

**Display**: Single line, left-aligned, truncated if too long

### 4. 📄 Long Text (10% usage)

**What it is**: Multi-paragraph detailed text

**Use cases from examples:**
- Draft emails/responses
- Article outlines
- Personalized sales pitches
- Detailed explanations
- Social media copy
- Action suggestions

**Display**: Multi-line text area with scroll if needed

### 5. 📅 Date (5% usage)

**What it is**: Date value with formatted display

**Use cases from examples:**
- Best publish time
- Follow-up date
- Suggested contact date
- Deadlines
- Event dates

**Format options:**
- Short: "Jan 15, 2024"
- Long: "January 15, 2024"

**AI format**: Must return YYYY-MM-DD (e.g., "2024-01-15")

---

## Real Usage Analysis

Looking at all 8 use cases in PROJECT.md:

### 📊 Stock Portfolio Analysis
- Sentiment → **Single Select** (Positive/Negative/Neutral)
- Company Size → **Single Select** (Small/Mid/Large)
- P/E Ratio → Number (future)
- Investment Signal → **Single Select** (Buy/Hold/Sell)
- Risk Level → **Single Select** (Low/Medium/High)

### 🐛 GitHub Issues Dashboard
- Category → **Single Select** (Bug/Feature/Documentation)
- Priority → **Single Select** (Low/Medium/High)
- Complexity → **Single Select** (Simple/Medium/Complex)
- Suggested Action → **Long Text**
- Estimated Time → Number (future)

### 💬 Customer Support Tickets
- Sentiment → **Single Select**
- Category → **Single Select**
- Priority → **Single Select**
- Draft Response → **Long Text**
- Escalation Needed → **Single Select** (Yes/No)

### 🛍️ E-commerce Product Optimization
- SEO Title → **Text**
- Meta Description → **Text**
- Target Keywords → **Multi Select** (5 tags)
- Product Tags → **Multi Select**

### 📝 Content Calendar Planning
- Target Audience → **Text**
- Content Angle → **Text**
- Outline → **Long Text**
- Social Copy → **Long Text**
- Best Publish Time → **Date**

### 💼 Sales Lead Enrichment
- Industry → **Single Select** (free-form or predefined)
- Company Size → Number Range (future)
- Tech Stack → **Multi Select**
- Pain Points → **Multi Select**
- Personalized Pitch → **Long Text**

### 🔬 Research Paper Analysis
- Key Findings → **Multi Select** (displayed as pills instead of bullets)
- Methodology → **Text**
- Relevance Score → Rating (future)
- Citation Style → **Text**
- Related Papers → **Multi Select**

### 📧 Email Campaign Planning
- Email Subject Line → **Text**
- Email Body → **Long Text**
- Follow-up Timing → **Date** or **Text**

**Result**: The 5 MVP types cover the vast majority of use cases. Other types (Number, Rating, Number Range) can come in Phase 2.

---

## Key Decisions

1. **Options are optional** for select types
   - With options: Validated against predefined list
   - Without options: Free-form, AI suggests any value
   - This gives maximum flexibility

2. **Boolean removed** - Use single_select with Yes/No options instead (more flexible)

3. **List becomes multi_select** - Visual pills are better than bullet points for scanning

4. **Date added** - Common enough use case (scheduling, planning)

5. **Manual columns stay text-only** - Types only for AI columns in MVP

6. **No type changing** - If you want to change type, delete and recreate column

7. **Default type is text** - For backward compatibility

---

## UI/UX

### Column Creation
When creating/editing AI column:
1. Select output type from dropdown
2. For select types: optionally define options with colors
3. For multi-select: optionally set max selections
4. For date: choose display format

### Table Display
- **Single select**: One pill with color
- **Multi select**: Multiple pills that wrap
- **Text**: Single line, truncated
- **Long text**: Multi-line with scroll
- **Date**: Formatted date with 📅 icon

### Column Header
- Show type icon (📝, 🏷️, 📅, etc.)
- Tooltip shows full type name

---

## Future Types (Post-MVP)

After MVP is stable and we get user feedback:

1. **⭐ Rating** (1-5 or 1-10 stars) - For scores and ratings
2. **🔢 Number** - For numeric values with formatting
3. **📏 Number Range** - For ranges like "100-500 employees"
4. **💰 Currency** - For money amounts
5. **🔗 URL** - For links with click-through
6. **📧 Email** - For email addresses
7. **Multi-select with checkboxes** - Alternative UI for multi-select


---

## Next Steps

1. ✅ Define requirements (this document)
2. Design & implement MVP
3. Test with real use cases from PROJECT.md
4. Gather user feedback
5. Iterate on Phase 2 types
