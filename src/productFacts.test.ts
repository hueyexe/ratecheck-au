import { describe, expect, test } from "bun:test";

import { getProductFactRows, locationSpecificRatesCopy, productFactStatus } from "./productFacts";

describe("productFacts", () => {
  test("reports listed and not-listed statuses for common loan features", () => {
    const facts = getProductFactRows({
      product_tags: '["offset","redraw"]',
      feature_types: '["OFFSET","REDRAW"]',
      audience_tags: "[]",
      eligibility_types: "[]",
    });

    expect(facts.find((fact) => fact.key === "offset")?.status).toBe("Listed");
    expect(facts.find((fact) => fact.key === "redraw")?.status).toBe("Listed");
    expect(facts.find((fact) => fact.key === "extra_repayments")?.status).toBe("Not listed");
  });

  test("reports extra repayments as listed from product tags or feature types", () => {
    const productTagFacts = getProductFactRows({
      product_tags: '["extra_repayments"]',
      feature_types: "[]",
      audience_tags: "[]",
      eligibility_types: "[]",
    });
    const featureTypeFacts = getProductFactRows({
      product_tags: "[]",
      feature_types: '["EXTRA_REPAYMENTS"]',
      audience_tags: "[]",
      eligibility_types: "[]",
    });

    expect(productTagFacts.find((fact) => fact.key === "extra_repayments")?.status).toBe("Listed");
    expect(featureTypeFacts.find((fact) => fact.key === "extra_repayments")?.status).toBe("Listed");
  });

  test("reports offset and redraw as not listed when tags and feature types are missing", () => {
    const facts = getProductFactRows({
      product_tags: "[]",
      feature_types: "[]",
      audience_tags: "[]",
      eligibility_types: "[]",
    });

    expect(facts.find((fact) => fact.key === "offset")?.status).toBe("Not listed");
    expect(facts.find((fact) => fact.key === "redraw")?.status).toBe("Not listed");
  });

  test("detects first-home buyer products from product tags", () => {
    const facts = getProductFactRows({
      product_tags: '["first_home_buyer"]',
      feature_types: "[]",
      audience_tags: "[]",
      eligibility_types: "[]",
    });

    expect(facts.find((fact) => fact.key === "first_home_buyer")?.status).toBe("Listed");
    expect(facts.find((fact) => fact.key === "first_home_buyer")?.label).toBe("First-home buyer");
  });

  test("uses not-listed rather than no for missing CDR feature data", () => {
    expect(productFactStatus(false)).toBe("Not listed");
    expect(productFactStatus(true)).toBe("Listed");
  });

  test("defines the location limitation without implying coverage", () => {
    expect(locationSpecificRatesCopy).toContain("does not currently have reliable state, rural, regional, or metro fields");
    expect(locationSpecificRatesCopy).toContain("Confirm location eligibility with the lender");
  });
});
