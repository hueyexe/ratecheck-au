import { useState, useEffect } from "react";
import type { FilterState } from "../types";
import MaterialIcon from "./MaterialIcon";

interface FiltersProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  total: number;
  filtered: number;
}

const RATE_TYPES = [
  { value: "", label: "All" },
  { value: "VARIABLE", label: "Variable" },
  { value: "FIXED", label: "Fixed" },
];
const PURPOSES = [
  { value: "", label: "All" },
  { value: "OWNER_OCCUPIED", label: "Owner Occupied" },
  { value: "INVESTMENT", label: "Investment" },
];
const REPAYMENTS = [
  { value: "", label: "All" },
  { value: "PRINCIPAL_AND_INTEREST", label: "P&I" },
  { value: "INTEREST_ONLY", label: "Interest Only" },
];
const LVR_OPTIONS = [
  { value: 0, label: "Any LVR" },
  { value: 60, label: "≤60%" },
  { value: 70, label: "≤70%" },
  { value: 80, label: "≤80%" },
  { value: 90, label: "≤90%" },
  { value: 95, label: "≤95%" },
];
const FIXED_TERMS = [
  { value: "", label: "Any" },
  { value: "P1Y", label: "1yr" },
  { value: "P2Y", label: "2yr" },
  { value: "P3Y", label: "3yr" },
  { value: "P4Y", label: "4yr" },
  { value: "P5Y", label: "5yr" },
];
const FEATURES = [
  { value: "offset", label: "Offset", icon: "swap_horiz" as const },
  { value: "redraw", label: "Redraw", icon: "repeat" as const },
  { value: "extra_repayments", label: "Extra Repayments", icon: "savings" as const },
  { value: "cashback", label: "Cashback", icon: "savings" as const },
  { value: "package", label: "Package", icon: "package" as const },
  { value: "guarantor", label: "Guarantor", icon: "check" as const },
];
const AUDIENCE = [
  { value: "first_home_buyer", label: "First Home Buyer" },
  { value: "education_workers", label: "Teacher" },
  { value: "health_workers", label: "Health Worker" },
  { value: "police_and_defence", label: "Defence/Police" },
  { value: "essential_workers", label: "Essential Worker" },
];

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-full text-sm font-medium transition-all duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${
        active
          ? "bg-accent-500 text-white shadow-sm"
          : "border border-sand-200 dark:border-sand-700 text-sand-600 dark:text-sand-400 hover:border-accent-300 dark:hover:border-accent-700 hover:text-accent-700 dark:hover:text-accent-300 bg-white dark:bg-sand-900"
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
      if (search !== filters.search) onChange({ ...filters, search });
    }, 300);
    return () => clearTimeout(t);
  }, [search, filters, onChange]);

  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  const toggleFeature = (f: string) => {
    const next = filters.features.includes(f)
      ? filters.features.filter((x) => x !== f)
      : [...filters.features, f];
    set({ features: next });
  };
  const toggleAudience = (a: string) => {
    const next = filters.audience.includes(a)
      ? filters.audience.filter((x) => x !== a)
      : [...filters.audience, a];
    set({ audience: next });
  };

  const activeCount =
    filters.features.length +
    filters.audience.length +
    (filters.fixedTerm ? 1 : 0) +
    (filters.rateType ? 1 : 0) +
    (filters.loanPurpose ? 1 : 0) +
    (filters.repaymentType ? 1 : 0) +
    (filters.maxLvr ? 1 : 0);

  return (
    <div className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-3 md:p-4 sticky top-[65px] z-10 shadow-sm">
      {/* Mobile toggle */}
      <div className="flex items-center justify-between md:hidden mb-2">
        <span className="text-sm text-sand-500 dark:text-sand-400 nums">
          {filtered.toLocaleString()} of {total.toLocaleString()} rates
        </span>
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium bg-sand-100 dark:bg-sand-800 text-sand-600 dark:text-sand-400"
        >
          Filters {activeCount > 0 && <span className="w-5 h-5 rounded-full bg-accent-500 text-white text-[10px] flex items-center justify-center">{activeCount}</span>}
        </button>
      </div>

      <div className={`space-y-2.5 md:block ${open ? "block animate-slide-down" : "hidden"}`}>
        {/* Search */}
        <div className="relative max-w-xs">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sand-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search banks or products…"
            className="w-full pl-9 pr-8 py-2 rounded-full bg-sand-100 dark:bg-sand-800 text-sm text-sand-900 dark:text-sand-100 placeholder-sand-400 focus:outline-2 focus:outline-accent-500 transition-colors"
            aria-label="Search banks and products"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); set({ search: "" }); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-sand-400 hover:text-sand-600"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Scope */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-sand-400 dark:text-sand-500 w-14 shrink-0">Scope</span>
          <Pill active={filters.everydayOnly} onClick={() => set({ everydayOnly: true })}>Everyday rates</Pill>
          <Pill active={!filters.everydayOnly} onClick={() => set({ everydayOnly: false })}>All advertised</Pill>
          <p className="basis-full pl-14 text-[11px] text-sand-500 dark:text-sand-400">Everyday hides specialist, restricted and special-purpose products.</p>
        </div>

        {/* Type */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-sand-400 dark:text-sand-500 w-14 shrink-0">Type</span>
          {RATE_TYPES.map((t) => (
            <Pill key={t.value} active={filters.rateType === t.value} onClick={() => set({ rateType: t.value })}>
              {t.label}
            </Pill>
          ))}
        </div>

        {/* Fixed term — only when Fixed selected */}
        {filters.rateType === "FIXED" && (
          <div className="flex flex-wrap items-center gap-1.5 animate-slide-down">
            <span className="text-[11px] text-sand-400 dark:text-sand-500 w-14 shrink-0">Term</span>
            {FIXED_TERMS.map((t) => (
              <Pill key={t.value} active={filters.fixedTerm === t.value} onClick={() => set({ fixedTerm: t.value })}>
                {t.label}
              </Pill>
            ))}
          </div>
        )}

        {/* Purpose */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-sand-400 dark:text-sand-500 w-14 shrink-0">Use</span>
          {PURPOSES.map((p) => (
            <Pill key={p.value} active={filters.loanPurpose === p.value} onClick={() => set({ loanPurpose: p.value })}>
              {p.label}
            </Pill>
          ))}
        </div>

        {/* Repayment */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-sand-400 dark:text-sand-500 w-14 shrink-0">Repay</span>
          {REPAYMENTS.map((r) => (
            <Pill key={r.value} active={filters.repaymentType === r.value} onClick={() => set({ repaymentType: r.value })}>
              {r.label}
            </Pill>
          ))}
        </div>

        {/* LVR */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-sand-400 dark:text-sand-500 w-14 shrink-0">LVR</span>
          {LVR_OPTIONS.map((l) => (
            <Pill key={l.value} active={filters.maxLvr === l.value} onClick={() => set({ maxLvr: l.value })}>
              {l.label}
            </Pill>
          ))}
        </div>

        {/* Features */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-sand-400 dark:text-sand-500 w-14 shrink-0">Features</span>
          {FEATURES.map((f) => (
            <Pill key={f.value} active={filters.features.includes(f.value)} onClick={() => toggleFeature(f.value)}>
              <MaterialIcon name={f.icon} className="w-3 h-3" />
              {f.label}
            </Pill>
          ))}
        </div>

        {/* Audience */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-sand-400 dark:text-sand-500 w-14 shrink-0">For</span>
          {AUDIENCE.map((a) => (
            <Pill key={a.value} active={filters.audience.includes(a.value)} onClick={() => toggleAudience(a.value)}>
              {a.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* Desktop count + clear */}
      <div className="hidden md:flex items-center justify-between mt-2.5 pt-2.5 border-t border-sand-100 dark:border-sand-800">
        <span className="text-[11px] text-sand-400 dark:text-sand-500 nums">
          Showing <span className="text-sand-700 dark:text-sand-300 font-medium">{filtered.toLocaleString()}</span> of {total.toLocaleString()} rates
        </span>
        {activeCount > 0 && (
          <button
            onClick={() => onChange({ rateType: "", loanPurpose: "", repaymentType: "", maxLvr: 0, everydayOnly: true, search: "", sortKey: "rate", sortAsc: true, features: [], audience: [], fixedTerm: "" })}
            className="text-[11px] text-accent-600 dark:text-accent-400 hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Mobile clear all — shown inside open panel */}
      {open && activeCount > 0 && (
        <div className="md:hidden mt-3 pt-3 border-t border-sand-100 dark:border-sand-800">
          <button
            onClick={() => { onChange({ rateType: "", loanPurpose: "", repaymentType: "", maxLvr: 0, everydayOnly: true, search: "", sortKey: "rate", sortAsc: true, features: [], audience: [], fixedTerm: "" }); setOpen(false); }}
            className="w-full py-2.5 rounded-full text-sm font-medium text-accent-600 dark:text-accent-400 border border-accent-200 dark:border-accent-800 hover:bg-accent-50 dark:hover:bg-accent-950/30 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
