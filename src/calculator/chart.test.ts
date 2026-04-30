import { describe, expect, test } from "bun:test";

import { buildBalanceSeries, buildEquitySeries } from "./chart";
import type { ScheduleRow } from "./simulation";

const rows: ScheduleRow[] = [
  row(1, "2026-01-01", 600000, "Interest"),
  row(2, "2027-01-01", 580000, "Minimum repayment"),
  row(3, "2028-01-01", 550000, "Minimum repayment"),
];

describe("calculator chart helpers", () => {
  test("builds balance series from schedule rows", () => {
    expect(buildBalanceSeries(rows)).toEqual([
      { date: "2026-01-01", value: 600000, label: "Interest" },
      { date: "2027-01-01", value: 580000, label: "Minimum repayment" },
      { date: "2028-01-01", value: 550000, label: "Minimum repayment" },
    ]);
  });

  test("builds equity series from property growth and balance", () => {
    expect(
      buildEquitySeries(rows, {
        propertyValue: 800000,
        annualGrowthRate: 5,
        startDate: "2026-01-01",
      }),
    ).toEqual([
      { date: "2026-01-01", value: 200000, label: "Equity" },
      { date: "2027-01-01", value: 260000, label: "Equity" },
      { date: "2028-01-01", value: 332000, label: "Equity" },
    ]);
  });
});

function row(index: number, date: string, balance: number, label: string): ScheduleRow {
  return {
    index,
    date,
    type: "scheduledRepayment",
    label,
    amount: 0,
    interestAmount: 0,
    principalAmount: 0,
    balance,
    cumulativeInterest: 0,
    cumulativePrincipal: 0,
    paidInAdvance: 0,
  };
}
