import type { ScheduleRow } from "./simulation";

const header = [
  "index",
  "date",
  "type",
  "label",
  "amount",
  "interest_amount",
  "principal_amount",
  "balance",
  "cumulative_interest",
  "cumulative_principal",
  "paid_in_advance",
];

export function scheduleRowsToCsv(rows: ScheduleRow[]): string {
  return [header, ...rows.map(rowToValues)].map((values) => values.map(csvEscape).join(",")).join("\n");
}

function rowToValues(row: ScheduleRow): Array<string | number> {
  return [
    row.index,
    row.date,
    row.type,
    row.label,
    row.amount,
    row.interestAmount,
    row.principalAmount,
    row.balance,
    row.cumulativeInterest,
    row.cumulativePrincipal,
    row.paidInAdvance,
  ];
}

function csvEscape(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
