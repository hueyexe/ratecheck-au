import { describe, expect, test } from "bun:test";

import { classifyEverydayRate, isEverydayRate } from "./everydayRates";

const baseRate = {
  bank_name: "Gateway Bank",
  brand_group: "",
  product_name: "Low Rate Essentials",
  description: "",
  product_tags: "[]",
  audience_tags: "[]",
  eligibility_types: '["MIN_AGE","NATURAL_PERSON","RESIDENCY_STATUS"]',
  rate_notes: "",
  is_revert_rate: 0,
};

describe("classifyEverydayRate", () => {
  test("keeps a broad owner-occupied product everyday", () => {
    const profile = classifyEverydayRate(baseRate);

    expect(profile.isEveryday).toBe(true);
    expect(profile.reasons).toEqual([]);
  });

  test("hides audience-restricted products", () => {
    const profile = classifyEverydayRate({
      ...baseRate,
      bank_name: "Police Bank",
      audience_tags: '["police_and_defence"]',
    });

    expect(profile.isEveryday).toBe(false);
    expect(profile.isRestricted).toBe(true);
    expect(profile.reasons).toContain("restricted audience");
  });

  test("hides special-purpose green and first-home-buyer products", () => {
    expect(isEverydayRate({ ...baseRate, product_name: "Green Plus Home Loan", product_tags: '["green"]' })).toBe(false);
    expect(isEverydayRate({ ...baseRate, product_name: "First Home Loan", product_tags: '["first_home_buyer"]' })).toBe(false);
  });

  test("hides veterans products found by product name", () => {
    const profile = classifyEverydayRate({ ...baseRate, product_name: "Flexi First Option Home Loan - Veterans" });

    expect(profile.isEveryday).toBe(false);
    expect(profile.reasons).toContain("special purpose");
  });

  test("hides staff and team-member products found by product name", () => {
    const profile = classifyEverydayRate({ ...baseRate, product_name: "Team Member Home Loan - No Offset" });

    expect(profile.isEveryday).toBe(false);
    expect(profile.isRestricted).toBe(true);
    expect(profile.reasons).toContain("restricted audience");
  });

  test("hides revert rates and sub-floor rates", () => {
    const revert = classifyEverydayRate({ ...baseRate, is_revert_rate: 1 });
    const subFloor = classifyEverydayRate({ ...baseRate, rate: 0.032 });

    expect(revert.isEveryday).toBe(false);
    expect(revert.isSpecialScenario).toBe(true);
    expect(subFloor.isEveryday).toBe(false);
    expect(subFloor.isSpecialScenario).toBe(true);
    expect(isEverydayRate({ ...baseRate, rate: 0.032 })).toBe(false);
  });
});
