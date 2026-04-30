import { describe, expect, test } from "bun:test";

import { decodeCalculatorState, encodeCalculatorState } from "./shareState";

describe("calculator share state", () => {
  test("round-trips a calculator scenario through URL-safe text", () => {
    const state = {
      loanAmount: 600000,
      propertyValue: 800000,
      annualInterestRate: 6,
      termYears: 30,
      repaymentFrequency: "Monthly" as const,
      offsetBalance: 50000,
      activeTab: "Schedule" as const,
    };

    const encoded = encodeCalculatorState(state);

    expect(encoded).not.toContain("{");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("+");
    expect(decodeCalculatorState(encoded)).toEqual(state);
  });

  test("returns null for invalid share state", () => {
    expect(decodeCalculatorState("not-valid")).toBeNull();
  });

  test("returns null when a decoded payload fails validation", () => {
    const encoded = encodeCalculatorState({});

    const decoded = decodeCalculatorState(encoded, (value): value is { loanAmount: number } => {
      return typeof value === "object" && value !== null && "loanAmount" in value && typeof value.loanAmount === "number";
    });

    expect(decoded).toBeNull();
  });
});
