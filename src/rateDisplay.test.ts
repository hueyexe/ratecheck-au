import { describe, expect, test } from "bun:test";

import { formatFixedTerm, formatLoanPurpose, formatLvr, formatRate, formatRateMovement, formatRateMovementShort, formatRepaymentType, formatUpdatedAt } from "./rateDisplay";

describe("rate display helpers", () => {
  test("formats rate movement in plain percentage-point copy", () => {
    expect(formatRateMovement(0.0012)).toBe("up 0.12 percentage points");
    expect(formatRateMovement(-0.0005)).toBe("down 0.05 percentage points");
    expect(formatRateMovement(0)).toBe("no change");
    expect(formatRateMovementShort(0.0012)).toBe("up 0.12 pts");
  });

  test("formats common rate table values", () => {
    expect(formatRate(0.0564)).toBe("5.64%");
    expect(formatLvr(0, 0.8)).toBe("≤80%");
    expect(formatFixedTerm("P2Y")).toBe("2yr");
    expect(formatRepaymentType("PRINCIPAL_AND_INTEREST")).toBe("P&I");
    expect(formatLoanPurpose("OWNER_OCCUPIED")).toBe("Owner");
  });

  test("formats update timestamps for compare columns", () => {
    expect(formatUpdatedAt("2025-06-04T00:00:00.000+10:00")).toBe("4 Jun 2025");
    expect(formatUpdatedAt("2026-02-16T22:43:55.588729Z")).toBe("17 Feb 2026, 9:43 am AEDT");
    expect(formatUpdatedAt(null)).toBe("Not listed");
  });
});
