import { describe, expect, test } from "bun:test";

import { calculatorReducer, createDefaultCalculatorState, isCalculatorState } from "./state";

describe("calculator UI state", () => {
  test("switches tabs without changing loan assumptions", () => {
    const state = createDefaultCalculatorState();
    const next = calculatorReducer(state, { type: "setTab", tab: "Schedule" });

    expect(next.activeTab).toBe("Schedule");
    expect(next.loanAmount).toBe(state.loanAmount);
    expect(next.propertyValue).toBe(state.propertyValue);
  });

  test("patches loan assumptions", () => {
    const state = createDefaultCalculatorState();
    const next = calculatorReducer(state, { type: "patch", patch: { loanAmount: 500000, offsetBalance: 20000 } });

    expect(next.loanAmount).toBe(500000);
    expect(next.offsetBalance).toBe(20000);
  });

  test("resets to defaults", () => {
    const state = calculatorReducer(createDefaultCalculatorState(), { type: "patch", patch: { loanAmount: 1 } });
    expect(calculatorReducer(state, { type: "reset" })).toEqual(createDefaultCalculatorState());
  });

  test("defaults interest-only mode to a bounded period and clears it when returning to principal and interest", () => {
    const interestOnly = calculatorReducer(createDefaultCalculatorState(), { type: "patch", patch: { repaymentType: "InterestOnly" } });
    expect(interestOnly.interestOnlyMonths).toBe(60);

    const principalAndInterest = calculatorReducer(interestOnly, { type: "patch", patch: { repaymentType: "PrincipalAndInterest" } });
    expect(principalAndInterest.interestOnlyMonths).toBe(0);
  });

  test("identifies complete calculator share state payloads", () => {
    expect(isCalculatorState(createDefaultCalculatorState())).toBe(true);
    expect(isCalculatorState({})).toBe(false);
    expect(isCalculatorState({ ...createDefaultCalculatorState(), loanAmount: "600000" })).toBe(false);
    expect(isCalculatorState({ ...createDefaultCalculatorState(), repaymentFrequency: "Quarterly" })).toBe(false);
  });
});
