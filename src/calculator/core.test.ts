import { describe, expect, test } from "bun:test";

import {
  calculateAdvancedSummary,
  calculateDeposit,
  calculateLvr,
  calculateMonthlyRepayment,
  calculatePrincipalValue,
  calculateRepaymentPlan,
  calculateTotalInterest,
  calculateTotalRepayment,
} from "./core";

describe("calculator core helpers", () => {
  test("calculates the Figura baseline monthly repayment", () => {
    expect(
      calculateMonthlyRepayment({
        annualInterestRate: 6,
        loanAmount: 600000,
        termYears: 30,
        repaymentFrequency: "Monthly",
        repaymentType: "PrincipalAndInterest",
      }),
    ).toBeCloseTo(3597.3, 2);
  });

  test("calculates monthly repayment at zero interest", () => {
    expect(
      calculateMonthlyRepayment({
        annualInterestRate: 0,
        termYears: 30,
        loanAmount: 360000,
        repaymentFrequency: "Monthly",
      }),
    ).toBeCloseTo(1000, 2);
  });

  test("inverts monthly repayment into principal value", () => {
    const principal = calculatePrincipalValue({
      annualInterestRate: 5,
      termYears: 30,
      repayment: 1000,
      repaymentFrequency: "Monthly",
    });

    expect(
      calculateMonthlyRepayment({
        annualInterestRate: 5,
        termYears: 30,
        loanAmount: principal,
        repaymentFrequency: "Monthly",
      }),
    ).toBeCloseTo(1000, 2);
  });

  test("derives deposit and LVR", () => {
    expect(calculateDeposit({ propertyValue: 800000, loanAmount: 640000 })).toBe(160000);
    expect(calculateLvr({ propertyValue: 800000, loanAmount: 640000 })).toBeCloseTo(0.8, 4);
  });

  test("calculates total repayment and interest", () => {
    const repayment = calculateMonthlyRepayment({
      annualInterestRate: 6,
      termYears: 10,
      loanAmount: 500000,
      repaymentFrequency: "Monthly",
    });

    const totalRepayment = calculateTotalRepayment({
      annualInterestRate: 6,
      termYears: 10,
      loanAmount: 500000,
      repaymentFrequency: "Monthly",
    });

    expect(totalRepayment).toBeCloseTo(repayment * 120, 2);
    expect(calculateTotalInterest({
      annualInterestRate: 6,
      termYears: 10,
      loanAmount: 500000,
      repaymentFrequency: "Monthly",
    })).toBeCloseTo(totalRepayment - 500000, 2);
  });

  test("supports interest-only repayment mode", () => {
    expect(
      calculateMonthlyRepayment({
        annualInterestRate: 6,
        termYears: 30,
        loanAmount: 240000,
        repaymentFrequency: "Monthly",
        repaymentType: "InterestOnly",
      }),
    ).toBeCloseTo(1200, 2);
  });

  test("shows earlier payoff with regular extra repayments", () => {
    const base = calculateRepaymentPlan({
      annualInterestRate: 5,
      termYears: 30,
      loanAmount: 200000,
      repaymentFrequency: "Monthly",
      repaymentType: "PrincipalAndInterest",
    });

    const withExtra = calculateRepaymentPlan({
      annualInterestRate: 5,
      termYears: 30,
      loanAmount: 200000,
      repaymentFrequency: "Monthly",
      repaymentType: "PrincipalAndInterest",
      extraRepayment: 300,
    });

    expect(withExtra.payoffMonths).toBeLessThan(base.payoffMonths);
    expect(withExtra.totalInterest).toBeLessThan(base.totalInterest);
  });

  test("reduces first payment interest with offset balance", () => {
    const base = calculateRepaymentPlan({
      annualInterestRate: 6,
      termYears: 20,
      loanAmount: 300000,
      repaymentFrequency: "Monthly",
      repaymentType: "PrincipalAndInterest",
    });

    const withOffset = calculateRepaymentPlan({
      annualInterestRate: 6,
      termYears: 20,
      loanAmount: 300000,
      repaymentFrequency: "Monthly",
      repaymentType: "PrincipalAndInterest",
      offsetBalance: 50000,
    });

    expect(base.amortizationRows[0].interestAmount).toBeGreaterThan(withOffset.amortizationRows[0].interestAmount);
    expect(base.amortizationRows[0].interestAmount - withOffset.amortizationRows[0].interestAmount).toBeGreaterThan(200);
  });

  test("handles a one-off lump sum at a target month", () => {
    const withLump = calculateRepaymentPlan({
      annualInterestRate: 4.5,
      termYears: 25,
      loanAmount: 400000,
      repaymentFrequency: "Monthly",
      repaymentType: "PrincipalAndInterest",
      lumpSumAmount: 20000,
      lumpSumMonth: 6,
    });

    const withoutLump = calculateRepaymentPlan({
      annualInterestRate: 4.5,
      termYears: 25,
      loanAmount: 400000,
      repaymentFrequency: "Monthly",
      repaymentType: "PrincipalAndInterest",
    });

    expect(withLump.totalInterest).toBeLessThan(withoutLump.totalInterest);
    expect(withLump.payoffMonths).toBeLessThanOrEqual(withoutLump.payoffMonths);
  });

  test("keeps split-loan results aligned with aggregate inputs", () => {
    const aggregate = calculateAdvancedSummary({
      annualInterestRate: 5.2,
      loanAmount: 600000,
      propertyValue: 900000,
      repaymentFrequency: "Fortnightly",
      repaymentType: "PrincipalAndInterest",
      termYears: 25,
      splitLoan: {
        enabled: true,
        loanAmount: 200000,
        annualInterestRate: 4.5,
        termYears: 25,
        repaymentFrequency: "Fortnightly",
        repaymentType: "PrincipalAndInterest",
      },
    });

    const nonSplit = calculateAdvancedSummary({
      annualInterestRate: 5.2,
      loanAmount: 600000,
      propertyValue: 900000,
      repaymentFrequency: "Fortnightly",
      repaymentType: "PrincipalAndInterest",
      termYears: 25,
    });

    expect(aggregate.totalRepayments).toBeLessThan(nonSplit.totalRepayments);
    expect(aggregate.totalRepayments).toBeGreaterThan(0);
    expect(aggregate.monthlyEquivalentRepayment).toBeGreaterThan(0);
  });

  test("builds full summaries with scenario comparison", () => {
    const summary = calculateAdvancedSummary({
      annualInterestRate: 5.4,
      loanAmount: 450000,
      propertyValue: 700000,
      repaymentFrequency: "Weekly",
      repaymentType: "PrincipalAndInterest",
      termYears: 30,
      extraRepayment: 250,
      offsetBalance: 15000,
      lumpSumAmount: 10000,
      lumpSumMonth: 12,
    });

    expect(summary.payoffMonths).toBeLessThanOrEqual(360);
    expect(summary.totalInterest).toBeGreaterThan(0);
    expect(summary.scenarioComparison.totalInterestSaved).toBeGreaterThan(0);
    expect(summary.amortizationRows.length).toBeGreaterThan(0);
  });
});
