import type { ScheduleRow } from "./simulation";

export type ScheduleInterval = "AllTransactions" | "Monthly" | "Yearly";

export function filterScheduleRowsByInterval(rows: ScheduleRow[], interval: ScheduleInterval): ScheduleRow[] {
  if (interval === "AllTransactions") {
    return rows;
  }

  const rowsByPeriod = new Map<string, ScheduleRow[]>();
  for (const row of rows) {
    const key = interval === "Yearly" ? row.date.slice(0, 4) : row.date.slice(0, 7);
    rowsByPeriod.set(key, [...(rowsByPeriod.get(key) ?? []), row]);
  }

  return Array.from(rowsByPeriod.values())
    .map((periodRows) => {
      const last = periodRows.at(-1)!;
      return {
        ...last,
        label: interval === "Yearly" ? "Yearly summary" : "Monthly summary",
        amount: roundCents(periodRows.reduce((total, row) => total + Math.max(0, row.amount), 0)),
        principalAmount: roundCents(periodRows.reduce((total, row) => total + row.principalAmount, 0)),
        interestAmount: roundCents(periodRows.reduce((total, row) => total + row.interestAmount, 0)),
      };
    })
    .sort((left, right) => left.index - right.index);
}

function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
