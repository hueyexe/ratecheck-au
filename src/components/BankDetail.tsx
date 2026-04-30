import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import type { Database } from "sql.js";
import type { BankProduct } from "../types";
import { queryBankProducts, queryProductById } from "../db";
import { buildProductProfile, formatAudienceTag, formatProductTag } from "../productProfile";
import { productPath, ratesSearchPath } from "../navigation";
import MaterialIcon from "./MaterialIcon";
import { useSEO } from "../hooks/useSEO";

interface BankDetailProps {
  db: Database;
}

function formatRate(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function formatRateType(rt: string): string {
  switch (rt) {
    case "BUNDLE_DISCOUNT_VARIABLE": return "Bundle Var";
    case "BUNDLE_DISCOUNT_FIXED": return "Bundle Fix";
    case "INTRODUCTORY": return "Intro";
    case "VARIABLE": return "Variable";
    case "FIXED": return "Fixed";
    default: return rt;
  }
}

function formatRepayment(rt: string): string {
  return rt === "PRINCIPAL_AND_INTEREST" ? "P&I" : rt === "INTEREST_ONLY" ? "IO" : rt;
}

function formatPurpose(p: string): string {
  return p === "OWNER_OCCUPIED" ? "Owner" : p === "INVESTMENT" ? "Invest" : p;
}

export default function BankDetail({ db }: BankDetailProps) {
  const { bankName: bankNameParam, productId } = useParams<{ bankName: string; productId?: string }>();
  const bankName = decodeURIComponent(bankNameParam || "");
  useSEO(bankName || "Bank", `Compare home loan rates from ${bankName}. Variable, fixed, P&I, and interest-only products.`);

  const products = useMemo(
    () => (productId ? queryProductById(db, productId) : queryBankProducts(db, bankName)),
    [db, bankName, productId],
  );

  const groupedProducts = useMemo(() => {
    const groups: Record<string, BankProduct[]> = {};
    for (const p of products) {
      if (!groups[p.product_name]) groups[p.product_name] = [];
      groups[p.product_name].push(p);
    }
    return groups;
  }, [products]);

  const bestVariable = useMemo(() => {
    const vars = products.filter(p => ["VARIABLE", "BUNDLE_DISCOUNT_VARIABLE", "INTRODUCTORY"].includes(p.rate_type));
    return vars.length ? Math.min(...vars.map(p => p.rate)) : null;
  }, [products]);

  const bestFixed = useMemo(() => {
    const fixed = products.filter(p => ["FIXED", "BUNDLE_DISCOUNT_FIXED"].includes(p.rate_type));
    return fixed.length ? Math.min(...fixed.map(p => p.rate)) : null;
  }, [products]);

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sand-500 dark:text-sand-400 text-sm">No products found for this bank.</p>
        <Link to="/banks" className="text-accent-600 dark:text-accent-400 text-sm mt-2 inline-flex items-center gap-1 hover:underline">
          <MaterialIcon name="arrow_back" className="w-4 h-4" />
          Back to all banks
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/banks" className="text-sm text-sand-500 dark:text-sand-400 hover:text-accent-600 dark:hover:text-accent-400 mb-3 inline-flex items-center gap-1 py-2 -my-2 transition-colors">
          <MaterialIcon name="arrow_back" className="w-4 h-4" />
          All banks
        </Link>
        <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-100">{products[0]?.bank_name || bankName}</h2>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-sand-500 dark:text-sand-400">
          {bestVariable != null && (
            <span>Best variable: <span className="nums font-semibold text-accent-600 dark:text-accent-400">{formatRate(bestVariable)}</span></span>
          )}
          {bestFixed != null && (
            <span>Best fixed: <span className="nums font-semibold text-sky-600 dark:text-sky-400">{formatRate(bestFixed)}</span></span>
          )}
          <span>{products.length} product{products.length !== 1 ? "s" : ""}</span>
          <Link to={ratesSearchPath(products[0]?.bank_name || bankName)} className="text-accent-600 dark:text-accent-400 hover:underline">
            View in rates table
          </Link>
        </div>
      </div>

      {Object.entries(groupedProducts).map(([productName, productGroup]) => {
        const profile = buildProductProfile(productGroup[0]);
        return (
          <div key={productName} className="mb-5 rounded-2xl border border-sand-200 dark:border-sand-800 overflow-hidden">
            <div className="px-4 py-3 bg-sand-50 dark:bg-sand-900 border-b border-sand-200 dark:border-sand-800">
              <Link to={productPath(productGroup[0].product_id)} className="text-sm font-semibold text-sand-900 dark:text-sand-100 hover:text-accent-600 dark:hover:text-accent-400 transition-colors">
                {productName}
              </Link>
              {productGroup[0].description && (
                <div className="text-xs text-sand-500 dark:text-sand-400 mt-0.5">{productGroup[0].description}</div>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  profile.fitTone === "emerald"
                    ? "bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300"
                    : profile.fitTone === "violet"
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                }`}>
                  {profile.fitLabel}
                </span>
                {profile.audienceTags.slice(0, 2).map((tag) => (
                  <span key={tag} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                    {formatAudienceTag(tag)}
                  </span>
                ))}
                {profile.productTags.slice(0, 2).map((tag) => (
                  <span key={tag} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-sand-100 text-sand-600 dark:bg-sand-800 dark:text-sand-300">
                    {formatProductTag(tag)}
                  </span>
                ))}
              </div>
            </div>

            {/* Mobile card view — shows all fields */}
            <div className="sm:hidden divide-y divide-sand-100 dark:divide-sand-800">
              {productGroup.map((p, i) => (
                <div key={i} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      ["VARIABLE", "BUNDLE_DISCOUNT_VARIABLE", "INTRODUCTORY"].includes(p.rate_type)
                        ? "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400"
                        : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                    }`}>
                      {formatRateType(p.rate_type)}
                    </span>
                    <span className="nums font-bold text-lg text-sand-900 dark:text-sand-100">{formatRate(p.rate)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-sand-500 dark:text-sand-400">
                    <span>{formatRepayment(p.repayment_type)}</span>
                    <span>{formatPurpose(p.loan_purpose)}</span>
                    {p.lvr_max > 0 && <span>LVR ≤{(p.lvr_max * 100).toFixed(0)}%</span>}
                    {p.fixed_term && <span>{p.fixed_term}</span>}
                    <span className="col-span-2 text-xs">Comparison: <span className="nums">{formatRate(p.comparison_rate)}</span></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-sand-400 dark:text-sand-500 border-b border-sand-100 dark:border-sand-800">
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-right px-4 py-2 font-medium">Rate</th>
                    <th className="text-right px-4 py-2 font-medium">Comparison</th>
                    <th className="text-right px-4 py-2 font-medium hidden sm:table-cell">Repayment</th>
                    <th className="text-right px-4 py-2 font-medium hidden sm:table-cell">Purpose</th>
                    <th className="text-right px-4 py-2 font-medium hidden md:table-cell">LVR</th>
                    {productGroup.some((p) => p.fixed_term) && (
                      <th className="text-right px-4 py-2 font-medium hidden md:table-cell">Term</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {productGroup.map((p, i) => (
                    <tr key={i} className="border-b border-sand-50 dark:border-sand-800/50 last:border-b-0 hover:bg-accent-50/40 dark:hover:bg-accent-950/10 transition-colors">
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          ["VARIABLE", "BUNDLE_DISCOUNT_VARIABLE", "INTRODUCTORY"].includes(p.rate_type)
                            ? "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400"
                            : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                        }`}>
                          {formatRateType(p.rate_type)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right nums font-semibold text-sand-900 dark:text-sand-100">{formatRate(p.rate)}</td>
                      <td className="px-4 py-2 text-right nums text-sand-500 dark:text-sand-400">{formatRate(p.comparison_rate)}</td>
                      <td className="px-4 py-2 text-right text-sand-500 dark:text-sand-400 hidden sm:table-cell">{formatRepayment(p.repayment_type)}</td>
                      <td className="px-4 py-2 text-right text-sand-500 dark:text-sand-400 hidden sm:table-cell">{formatPurpose(p.loan_purpose)}</td>
                      <td className="px-4 py-2 text-right text-sand-500 dark:text-sand-400 hidden md:table-cell">
                        {p.lvr_max > 0 ? `${(p.lvr_max * 100).toFixed(0)}%` : "—"}
                      </td>
                      {productGroup.some((pp) => pp.fixed_term) && (
                        <td className="px-4 py-2 text-right text-sand-500 dark:text-sand-400 hidden md:table-cell">{p.fixed_term || "—"}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
