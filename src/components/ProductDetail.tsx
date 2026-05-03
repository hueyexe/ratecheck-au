import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { Database } from "sql.js";
import type { ProductHistoryFile } from "../types";
import { queryProductById } from "../db";
import { buildProductProfile, formatAudienceTag, formatProductTag } from "../productProfile";
import { productDetailUrl, productHistoryUrl } from "../productHistory";
import { bankPath, ratesSearchPath } from "../navigation";
import { getProductDetailSections, mergeProductDetailSections } from "../productDetailData";
import type { AdditionalInfoUriItem, ConstraintDetailItem, EligibilityDetailItem, FeeDetailItem, FeatureDetailItem, ProductDetailSections } from "../productDetailData";
import MaterialIcon from "./MaterialIcon";
import ProductHistoryChart from "./ProductHistoryChart";
import { useSEO } from "../hooks/useSEO";

interface ProductDetailProps {
  db: Database;
}

function formatRate(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

interface RateConditionDetailItem { rateApplicabilityType?: string; additionalValue?: string; additionalInfo?: string; additionalInfoUri?: string; }

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
  const { bankName: bankNameParam = "", productId = "" } = useParams<{ bankName: string; productId: string }>();
  const bankName = decodeURIComponent(bankNameParam);
  const products = useMemo(() => queryProductById(db, bankName, productId), [db, bankName, productId]);
  const product = products[0];
  const profile = useMemo(() => (products[0] ? buildProductProfile(products[0]) : null), [products]);
  const [historyState, setHistoryState] = useState<{ key: string; history: ProductHistoryFile | null; missing: boolean } | null>(null);
  const [detailSidecarState, setDetailSidecarState] = useState<{ key: string; detail: unknown | null } | null>(null);
  const currentProductKey = product ? `${product.bank_name}::${product.product_id}` : "";
  const history = historyState?.key === currentProductKey ? historyState.history : null;
  const historyMissing = historyState?.key === currentProductKey ? historyState.missing : false;
  const detailSidecar = detailSidecarState?.key === currentProductKey ? detailSidecarState.detail : null;
  useSEO(product?.product_name || "Product", product ? `${product.bank_name} — ${product.product_name}. Rate: ${formatRate(product.rate)}.` : undefined);

  const featureDetails = useMemo<FeatureDetailItem[]>(() => {
    return parseJsonArray<FeatureDetailItem>(product?.feature_details);
  }, [product?.feature_details]);

  const eligibilityDetails = useMemo<EligibilityDetailItem[]>(() => {
    return parseJsonArray<EligibilityDetailItem>(product?.eligibility_details);
  }, [product?.eligibility_details]);

  const constraints = useMemo<ConstraintDetailItem[]>(() => {
    return parseJsonArray<ConstraintDetailItem>(product?.constraints);
  }, [product?.constraints]);

  const fees = useMemo<FeeDetailItem[]>(() => {
    return parseJsonArray<FeeDetailItem>(product?.fees);
  }, [product?.fees]);

  const rateConditionDetails = useMemo<RateConditionDetailItem[]>(() => {
    return parseJsonArray<RateConditionDetailItem>(product?.rate_condition_details);
  }, [product?.rate_condition_details]);

  const additionalInfoUris = useMemo<AdditionalInfoUriItem[]>(() => {
    return parseJsonArray<AdditionalInfoUriItem>(product?.additional_info_uris);
  }, [product?.additional_info_uris]);

  const sidecarSections = useMemo(() => getProductDetailSections(detailSidecar), [detailSidecar]);
  const renderedSections = useMemo<ProductDetailSections>(() => mergeProductDetailSections({
    featureDetails,
    eligibilityDetails,
    constraints,
    fees,
    additionalInfoUris,
  }, sidecarSections), [additionalInfoUris, constraints, eligibilityDetails, featureDetails, fees, sidecarSections]);

  useEffect(() => {
    if (!product) return;
    const controller = new AbortController();
    const key = `${product.bank_name}::${product.product_id}`;
    fetch(productHistoryUrl(import.meta.env.BASE_URL, product.bank_name, product.product_id), { signal: controller.signal })
      .then((response) => {
        if (response.status === 404) {
          setHistoryState({ key, history: null, missing: true });
          return null;
        }
        if (!response.ok) throw new Error(response.statusText);
        return response.json() as Promise<ProductHistoryFile>;
      })
      .then((json) => {
        if (json) setHistoryState({ key, history: json, missing: false });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHistoryState({ key, history: null, missing: true });
      });
    return () => controller.abort();
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const controller = new AbortController();
    const key = `${product.bank_name}::${product.product_id}`;

    fetch(productDetailUrl(import.meta.env.BASE_URL, product.bank_name, product.product_id), { signal: controller.signal })
      .then((response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(response.statusText);
        return response.json() as Promise<unknown>;
      })
      .then((json) => setDetailSidecarState({ key, detail: json }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDetailSidecarState({ key, detail: null });
      });

    return () => controller.abort();
  }, [product]);

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
      <Link to={bankPath(product.bank_name)} className="text-sm text-sand-500 dark:text-sand-400 hover:text-accent-600 dark:hover:text-accent-400 mb-3 inline-flex items-center gap-1 py-2 -my-2 transition-colors">
        <MaterialIcon name="arrow_back" className="w-4 h-4" />
        Back to {product.bank_name}
      </Link>
      <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-100">{product.product_name}</h2>
      <p className="mt-2 text-sm text-sand-500 dark:text-sand-400 leading-6">{product.description || "No description available."}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Link to={bankPath(product.bank_name)} className="inline-flex px-3 py-1.5 rounded-full bg-sand-100 text-sand-700 hover:bg-accent-100 hover:text-accent-700 dark:bg-sand-800 dark:text-sand-300 dark:hover:bg-accent-900/30 dark:hover:text-accent-300 transition-colors">
          All {product.bank_name} products
        </Link>
        <Link to={ratesSearchPath(product.product_name)} className="inline-flex px-3 py-1.5 rounded-full bg-sand-100 text-sand-700 hover:bg-accent-100 hover:text-accent-700 dark:bg-sand-800 dark:text-sand-300 dark:hover:bg-accent-900/30 dark:hover:text-accent-300 transition-colors">
          Find matching rates
        </Link>
        <a href={productDetailUrl(import.meta.env.BASE_URL, product.bank_name, product.product_id)} className="inline-flex px-3 py-1.5 rounded-full bg-sand-100 text-sand-700 hover:bg-accent-100 hover:text-accent-700 dark:bg-sand-800 dark:text-sand-300 dark:hover:bg-accent-900/30 dark:hover:text-accent-300 transition-colors">
          Full CDR detail
        </a>
      </div>

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

      {history ? <ProductHistoryChart history={history} /> : historyMissing && (
        <div className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4 text-sm text-sand-600 dark:text-sand-300">
          <div className="font-semibold text-sand-900 dark:text-sand-100 mb-1">Rate history</div>
          Rate history starts from snapshots RateCheck has collected. This product will show a chart once history is available.
        </div>
      )}

      {(product.effective_from || product.effective_to) && (
        <div className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4 text-sm text-sand-600 dark:text-sand-300">
          <div className="font-semibold text-sand-900 dark:text-sand-100 mb-2">Product availability</div>
          {product.effective_from && <div>Effective from {new Date(product.effective_from).toLocaleDateString("en-AU")}</div>}
          {product.effective_to && <div>Effective to {new Date(product.effective_to).toLocaleDateString("en-AU")}</div>}
        </div>
      )}

      {/* Feature details from CDR API */}
      {renderedSections.featureDetails.length > 0 && (
        <div className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
          <div className="font-semibold text-sm text-sand-900 dark:text-sand-100 mb-3">What's included</div>
          <div className="space-y-2">
            {renderedSections.featureDetails.map((f, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 text-accent-500 mt-0.5">✓</span>
                <div>
                  <span className="font-medium text-sand-800 dark:text-sand-200">
                    {formatFeatureDetailType(f.type)}
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
      {renderedSections.eligibilityDetails.length > 0 && (
        <div className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
          <div className="font-semibold text-sm text-sand-900 dark:text-sand-100 mb-1">Who can apply</div>
          <p className="text-xs text-sand-400 dark:text-sand-500 mb-3">Conditions published by this bank through the CDR open banking system.</p>
          <div className="space-y-2">
            {renderedSections.eligibilityDetails.map((e, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 text-sand-400 mt-0.5">•</span>
                <div>
                  <span className="font-medium text-sand-800 dark:text-sand-200">
                    {formatEligibilityDetailType(e.type)}
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

      {renderedSections.constraints.length > 0 && (
        <div className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
          <div className="font-semibold text-sm text-sand-900 dark:text-sand-100 mb-1">Product limits</div>
          <p className="text-xs text-sand-400 dark:text-sand-500 mb-3">Limits published by this bank through CDR.</p>
          <div className="space-y-2">
            {renderedSections.constraints.map((constraint, i) => (
              <div key={i} className="text-sm text-sand-600 dark:text-sand-300">
                <span className="font-medium text-sand-800 dark:text-sand-200">{(constraint.constraintType || "Limit").replace(/_/g, " ").toLowerCase()}</span>
                {(constraint.additionalInfo || constraint.additionalValue) && <span> - {constraint.additionalInfo || constraint.additionalValue}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {renderedSections.fees.length > 0 && (
        <div className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
          <div className="font-semibold text-sm text-sand-900 dark:text-sand-100 mb-1">Fees published by the bank</div>
          <p className="text-xs text-sand-400 dark:text-sand-500 mb-3">Fee data can be incomplete or conditional, so check the bank's terms before applying.</p>
          <div className="space-y-2">
            {renderedSections.fees.slice(0, 8).map((fee, i) => {
              const fixedAmount = formatFeeAmount(fee.fixedAmount);
              const extra = formatDetailValue(fee.additionalInfo) || formatDetailValue(fee.additionalValue);

              return (
                <div key={i} className="text-sm text-sand-600 dark:text-sand-300">
                  <span className="font-medium text-sand-800 dark:text-sand-200">{fee.name || fee.feeType || "Fee"}</span>
                  {fixedAmount && <span className="nums"> - ${fixedAmount}</span>}
                  {extra && <span> - {extra}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rateConditionDetails.length > 0 && (
        <div className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
          <div className="font-semibold text-sm text-sand-900 dark:text-sand-100 mb-3">Rate conditions</div>
          <div className="space-y-2">
            {rateConditionDetails.map((condition, i) => (
              <div key={i} className="text-sm text-sand-600 dark:text-sand-300">
                <span className="font-medium text-sand-800 dark:text-sand-200">{(condition.rateApplicabilityType || "Condition").replace(/_/g, " ").toLowerCase()}</span>
                {(condition.additionalInfo || condition.additionalValue) && <span> - {condition.additionalInfo || condition.additionalValue}</span>}
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

      {renderedSections.additionalInfoUris.length > 0 && (
        <div className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
          <div className="font-semibold text-sm text-sand-900 dark:text-sand-100 mb-3">More product information</div>
          <div className="flex flex-wrap gap-2">
            {renderedSections.additionalInfoUris.filter((link) => link.additionalInfoUri).map((link) => (
              <a
                key={link.additionalInfoUri}
                href={link.additionalInfoUri}
                target="_blank"
                rel="noreferrer"
                className="inline-flex px-3 py-1.5 rounded-full text-xs font-medium bg-sand-100 text-sand-700 hover:bg-accent-100 hover:text-accent-700 dark:bg-sand-800 dark:text-sand-300 dark:hover:bg-accent-900/30 dark:hover:text-accent-300 transition-colors"
              >
                {link.description || "More info"}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isPlainObject) as T[] : [];
  } catch {
    return [];
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatDetailValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (isPlainObject(value)) {
    const amount = value.amount;
    if (typeof amount === "string" || typeof amount === "number") return String(amount);
  }
  return "";
}

function formatFeeAmount(value: unknown): string {
  return formatDetailValue(value);
}

function formatFeatureDetailType(type: string | undefined): string {
  if (!type) return "Feature";
  return FEATURE_LABELS[type] || type.replace(/_/g, " ").toLowerCase();
}

function formatEligibilityDetailType(type: string | undefined): string {
  if (!type) return "Condition";
  return ELIGIBILITY_LABELS[type] || type.replace(/_/g, " ").toLowerCase();
}
