import { describe, expect, test } from "bun:test";

import { simulateLoan } from "./simulation";
import type { SimulationInput } from "./simulation";

const baseInput: SimulationInput = {
  loanAmount: 600000,
  annualInterestRate: 6,
  termYears: 30,
  termMonths: 0,
  startDate: "2026-04-28",
  firstRepaymentDate: "2026-05-28",
  repaymentFrequency: "Monthly",
  repaymentType: "PrincipalAndInterest",
};

describe("simulateLoan", () => {
  test("generates dated Actual/365 interest and repayment rows", () => {
    const result = simulateLoan({ ...baseInput, maxRows: 2 });

    expect(result.rows[0]).toMatchObject({
      date: "2026-05-28",
      type: "interest",
      label: "Interest",
    });
    expect(result.rows[0].amount).toBeCloseTo(-2958.9, 2);
    expect(result.rows[0].interestAmount).toBeCloseTo(2958.9, 2);
    expect(result.rows[0].balance).toBeCloseTo(602958.9, 2);

    expect(result.rows[1]).toMatchObject({
      date: "2026-05-28",
      type: "scheduledRepayment",
      label: "Minimum repayment",
    });
    expect(result.rows[1].amount).toBeCloseTo(3597.3, 2);
    expect(result.rows[1].principalAmount).toBeCloseTo(638.4, 2);
    expect(result.rows[1].balance).toBeCloseTo(599361.6, 2);
    expect(result.summary.monthlyRepayment).toBeCloseTo(3597.3, 2);
  });

  test("runs until the loan is paid off with a zero final balance", () => {
    const result = simulateLoan({
      loanAmount: 120000,
      annualInterestRate: 0,
      termYears: 1,
      startDate: "2026-04-28",
      firstRepaymentDate: "2026-05-28",
      repaymentFrequency: "Monthly",
      repaymentType: "PrincipalAndInterest",
    });

    const repayments = result.rows.filter((row) => row.type === "scheduledRepayment");
    expect(repayments).toHaveLength(12);
    expect(repayments[0].amount).toBe(10000);
    expect(result.summary.paidOffDate).toBe("2027-04-28");
    expect(result.summary.finalBalance).toBe(0);
  });

  test("supports monthly, fortnightly, and weekly repayment frequencies", () => {
    const fortnightly = simulateLoan({
      loanAmount: 26000,
      annualInterestRate: 0,
      termYears: 1,
      startDate: "2026-04-28",
      firstRepaymentDate: "2026-05-12",
      repaymentFrequency: "Fortnightly",
      repaymentType: "PrincipalAndInterest",
    });
    const weekly = simulateLoan({
      loanAmount: 52000,
      annualInterestRate: 0,
      termYears: 1,
      startDate: "2026-04-28",
      firstRepaymentDate: "2026-05-05",
      repaymentFrequency: "Weekly",
      repaymentType: "PrincipalAndInterest",
    });

    expect(fortnightly.rows.filter((row) => row.type === "scheduledRepayment")).toHaveLength(26);
    expect(weekly.rows.filter((row) => row.type === "scheduledRepayment")).toHaveLength(52);
  });

  test("accepts NewLoan and ExistingLoan modes", () => {
    expect(simulateLoan({ ...baseInput, mode: "NewLoan", maxRows: 2 }).summary.openingBalance).toBe(600000);
    expect(simulateLoan({ ...baseInput, mode: "ExistingLoan", maxRows: 2 }).summary.openingBalance).toBe(600000);
  });

  test("uses interest-only scheduled repayments during the interest-only period", () => {
    const result = simulateLoan({
      ...baseInput,
      loanAmount: 300000,
      interestOnlyMonths: 12,
      maxRows: 2,
    });

    expect(result.rows[1]).toMatchObject({
      type: "scheduledRepayment",
      principalAmount: 0,
    });
    expect(result.rows[1].amount).toBeCloseTo(1479.45, 2);
    expect(result.rows[1].balance).toBe(300000);
  });

  test("recalculates repayments after an interest-only period to clear the loan", () => {
    const result = simulateLoan({
      loanAmount: 120000,
      annualInterestRate: 6,
      termYears: 2,
      startDate: "2026-04-28",
      firstRepaymentDate: "2026-05-28",
      repaymentFrequency: "Monthly",
      repaymentType: "PrincipalAndInterest",
      interestOnlyMonths: 12,
    });

    const repayments = result.rows.filter((row) => row.type === "scheduledRepayment");
    expect(repayments[0].amount).toBeCloseTo(591.78, 2);
    expect(repayments[0].balance).toBe(120000);
    expect(repayments[11].principalAmount).toBe(0);
    expect(repayments[12].amount).toBeGreaterThan(10000);
    expect(result.summary.finalBalance).toBe(0);
  });

  test("reduces interest with offset and can end immediately when fully offset", () => {
    const partialOffset = simulateLoan({
      ...baseInput,
      offset: { startingBalance: 50000, endWhenFullyOffset: false, drawRepaymentsFromOffset: false },
      maxRows: 1,
    });
    expect(partialOffset.rows[0].interestAmount).toBeCloseTo(2712.33, 2);

    const fullyOffset = simulateLoan({
      ...baseInput,
      loanAmount: 400000,
      offset: { startingBalance: 400000, endWhenFullyOffset: true, drawRepaymentsFromOffset: false },
    });
    expect(fullyOffset.rows).toHaveLength(0);
    expect(fullyOffset.summary.paidOffDate).toBe("2026-04-28");
    expect(fullyOffset.summary.totalInterest).toBe(0);
  });

  test("can draw scheduled repayments from offset balance", () => {
    const result = simulateLoan({
      loanAmount: 10000,
      annualInterestRate: 0,
      termYears: 0,
      termMonths: 1,
      startDate: "2026-04-28",
      firstRepaymentDate: "2026-05-28",
      repaymentFrequency: "Monthly",
      repaymentType: "PrincipalAndInterest",
      offset: { startingBalance: 15000, endWhenFullyOffset: false, drawRepaymentsFromOffset: true },
    });

    expect(result.summary.finalOffsetBalance).toBe(5000);
    expect(result.rows.find((row) => row.type === "scheduledRepayment")?.amount).toBe(10000);
  });

  test("applies extra repayments, lump sums, fees, and withdrawals on schedule dates", () => {
    const result = simulateLoan({
      loanAmount: 120000,
      annualInterestRate: 0,
      termYears: 1,
      startDate: "2026-04-28",
      firstRepaymentDate: "2026-05-28",
      repaymentFrequency: "Monthly",
      repaymentType: "PrincipalAndInterest",
      transactions: [
        { date: "2026-05-28", type: "extraRepayment", amount: 100, label: "Extra" },
        { date: "2026-05-28", type: "lumpSum", amount: 200, label: "Lump" },
        { date: "2026-05-28", type: "fee", amount: 10, label: "Fee" },
        { date: "2026-05-28", type: "withdrawal", amount: 20, label: "Withdrawal" },
      ],
      maxRows: 5,
    });

    expect(result.rows.map((row) => row.type)).toEqual(["extraRepayment", "lumpSum", "fee", "withdrawal", "scheduledRepayment"]);
    expect(result.rows.at(-1)?.balance).toBe(109730);
  });

  test("applies recurring extra repayments after scheduled repayments", () => {
    const result = simulateLoan({
      loanAmount: 12000,
      annualInterestRate: 0,
      termYears: 1,
      startDate: "2026-04-28",
      firstRepaymentDate: "2026-05-28",
      repaymentFrequency: "Monthly",
      repaymentType: "PrincipalAndInterest",
      extraRepayment: 100,
    });

    const firstExtra = result.rows.find((row) => row.type === "extraRepayment");
    expect(firstExtra).toMatchObject({ date: "2026-05-28", amount: 100, principalAmount: 100 });
    expect(result.summary.paidOffDate).toBe("2027-03-28");
  });

  test("applies rate change repayment behaviours", () => {
    const keep = simulateLoan({
      ...baseInput,
      rateChanges: [{ date: "2026-06-28", annualInterestRate: 7, behaviour: "KeepRepayment" }],
      maxRows: 4,
    });
    expect(keep.rows[3].amount).toBeCloseTo(3597.3, 2);

    const recalculate = simulateLoan({
      ...baseInput,
      rateChanges: [{ date: "2026-06-28", annualInterestRate: 3, behaviour: "RecalculateRepayment" }],
      maxRows: 4,
    });
    expect(recalculate.rows[3].amount).toBeLessThan(3597.3);

    const minimum = simulateLoan({
      ...baseInput,
      rateChanges: [{ date: "2026-06-28", annualInterestRate: 3, behaviour: "MinimumRepayment", minimumRepayment: 3500 }],
      maxRows: 4,
    });
    expect(minimum.rows[3].amount).toBe(3500);
  });

  test("supports split loan parts with partId rows and combined summary", () => {
    const result = simulateLoan({
      ...baseInput,
      loanParts: [
        { partId: "variable", loanAmount: 400000, annualInterestRate: 6 },
        { partId: "fixed", loanAmount: 200000, annualInterestRate: 5 },
      ],
      maxRows: 2,
    });

    expect(result.rows.map((row) => row.partId)).toEqual(["variable", "variable", "fixed", "fixed"]);
    expect(result.summary.openingBalance).toBe(600000);
    expect(result.summary.finalBalance).toBeCloseTo((result.partSummaries?.variable.finalBalance ?? 0) + (result.partSummaries?.fixed.finalBalance ?? 0), 2);
  });
});
