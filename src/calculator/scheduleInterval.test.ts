import { describe, expect, test } from "bun:test";

import { filterScheduleRowsByInterval } from "./scheduleInterval";
import type { ScheduleRow } from "./simulation";

const rows: ScheduleRow[] = [
  row(1, "2026-05-28", "interest", "Interest", -100, 0, 100, 100100),
  row(2, "2026-05-28", "scheduledRepayment", "Minimum repayment", 1000, 900, 0, 99100),
  row(3, "2026-06-28", "scheduledRepayment", "Minimum repayment", 1000, 1000, 0, 98100),
  row(4, "2027-05-28", "scheduledRepayment", "Minimum repayment", 1000, 1000, 0, 86100),
];

describe("filterScheduleRowsByInterval", () => {
  test("returns all rows for all transactions", () => {
    expect(filterScheduleRowsByInterval(rows, "AllTransactions")).toHaveLength(4);
  });

  test("returns last row per month for monthly view", () => {
    expect(filterScheduleRowsByInterval(rows, "Monthly").map((item) => item.index)).toEqual([2, 3, 4]);
  });

  test("aggregates monthly interest and principal into the visible summary row", () => {
    const [first] = filterScheduleRowsByInterval(rows, "Monthly");

    expect(first.amount).toBe(1000);
    expect(first.principalAmount).toBe(900);
    expect(first.interestAmount).toBe(100);
    expect(first.balance).toBe(99100);
  });

  test("returns last row per year for yearly view", () => {
    expect(filterScheduleRowsByInterval(rows, "Yearly").map((item) => item.index)).toEqual([3, 4]);
  });
});

function row(index: number, date: string, type: ScheduleRow["type"], label: string, amount: number, principalAmount: number, interestAmount: number, balance: number): ScheduleRow {
  return {
    index,
    date,
    type,
    label,
    amount,
    interestAmount,
    principalAmount,
    balance,
    cumulativeInterest: interestAmount,
    cumulativePrincipal: principalAmount,
    paidInAdvance: 0,
  };
}
