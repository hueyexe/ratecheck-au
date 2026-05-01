import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Database } from "sql.js";
import type { BankSortKey, BankSummary, MetaFile } from "../types";
import { queryBanks, sortBanks } from "../db";
import { formatAudienceTag, getBankAudienceTags } from "../productProfile";
import { bankPath } from "../navigation";
import { useSEO } from "../hooks/useSEO";
import CopyForAI from "./CopyForAI";

interface BanksViewProps {
  db: Database;
  meta: MetaFile | null;
}

const SORT_OPTIONS: Array<{ value: BankSortKey; label: string }> = [
  { value: "best_variable_rate", label: "Best variable" },
  { value: "best_fixed_rate", label: "Best fixed" },
  { value: "product_count", label: "Products" },
  { value: "bank_name", label: "A–Z" },
];

function formatRate(v: number | null): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

export default function BanksView({ db, meta }: BanksViewProps) {
  useSEO("Banks", "Compare home loan rates from 65+ Australian banks. Filter by variable, fixed, owner-occupied, investment, and more.");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<BankSortKey>("best_variable_rate");
  const [sortAsc, setSortAsc] = useState(true);

  const banks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = queryBanks(db).filter((bank) =>
      !q || bank.bank_name.toLowerCase().includes(q) || bank.brand_group.toLowerCase().includes(q)
    );
    return sortBanks(filtered, sortKey, sortAsc);
  }, [db, search, sortKey, sortAsc]);

  const cycleSort = (key: BankSortKey) => {
    if (key === sortKey) { setSortAsc((v) => !v); return; }
    setSortKey(key); setSortAsc(true);
  };

  const sortIndicator = (key: BankSortKey) => sortKey !== key ? "" : sortAsc ? " ↑" : " ↓";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search banks or brands…"
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 text-sm text-sand-900 dark:text-sand-100 placeholder-sand-400 focus:outline-2 focus:outline-accent-500"
            aria-label="Search banks or brands"
          />
        </div>

        <div className="md:hidden flex gap-2">
          <label className="sr-only" htmlFor="bank-sort">Sort banks</label>
          <select
            id="bank-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as BankSortKey)}
            className="min-w-0 flex-1 rounded-full border border-sand-200 dark:border-sand-800 bg-white dark:bg-sand-900 px-3 py-2.5 text-sm text-sand-900 dark:text-sand-100"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortAsc((v) => !v)}
            className="shrink-0 rounded-full border border-sand-200 dark:border-sand-800 bg-white dark:bg-sand-900 px-3 py-2.5 text-sm text-sand-900 dark:text-sand-100"
            aria-label={sortAsc ? "Sort descending" : "Sort ascending"}
          >
            {sortAsc ? "↑" : "↓"}
          </button>
        </div>
      </div>

      <CopyForAI pageName="Banks" pageDescription="Use this when comparing lenders, product counts and each bank's best advertised variable or fixed rates." sourcePath="banks.md" generatedAt={meta?.generatedAt} />

      <div className="rounded-2xl border border-sand-200 dark:border-sand-800 overflow-hidden bg-white dark:bg-sand-950">
        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2.5 bg-sand-50 dark:bg-sand-900 text-xs font-semibold text-sand-400 dark:text-sand-500 uppercase tracking-wider border-b border-sand-200 dark:border-sand-800">
          <button type="button" className="col-span-5 text-left hover:text-sand-900 dark:hover:text-sand-100 transition-colors" onClick={() => cycleSort("bank_name")}>
            Bank{sortIndicator("bank_name")}
          </button>
          <button type="button" className="col-span-2 text-right hover:text-sand-900 dark:hover:text-sand-100 transition-colors" onClick={() => cycleSort("best_variable_rate")}>
            Best Variable{sortIndicator("best_variable_rate")}
          </button>
          <button type="button" className="col-span-2 text-right hover:text-sand-900 dark:hover:text-sand-100 transition-colors" onClick={() => cycleSort("best_fixed_rate")}>
            Best Fixed{sortIndicator("best_fixed_rate")}
          </button>
          <button type="button" className="col-span-2 text-right hover:text-sand-900 dark:hover:text-sand-100 transition-colors" onClick={() => cycleSort("product_count")}>
            Products{sortIndicator("product_count")}
          </button>
          <div className="col-span-1" />
        </div>

        {banks.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-sand-400 dark:text-sand-500">
            No banks found.
          </div>
        ) : (
          banks.map((bank) => <BankRow key={bank.bank_name} bank={bank} />)
        )}
      </div>

      <div className="text-xs text-sand-400 dark:text-sand-500">
        {banks.length} banks shown
      </div>
    </div>
  );
}

function BankRow({ bank }: { bank: BankSummary }) {
  const audienceTags = getBankAudienceTags(bank.bank_name, bank.brand_group);

  return (
    <Link
      to={bankPath(bank.bank_name)}
      className="block px-4 py-3.5 hover:bg-accent-50/60 dark:hover:bg-accent-950/20 transition-colors border-b border-sand-100 dark:border-sand-800 last:border-b-0 focus:outline-none focus:bg-accent-50/60"
    >
      {/* Mobile */}
      <div className="md:hidden space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="font-semibold text-sm text-sand-900 dark:text-sand-100 truncate block">{bank.bank_name}</span>
            {audienceTags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {audienceTags.slice(0, 2).map((tag) => (
                  <span key={tag} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                    {formatAudienceTag(tag)}
                  </span>
                ))}
              </div>
            )}
            {bank.best_product_name && (
              <p className="mt-0.5 text-xs text-sand-500 dark:text-sand-400 truncate">{bank.best_product_name}</p>
            )}
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-sand-300 dark:text-sand-600 shrink-0 mt-0.5" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Variable", value: formatRate(bank.best_variable_rate) },
            { label: "Fixed", value: formatRate(bank.best_fixed_rate) },
            { label: "Products", value: String(bank.product_count) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-sand-50 dark:bg-sand-900/60 px-2 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wide text-sand-400 dark:text-sand-500">{s.label}</div>
              <div className="mt-1 nums text-sm font-semibold text-sand-900 dark:text-sand-100">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:grid grid-cols-12 gap-4 items-center">
        <div className="col-span-5 flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm text-sand-900 dark:text-sand-100 truncate">{bank.bank_name}</span>
          {audienceTags.length > 0 && (
            <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
              {formatAudienceTag(audienceTags[0])}
            </span>
          )}
        </div>
        <div className="col-span-2 text-right nums text-sm font-medium text-sand-900 dark:text-sand-100">{formatRate(bank.best_variable_rate)}</div>
        <div className="col-span-2 text-right nums text-sm font-medium text-sand-900 dark:text-sand-100">{formatRate(bank.best_fixed_rate)}</div>
        <div className="col-span-2 text-right text-sm text-sand-500 dark:text-sand-400">{bank.product_count}</div>
        <div className="col-span-1 text-right">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-sand-300 dark:text-sand-600 inline" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
