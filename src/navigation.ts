import { buildCompareKey, serialiseCompareKeys } from "./compareKeys";
import type { RateRow } from "./types";

export function bankPath(bankName: string): string {
  return `/bank/${encodeURIComponent(bankName)}`;
}

export function productPath(bankName: string, productId: string): string {
  return `/product/${encodeURIComponent(bankName)}/${encodeURIComponent(productId)}`;
}

export function ratesSearchPath(query: string): string {
  const params = new URLSearchParams();
  params.set("q", query);
  return `/rates?${params.toString()}`;
}

export function comparePathFromKeys(keys: string[]): string {
  const products = serialiseCompareKeys(keys);
  return products ? `/compare?products=${products}` : "/compare";
}

export function comparePathFromRows(rows: RateRow[]): string {
  return comparePathFromKeys(rows.map(buildCompareKey));
}
