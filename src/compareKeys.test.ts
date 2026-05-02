import { describe, expect, test } from "bun:test";

import { buildCompareKey, parseCompareProductsParam, serialiseCompareKeys } from "./compareKeys";
import type { RateRow } from "./types";

const row: RateRow = {
  rate_id: 123,
  bank_name: "Example Bank",
  brand_group: "Example Group",
  product_name: "Basic Home Loan",
  product_id: "product/123",
  description: "Simple variable loan",
  rate_type: "VARIABLE",
  rate: 0.0564,
  comparison_rate: 0.0572,
  repayment_type: "PRINCIPAL_AND_INTEREST",
  loan_purpose: "OWNER_OCCUPIED",
  lvr_min: 0,
  lvr_max: 0.8,
  fixed_term: "",
  is_tailored: 0,
  last_updated: "2026-04-30T00:00:00Z",
};

describe("compare keys", () => {
  test("round-trips a stable row key through the products query value", () => {
    const key = buildCompareKey(row);
    const value = serialiseCompareKeys([key]);

    expect(value).toContain("product%2F123");
    expect(parseCompareProductsParam(value)).toEqual([key]);
  });

  test("drops malformed and duplicate keys while preserving first-seen order", () => {
    const key = buildCompareKey(row);
    const value = `${encodeURIComponent(key)}%2Cbad%2Ckey,${encodeURIComponent(key)}`;

    expect(parseCompareProductsParam(value)).toEqual([key]);
  });
});
