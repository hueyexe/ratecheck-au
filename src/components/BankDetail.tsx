import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import type { Database } from "sql.js";
import type { BankProduct } from "../types";
import { queryBankProducts, queryProductById } from "../db";
import { buildProductProfile, formatAudienceTag, formatProductTag } from "../productProfile";

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
  switch (rt) {
    case "PRINCIPAL_AND_INTEREST": return "P&I";
    case "INTEREST_ONLY": return "IO";
    default: return rt;
  }
}

function formatPurpose(p: string): string {
  switch (p) {
    case "OWNER_OCCUPIED": return "Owner";
    case "INVESTMENT": return "Invest";
    default: return p;
  }
}

export default function BankDetail({ db }: BankDetailProps) {
  const { bankName: bankNameParam, productId } = useParams<{ bankName: string; productId?: string }>();
  const bankName = decodeURIComponent(bankNameParam || "");

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
    const vars = products.filter(p => p.rate_type === "VARIABLE" || p.rate_type === "BUNDLE_DISCOUNT_VARIABLE" || p.rate_type === "INTRODUCTORY");
    return vars.length ? Math.min(...vars.map(p => p.rate)) : null;
  }, [products]);

  const bestFixed = useMemo(() => {
    const fixed = products.filter(p => p.rate_type === "FIXED" || p.rate_type === "BUNDLE_DISCOUNT_FIXED");
    return fixed.length ? Math.min(...fixed.map(p => p.rate)) : null;
  }, [products]);

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No products found for this bank.
        </p>
        <Link to="/banks" className="text-primary-600 dark:text-primary-400 text-sm mt-2 inline-block hover:underline">
          ← Back to all banks
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Bank header */}
      <div className="mb-6">
        <Link to="/banks" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 inline-block">
          ← Back to all banks
        </Link>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {products[0]?.bank_name || bankName}
        </h2>
        <div className="flex gap-6 mt-2 text-sm">
          {bestVariable != null && (
            <span className="text-gray-500 dark:text-gray-400">
              Best variable: <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{formatRate(bestVariable)}</span>
            </span>
          )}
          {bestFixed != null && (
            <span className="text-gray-500 dark:text-gray-400">
              Best fixed: <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{formatRate(bestFixed)}</span>
            </span>
          )}
          <span className="text-gray-500 dark:text-gray-400">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Products */}
      {Object.entries(groupedProducts).map(([productName, productGroup]) => {
        const profile = buildProductProfile(productGroup[0]);
        return (
        <div key={productName} className="mb-6 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <Link to={`/product/${encodeURIComponent(productGroup[0].product_id)}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:underline">
              {productName}
            </Link>
            {productGroup[0].description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {productGroup[0].description}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                profile.fitTone === "emerald"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : profile.fitTone === "violet"
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              }`}>
                {profile.fitLabel}
              </span>
              {profile.audienceTags.slice(0, 2).map((tag) => (
                <span key={tag} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  {formatAudienceTag(tag)}
                </span>
              ))}
              {profile.productTags.slice(0, 2).map((tag) => (
                <span key={tag} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {formatProductTag(tag)}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
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
                  <tr
                    key={i}
                    className="border-b border-gray-50 dark:border-gray-800/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-900/30"
                  >
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                          p.rate_type === "VARIABLE" ||
                          p.rate_type === "BUNDLE_DISCOUNT_VARIABLE" ||
                          p.rate_type === "INTRODUCTORY"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {formatRateType(p.rate_type)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {formatRate(p.rate)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-500 dark:text-gray-400">
                      {formatRate(p.comparison_rate)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {formatRepayment(p.repayment_type)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {formatPurpose(p.loan_purpose)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {p.lvr_max > 0 ? `${(p.lvr_max * 100).toFixed(0)}%` : "—"}
                    </td>
                    {productGroup.some((pp) => pp.fixed_term) && (
                      <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400 hidden md:table-cell">
                        {p.fixed_term || "—"}
                      </td>
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
