import { useState, useEffect } from "react";
import type { FilterState } from "../types";

interface FiltersProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  total: number;
  filtered: number;
}

const RATE_TYPES = [
  { value: "", label: "All Types" },
  { value: "VARIABLE", label: "Variable" },
  { value: "FIXED", label: "Fixed" },
];

const PURPOSES = [
  { value: "", label: "All Purposes" },
  { value: "OWNER_OCCUPIED", label: "Owner Occupied" },
  { value: "INVESTMENT", label: "Investment" },
];

const REPAYMENTS = [
  { value: "", label: "All Repayments" },
  { value: "PRINCIPAL_AND_INTEREST", label: "P&I" },
  { value: "INTEREST_ONLY", label: "Interest Only" },
];

const LVR_OPTIONS = [
  { value: 0, label: "Any LVR" },
  { value: 60, label: "60%" },
  { value: 70, label: "70%" },
  { value: 80, label: "80%" },
  { value: 90, label: "90%" },
  { value: 95, label: "95%" },
];

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
        active
          ? "bg-indigo-600 text-white dark:bg-indigo-500"
          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function Filters({ filters, onChange, total, filtered }: FiltersProps) {
  const [search, setSearch] = useState(filters.search);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== filters.search) {
        onChange({ ...filters, search });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, filters, onChange]);

  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl rounded-2xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-800/50">
      {/* Mobile toggle */}
      <div className="flex items-center justify-between md:hidden mb-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Showing {filtered} of {total} rates
        </span>
        <button
          onClick={() => setOpen(!open)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          aria-expanded={open}
        >
          Filters {open ? "−" : "+"}
        </button>
      </div>

      <div className={`space-y-3 ${open ? "block" : "hidden"} md:block`}>
        {/* Search */}
        <div className="relative max-w-full md:max-w-sm">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search banks, products, or rate details..."
            className="w-full pl-10 pr-8 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-2 focus:outline-indigo-500 transition-colors"
            aria-label="Search banks, products, or rate details"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); set({ search: "" }); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter groups */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center mr-1">View:</span>
          <Pill active={filters.everydayOnly} onClick={() => set({ everydayOnly: true })}>
            Everyday borrowers
          </Pill>
          <Pill active={!filters.everydayOnly} onClick={() => set({ everydayOnly: false })}>
            Full market
          </Pill>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center mr-1">Type:</span>
          {RATE_TYPES.map((t) => (
            <Pill key={t.value} active={filters.rateType === t.value} onClick={() => set({ rateType: t.value })}>
              {t.label}
            </Pill>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center mr-1">Purpose:</span>
          {PURPOSES.map((p) => (
            <Pill key={p.value} active={filters.loanPurpose === p.value} onClick={() => set({ loanPurpose: p.value })}>
              {p.label}
            </Pill>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center mr-1">Repayment:</span>
          {REPAYMENTS.map((r) => (
            <Pill key={r.value} active={filters.repaymentType === r.value} onClick={() => set({ repaymentType: r.value })}>
              {r.label}
            </Pill>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center mr-1">Max LVR:</span>
          {LVR_OPTIONS.map((l) => (
            <Pill key={l.value} active={filters.maxLvr === l.value} onClick={() => set({ maxLvr: l.value })}>
              {l.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* Result count — desktop */}
      <div className="hidden md:block mt-3 text-sm text-gray-500 dark:text-gray-400">
        Showing {filtered} of {total} rates
        {filters.everydayOnly && <span className="block text-xs mt-1">Specialist and special-scenario loans are hidden unless you switch to Full market.</span>}
      </div>
    </div>
  );
}
