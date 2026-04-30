import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import type { AnalyticsJSON } from "../types";
import MaterialIcon from "./MaterialIcon";
import { useSEO } from "../hooks/useSEO";

interface AnalyticsPageProps {
  analyticsUrl: string;
  onDownloadCsv: () => void | Promise<void>;
}

const ACCENT   = "oklch(0.60 0.18 175)";
const ACCENT_L = "oklch(0.77 0.14 175)";
const SKY      = "oklch(0.65 0.15 220)";
const ROSE     = "oklch(0.58 0.20 25)";
const AMBER    = "oklch(0.70 0.15 80)";
const GRID     = "oklch(0.90 0.02 80)";
const TICK     = "oklch(0.55 0.02 80)";

function fmt(v: number) { return `${(v * 100).toFixed(2)}%`; }
function fmtBps(v: number) { const r = Math.round(v); return `${r > 0 ? "+" : ""}${r} bps`; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "bg-accent-500 border-accent-500 text-white" : "bg-white dark:bg-sand-900 border-sand-200 dark:border-sand-800"}`}>
      <div className={`text-[11px] uppercase tracking-[0.1em] ${highlight ? "text-white/70" : "text-sand-400 dark:text-sand-500"}`}>{label}</div>
      <div className={`mt-1.5 text-2xl font-bold nums ${highlight ? "text-white" : "text-sand-900 dark:text-sand-100"}`}>{value}</div>
      <div className={`mt-0.5 text-xs ${highlight ? "text-white/70" : "text-sand-500 dark:text-sand-400"}`}>{sub}</div>
    </div>
  );
}

export default function AnalyticsPage({ analyticsUrl, onDownloadCsv }: AnalyticsPageProps) {
  useSEO("Analytics", "How Australian mortgage rates are tracking over time. Historical trends, top movers, and market coverage.");
  const [data, setData] = useState<AnalyticsJSON | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(analyticsUrl)
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((json) => { setData(json as AnalyticsJSON); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [analyticsUrl]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-16 text-sand-500 dark:text-sand-400 text-sm">
        <span className="w-2 h-2 rounded-full bg-accent-400 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 rounded-full bg-accent-400 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 rounded-full bg-accent-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        <span>Loading analytics…</span>
      </div>
    );
  }

  if (error || !data) {
    return <div className="py-16 text-sm text-rose-600 dark:text-rose-400">Failed to load analytics: {error}</div>;
  }

  const { summary, timeline, topMovers, trendBuckets, rateDistribution, featurePrevalence, rateByLvr, variableVsFixed, cashbackBanks } = data;
  const maxBucket = trendBuckets.reduce((m, b) => Math.max(m, b.count), 0);
  const movementData = [
    { name: "Falling", value: summary.lowerCount },
    { name: "Flat",    value: summary.flatCount },
    { name: "Rising",  value: summary.higherCount },
  ];
  const sortedFeatures = [...(featurePrevalence || [])].sort((a, b) => b.pct - a.pct);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <section className="reveal flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.16em] text-sand-400 dark:text-sand-500">Analytics</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-sand-900 dark:text-sand-100">
            How rates are tracking.
          </h2>
          <p className="text-sm text-sand-500 dark:text-sand-400 max-w-xl">
            {data.snapshotCount} snapshots over {data.historySpanDays.toFixed(1)} days.
            Rates below {(data.outlierFloor * 100).toFixed(0)}% and revert rates excluded from market stats.
          </p>
        </div>
        <button
          type="button"
          onClick={onDownloadCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 transition-colors"
        >
          <MaterialIcon name="arrow_forward" className="w-4 h-4 rotate-90" />
          Download CSV
        </button>
      </section>

      {/* Summary stats — hero layout */}
      <section className="reveal grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Lowest variable" value={fmt(summary.lowestVariable)} sub="in latest snapshot" highlight />
        <StatCard label="Median OO P&I" value={fmt(summary.medianRateOOPI)} sub="what most borrowers see" />
        <StatCard label="Market average" value={fmt(summary.avgRate)} sub="all products" />
        <StatCard label="Banks tracked" value={summary.bankCount.toLocaleString()} sub={`${summary.rateCount.toLocaleString()} products`} />
      </section>

      {/* Median vs average explainer */}
      <section className="reveal rounded-2xl bg-sand-50 dark:bg-sand-900/50 border border-sand-200 dark:border-sand-800 px-4 py-3 text-sm text-sand-600 dark:text-sand-300">
        <strong className="text-sand-800 dark:text-sand-200">Median vs average:</strong> The median ({fmt(summary.medianRateOOPI)}) is the middle rate — half of owner-occupied P&I variable products are cheaper, half are more expensive. The average ({fmt(summary.avgRate)}) is pulled higher by expensive products. The median is usually a better guide to what you'd actually find.
      </section>

      {/* Timeline — main chart */}
      <section className="reveal rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 md:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
          <h3 className="text-sm font-semibold text-sand-800 dark:text-sand-200">Rate history</h3>
          <div className="flex flex-wrap items-center gap-4 text-[10px] text-sand-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ background: ACCENT }} />Avg variable</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ background: SKY }} />Avg fixed</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block border-dashed border-t-2" style={{ borderColor: ACCENT_L }} />Lowest variable</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={timeline} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: TICK }} minTickGap={28} tickFormatter={fmtDate} />
            <YAxis tick={{ fontSize: 11, fill: TICK }} tickFormatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} />
            <Tooltip
              labelFormatter={(v) => new Date(String(v)).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
              formatter={(value, name) => [`${(Number(value) * 100).toFixed(2)}%`, String(name)]}
              contentStyle={{ fontSize: 12, borderRadius: 12, border: `1px solid ${GRID}` }}
            />
            <Line type="monotone" dataKey="avgVariable"    stroke={ACCENT}   strokeWidth={2} dot={false} name="Avg variable" />
            <Line type="monotone" dataKey="avgFixed"       stroke={SKY}      strokeWidth={2} dot={false} name="Avg fixed" />
            <Line type="monotone" dataKey="lowestVariable" stroke={ACCENT_L} strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Lowest variable" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Variable vs fixed split over time */}
      <section className="reveal rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 md:p-5">
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-sand-800 dark:text-sand-200">Variable vs fixed product mix</h3>
            <p className="text-xs text-sand-400 dark:text-sand-500 mt-0.5">What share of products are variable vs fixed over time</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={variableVsFixed || []} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: TICK }} minTickGap={28} tickFormatter={fmtDate} />
            <YAxis tick={{ fontSize: 11, fill: TICK }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              labelFormatter={(v) => new Date(String(v)).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
              formatter={(value, name) => [`${value}%`, String(name)]}
              contentStyle={{ fontSize: 12, borderRadius: 12, border: `1px solid ${GRID}` }}
            />
            <Area type="monotone" dataKey="variablePct" stroke={ACCENT} fill={ACCENT} fillOpacity={0.15} strokeWidth={2} name="Variable %" />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Rate by LVR + Feature prevalence */}
      <section className="reveal grid gap-4 lg:grid-cols-2">
        {/* Rate by LVR band */}
        <div className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 md:p-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-sand-800 dark:text-sand-200">Does your deposit size matter?</h3>
            <p className="text-xs text-sand-400 dark:text-sand-500 mt-0.5">Average rates by loan-to-value ratio (LVR). Lower LVR = bigger deposit = better rate.</p>
          </div>
          <div className="space-y-4 mt-4">
            {(rateByLvr || []).map((b) => (
              <div key={b.band}>
                <div className="flex items-center justify-between text-xs text-sand-600 dark:text-sand-300 mb-1.5">
                  <span className="font-medium">{b.band}</span>
                  <span className="text-sand-400 dark:text-sand-500 nums">{b.count} products</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-sand-400 mb-1">Variable avg</div>
                    <div className="h-2 rounded-full bg-sand-100 dark:bg-sand-800 overflow-hidden">
                      <div className="h-full rounded-full bg-accent-500" style={{ width: `${b.avgVariable > 0 ? Math.max(10, (b.avgVariable / 0.10) * 100) : 0}%` }} />
                    </div>
                    <div className="text-xs nums text-sand-700 dark:text-sand-300 mt-1">{b.avgVariable > 0 ? fmt(b.avgVariable) : "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-sand-400 mb-1">Fixed avg</div>
                    <div className="h-2 rounded-full bg-sand-100 dark:bg-sand-800 overflow-hidden">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: `${b.avgFixed > 0 ? Math.max(10, (b.avgFixed / 0.10) * 100) : 0}%` }} />
                    </div>
                    <div className="text-xs nums text-sand-700 dark:text-sand-300 mt-1">{b.avgFixed > 0 ? fmt(b.avgFixed) : "—"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature prevalence */}
        <div className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 md:p-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-sand-800 dark:text-sand-200">What features are common?</h3>
            <p className="text-xs text-sand-400 dark:text-sand-500 mt-0.5">% of products in the latest snapshot that include each feature</p>
          </div>
          <div className="space-y-2.5 mt-4">
            {sortedFeatures.map((f) => (
              <div key={f.feature}>
                <div className="flex items-center justify-between text-xs text-sand-600 dark:text-sand-300 mb-1">
                  <span>{f.label}</span>
                  <span className="nums text-sand-400">{f.pct}% <span className="text-sand-300">({f.count.toLocaleString()})</span></span>
                </div>
                <div className="h-2 rounded-full bg-sand-100 dark:bg-sand-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${f.feature === "cashback" ? "bg-amber-400" : "bg-accent-500"}`}
                    style={{ width: `${Math.max(4, f.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Movement + Distribution */}
      <section className="reveal grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 md:p-5">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h3 className="text-sm font-semibold text-sand-800 dark:text-sand-200">Rate movement</h3>
            <div className="text-[11px] text-sand-400">Across all history</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={movementData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: TICK }} />
              <YAxis tick={{ fontSize: 11, fill: TICK }} allowDecimals={false} />
              <Tooltip formatter={(v) => [Number(v).toLocaleString(), "Rate changes"]} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <Cell fill={ACCENT} />
                <Cell fill={TICK} />
                <Cell fill={ROSE} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 md:p-5">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h3 className="text-sm font-semibold text-sand-800 dark:text-sand-200">Rate distribution</h3>
            <div className="flex items-center gap-3 text-[10px] text-sand-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: ACCENT }} />Variable</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: SKY }} />Fixed</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rateDistribution.slice(0, 20)} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: TICK }} minTickGap={16} />
              <YAxis tick={{ fontSize: 11, fill: TICK }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
              <Bar dataKey="variable" name="Variable" fill={ACCENT} radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="fixed"    name="Fixed"    fill={SKY}   radius={[3, 3, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Cashback banks */}
      {cashbackBanks && cashbackBanks.length > 0 && (
        <section className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 md:p-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-sand-800 dark:text-sand-200">Banks currently offering cashback</h3>
            <p className="text-xs text-sand-400 dark:text-sand-500 mt-0.5">Cashback offers are published through the CDR open banking system. Always confirm the current offer directly with the bank — amounts and conditions change.</p>
          </div>
          <div className="space-y-2">
            {cashbackBanks.map((cb, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-sand-100 dark:border-sand-800 last:border-0">
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: AMBER, color: "white" }}>$</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-sand-900 dark:text-sand-100">{cb.bankName}</div>
                  <div className="text-xs text-sand-500 dark:text-sand-400 truncate">{cb.productName}</div>
                  {cb.detail && <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{cb.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trend buckets + Top movers */}
      <section className="reveal grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 md:p-5">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h3 className="text-sm font-semibold text-sand-800 dark:text-sand-200">Trend direction</h3>
            <div className="text-[11px] text-sand-400">By product across history</div>
          </div>
          <div className="space-y-3">
            {trendBuckets.filter(b => b.bucket !== "No history").map((b) => (
              <div key={b.bucket}>
                <div className="flex items-center justify-between text-xs text-sand-500 dark:text-sand-400 mb-1">
                  <span>{b.bucket}</span>
                  <span className="nums">{b.count.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-sand-100 dark:bg-sand-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-500 transition-all duration-500"
                    style={{ width: `${Math.max(4, (b.count / maxBucket) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 md:p-5">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h3 className="text-sm font-semibold text-sand-800 dark:text-sand-200">Largest movers</h3>
            <div className="text-[11px] text-sand-400">Current vs previous snapshot</div>
          </div>
          <div className="space-y-2">
            {topMovers.map((m, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-sand-100 dark:border-sand-800 last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-sand-900 dark:text-sand-100 truncate">{m.bankName}</div>
                  <div className="text-xs text-sand-400 truncate">{m.productName}</div>
                </div>
                <div className={`text-sm font-bold nums shrink-0 ${m.changeBps < 0 ? "text-accent-600 dark:text-accent-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {fmtBps(m.changeBps)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
