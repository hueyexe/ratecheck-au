# AGENTS.md

## Project Overview

**RateCheck** — free, open-source Australian mortgage rate comparator. Live at **ratecheckau.homes**.

Two codebases in one repo:
1. **Go data aggregator** (`aggregator/`) — CLI that fetches CDR open banking APIs, writes `public/rates.db` (latest snapshot only, ~2.7 MB), `public/analytics.json` (pre-computed history stats), and `public/meta.json`. Full history lives in `history.db` — persisted via **GitHub Actions cache**, never committed, never served to browsers.
2. **React frontend** (repo root) — Vite + React + TypeScript + Tailwind CSS v4 SPA. Loads `rates.db` via sql.js (WASM). Analytics page fetches `analytics.json` — no heavy SQL in the browser.

## Build & Run Commands

### Frontend (React + Vite)

Package manager is **bun** (not npm/yarn/pnpm).

```sh
bun install          # install dependencies
bun run build        # typecheck (tsc -b) then vite build → dist/
bun run dev          # local dev server (port 5173 or 5174)
bun run lint         # eslint across all .ts/.tsx files
```

`vite.config.ts` has `base: "/"` — the app is served from the domain root (`ratecheckau.homes/`), not a subdirectory.

`src/main.tsx` uses `<BrowserRouter basename="/">`.

### Go Aggregator

```sh
cd aggregator
go build ./...       # compile check
go run .             # run aggregator — writes ../public/rates.db, ../public/analytics.json, ../public/meta.json
golangci-lint run ./...  # lint (v2 config in aggregator/.golangci.yml)
```

Go version: 1.26. Linter: golangci-lint v2. Module name: `aus-mortgage-comparator/aggregator` (stale name in go.mod, don't change it).

### CI Workflows

- `.github/workflows/update-rates.yml` — runs every 6h. Restores `history.db` from Actions cache, runs aggregator, saves cache, commits only `public/rates.db`, `public/analytics.json`, `public/meta.json`. **`history.db` is never committed.**
- `.github/workflows/deploy.yml` — `bun run build`, deploys `dist/` to GitHub Pages on push to main.

## Architecture — Data Flow

```
CDR Register API → Go aggregator → history.db (Actions cache only, never committed)
                                 → public/rates.db (latest snapshot only, ~2.7 MB)
                                 → public/analytics.json (pre-computed history stats)
                                 → public/meta.json (tiny metadata)
                                        ↓
                              Vite build copies public/ to dist/
                                        ↓
                              Cloudflare CDN → Browser
                              sql.js WASM loads rates.db
                              SQL queries power all filtering/sorting
                              Analytics page fetches analytics.json (no WASM queries)
```

### SQLite Schema — `rates` table key columns

- `snapshot_id`, `bank_name`, `product_id`, `rate_type`, `rate`, `comparison_rate`
- `repayment_type`, `loan_purpose`, `lvr_min`, `lvr_max`, `fixed_term`
- `feature_types`, `feature_details` (JSON array of `{type, value, info}` from CDR)
- `product_tags`, `audience_tags`, `eligibility_types`, `eligibility_details` (JSON)
- `rate_conditions`, `rate_notes`, `is_tailored`, `is_revert_rate`
- `rates.db` contains latest snapshot only — history lives in Actions cache

### Data Quality Rules (aggregator)

- Rates `> 0.20` (20%) are skipped — CDR data errors (e.g. Bank of Sydney published 71.9%)
- `outlierFloor = 0.04` — rates below 4% excluded from market stats (specialist products), still visible in table
- `is_revert_rate = 1` — flagged when: no comparison rate AND rate > 7% AND same product has a lower rate. These are the "revert rate" a bank charges if you don't qualify for their discount.

### analytics.json shape

Pre-computed by `aggregator/analytics.go`. Key fields:
- `summary.medianRateOOPI` — median owner-occupied P&I variable rate (more useful than mean)
- `featurePrevalence` — `[{feature, label, count, pct}]` — % of products with each feature
- `rateByLvr` — `[{band, avgVariable, avgFixed, count}]` — rates by LVR band
- `variableVsFixed` — `[{date, variablePct, variableCount, fixedCount}]` — mix over time
- `cashbackBanks` — `[{bankName, productName, detail}]` — banks with cashback offers

### Frontend Data Layer

- `src/db.ts` — sql.js wrapper. All filtering via parameterised SQL, no JS array filtering.
- `src/hooks/useUrlState.ts` — filter state synced to URL search params
- Analytics data: `fetch(analyticsUrl)` in `AnalyticsPage.tsx`, not SQL
- `import.meta.env.BASE_URL` prefix required when fetching static assets

### SPA Routing (GitHub Pages)

- `public/404.html` redirects unknown paths to `/?p=<encoded-path>`
- `index.html` restore script decodes `p` param and calls `history.replaceState`
- **Critical**: the restore script must use `decodeURIComponent(p[1])` directly — do NOT prepend `window.location.pathname` or paths double up (e.g. `//rates`)

## Code Style — TypeScript / React

- **bun** only — never npm/yarn
- `verbatimModuleSyntax` enabled — use `import type` for type-only imports
- Tailwind CSS v4 via `@tailwindcss/vite` — no `tailwind.config.js`
- Color tokens: `accent-*` (warm teal), `sand-*` (warm neutrals) — never `gray-*` or `indigo-*`
- `.nums` utility class = DM Mono + tabular-nums — use for ALL rate/number display
- `font-mono` is banned — only use `.nums` for numbers
- Active pills: `bg-accent-500 text-white rounded-full`; inactive: `border border-sand-200 rounded-full`
- `MaterialIcon.tsx` — inline SVG paths only, no external icon package imports
- DB row types use snake_case to match SQLite columns (`RateRow.bank_name`)
- No Redux — `useState`/`useMemo` only. DB loaded once in `useEffect`, stored in `useState<Database | null>`

## Code Style — Go

- All files in `package main` (single binary)
- `fmt.Errorf("context: %w", err)` for error wrapping
- Skip individual bank/product failures — don't abort the whole run
- `errgroup` with `g.SetLimit(10)` for concurrent fetching
- CDR API: set `x-v` header, retry with lower version on 406

## File Layout

```
aggregator/
  main.go            CLI entry, concurrency, orchestration
  register.go        CDR Register API client
  products.go        rate fetching, revert rate detection, feature/eligibility details
  db.go              SQLite schema, write, writeStrippedDB(), migrations
  analytics.go       pre-compute analytics.json (outlierFloor=0.04, revertRateCeil=0.20)
  meta.go            meta.json export
  types.go           all struct definitions
  .golangci.yml      linter config (v2)
public/
  rates.db           latest snapshot only (~2.7 MB)
  analytics.json     pre-computed history stats
  meta.json          metadata
  CNAME              ratecheckau.homes
  404.html           SPA redirect for GitHub Pages
  site.webmanifest   PWA manifest
src/
  main.tsx           BrowserRouter basename="/", ThemeProvider
  App.tsx            root component, DB init, layout
  db.ts              sql.js wrapper, typed query functions
  types.ts           shared TypeScript interfaces
  index.css          Tailwind + @theme color tokens (oklch)
  productProfile.ts  product classification, tag parsing, profile caching
  hooks/
    useUrlState.ts   filter state ↔ URL params
    useSEO.ts        per-route document.title
  utils/
    csv.ts           CSV export
  components/
    Header.tsx       wordmark, pill nav, live dot
    Dashboard.tsx    hero stat + native bar charts (no Recharts)
    Filters.tsx      sticky filter bar, rounded-full pills
    RateTable.tsx    virtualised table (desktop) / cards (mobile)
    AnalyticsPage.tsx fetches analytics.json, renders Recharts charts
    CompareDrawer.tsx side-by-side bank comparison
    ProductDetail.tsx feature/eligibility details from CDR
    BanksView.tsx    bank list
    BankDetail.tsx   single bank products
    AboutPage.tsx    plain-language about + GitHub link
    MaterialIcon.tsx inline Material Design SVG paths (no npm package)
    LoadingSkeleton.tsx animated loading placeholder
.github/workflows/
  update-rates.yml   6h cron: cache history.db, run aggregator, commit public/ files only
  deploy.yml         push to main → bun build → GitHub Pages
```

## Critical Architecture Rules

- `rates.db` is latest-snapshot-only — **never put history back in the browser DB**
- `analytics.json` is pre-computed — **never run window functions in WASM**
- `history.db` is gitignored — **never commit it, never put it in `public/`**
- `Dashboard.tsx` uses native SVG bars, not Recharts — keep it that way (Recharts is only in AnalyticsPage)
- `vite.config.ts` base is `"/"` — do not change to a subdirectory path

## Design Context

### Users
**Primary: everyday Australian homebuyer.** Non-technical, time-poor. Copy must be plain Australian English. Data must be scannable. Secondary: brokers/refinancers who want density, filters, CSV, analytics.

### Brand
**Approachable, honest, data-forward.** Three words: **clear, trustworthy, fresh.** Warm and direct — not a bank, not a fintech startup.

### Aesthetic
Friendly but data-dense. Warm teal accent, warm sand neutrals, DM Sans body, DM Mono numbers only.

**Never:**
- Gradient headers or gradient text
- `font-mono` for "data vibes" — only `.nums` for actual numbers
- `border-t-4` coloured accents, `hover:-translate-y` lift shadows, glassmorphism
- `gray-*` or `indigo-*` colour tokens
- Jargon in user-facing copy
