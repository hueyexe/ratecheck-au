import { describe, expect, test } from "bun:test";

import { scheduleRowsToCsv } from "./exportSchedule";
import type { ScheduleRow } from "./simulation";

describe("scheduleRowsToCsv", () => {
  test("exports visible schedule rows with stable columns", () => {
    const rows: ScheduleRow[] = [
      {
        index: 1,
        date: "2026-05-28",
        type: "interest",
        label: "Interest",
        amount: -2958.9,
        interestAmount: 2958.9,
        principalAmount: 0,
        balance: 602958.9,
        cumulativeInterest: 2958.9,
        cumulativePrincipal: 0,
        paidInAdvance: 0,
      },
    ];

    expect(scheduleRowsToCsv(rows)).toBe([
      "index,date,type,label,amount,interest_amount,principal_amount,balance,cumulative_interest,cumulative_principal,paid_in_advance",
      "1,2026-05-28,interest,Interest,-2958.9,2958.9,0,602958.9,2958.9,0,0",
    ].join("\n"));
  });

  test("escapes labels for CSV", () => {
    const rows: ScheduleRow[] = [
      {
        index: 1,
        date: "2026-05-28",
        type: "fee",
        label: "Package, fee",
        amount: -10,
        interestAmount: 0,
        principalAmount: 0,
        balance: 100010,
        cumulativeInterest: 0,
        cumulativePrincipal: 0,
        paidInAdvance: 0,
      },
    ];

    expect(scheduleRowsToCsv(rows)).toContain('"Package, fee"');
  });
});
