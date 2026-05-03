import { describe, expect, test } from "bun:test";

import { getProductDetailSections, mergeProductDetailSections } from "./productDetailData";

describe("product detail sidecar data", () => {
  test("extracts rich detail arrays from raw CDR sidecar files", () => {
    const sections = getProductDetailSections({
      key: "example-bank-p1",
      bankName: "Example Bank",
      productName: "Complete Loan",
      productId: "p1",
      detail: {
        features: [{ featureType: "REDRAW", additionalInfo: "Unlimited online redraw" }],
        eligibility: [{ eligibilityType: "MIN_AGE", additionalValue: "18" }],
        constraints: [{ constraintType: "MIN_LIMIT", additionalValue: "100000" }],
        fees: [{ name: "Service fee", fixedAmount: { amount: "10.00" } }],
        additionalInformationUris: [{ description: "Guide", additionalInfoUri: "https://bank.example/guide" }],
      },
    });

    expect(sections.featureDetails).toEqual([{ type: "REDRAW", info: "Unlimited online redraw" }]);
    expect(sections.eligibilityDetails).toEqual([{ type: "MIN_AGE", value: "18" }]);
    expect(sections.constraints).toEqual([{ constraintType: "MIN_LIMIT", additionalValue: "100000" }]);
    expect(sections.fees).toEqual([{ name: "Service fee", fixedAmount: { amount: "10.00" } }]);
    expect(sections.additionalInfoUris).toEqual([{ description: "Guide", additionalInfoUri: "https://bank.example/guide" }]);
  });

  test("returns empty arrays for malformed sidecar data", () => {
    const sections = getProductDetailSections({ detail: { features: [null, "bad"], fees: "bad" } });

    expect(sections.featureDetails).toEqual([]);
    expect(sections.eligibilityDetails).toEqual([]);
    expect(sections.constraints).toEqual([]);
    expect(sections.fees).toEqual([]);
    expect(sections.additionalInfoUris).toEqual([]);
  });

  test("prefers sidecar sections and falls back to browser DB sections", () => {
    const merged = mergeProductDetailSections(
      {
        featureDetails: [{ type: "REDRAW", info: "DB redraw" }],
        eligibilityDetails: [{ type: "MIN_AGE", value: "18" }],
        constraints: [],
        fees: [{ name: "DB fee" }],
        additionalInfoUris: [{ description: "DB guide", additionalInfoUri: "https://bank.example/db" }],
      },
      {
        featureDetails: [{ type: "OFFSET", info: "Sidecar offset" }],
        eligibilityDetails: [],
        constraints: [{ constraintType: "MIN_LIMIT", additionalValue: "100000" }],
        fees: [],
        additionalInfoUris: [],
      },
    );

    expect(merged.featureDetails).toEqual([{ type: "OFFSET", info: "Sidecar offset" }]);
    expect(merged.eligibilityDetails).toEqual([{ type: "MIN_AGE", value: "18" }]);
    expect(merged.constraints).toEqual([{ constraintType: "MIN_LIMIT", additionalValue: "100000" }]);
    expect(merged.fees).toEqual([{ name: "DB fee" }]);
    expect(merged.additionalInfoUris).toEqual([{ description: "DB guide", additionalInfoUri: "https://bank.example/db" }]);
  });
});
