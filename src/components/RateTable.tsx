import { useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { RateRow, FilterState } from "../types";
import { buildProductProfile, getProductProfileKey } from "../productProfile";

interface RateTableProps {
  rates: RateRow[];
  filters: FilterState;
  profiles: Map<string, ReturnType<typeof buildProductProfile>>;
  onSort: (key: FilterState["sortKey"]) => void;
}

function formatRate(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function rateColor(v: number): string {
  const pct = v * 100;
  if (pct < 5.5) return "text-emerald-600 dark:text-emerald-400";
  if (pct > 7) return "text-red-600 dark:text-red-400";
  return "text-amber-600 dark:text-amber-400";
}

function formatLvr(min: number, max: number): string {
  if (min === 0 && max === 0) return "--";
  if (min === 0) return `\u2264${max}%`;
  return `${min}-${max}%`;
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
  if (!active) return <span className="text-gray-300 dark:text-gray-600 ml-1">&#9650;</span>;
  return <span className="text-indigo-500 ml-1">{asc ? "\u25B2" : "\u25BC"}</span>;
}

function TypeBadge({ type }: { type: string }) {
  const isFixed = type.includes("FIXED");
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
      isFixed
        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
    }`}>
      {isFixed ? "Fixed" : "Variable"}
    </span>
  );
}

function FitBadge({ label, tone }: { label: string; tone: "emerald" | "violet" | "amber" }) {
  const className = tone === "emerald"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
    : tone === "violet"
      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";

  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{label}</span>;
}

export default function RateTable({ rates, filters, profiles, onSort }: RateTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 20,
  });

  const handleSort = useCallback((key: FilterState["sortKey"]) => {
    onSort(key);
  }, [onSort]);

  if (rates.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
        No rates match your filters. {filters.everydayOnly ? "Try switching to Full market or broadening your filters." : "Try broadening your search."}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <div
          ref={parentRef}
          className="overflow-auto rounded-2xl border border-gray-200 dark:border-gray-800"
          style={{ maxHeight: "70vh" }}
        >
          <table className="w-full text-sm" role="grid">
            <thead className="sticky top-0 z-[1] bg-gray-50 dark:bg-gray-900 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <tr>
                <th
                  className="px-4 py-3 w-44 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  onClick={() => handleSort("bank_name")}
                  aria-sort={filters.sortKey === "bank_name" ? (filters.sortAsc ? "ascending" : "descending") : "none"}
                >
                  Bank <SortArrow active={filters.sortKey === "bank_name"} asc={filters.sortAsc} />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  onClick={() => handleSort("product_name")}
                  aria-sort={filters.sortKey === "product_name" ? (filters.sortAsc ? "ascending" : "descending") : "none"}
                >
                  Product <SortArrow active={filters.sortKey === "product_name"} asc={filters.sortAsc} />
                </th>
                <th
                  className="px-4 py-3 w-28 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  onClick={() => handleSort("rate")}
                  aria-sort={filters.sortKey === "rate" ? (filters.sortAsc ? "ascending" : "descending") : "none"}
                >
                  Rate <SortArrow active={filters.sortKey === "rate"} asc={filters.sortAsc} />
                </th>
                <th
                  className="px-4 py-3 w-28 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  onClick={() => handleSort("comparison_rate")}
                  aria-sort={filters.sortKey === "comparison_rate" ? (filters.sortAsc ? "ascending" : "descending") : "none"}
                >
                  Comparison <SortArrow active={filters.sortKey === "comparison_rate"} asc={filters.sortAsc} />
                </th>
                <th
                  className="px-4 py-3 w-24 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  onClick={() => handleSort("rate_type")}
                  aria-sort={filters.sortKey === "rate_type" ? (filters.sortAsc ? "ascending" : "descending") : "none"}
                >
                  Type <SortArrow active={filters.sortKey === "rate_type"} asc={filters.sortAsc} />
                </th>
                <th className="px-4 py-3 w-32">Fit</th>
                <th
                  className="px-4 py-3 w-24 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  onClick={() => handleSort("repayment_type")}
                  aria-sort={filters.sortKey === "repayment_type" ? (filters.sortAsc ? "ascending" : "descending") : "none"}
                >
                  Repayment <SortArrow active={filters.sortKey === "repayment_type"} asc={filters.sortAsc} />
                </th>
                <th
                  className="px-4 py-3 w-28 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  onClick={() => handleSort("loan_purpose")}
                  aria-sort={filters.sortKey === "loan_purpose" ? (filters.sortAsc ? "ascending" : "descending") : "none"}
                >
                  Purpose <SortArrow active={filters.sortKey === "loan_purpose"} asc={filters.sortAsc} />
                </th>
                <th
                  className="px-4 py-3 w-20 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  onClick={() => handleSort("lvr_max")}
                  aria-sort={filters.sortKey === "lvr_max" ? (filters.sortAsc ? "ascending" : "descending") : "none"}
                >
                  LVR <SortArrow active={filters.sortKey === "lvr_max"} asc={filters.sortAsc} />
                </th>
              </tr>
            </thead>
            <tbody
              style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
            >
              {virtualizer.getVirtualItems().map((vRow) => {
                const row = rates[vRow.index];
                const profile = profiles.get(getProductProfileKey(row)) ?? buildProductProfile(row);
                return (
                  <tr
                    key={vRow.index}
                    className={`absolute w-full flex items-center ${
                      vRow.index % 2 === 0
                        ? "bg-white dark:bg-gray-950"
                        : "bg-gray-50/50 dark:bg-gray-900/50"
                    } hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors`}
                    style={{
                      height: `${vRow.size}px`,
                      transform: `translateY(${vRow.start}px)`,
                    }}
                  >
                    <td className="px-4 truncate w-44 font-medium">{row.bank_name}</td>
                    <td className="px-4 truncate flex-1 text-gray-600 dark:text-gray-400">{row.product_name}</td>
                    <td className={`px-4 w-28 font-bold font-mono ${rateColor(row.rate)}`}>{formatRate(row.rate)}</td>
                    <td className="px-4 w-28 font-mono text-gray-600 dark:text-gray-400">{formatRate(row.comparison_rate)}</td>
                    <td className="px-4 w-24"><TypeBadge type={row.rate_type} /></td>
                    <td className="px-4 w-32"><FitBadge label={profile.fitLabel} tone={profile.fitTone} /></td>
                    <td className="px-4 w-24 text-xs text-gray-500 dark:text-gray-400">
                      {row.repayment_type === "PRINCIPAL_AND_INTEREST" ? "P&I" : row.repayment_type === "INTEREST_ONLY" ? "IO" : row.repayment_type}
                    </td>
                    <td className="px-4 w-28 text-xs text-gray-500 dark:text-gray-400">
                      {row.loan_purpose === "OWNER_OCCUPIED" ? "Owner Occ." : row.loan_purpose === "INVESTMENT" ? "Investment" : row.loan_purpose}
                    </td>
                    <td className="px-4 w-20 text-xs text-gray-500 dark:text-gray-400">{formatLvr(row.lvr_min, row.lvr_max)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rates.slice(0, 50).map((row, i) => {
          const profile = profiles.get(getProductProfileKey(row)) ?? buildProductProfile(row);
          return (
            <div
              key={i}
              className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{row.bank_name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{row.product_name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-lg font-bold font-mono ${rateColor(row.rate)}`}>{formatRate(row.rate)}</div>
                  <div className="mt-1"><FitBadge label={profile.fitLabel} tone={profile.fitTone} /></div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <TypeBadge type={row.rate_type} />
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {row.repayment_type === "PRINCIPAL_AND_INTEREST" ? "P&I" : row.repayment_type === "INTEREST_ONLY" ? "IO" : row.repayment_type}
                </span>
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {row.loan_purpose === "OWNER_OCCUPIED" ? "Owner Occ." : row.loan_purpose === "INVESTMENT" ? "Investment" : row.loan_purpose}
                </span>
                {row.fixed_term && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {formatFixedTerm(row.fixed_term)}
                  </span>
                )}
                {(row.lvr_min > 0 || row.lvr_max > 0) && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    LVR {formatLvr(row.lvr_min, row.lvr_max)}
                  </span>
                )}
                {profile.highlightTags.map((tag) => (
                  <span key={tag} className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Comparison: {formatRate(row.comparison_rate)}
              </div>
            </div>
          );
        })}
        {rates.length > 50 && (
          <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
            Showing 50 of {rates.length} rates. Use filters to narrow results.
          </div>
        )}
      </div>
    </>
  );
}
