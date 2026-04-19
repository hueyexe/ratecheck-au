import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Database } from "sql.js";
import type { BankSortKey, BankSummary } from "../types";
import { queryBanks, sortBanks } from "../db";
import { formatAudienceTag, getBankAudienceTags } from "../productProfile";

interface BanksViewProps {
  db: Database;
}

const SORT_OPTIONS: Array<{ value: BankSortKey; label: string }> = [
  { value: "best_variable_rate", label: "Best variable" },
  { value: "best_fixed_rate", label: "Best fixed" },
  { value: "product_count", label: "Products" },
  { value: "bank_name", label: "Bank name" },
];

function formatRate(v: number | null): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

export default function BanksView({ db }: BanksViewProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<BankSortKey>("best_variable_rate");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    document.title = "Australian Mortgage Rate Comparator";
  }, []);

  const banks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = queryBanks(db).filter((bank) => {
      if (!q) return true;
      return bank.bank_name.toLowerCase().includes(q) || bank.brand_group.toLowerCase().includes(q);
    });
    return sortBanks(filtered, sortKey, sortAsc);
  }, [db, search, sortKey, sortAsc]);

  const cycleSort = (key: BankSortKey) => {
    if (key === sortKey) {
      setSortAsc((v) => !v);
      return;
    }
    setSortKey(key);
    setSortAsc(true);
  };

  const sortIndicator = (key: BankSortKey) => {
    if (sortKey !== key) return "";
    return sortAsc ? " ↑" : " ↓";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search banks or brands"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Search banks or brands"
          />
        </div>

        <div className="md:hidden flex gap-2">
          <label className="sr-only" htmlFor="bank-sort">Sort banks</label>
          <select
            id="bank-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as BankSortKey)}
            className="min-w-0 flex-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortAsc((v) => !v)}
            className="shrink-0 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100"
            aria-label={sortAsc ? "Sort descending" : "Sort ascending"}
          >
            {sortAsc ? "↑" : "↓"}
          </button>
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950">
        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-900 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
          <button type="button" className="col-span-5 text-left hover:text-gray-900 dark:hover:text-gray-100" onClick={() => cycleSort("bank_name")}>
            Bank{sortIndicator("bank_name")}
          </button>
          <button type="button" className="col-span-2 text-right hover:text-gray-900 dark:hover:text-gray-100" onClick={() => cycleSort("best_variable_rate")}>
            Best Variable{sortIndicator("best_variable_rate")}
          </button>
          <button type="button" className="col-span-2 text-right hover:text-gray-900 dark:hover:text-gray-100" onClick={() => cycleSort("best_fixed_rate")}>
            Best Fixed{sortIndicator("best_fixed_rate")}
          </button>
          <button type="button" className="col-span-2 text-right hover:text-gray-900 dark:hover:text-gray-100" onClick={() => cycleSort("product_count")}>
            Products{sortIndicator("product_count")}
          </button>
          <div className="col-span-1"></div>
        </div>

        {banks.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            No banks found.
          </div>
        ) : (
          banks.map((bank) => <BankRow key={bank.bank_name} bank={bank} />)
        )}
      </div>

      <div className="text-xs text-gray-400 dark:text-gray-500">
        {banks.length} banks shown. Search matches bank names and brand groups.
      </div>
    </div>
  );
}

interface BankRowProps {
  bank: BankSummary;
}

function BankRow({ bank }: BankRowProps) {
  const audienceTags = getBankAudienceTags(bank.bank_name, bank.brand_group);

  return (
    <Link
      to={`/bank/${encodeURIComponent(bank.bank_name)}`}
      className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-900/50"
    >
      <div className="md:hidden space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400 shrink-0">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                {bank.bank_name}
              </span>
            </div>
            {audienceTags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {audienceTags.slice(0, 2).map((tag) => (
                  <span key={tag} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    {formatAudienceTag(tag)}
                  </span>
                ))}
              </div>
            )}
            {bank.best_product_name && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                {bank.best_product_name}
              </p>
            )}
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 mt-0.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 px-2 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Variable</div>
            <div className="mt-1 font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{formatRate(bank.best_variable_rate)}</div>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 px-2 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Fixed</div>
            <div className="mt-1 font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{formatRate(bank.best_fixed_rate)}</div>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 px-2 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Products</div>
            <div className="mt-1 font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{bank.product_count}</div>
          </div>
        </div>
      </div>

      <div className="hidden md:grid grid-cols-12 gap-4 items-center">
        <div className="col-span-5">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{bank.bank_name}</span>
            {audienceTags.length > 0 && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                {formatAudienceTag(audienceTags[0])}
              </span>
            )}
          </div>
        </div>
        <div className="col-span-2 text-right">
          <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{formatRate(bank.best_variable_rate)}</span>
        </div>
        <div className="col-span-2 text-right">
          <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{formatRate(bank.best_fixed_rate)}</span>
        </div>
        <div className="col-span-2 text-right">
          <span className="text-sm text-gray-500 dark:text-gray-400">{bank.product_count}</span>
        </div>
        <div className="col-span-1 text-right">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-300 dark:text-gray-600 inline">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
