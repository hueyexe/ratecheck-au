export function formatCurrency(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits,
  }).format(Math.max(0, value));
}

export function formatSignedCurrency(value: number): string {
  const formatted = formatCurrency(Math.abs(value));
  if (value < 0) return `-${formatted}`;
  if (value > 0) return `+${formatted}`;
  return formatted;
}

export function formatPercent(value: number, maximumFractionDigits = 2): string {
  return `${new Intl.NumberFormat("en-AU", { maximumFractionDigits }).format(Math.max(0, value))}%`;
}

export function formatMonthYear(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}
