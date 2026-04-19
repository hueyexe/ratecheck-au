import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import type { Database } from "sql.js";
import { queryProductById } from "../db";
import { buildProductProfile, formatAudienceTag, formatProductTag } from "../productProfile";
import MaterialIcon from "./MaterialIcon";
import { useSEO } from "../hooks/useSEO";

interface ProductDetailProps {
  db: Database;
}

function formatRate(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

interface FeatureDetailItem { type: string; value?: string; info?: string; }
interface EligibilityDetailItem { type: string; value?: string; info?: string; }

const FEATURE_LABELS: Record<string, string> = {
  OFFSET: "Offset account",
  REDRAW: "Redraw facility",
  EXTRA_REPAYMENTS: "Extra repayments",
  CASHBACK_OFFER: "Cashback offer",
  GUARANTOR: "Guarantor option",
  NPP_PAYID: "PayID supported",
  NPP_ENABLED: "NPP payments",
  DIGITAL_BANKING: "Online banking",
  NOTIFICATIONS: "Rate change alerts",
  COMPLEMENTARY_PRODUCT_DISCOUNTS: "Bundle discounts",
  INSURANCE: "Insurance included",
  BILL_PAYMENT: "Bill payments",
  CARD_ACCESS: "Card access",
};

const ELIGIBILITY_LABELS: Record<string, string> = {
  MIN_AGE: "Minimum age",
  MAX_AGE: "Maximum age",
  NATURAL_PERSON: "Individual applicants only",
  RESIDENCY_STATUS: "Residency requirement",
  EMPLOYMENT_STATUS: "Employment requirement",
  BUSINESS: "Business customers only",
  PENSION_RECIPIENT: "Pension recipients",
  STAFF: "Staff members only",
  STUDENT: "Students only",
  OTHER: "Other conditions apply",
};

export default function ProductDetail({ db }: ProductDetailProps) {
  const { productId = "" } = useParams<{ productId: string }>();
  const products = useMemo(() => queryProductById(db, productId), [db, productId]);
  const product = products[0];
  const profile = useMemo(() => (products[0] ? buildProductProfile(products[0]) : null), [products]);
  useSEO(product?.product_name || "Product", product ? `${product.bank_name} — ${product.product_name}. Rate: ${formatRate(product.rate)}.` : undefined);

  const featureDetails = useMemo<FeatureDetailItem[]>(() => {
    try { return JSON.parse(product?.feature_details || "[]"); } catch { return []; }
  }, [product?.feature_details]);

  const eligibilityDetails = useMemo<EligibilityDetailItem[]>(() => {
    try { return JSON.parse(product?.eligibility_details || "[]"); } catch { return []; }
  }, [product?.eligibility_details]);

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sand-500 dark:text-sand-400 text-sm">No product found.</p>
        <Link to="/banks" className="text-accent-600 dark:text-accent-400 text-sm mt-2 inline-flex items-center gap-1 hover:underline">
          <MaterialIcon name="arrow_back" className="w-4 h-4" />
          Back to all banks
        </Link>
      </div>
    );
  }

  const isRevert = product.is_revert_rate === 1;

  return (
    <div className="max-w-3xl">
      <Link to={`/bank/${encodeURIComponent(product.bank_name)}`} className="text-sm text-sand-500 dark:text-sand-400 hover:text-accent-600 dark:hover:text-accent-400 mb-3 inline-flex items-center gap-1 py-2 -my-2 transition-colors">
        <MaterialIcon name="arrow_back" className="w-4 h-4" />
        Back to {product.bank_name}
      </Link>
      <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-100">{product.product_name}</h2>
      <p className="mt-2 text-sm text-sand-500 dark:text-sand-400 leading-6">{product.description || "No description available."}</p>

      {isRevert && (
        <div className="mt-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <strong>Heads up:</strong> This is a revert rate — the higher rate this bank charges if you don't qualify for their advertised discount. It's published alongside the lower rate for the same product. Always check which rate you'd actually get.
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
          profile?.fitTone === "emerald"
            ? "bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300"
            : profile?.fitTone === "violet"
              ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        }`}>
          {profile?.fitLabel}
        </span>
        {profile?.audienceTags.map((tag) => (
          <span key={tag} className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
            {formatAudienceTag(tag)}
          </span>
        ))}
        {profile?.productTags.map((tag) => (
          <span key={tag} className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-sand-100 text-sand-700 dark:bg-sand-800 dark:text-sand-300">
            {formatProductTag(tag)}
          </span>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
          <div className="text-sand-500 dark:text-sand-400 text-xs uppercase tracking-wide">Rate</div>
          <div className="nums font-bold text-2xl text-accent-600 dark:text-accent-400 mt-1">{formatRate(product.rate)}</div>
        </div>
        <div className="rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
          <div className="text-sand-500 dark:text-sand-400 text-xs uppercase tracking-wide">Comparison rate</div>
          <div className="nums font-bold text-2xl text-sand-700 dark:text-sand-300 mt-1">
            {product.comparison_rate > 0 ? formatRate(product.comparison_rate) : "—"}
          </div>
          {product.comparison_rate === 0 && (
            <div className="text-xs text-sand-400 dark:text-sand-500 mt-1">Not published by this bank</div>
          )}
        </div>
      </div>

      {product.rate_notes && (
        <div className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4 text-sm text-sand-600 dark:text-sand-300">
          <div className="font-semibold text-sand-900 dark:text-sand-100 mb-1">Rate notes</div>
          {product.rate_notes}
        </div>
      )}

      {/* Feature details from CDR API */}
      {featureDetails.length > 0 && (
        <div className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
          <div className="font-semibold text-sm text-sand-900 dark:text-sand-100 mb-3">What's included</div>
          <div className="space-y-2">
            {featureDetails.map((f, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 text-accent-500 mt-0.5">✓</span>
                <div>
                  <span className="font-medium text-sand-800 dark:text-sand-200">
                    {FEATURE_LABELS[f.type] || f.type.replace(/_/g, " ").toLowerCase()}
                  </span>
                  {(f.value || f.info) && (
                    <span className="text-sand-500 dark:text-sand-400">
                      {" — "}{f.info || f.value}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Eligibility details from CDR API */}
      {eligibilityDetails.length > 0 && (
        <div className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
          <div className="font-semibold text-sm text-sand-900 dark:text-sand-100 mb-1">Who can apply</div>
          <p className="text-xs text-sand-400 dark:text-sand-500 mb-3">Conditions published by this bank through the CDR open banking system.</p>
          <div className="space-y-2">
            {eligibilityDetails.map((e, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 text-sand-400 mt-0.5">•</span>
                <div>
                  <span className="font-medium text-sand-800 dark:text-sand-200">
                    {ELIGIBILITY_LABELS[e.type] || e.type.replace(/_/g, " ").toLowerCase()}
                  </span>
                  {(e.value || e.info) && (
                    <span className="text-sand-500 dark:text-sand-400">
                      {" — "}{e.info || e.value}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile && profile.links.length > 0 && (
        <div className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
          <div className="font-semibold text-sm text-sand-900 dark:text-sand-100 mb-3">Useful links</div>
          <div className="flex flex-wrap gap-2">
            {profile.links.map((link) => (
              <a
                key={`${link.label}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex px-3 py-1.5 rounded-full text-xs font-medium bg-sand-100 text-sand-700 hover:bg-accent-100 hover:text-accent-700 dark:bg-sand-800 dark:text-sand-300 dark:hover:bg-accent-900/30 dark:hover:text-accent-300 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
