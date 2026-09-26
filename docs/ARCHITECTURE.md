# Drop Lab architecture

Drop Lab validates print-on-demand product ideas before money is spent on them.
Phase 1 is the **Market Research Engine**.

```
MARKET RESEARCH  ← Phase 1 (this code)
→ PRODUCT OPPORTUNITY → ORIGINAL DESIGN → PRODUCT PAGE → PRE-ORDER CAMPAIGN
→ SOCIAL CONTENT → REAL CUSTOMER DEMAND → PRINTFUL FULFILLMENT
→ PERFORMANCE DATA → LEARN AND REPEAT
```

## Core rule: observed vs. computed vs. AI

| Kind | Where it comes from | Where it lives in code | UI label |
|---|---|---|---|
| **Observed** | Marketplace APIs, or text quoted verbatim by the web search tool | `src/lib/providers/*` → `Listing`, `Observation` | Observed data |
| **Computed** | Deterministic math on observed data (price ranges, keyword counts) | `src/lib/research/metrics.ts` | Computed |
| **AI** | Claude's interpretation of the evidence | `src/lib/ai/*` → `ai_analyses` table | AI interpretation |
| **Hypothesis** | Things to test with real customers | part of each AI opportunity | Hypothesis to test |

Guards against invented data:

1. Providers return `null` for anything the source doesn't provide. The UI shows `null` as **Unavailable**.
2. Web search evidence is only the search results and the `cited_text` quotes the API returns. Claude's own
   summary prose is thrown away.
3. Listings pulled out of web excerpts are verified in code (`verifyExtractedListings`). The title, price and
   review count must appear verbatim in the quoted excerpt. Otherwise the listing is dropped or the value is cleared.
4. Every AI claim must cite evidence IDs (`L1`, `O3`…). `checkAnalysisEvidence` removes IDs that don't exist and
   flags opportunities left with no real evidence.
5. "Confidence" is a qualitative evidence-strength label (low/medium/high), not a score or a sales forecast.

## Folder structure

```
src/
  app/                          UI pages + API routes (thin; call into lib/)
    page.tsx                    Home: branding, market input, data sources, recent research
    reports/[id]/page.tsx       Report page (auto-refreshes while research runs)
    api/research/route.ts       POST start research · GET recent runs
    api/research/[id]/route.ts  GET full report (JSON)
  components/                   React UI components
    report/                     Report sections (overview, competition, opportunities, evidence)
  lib/
    config.ts                   Reads environment variables (server-only)
    format.ts                   Display helpers
    providers/                  External market data sources
      types.ts                  MarketResearchProvider interface
      registry.ts               List of providers - add new ones here
      etsy.ts, ebay.ts, serpapi-google-shopping.ts, claude-web-search.ts
    research/                   Research logic (no UI, no SQL)
      types.ts                  Listing, Observation, ProviderOutput, ResearchRun
      run-research.ts           Pipeline: providers → save → metrics → AI analysis
      evidence.ts               Assigns evidence IDs (L1…, O1…)
      metrics.ts                Price/review stats, keywords (deterministic)
      report.ts                 ResearchReport type
    ai/                         Claude integration
      client.ts                 Anthropic client + error handling
      prompts.ts                All prompts
      schemas.ts                Zod schemas for structured outputs
      web-evidence.ts           Extract + verify evidence from web search responses
      analyze-market.ts         The analysis call
      analysis-check.ts         Removes citations to evidence that doesn't exist
    db/                         SQLite (better-sqlite3)
      client.ts                 Connection + migrations runner
      migrations.ts             Schema (append-only list)
      repository.ts             All SQL queries
tests/                          Unit tests (vitest) for the pure logic
```

`src/lib/config.ts`, the database and the AI modules import `server-only`, so the build fails if browser code
ever imports them. API keys never reach the frontend.

## Research pipeline

1. `POST /api/research` validates the input, creates a `research_runs` row and returns its ID right away.
   The work continues in the background through Next.js `after()`.
2. Every configured provider runs in parallel. One failing doesn't stop the others. Each result, including
   errors, is saved to `provider_results`.
3. Evidence IDs are assigned from the saved results, so the IDs are stable every time a report is loaded.
4. If `ANTHROPIC_API_KEY` is set, Claude analyses the evidence with a structured-output schema. The result
   (or the reason it was skipped or failed) is saved to `ai_analyses`.
5. The report page polls until the run is `complete` or `failed`.

## Data sources

| Source | Credentials | What it provides | Not provided |
|---|---|---|---|
| **Claude web search** (`web_search_20260209`) | `ANTHROPIC_API_KEY` | Search results (title/URL/page age), verbatim cited excerpts, listings verified from excerpts | Structured marketplace data; totals |
| **Etsy Open API v3** `findAllListingsActive` | `ETSY_API_KEY` (+ `ETSY_SHARED_SECRET`) | Titles, prices, tags, favorites, total active result count | Per-listing review counts, sales |
| **eBay Browse API** `item_summary/search` | `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` (OAuth client credentials) | Titles, prices, sellers, total result count | Review counts, units sold |
| **SerpApi Google Shopping** | `SERPAPI_API_KEY` (paid) | Titles, prices, star ratings, review counts, stores | Total result count |
| **Claude analysis** | `ANTHROPIC_API_KEY` | Interpretation only | Any new facts |

### Platform/API limitations to know about

- **Claude**
  - Web search is billed per search on top of tokens. `WEB_SEARCH_MAX_USES` caps searches per run (default 8).
  - The web search tool only returns what it finds, so coverage varies by niche.
  - Requests use server-side refusal fallback (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`).
    If the main model declines, the API retries on Anthropic's recommended fallback model. The report records
    which model actually answered.
  - A full run (web research plus analysis) can take a few minutes.
- **Etsy**
  - Apps must be registered, and commercial use needs Etsy's approval.
  - Rate limits: 10 requests/second and 10,000/day by default.
  - The `x-api-key` header takes `keystring:shared_secret` (set both variables).
  - Etsy's API terms require the trademark notice shown in the report.
  - There are no review counts or sales per listing.
- **eBay**
  - Browse API default limit is about 5,000 calls/day.
  - Search results don't include product reviews or sold counts.
  - eBay sells little print-on-demand apparel compared to Etsy/Amazon.
- **Amazon (not implemented)**
  - The Product Advertising API needs an approved Associates account with recent qualifying sales, and Amazon
    has announced its replacement by the Creators API. Check Amazon's current terms before building on either.
  - Scraping Amazon violates its terms.
  - The practical options are a paid data vendor (SerpApi's Amazon engine, Keepa, Rainforest), which could be
    added as another provider.
- **Google Trends (not implemented)**
  - There is no generally available official API (Google's Trends API is in limited alpha).
  - SerpApi has a Google Trends engine that could be added as a provider.
- **Redbubble / TeePublic / Printful storefronts**: no public search APIs. Covered indirectly by Claude web search.
- **Numbers are snapshots.** Result counts and prices change constantly. Every provider result stores its
  fetch time.

## Adding a new data provider

1. Create `src/lib/providers/<name>.ts` exporting a `MarketResearchProvider`.
2. Map the source's response to `ProviderOutput` in a pure `normalize…` function. Use `null` for missing
   values and add a unit test.
3. Add the provider's ID to `ProviderId` in `src/lib/research/types.ts` and its display name to
   `PROVIDER_LABELS` in `src/lib/format.ts`.
4. Add it to `ALL_PROVIDERS` in `src/lib/providers/registry.ts`, and its env vars to `.env.example`.

## Designed for later phases (not implemented)

| Future feature | Where it plugs in |
|---|---|
| Opportunity → product concept | New `product_concepts` table referencing `research_runs.id` and an opportunity index. The report gets a "Create concept" button. |
| AI design generation | `src/lib/design/` module with a `DesignGenerator` interface (like providers). Designs stored with provenance, reviewed for IP before use. |
| Printful integration + mockups | `src/lib/fulfillment/printful.ts` behind a `FulfillmentProvider` interface (catalog, mockup generator, orders). Keys stay in `config.ts`. |
| Product pages | New `app/p/[slug]` public routes rendering a product concept. |
| Stripe pre-orders | `src/lib/payments/stripe.ts` + webhook route. Pre-orders are the real demand signal that validates a hypothesis. |
| Social content | `src/lib/ai/social.ts` using the same prompt/schema pattern as the analysis. |
| Campaign tracking / analytics / email capture | New tables (`campaigns`, `events`, `subscribers`) added as new entries in `migrations.ts`. |
| Learning from performance | Compare each opportunity's hypotheses with real pre-order and sales data. Feed outcomes back into future analysis prompts as evidence. |

The database schema is an append-only migration list (`src/lib/db/migrations.ts`), so each phase adds tables
without breaking existing data.
