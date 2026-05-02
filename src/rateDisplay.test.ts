import { describe, expect, test } from "bun:test";

import { formatFixedTerm, formatLoanPurpose, formatLvr, formatRate, formatRateMovement, formatRepaymentType } from "./rateDisplay";

describe("rate display helpers", () => {
  test("formats rate movement in plain percentage-point copy", () => {
    expect(formatRateMovement(0.0012)).toBe("up 0.12 percentage points");
    expect(formatRateMovement(-0.0005)).toBe("down 0.05 percentage points");
    expect(formatRateMovement(0)).toBe("no change");
  });

  test("formats common rate table values", () => {
    expect(formatRate(0.0564)).toBe("5.64%");
    expect(formatLvr(0, 0.8)).toBe("≤80%");
    expect(formatFixedTerm("P2Y")).toBe("2yr");
    expect(formatRepaymentType("PRINCIPAL_AND_INTEREST")).toBe("P&I");
    expect(formatLoanPurpose("OWNER_OCCUPIED")).toBe("Owner");
  });
});
