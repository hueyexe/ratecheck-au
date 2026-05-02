import { Link, useLocation } from "react-router-dom";
import type { Database } from "sql.js";
import { parseCompareProductsParam } from "../compareKeys";
import { queryRatesByCompareKeys } from "../db";
import { buildProductProfile, formatProductTag } from "../productProfile";
import { formatFixedTerm, formatLoanPurpose, formatLvr, formatRate, formatRateType, formatRepaymentType } from "../rateDisplay";
import type { RateRow } from "../types";

interface ComparePageViewProps {
  rows: RateRow[];
  invalidCount: number;
}

interface CompareRowDefinition {
  label: string;
  value: (row: RateRow) => string;
}

const rowGroups: Array<{ title: string; rows: CompareRowDefinition[] }> = [
  {
    title: "Cost and rate",
    rows: [
      { label: "Interest rate", value: (row) => formatRate(row.rate) },
      { label: "Comparison rate", value: (row) => formatRate(row.comparison_rate) },
      { label: "Rate type", value: (row) => formatRateType(row.rate_type) },
      { label: "Fixed term", value: (row) => row.rate_type.includes("FIXED") ? formatFixedTerm(row.fixed_term) : "Not fixed" },
    ],
  },
  {
    title: "Loan fit",
    rows: [
      { label: "Repayments", value: (row) => formatRepaymentType(row.repayment_type) },
      { label: "Loan use", value: (row) => formatLoanPurpose(row.loan_purpose) },
      { label: "LVR", value: (row) => formatLvr(row.lvr_min, row.lvr_max) },
      { label: "Fit", value: (row) => buildProductProfile(row).fitLabel },
    ],
  },
  {
    title: "Features and source",
    rows: [
      { label: "Features", value: (row) => buildProductProfile(row).productTags.map(formatProductTag).join(", ") || "Not listed" },
      { label: "Last updated", value: (row) => row.last_updated || "Not listed" },
    ],
  },
];

export function ComparePageView({ rows, invalidCount }: ComparePageViewProps) {
  if (rows.length === 0) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-sand-200 bg-white p-6 text-center dark:border-sand-800 dark:bg-sand-900">
        <p className="text-sm font-semibold text-accent-700 dark:text-accent-300">Compare loans</p>
        <h1 className="mt-2 text-2xl font-semibold text-sand-950 dark:text-sand-50">No loans selected</h1>
        <p className="mt-2 text-sm leading-6 text-sand-600 dark:text-sand-300">Choose loans from the rates table, then open Compare to see them side by side.</p>
        {invalidCount > 0 && <p className="nums mt-2 text-xs text-sand-500 dark:text-sand-400">{formatInvalidCount(invalidCount)}</p>}
        <Link to="/rates" className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600">Browse rates</Link>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-accent-700 dark:text-accent-300">Compare loans</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-sand-950 dark:text-sand-50">Side-by-side loan details</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-sand-600 dark:text-sand-300">These are advertised product details. Confirm eligibility, fees and final terms directly with the lender.</p>
        </div>
        <Link to="/rates" className="inline-flex min-h-[44px] items-center rounded-full border border-sand-200 px-4 py-2 text-sm font-semibold text-sand-700 hover:border-accent-300 hover:text-accent-700 dark:border-sand-700 dark:text-sand-200 dark:hover:text-accent-300">Add or change loans</Link>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-sand-200 bg-white dark:border-sand-800 dark:bg-sand-900">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-sand-200 bg-sand-50 text-left dark:border-sand-800 dark:bg-sand-800/70">
              <th className="sticky left-0 z-[1] w-44 bg-sand-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-sand-500 dark:bg-sand-800 dark:text-sand-300">Detail</th>
              {rows.map((row) => (
                <th key={row.rate_id} className="min-w-56 px-4 py-3 align-top">
                  <div className="font-semibold text-sand-950 dark:text-sand-50">{row.bank_name}</div>
                  <div className="mt-1 text-xs font-normal text-sand-500 dark:text-sand-400">{row.product_name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowGroups.map((group) => (
              <CompareGroup key={group.title} title={group.title} rows={group.rows} products={rows} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ComparePage({ db }: { db: Database }) {
  const location = useLocation();
  const productsParam = getRawQueryParam(location.search, "products");
  const rawCount = countRawProducts(productsParam);
  const keys = parseCompareProductsParam(productsParam);
  const rows = queryRatesByCompareKeys(db, keys);
  return <ComparePageView rows={rows} invalidCount={Math.max(0, rawCount - rows.length)} />;
}

function getRawQueryParam(search: string, name: string): string | null {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query) return null;
  const encodedName = encodeURIComponent(name);
  for (const part of query.split("&")) {
    const equalsIndex = part.indexOf("=");
    const rawName = equalsIndex === -1 ? part : part.slice(0, equalsIndex);
    if (rawName === encodedName) return equalsIndex === -1 ? "" : part.slice(equalsIndex + 1);
  }
  return null;
}

function countRawProducts(value: string | null): number {
  if (!value) return 0;
  return value.split(",").filter(Boolean).length;
}

function formatInvalidCount(count: number): string {
  return count === 1 ? "1 invalid selection was ignored." : `${count} invalid selections were ignored.`;
}

function CompareGroup({ title, rows, products }: { title: string; rows: CompareRowDefinition[]; products: RateRow[] }) {
  return (
    <>
      <tr>
        <th colSpan={products.length + 1} className="bg-sand-100 px-4 py-2 text-left text-xs font-semibold text-sand-700 dark:bg-sand-800 dark:text-sand-200">{title}</th>
      </tr>
      {rows.map((definition) => (
        <tr key={definition.label} className="border-t border-sand-100 dark:border-sand-800">
          <th className="sticky left-0 z-[1] bg-white px-4 py-3 text-left text-xs font-medium text-sand-500 dark:bg-sand-900 dark:text-sand-400">{definition.label}</th>
          {products.map((row) => (
            <td key={`${definition.label}-${row.rate_id}`} className="px-4 py-3 text-sand-800 dark:text-sand-200">{definition.value(row)}</td>
          ))}
        </tr>
      ))}
    </>
  );
}
