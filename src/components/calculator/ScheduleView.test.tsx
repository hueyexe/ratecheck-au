import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import ScheduleView from "./ScheduleView";
import type { ScheduleRow } from "../../calculator/simulation";

const rows: ScheduleRow[] = [
  row(1, "2026-05-30", "interest", "Interest", -2000, 598800, 2000, 0),
  row(2, "2026-05-30", "scheduledRepayment", "Minimum repayment", 3200, 595600, 0, 3200),
];

describe("ScheduleView", () => {
  test("renders desktop table and mobile-friendly schedule cards", () => {
    const html = renderToStaticMarkup(<ScheduleView rows={rows} interval="Monthly" />);

    expect(html).toContain("Repayment schedule");
    expect(html).toContain("<table");
    expect(html).toContain("Payment 1");
    expect(html).toContain("Balance");
    expect(html).toContain("$598,800");
  });
});

function row(index: number, date: string, type: ScheduleRow["type"], label: string, amount: number, balance: number, interestAmount: number, principalAmount: number): ScheduleRow {
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
