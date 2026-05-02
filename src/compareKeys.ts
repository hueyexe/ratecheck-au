import type { RateRow } from "./types";

export interface CompareKeyParts {
  rate_id: number;
  product_id: string;
  rate_type: string;
  rate: number;
  comparison_rate: number;
  repayment_type: string;
  loan_purpose: string;
  lvr_min: number;
  lvr_max: number;
  fixed_term: string;
}

const separator = "|";
const keyPartCount = 10;

export function buildCompareKey(row: Pick<RateRow, keyof CompareKeyParts>): string {
  return [row.rate_id, row.product_id, row.rate_type, normaliseNumber(row.rate), normaliseNumber(row.comparison_rate), row.repayment_type, row.loan_purpose, normaliseNumber(row.lvr_min), normaliseNumber(row.lvr_max), row.fixed_term].join(separator);
}

export function parseCompareKey(value: string): CompareKeyParts | null {
  const parts = value.split(separator);
  if (parts.length !== keyPartCount) return null;
  if (parts.some((part) => part.includes(","))) return null;
  const [rateIdRaw, product_id, rate_type, rateRaw, comparisonRateRaw, repayment_type, loan_purpose, lvrMinRaw, lvrMaxRaw, fixed_term] = parts;
  const rate_id = Number(rateIdRaw);
  const rate = Number(rateRaw);
  const comparison_rate = Number(comparisonRateRaw);
  const lvr_min = Number(lvrMinRaw);
  const lvr_max = Number(lvrMaxRaw);
  if (!product_id || !rate_type || !repayment_type || !loan_purpose) return null;
  if (!Number.isInteger(rate_id) || rate_id <= 0) return null;
  if (!Number.isFinite(rate) || !Number.isFinite(comparison_rate) || !Number.isFinite(lvr_min) || !Number.isFinite(lvr_max)) return null;
  return { rate_id, product_id, rate_type, rate, comparison_rate, repayment_type, loan_purpose, lvr_min, lvr_max, fixed_term };
}

export function serialiseCompareKeys(keys: string[]): string {
  return uniqueValidKeys(keys).map((key) => encodeURIComponent(key)).join(",");
}

export function parseCompareProductsParam(value: string | null | undefined): string[] {
  if (!value) return [];
  return uniqueValidKeys(value.split(",").map((item) => safeDecode(item)));
}

export function uniqueValidKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const key of keys) {
    if (!parseCompareKey(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}

function normaliseNumber(value: number): string {
  return value.toString();
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}
