import type { RepaymentFrequency, RepaymentType } from "./core";
import type { ScheduleInterval } from "./scheduleInterval";

export type CalculatorTab = "Overview" | "WhatIf" | "Schedule";

export type CalculatorState = {
  activeTab: CalculatorTab;
  propertyValue: number;
  loanAmount: number;
  annualInterestRate: number;
  termYears: number;
  termMonths: number;
  repaymentFrequency: RepaymentFrequency;
  repaymentType: RepaymentType;
  interestOnlyMonths: number;
  offsetBalance: number;
  extraRepayment: number;
  propertyGrowthRate: number;
  scheduleInterval: ScheduleInterval;
};

export type CalculatorAction =
  | { type: "setTab"; tab: CalculatorTab }
  | { type: "patch"; patch: Partial<CalculatorState> }
  | { type: "reset" };

export function createDefaultCalculatorState(): CalculatorState {
  return {
    activeTab: "Overview",
    propertyValue: 800000,
    loanAmount: 600000,
    annualInterestRate: 6,
    termYears: 30,
    termMonths: 0,
    repaymentFrequency: "Monthly",
    repaymentType: "PrincipalAndInterest",
    interestOnlyMonths: 0,
    offsetBalance: 0,
    extraRepayment: 0,
    propertyGrowthRate: 3,
    scheduleInterval: "Monthly",
  };
}

export function isCalculatorState(value: unknown): value is CalculatorState {
  if (typeof value !== "object" || value === null) return false;

  const state = value as Record<string, unknown>;
  const numericFields = ["propertyValue", "loanAmount", "annualInterestRate", "termYears", "termMonths", "interestOnlyMonths", "offsetBalance", "extraRepayment", "propertyGrowthRate"];

  return (
    isOneOf(state.activeTab, ["Overview", "WhatIf", "Schedule"]) &&
    numericFields.every((field) => typeof state[field] === "number" && Number.isFinite(state[field])) &&
    isOneOf(state.repaymentFrequency, ["Monthly", "Fortnightly", "Weekly"]) &&
    isOneOf(state.repaymentType, ["PrincipalAndInterest", "InterestOnly"]) &&
    isOneOf(state.scheduleInterval, ["AllTransactions", "Monthly", "Yearly"])
  );
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  if (action.type === "setTab") {
    return { ...state, activeTab: action.tab };
  }
  if (action.type === "patch") {
    const next = { ...state, ...action.patch };
    if (action.patch.repaymentType === "InterestOnly" && !action.patch.interestOnlyMonths && next.interestOnlyMonths === 0) {
      return { ...next, interestOnlyMonths: Math.min(next.termYears * 12 + next.termMonths, 60) };
    }
    if (action.patch.repaymentType === "PrincipalAndInterest") {
      return { ...next, interestOnlyMonths: 0 };
    }
    return next;
  }
  return createDefaultCalculatorState();
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}
