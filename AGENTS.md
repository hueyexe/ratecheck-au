# AGENTS.md

## Project Overview

**RateCheck** — free, open-source Australian mortgage rate comparator. Two codebases in one repo:
1. **Go data aggregator** (`aggregator/`) — CLI that fetches CDR open banking APIs, writes `public/rates.db` (latest snapshot only, ~2.7 MB), `public/analytics.json` (pre-computed history stats), and `public/meta.json`. Full history lives in `history.db` at repo root — never served to browsers.
2. **React frontend** (repo root) — Vite + React + TypeScript + Tailwind CSS v4 SPA. Loads `rates.db` via sql.js (WASM). Analytics page fetches `analytics.json` — no heavy SQL in the browser.

## Build & Run Commands

### Frontend (React + Vite)

Package manager is **bun** (not npm/yarn/pnpm).

```sh
bun install          # install dependencies
bun run build        # typecheck (tsc -b) then vite build → dist/
bun run dev          # local dev server
bun run preview      # preview production build
bun run lint         # eslint across all .ts/.tsx files
```

No test framework is configured yet. If adding tests, use vitest:
```sh
bun add -d vitest
bun run vitest run              # run all tests
bun run vitest run src/App.test.tsx  # run a single test file
```

### Go Aggregator

```sh
cd aggregator
go build ./...       # compile check
go run .             # run aggregator, writes ../public/rates.db + ../public/meta.json
go test ./...        # run all tests (none yet)
go test -run TestFoo # run a single test
go mod tidy          # sync dependencies
golangci-lint run ./...  # lint (v2 config in aggregator/.golangci.yml)
```

Dependencies: `golang.org/x/sync`, `modernc.org/sqlite`. Go version: 1.26. Linter: golangci-lint v2.

### CI Workflows

- `.github/workflows/update-rates.yml` — runs `go run .` in aggregator/ every 6h, commits rates.db + meta.json if changed
- `.github/workflows/deploy.yml` — `bun run build`, deploys dist/ to GitHub Pages on push to main

## Architecture — Data Flow

```
CDR Register API → Go aggregator → history.db (repo root, full 30-day history)
                                 → public/rates.db (latest snapshot only, ~2.7 MB)
                                 → public/analytics.json (pre-computed history stats)
                                 → public/meta.json (tiny metadata)
                                        ↓
                              Vite build copies public/ to dist/
                                        ↓
                              Browser fetches rates.db (~2.7 MB)
                              sql.js WASM loads it
                              SQL queries power all filtering/sorting
                              Analytics page fetches analytics.json (no WASM queries)
```

### SQLite Schema
- `snapshots` table — one row per aggregator run (fetched_at, bank_count, rate_count)
- `rates` table — one row per rate entry, FK to snapshot_id
- Indexes on (snapshot_id, rate_type, repayment_type, loan_purpose, lvr_max, rate) for fast filtered queries
- `rates.db` contains latest snapshot only — history lives in `history.db` at repo root

### Frontend Data Layer
- `src/db.ts` — sql.js wrapper with typed query functions (queryRates, queryDashboardStats, queryRateDistribution, queryBestRatesByBank, queryRateHistoryByProduct)
- All filtering/sorting happens via parameterised SQL — no JS array filtering
- `src/hooks/useUrlState.ts` — filter state synced to URL search params
- Analytics data comes from `public/analytics.json` fetch, not SQL queries

## Code Style — TypeScript / React

### Formatting & Syntax
- Double quotes for strings in TSX/TS files
- Semicolons at end of statements
- 2-space indentation
- `verbatimModuleSyntax` is enabled — use `import type` for type-only imports
- Target: ES2023, JSX: react-jsx

### Imports
- Use `import type { X }` for type-only imports (enforced by verbatimModuleSyntax)
- React hooks from `"react"`, types from `"./types"`, components from `"./components/X"`
- Database functions from `"./db"`, theme from `"./ThemeProvider"`
- No path aliases configured — use relative paths

```tsx
import { useState, useEffect, useMemo } from "react";
import type { Database } from "sql.js";
import type { FilterState, RateRow, MetaFile } from "./types";
import { initDB, queryRates } from "./db";
import { useTheme } from "./ThemeProvider";
```

### Components
- Default exports for components: `export default function ComponentName()`
- Functional components only, no classes
- Props interfaces defined inline above the component in the same file
- No separate props files — keep interface next to the component

### Types
- Shared types in `src/types.ts`, exported as named interfaces
- DB row types use snake_case to match SQLite columns: `RateRow.bank_name`
- Use string literal unions for enums: `"VARIABLE" | "FIXED" | ...`
- No TypeScript enums — use string unions or `Record<string, string>` lookup maps
- Strict mode enabled: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`

### State & Data
- `useState` / `useMemo` for local state — no Redux or external state management
- SQLite DB loaded once via `initDB()` in `useEffect`, stored in `useState<Database | null>`
- Queries run synchronously via sql.js — wrap in `useMemo` keyed on filter state
- Use `import.meta.env.BASE_URL` prefix when fetching static assets
- Filter state synced to URL via `useUrlFilters()` hook

### Styling
- Tailwind CSS v4 via `@tailwindcss/vite` plugin — no tailwind.config.js
- All styling via utility classes in className strings
- Dark mode via `dark:` variant classes + ThemeProvider context
- Color scheme: `accent-*` (warm teal) for primary, `sand-*` for neutral — NOT gray/indigo
- Responsive: `md:` breakpoint prefix for desktop layouts
- Active pills: `bg-accent-500 text-white rounded-full`; inactive: `border border-sand-200 rounded-full`
- Custom theme colors defined in `src/index.css` via `@theme` block using `oklch()` values
- `nums` utility class = DM Mono + tabular-nums — use for ALL rate/number display

### Error Handling
- Early return for error/loading states in components
- Graceful handling of missing data (optional chaining, fallback values)
- Loading skeleton component shown while DB initializes

## Code Style — Go

### Formatting
- `gofmt` standard formatting (tabs, no config needed)
- All files in `package main` (single binary)

### Naming
- Exported types: PascalCase (`MortgageRate`, `BankBrand`)
- Unexported helpers: camelCase (`fetchProducts`, `fetchBankRates`)
- JSON tags: camelCase (`json:"bankName"`)
- Constants: camelCase for unexported (`userAgent`), PascalCase for exported

### Types
- CDR API response types mirror the JSON structure with `json` struct tags
- `MortgageRate` struct is the normalized output written to SQLite
- Embed structs for API type extension: `BankingProductDetailV7` embeds `BankingProductV6`
- Use `float64` for rates/LVR values, `string` for dates and ISO durations

### Error Handling
- Return `(result, error)` pairs from all functions that can fail
- Wrap errors with `fmt.Errorf("context: %w", err)`
- In main: log errors to stderr with `fmt.Fprintf(os.Stderr, ...)`
- Skip individual bank/product failures gracefully — don't abort the whole run
- Use `errgroup` with `g.SetLimit(10)` for concurrent fetching
- Use separate context for errgroup vs DB operations (errgroup cancels its context)

### HTTP Requests
- Set `x-v` header on all CDR API requests (version negotiation)
- Set `x-min-v` header for fallback version support
- Retry with lower API version on 406 (Not Acceptable)
- Custom `RoundTripper` for global User-Agent header
- Per-bank timeout: 30s. Register timeout: 60s.

### Structure
- `types.go` — all struct definitions (output + API response types)
- `register.go` — CDR Register API client (bank discovery)
- `products.go` — bank product/rate fetching and normalization
- `db.go` — SQLite database operations (schema, write, prune, optimize)
- `meta.go` — meta.json export
- `main.go` — CLI entry point, concurrency orchestration

### Dependencies
- `golang.org/x/sync/errgroup` — concurrent bank fetching
- `modernc.org/sqlite` — pure Go SQLite driver (no CGO)
- Use stdlib for HTTP, JSON, file I/O

## File Layout

```
aggregator/          # Go data aggregator
  main.go            # CLI entry, concurrency, orchestration
  register.go        # CDR Register API client
  products.go        # Bank products/rates client
  db.go              # SQLite write operations + writeStrippedDB()
  analytics.go       # Pre-compute analytics.json from history.db
  meta.go            # meta.json export
  types.go           # All type definitions
  .golangci.yml      # Linter config (v2)
  go.mod
history.db           # Full 30-day snapshot history — NEVER in public/, never served to browsers
public/
  rates.db           # Latest snapshot only (~2.7 MB, committed by CI)
  analytics.json     # Pre-computed history stats (committed by CI)
  meta.json          # Tiny metadata file for fast initial load
  history.db         # ← MUST NOT EXIST HERE — keep at repo root
src/
  main.tsx           # React entry point (BrowserRouter, ThemeProvider)
  App.tsx            # Root component, DB init, layout orchestration
  db.ts              # sql.js wrapper, typed query functions
  types.ts           # Shared TypeScript interfaces
  ThemeProvider.tsx  # Dark/light mode context + toggle
  theme.ts           # ThemeContext definition
  index.css          # Tailwind import + @theme color tokens (oklch)
  productProfile.ts  # Product classification, audience/feature tag parsing
  hooks/
    useUrlState.ts   # Filter state ↔ URL search params sync
    useSEO.ts        # Per-route document.title + meta description
  utils/
    csv.ts           # CSV export helper
  components/
    Header.tsx       # RateCheck wordmark, pill nav, live dot
    Dashboard.tsx    # Hero stat + supporting cards + bar charts
    Filters.tsx      # Sticky filter bar with rounded-full pills
    RateTable.tsx    # Virtualized table (desktop) / cards (mobile)
    CompareDrawer.tsx # Bank comparison side panel
    LoadingSkeleton.tsx # Animated loading placeholder
    AnalyticsPage.tsx   # Fetches analytics.json, renders Recharts
    BanksView.tsx    # Bank list with sort/search
    BankDetail.tsx   # Single bank product table
    ProductDetail.tsx # Single product detail view
    AboutPage.tsx    # Plain-language about + GitHub link
    MaterialIcon.tsx # Inline Material Design SVG icon wrapper
.github/workflows/
  update-rates.yml   # Cron: fetch rates every 6h → rates.db + analytics.json + history.db
  deploy.yml         # Build + deploy to GitHub Pages on push to main
```

## Design Context

### App
**RateCheck** — free, open-source Australian mortgage rate comparator. No ads, no affiliate links, no commercial bias.

### Users
**Primary: everyday Australian homebuyer.** Non-technical, time-poor, financially motivated. They want a fast, honest answer to "who has the best rate for my situation?" Copy must be plain Australian English. Data must be scannable, not overwhelming.

Secondary: mortgage brokers and refinancers who want density, filters, CSV export, and analytics. Progressive disclosure bridges both — simple surface, depth on demand.

### Brand Personality
**Approachable, honest, data-forward.** Three words: **clear, trustworthy, fresh.**

Warm and direct — like a knowledgeable friend who knows mortgages. Not a bank. Not a fintech startup. Not a government portal. Users should feel **confident and informed**, not overwhelmed or sold to.

### Aesthetic Direction
**Friendly but data-dense.** Inspired by Up Bank's approach — personality and warmth in the chrome, serious information in the content. Not a copy of Up Bank. Not Bloomberg Terminal. The sweet spot between the two.

**Colour system (all `oklch()`):**
- `accent-*` — warm teal `oklch(0.60 0.18 175)` — primary actions, active states
- `sand-*` — warm neutrals `oklch(0.98–0.10 0.01–0.02 80)` — backgrounds, borders, text
- Rate down (good): `oklch(0.60 0.17 155)` — green
- Rate up (bad): `oklch(0.58 0.20 25)` — rose/red
- Sky blue for fixed rates, amber for warnings

**Typography:**
- DM Sans — body and UI. Friendly, modern, rounded.
- DM Mono — rates and numbers ONLY via `.nums` utility class. Never used decoratively.

**Layout:** Rounded-2xl cards, pill navigation (filled active / outlined inactive), hero stat for lowest variable rate, left-aligned asymmetric layouts.

**Theme:** Light mode primary, dark mode fully supported.

### Anti-Patterns — Never Do These
- No gradient headers or gradient text
- No identical card grids (icon + heading + description repeated)
- No `font-mono` for "data vibes" — only DM Mono for actual numbers via `.nums`
- No `border-t-4` coloured accent borders
- No `hover:-translate-y` lift shadows
- No glassmorphism or glowing dark mode
- No indigo/violet/purple as primary colours
- No AI slop aesthetics (cyan-on-dark, neon accents, generic hero layouts)
- No jargon in user-facing copy — plain Australian English throughout

### Design Principles
1. **Approachable first, dense second** — Surface feels welcoming to a first-home buyer. Complexity lives behind filters, drill-downs, and the Analytics tab.
2. **Every number earns its place** — Show rates, comparisons, and trends. Remove anything decorative that doesn't help a user make a decision.
3. **Banks before rates** — Users think in lenders. The Banks view is the default. Rate rows are a secondary lens.
4. **Progressive disclosure** — Best rates visible immediately. Full product details, history, and analytics revealed on demand.
5. **Earned trust through transparency** — Show data source (CDR), freshness timestamp, outlier notes, and the non-advice disclaimer. No hidden agendas.

### Critical Architecture Rules
- `rates.db` is latest-snapshot-only (~2.7 MB) — **never put history back in the browser DB**
- `analytics.json` is pre-computed by the Go aggregator — **never run window functions in WASM**
- `history.db` lives at repo root — **never in `public/`, never served to browsers**
- Rates below 4% are excluded from market stats (specialist/subsidised products) but remain visible in the rate table
