# Daily Market Dashboard

## Data Architecture

### External API

**Alpha Vantage** (single source for now):

- Economic indicators: Treasury Yields, Fed Funds Rate, CPI, Unemployment
- ETF quotes: Sector ETFs, VIX proxy (VIXY), Gold (GLD), Silver (SLV), High Yield (HYG), Investment Grade (LQD)
- Forex: DXY via UUP or currency pairs

*Market breadth skipped for MVP - can add later with different source.*

### Database Schema (`src/db/schema.ts`)

```typescript
market_snapshots: {
  id, date, symbol, value, change_1d, change_1w, change_1m
  unique(date, symbol)
}
```

### Indicator Config (`src/config/indicators.ts`)

```typescript
export const INDICATORS = {
  VIX: { category: 'volatility' },
  DXY: { category: 'currency' },
  US10Y: { category: 'rates' },
  US02Y: { category: 'rates' },
  HYG: { category: 'credit' },
  LQD: { category: 'credit' },
  GLD: { category: 'commodities' },
  SLV: { category: 'commodities' },
  XLK: { category: 'sector' },
  // ... 11 sector ETFs
} as const
```

---

## Implementation

### 1. Database Schema

Add `market_snapshots` table to `src/db/schema.ts`

### 2. Market Data Service (`src/services/market-data/`)

Extensible architecture:

```
src/services/market-data/
├── types.ts          # MarketDataProvider interface
├── alpha-vantage.ts  # implements MarketDataProvider
├── index.ts          # exports unified fetch functions
```

**Provider interface** (for future extensibility):

```typescript
interface MarketDataProvider {
  fetchQuote(symbol: string): Promise<QuoteData>
  fetchEconomicIndicator(indicator: string): Promise<IndicatorData>
}
```

### 3. ORPC Routes (`src/orpc/router/market.ts`)

- `getDashboardData` - All indicators for a date
- `getIndicatorHistory` - Historical data for charts

### 4. Fetch Script (`src/scripts/fetch-market-data.ts`)

Manual script to fetch and store market data:

- Run via `pnpm tsx src/scripts/fetch-market-data.ts`
- Tracks last fetch date per symbol in `sync_metadata` table
- Re-runs only fetch missing dates (no full backfill)

**Additional table:**

```typescript
sync_metadata: { id, symbol, last_synced_date, updated_at }
```

### 5. Dashboard UI (`src/routes/_authed/dashboard.tsx`)

- Indicator cards grouped by category
- Sector performance grid
- Historical chart (click indicator to view)

---

## Key Indicators

| Category | Symbols |

|----------|---------|

| Volatility | VIXY (VIX proxy) |

| Currency | UUP (DXY proxy) |

| Rates | Treasury yields via Alpha Vantage economic API |

| Credit | HYG, LQD |

| Commodities | GLD, SLV (for Gold/Silver ratio) |

| Sectors | XLK, XLF, XLE, XLV, XLI, XLY, XLP, XLB, XLRE, XLU, XLC |
