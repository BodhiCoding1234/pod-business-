# Drop Lab

A private tool for a Printful-powered print-on-demand business. It researches a market with real data and
turns it into product opportunities to **validate with real customers** before spending money.

**Phase 1: Market Research Engine.** Enter a niche (e.g. `football t-shirts`) and Drop Lab will:

1. Collect real listings and sources from the configured data providers (Etsy, eBay, Google Shopping via
   SerpApi, and Claude web search).
2. Compute price ranges, review stats and common keywords from that data.
3. Ask Claude to interpret the evidence: customer types, themes, sub-niches, saturation signals, and
   opportunity areas with evidence, differentiation angles, risks and hypotheses to test.

Every item in a report is labelled **Observed data**, **Computed**, **AI interpretation** or **Hypothesis to
test**. Values that can't be verified show as **Unavailable**. Nothing in Drop Lab predicts that a product
will sell.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design, data sources, API limitations and future
phases.

## Setup

Requirements: Node.js 20.9+ (22 recommended).

```bash
npm install
cp .env.example .env.local   # then add your API keys
npm run dev                  # http://localhost:3000
```

You need **at least one** data source key. The fastest start is `ANTHROPIC_API_KEY`, which enables both
Claude web search and the AI analysis. Marketplace keys add structured listing data:

| Variable | Needed for |
|---|---|
| `ANTHROPIC_API_KEY` | Claude web search + AI analysis |
| `ANTHROPIC_MODEL` | Optional, default `claude-opus-5` |
| `ENABLE_WEB_SEARCH`, `WEB_SEARCH_MAX_USES` | Optional web search controls |
| `ETSY_API_KEY`, `ETSY_SHARED_SECRET` | Etsy listings |
| `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_MARKETPLACE_ID` | eBay listings |
| `SERPAPI_API_KEY`, `SERPAPI_COUNTRY` | Google Shopping prices, ratings and review counts |
| `DROP_LAB_DB_PATH` | Optional, default `data/drop-lab.db` |

The SQLite database is created automatically on first use.

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm start          # run the production build
npm test           # unit tests (vitest)
npm run lint       # eslint
npm run typecheck  # TypeScript
```
