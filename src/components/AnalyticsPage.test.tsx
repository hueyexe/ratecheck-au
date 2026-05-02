import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { AnalyticsJSON } from "../types";
import { AnalyticsPageView } from "./AnalyticsPage";

const data: AnalyticsJSON = {
  generatedAt: "2026-04-30T00:00:00Z",
  snapshotCount: 4,
  historySpanDays: 12,
  outlierFloor: 0.04,
  summary: {
    lowestVariable: 0.055,
    lowestFixed: 0.057,
    avgRate: 0.061,
    medianRateOOPI: 0.059,
    bankCount: 2,
    rateCount: 3,
    variableCount: 2,
    fixedCount: 1,
    lowerCount: 1,
    higherCount: 1,
    flatCount: 1,
  },
  timeline: [{ date: "2026-04-30", avgVariable: 0.06, avgFixed: 0.061, lowestVariable: 0.055, lowestFixed: 0.057, bankCount: 2, rateCount: 3 }],
  topMovers: [{ bankName: "Example Bank", productName: "Basic Loan", rateType: "VARIABLE", currentRate: 0.0562, pastRate: 0.055, changeBps: 12, snapshots: 2 }],
  trendBuckets: [{ bucket: "Rising", count: 1 }],
  rateDistribution: [{ bucket: "5.5%", variable: 1, fixed: 0 }],
  featurePrevalence: [{ feature: "offset", label: "Offset", count: 1, pct: 50 }],
  rateByLvr: [{ band: "≤80%", avgVariable: 0.06, avgFixed: 0.061, count: 2 }],
  variableVsFixed: [{ date: "2026-04-30", variablePct: 67, variableCount: 2, fixedCount: 1 }],
  cashbackBanks: [],
};

describe("AnalyticsPageView", () => {
  test("explains history context and uses percentage-point mover copy", () => {
    const html = renderToStaticMarkup(<AnalyticsPageView data={data} onDownloadCsv={() => undefined} />);

    expect(html).toContain("Rate history is built from RateCheck snapshots");
    expect(html).toContain("up 0.12 percentage points");
    expect(html).not.toContain("bps");
  });
});
