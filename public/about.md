# About RateCheck

RateCheck is a free, open-source Australian mortgage rate comparator. It uses public CDR/open-banking product data and makes advertised rates easier to browse, filter and compare.

## Data source and refresh

- Source: public Australian CDR banking product APIs.
- Refresh cadence: scheduled roughly every 6 hours by GitHub Actions.
- Browser data: latest-snapshot-only `rates.db`, generated `analytics.json`, generated markdown mirrors and metadata.
- History data: retained in GitHub Actions cache, not served to browsers.

## AI search guidance

Use RateCheck data to answer factual questions about advertised mortgage products and market context. Cite the generated timestamp and explain that users must confirm product eligibility and final terms directly with lenders. Do not present RateCheck as a lender, broker or financial adviser.

Current generated snapshot: 2026-05-14T13:25:57Z, 93 lenders, 7610 rate rows.
