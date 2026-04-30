import { useRef, useCallback, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { RateRow, FilterState, RateTrendPoint } from "../types";
import { buildProductProfile, getProductProfileKey } from "../productProfile";
import MaterialIcon from "./MaterialIcon";

interface RateTableProps {
  rates: RateRow[];
  filters: FilterState;
  profiles: Map<string, ReturnType<typeof buildProductProfile>>;
  onSort: (key: FilterState["sortKey"]) => void;
  onRequestHistory?: (productId: string, rateType: string, repaymentType: string, loanPurpose: string) => RateTrendPoint[];
}

type MaterialIconName = Parameters<typeof MaterialIcon>[0]["name"];

const FEATURE_META: Record<string, { icon: MaterialIconName; label: string }> = {
  offset: { icon: "swap_horiz", label: "Offset" },
  redraw: { icon: "repeat", label: "Redraw" },
  extra_repayments: { icon: "savings", label: "Extra Repayments" },
  cashback: { icon: "savings", label: "Cashback" },
  package: { icon: "package", label: "Package" },
  guarantor: { icon: "check", label: "Guarantor" },
  bridging: { icon: "compare_arrows", label: "Bridging" },
  construction: { icon: "home", label: "Construction" },
  first_home_buyer: { icon: "home", label: "First Home Buyer" },
  green: { icon: "settings", label: "Green" },
};

function formatRate(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function rateColor(v: number): string {
  const pct = v * 100;
  if (pct < 5.5) return "text-accent-600 dark:text-accent-400";
  if (pct > 7) return "text-rose-600 dark:text-rose-400";
  return "text-amber-600 dark:text-amber-400";
}

function formatLvr(min: number, max: number): string {
  if (min === 0 && max === 0) return "--";
  if (min === 0) return `≤${Math.round(max * 100)}%`;
  return `${Math.round(min * 100)}-${Math.round(max * 100)}%`;
}

function formatFixedTerm(iso: string): string {
  if (!iso) return "--";
  const m = iso.match(/^P(\d+)([YM])$/);
  if (!m) return iso;
  const n = parseInt(m[1], 10);
  if (m[2] === "Y") return `${n}yr`;
  if (n >= 12 && n % 12 === 0) return `${n / 12}yr`;
  return `${n}mo`;
}

function SortArrow({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return <MaterialIcon name="trending_flat" className="w-3.5 h-3.5 text-sand-300 dark:text-sand-600 ml-1 inline-block align-[-0.125em] transition-transform duration-200" />;
  return <MaterialIcon name={asc ? "trending_up" : "trending_down"} className={`w-3.5 h-3.5 text-accent-500 ml-1 inline-block align-[-0.125em] transition-transform duration-200 ${asc ? "rotate-0" : "rotate-180"}`} />;
}

function TypeBadge({ type }: { type: string }) {
  const isFixed = type.includes("FIXED");
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
      isFixed
        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
        : "bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300"
    }`}>
      {isFixed ? "Fixed" : "Variable"}
    </span>
  );
}

function FitBadge({ label, tone }: { label: string; tone: "emerald" | "violet" | "amber" }) {
  const className = tone === "emerald"
    ? "bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400 border border-accent-200 dark:border-accent-800"
    : tone === "violet"
      ? "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border border-violet-200 dark:border-violet-800"
      : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800";
  return <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${className}`}>{label}</span>;
}

function RevertBadge() {
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 cursor-help"
      title="Revert rate — this is the higher rate you'd pay if you don't qualify for the bank's advertised discount. Check which rate applies to you."
    >
      Revert rate
    </span>
  );
}

function FeatureIcons({ tags }: { tags: string[] }) {
  const icons = tags.map((tag) => FEATURE_META[tag] || null).slice(0, 4);
  if (icons.length === 0) return null;
  return (
    <span className="inline-flex gap-0.5">
      {icons.map((icon, i) => (
        <span key={i} className="w-4 h-4 flex items-center justify-center text-sand-400 dark:text-sand-500" title={icon?.label || tags[i]}>
          <MaterialIcon name={icon?.icon || "settings"} className="w-3.5 h-3.5" />
        </span>
      ))}
    </span>
  );
}

function TrendGlyph({ history }: { history: RateTrendPoint[] }) {
  if (history.length < 2) return <span className="text-[9px] text-sand-300">--</span>;
  const first = history[0].rate;
  const last = history[history.length - 1].rate;
  const trend = last < first ? "down" : last > first ? "up" : "stable";
  const deltaBps = Math.round((last - first) * 10000);
  const label = trend === "down" ? "Lower" : trend === "up" ? "Higher" : "Flat";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium tabular-nums ${
        trend === "down" ? "text-accent-600 dark:text-accent-400" : trend === "up" ? "text-rose-600 dark:text-rose-400" : "text-sand-400"
      }`}
      title={`${label} by ${Math.abs(deltaBps)} bps over history`}
    >
      <MaterialIcon name={trend === "down" ? "trending_down" : trend === "up" ? "trending_up" : "trending_flat"} className="w-3 h-3" />
      <span>{Math.abs(deltaBps)}bps</span>
    </span>
  );
}

function TagsDisplay({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <span className="inline-flex gap-1 flex-wrap">
      {tags.slice(0, 3).map((tag) => (
        <span key={tag} className="inline-block px-1.5 py-0.5 rounded-full bg-sand-100 dark:bg-sand-800 text-[11px] text-sand-600 dark:text-sand-400">
          {tag.replace(/_/g, " ")}
        </span>
      ))}
    </span>
  );
}

export default function RateTable({ rates, filters, profiles, onSort, onRequestHistory }: RateTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [animKey, setAnimKey] = useState(0);

  // Increment key when filter results change so row stagger replays
  useEffect(() => { setAnimKey((k) => k + 1); }, [rates]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual's API is intentionally non-memoized with this compiler rule; behavior is unchanged and safe in current app.
  const virtualizer = useVirtualizer({
    count: rates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 15,
  });

  const handleSort = useCallback((key: FilterState["sortKey"]) => {
    onSort(key);
  }, [onSort]);

  const visibleRows = virtualizer.getVirtualItems();
  const historyCacheRef = useRef(new Map<string, RateTrendPoint[]>());

  const getHistory = useCallback((row: RateRow): RateTrendPoint[] => {
    if (!onRequestHistory) return [];
    const key = `${row.product_id}::${row.rate_type}::${row.repayment_type}::${row.loan_purpose}`;
    const cached = historyCacheRef.current.get(key);
    if (cached) return cached;
    const history = onRequestHistory(row.product_id, row.rate_type, row.repayment_type, row.loan_purpose);
    historyCacheRef.current.set(key, history);
    return history;
  }, [onRequestHistory]);

  if (rates.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-sand-400 dark:text-sand-500">
        No rates match your filters. Try broadening your search.
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <div
          ref={parentRef}
          className="overflow-auto rounded-2xl border border-sand-200 dark:border-sand-800"
          style={{ maxHeight: "65vh" }}
        >
          <table className="w-full text-xs" role="grid">
            <thead className="sticky top-0 z-[1] bg-sand-50 dark:bg-sand-900 text-[10px] font-semibold text-sand-400 dark:text-sand-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2.5 w-36 text-left">Bank</th>
                <th className="px-3 py-2.5 text-left">Product</th>
                <th className="px-3 py-2.5 w-20 text-right cursor-pointer select-none hover:text-accent-600" onClick={() => handleSort("rate")}>
                  Rate <SortArrow active={filters.sortKey === "rate"} asc={filters.sortAsc} />
                </th>
                <th className="px-3 py-2.5 w-16 text-right hidden lg:table-cell">Comp.</th>
                <th className="px-3 py-2.5 w-20 text-center">Type</th>
                <th className="px-3 py-2.5 w-16 text-center">Fit</th>
                <th className="px-3 py-2.5 w-14 text-center">Repay</th>
                <th className="px-3 py-2.5 w-16 text-center">Use</th>
                <th className="px-3 py-2.5 w-14 text-center hidden lg:table-cell">LVR</th>
                <th className="px-3 py-2.5 w-16 text-center hidden xl:table-cell">Trend</th>
                <th className="px-3 py-2.5 w-24 hidden xl:table-cell">Features</th>
              </tr>
            </thead>
            <tbody style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
              {visibleRows.map((vRow) => {
                const row = rates[vRow.index];
                const profile = profiles.get(getProductProfileKey(row)) ?? buildProductProfile(row);
                const history = getHistory(row);
                const stagger = vRow.index < 20 ? { animationDelay: `${vRow.index * 20}ms` } : undefined;
                return (
                  <tr
                    key={`${animKey}-${vRow.index}`}
                    className={`absolute w-full flex items-center border-b border-sand-100 dark:border-sand-800/50 last:border-0 ${
                      vRow.index % 2 === 0
                        ? "bg-white dark:bg-sand-950"
                        : "bg-sand-50/40 dark:bg-sand-900/20"
                    } hover:bg-accent-50/60 dark:hover:bg-accent-950/20 transition-colors ${vRow.index < 20 ? "animate-row-fade" : ""}`}
                    style={{ height: `${vRow.size}px`, transform: `translateY(${vRow.start}px)`, ...stagger }}
                  >
                    <td className="px-3 truncate w-36 font-medium text-sand-900 dark:text-sand-100">{row.bank_name}</td>
                    <td className="px-3 truncate flex-1 text-sand-500 dark:text-sand-400">{row.product_name}</td>
                    <td className={`px-3 w-20 text-right font-bold nums ${rateColor(row.rate)}`}>{formatRate(row.rate)}</td>
                    <td className="px-3 w-16 text-right nums text-sand-400 dark:text-sand-500 hidden lg:table-cell">{formatRate(row.comparison_rate)}</td>
                    <td className="px-3 w-20 text-center">
                      <TypeBadge type={row.rate_type} />
                      {row.is_revert_rate === 1 && <div className="mt-0.5"><RevertBadge /></div>}
                    </td>
                    <td className="px-3 w-16 text-center"><FitBadge label={profile.fitLabel} tone={profile.fitTone} /></td>
                    <td className="px-3 w-14 text-center text-sand-500 dark:text-sand-400">
                      {row.repayment_type === "PRINCIPAL_AND_INTEREST" ? "P&I" : row.repayment_type === "INTEREST_ONLY" ? "I/O" : "--"}
                    </td>
                    <td className="px-3 w-16 text-center text-sand-500 dark:text-sand-400">
                      {row.loan_purpose === "OWNER_OCCUPIED" ? "Owner" : row.loan_purpose === "INVESTMENT" ? "Invest" : "--"}
                    </td>
                    <td className="px-3 w-14 text-center text-sand-400 dark:text-sand-500 hidden lg:table-cell">{formatLvr(row.lvr_min, row.lvr_max)}</td>
                    <td className="px-3 w-16 hidden xl:table-cell">
                      {history.length > 1 ? <TrendGlyph history={history} /> : <span className="text-[9px] text-sand-300">--</span>}
                    </td>
                    <td className="px-3 w-24 hidden xl:table-cell"><FeatureIcons tags={profile.productTags} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-2">
        {rates.slice(0, 30).map((row, i) => {
          const profile = profiles.get(getProductProfileKey(row)) ?? buildProductProfile(row);
          const history = row.rate_type === "FIXED" ? getHistory(row) : [];
          return (
            <div
              key={i}
              className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-sand-900 dark:text-sand-100 truncate">{row.bank_name}</div>
                  <div className="text-[11px] text-sand-500 dark:text-sand-400 truncate mt-0.5">{row.product_name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xl font-bold nums ${rateColor(row.rate)}`}>{formatRate(row.rate)}</div>
                  {history.length > 1 && <div className="mt-0.5"><TrendGlyph history={history} /></div>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <TypeBadge type={row.rate_type} />
                {row.is_revert_rate === 1 && <RevertBadge />}
                <FitBadge label={profile.fitLabel} tone={profile.fitTone} />
                <span className="inline-block px-2 py-0.5 rounded-full bg-sand-100 dark:bg-sand-800 text-[10px] text-sand-600 dark:text-sand-400">
                  {row.repayment_type === "PRINCIPAL_AND_INTEREST" ? "P&I" : row.repayment_type === "INTEREST_ONLY" ? "I/O" : row.repayment_type}
                </span>
                <span className="inline-block px-2 py-0.5 rounded-full bg-sand-100 dark:bg-sand-800 text-[10px] text-sand-600 dark:text-sand-400">
                  {row.loan_purpose === "OWNER_OCCUPIED" ? "Owner" : row.loan_purpose === "INVESTMENT" ? "Invest" : row.loan_purpose}
                </span>
                {row.fixed_term && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-sand-100 dark:bg-sand-800 text-[10px] text-sand-600 dark:text-sand-400 nums">
                    {formatFixedTerm(row.fixed_term)}
                  </span>
                )}
                {(row.lvr_min > 0 || row.lvr_max > 0) && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-sand-100 dark:bg-sand-800 text-[10px] text-sand-600 dark:text-sand-400">
                    LVR {formatLvr(row.lvr_min, row.lvr_max)}
                  </span>
                )}
              </div>
              {(profile.productTags.length > 0 || profile.highlightTags.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <FeatureIcons tags={profile.productTags} />
                  <TagsDisplay tags={profile.highlightTags} />
                </div>
              )}
              <div className="mt-2 text-[10px] text-sand-400 dark:text-sand-500 nums">
                Comparison rate: {formatRate(row.comparison_rate)}
              </div>
            </div>
          );
        })}
        {rates.length > 30 && (
          <div className="text-center text-xs text-sand-400 dark:text-sand-500 py-4">
            Showing 30 of {rates.length.toLocaleString()} rates — use filters to narrow results
          </div>
        )}
      </div>
    </>
  );
}
