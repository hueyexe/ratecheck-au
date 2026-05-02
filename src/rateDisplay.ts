export function formatRate(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "Not listed";
  return `${(value * 100).toFixed(2)}%`;
}

export function formatRateMovement(change: number): string {
  const percentagePoints = Math.abs(change * 100);
  if (percentagePoints < 0.005) return "no change";
  return `${change > 0 ? "up" : "down"} ${percentagePoints.toFixed(2)} percentage points`;
}

export function formatLvr(min: number, max: number): string {
  if (min === 0 && max === 0) return "Not listed";
  if (min === 0) return `≤${Math.round(max * 100)}%`;
  return `${Math.round(min * 100)}-${Math.round(max * 100)}%`;
}

export function formatFixedTerm(iso: string): string {
  if (!iso) return "Not listed";
  const match = iso.match(/^P(\d+)([YM])$/);
  if (!match) return iso;
  const amount = Number(match[1]);
  if (match[2] === "Y") return `${amount}yr`;
  if (amount >= 12 && amount % 12 === 0) return `${amount / 12}yr`;
  return `${amount}mo`;
}

export function formatRepaymentType(value: string): string {
  if (value === "PRINCIPAL_AND_INTEREST") return "P&I";
  if (value === "INTEREST_ONLY") return "I/O";
  if (value === "UNCONSTRAINED") return "Any repayment";
  return value.replaceAll("_", " ").toLowerCase();
}

export function formatLoanPurpose(value: string): string {
  if (value === "OWNER_OCCUPIED") return "Owner";
  if (value === "INVESTMENT") return "Invest";
  if (value === "UNCONSTRAINED") return "Any use";
  return value.replaceAll("_", " ").toLowerCase();
}

export function formatRateType(value: string): string {
  return value.includes("FIXED") ? "Fixed" : "Variable";
}
