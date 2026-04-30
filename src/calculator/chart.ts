import type { ScheduleRow } from "./simulation";

export type ChartPoint = {
  date: string;
  value: number;
  label: string;
};

export function buildBalanceSeries(rows: ScheduleRow[]): ChartPoint[] {
  return rows.map((row) => ({
    date: row.date,
    value: row.balance,
    label: row.label,
  }));
}

export function buildEquitySeries(
  rows: ScheduleRow[],
  options: { propertyValue: number; annualGrowthRate: number; startDate: string },
): ChartPoint[] {
  const start = parseDate(options.startDate);

  return rows.map((row) => {
    const years = yearsBetween(start, parseDate(row.date));
    const propertyValue = options.propertyValue * (1 + options.annualGrowthRate / 100) ** years;
    return {
      date: row.date,
      value: Math.round(propertyValue - row.balance),
      label: "Equity",
    };
  });
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function yearsBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (365 * 86_400_000);
}
