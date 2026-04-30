import type { ProductHistoryFile, ProductHistoryPoint, ProductHistoryVariant } from "../types";

interface ProductHistoryChartProps {
  history: ProductHistoryFile;
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function variantLabel(variant: ProductHistoryVariant): string {
  const pieces = [
    variant.rateType.replaceAll("_", " ").toLowerCase(),
    variant.repaymentType === "PRINCIPAL_AND_INTEREST" ? "P&I" : variant.repaymentType.replaceAll("_", " ").toLowerCase(),
    variant.loanPurpose === "OWNER_OCCUPIED" ? "owner occupied" : variant.loanPurpose.replaceAll("_", " ").toLowerCase(),
  ];
  if (variant.lvrMax > 0) pieces.push(`up to ${(variant.lvrMax * 100).toFixed(0)}% LVR`);
  if (variant.fixedTerm) pieces.push(`${variant.fixedTerm} fixed`);
  return pieces.join(" - ");
}

function preferredVariant(variants: ProductHistoryVariant[]): ProductHistoryVariant | null {
  if (variants.length === 0) return null;
  return variants.find((variant) =>
    variant.rateType.includes("VARIABLE") &&
    variant.repaymentType === "PRINCIPAL_AND_INTEREST" &&
    variant.loanPurpose === "OWNER_OCCUPIED"
  ) ?? variants[0];
}

function chartPoints(points: ProductHistoryPoint[]): string {
  if (points.length === 0) return "";
  const width = 560;
  const height = 128;
  const rates = points.map((point) => point.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const span = Math.max(0.0001, max - min);
  return points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - ((point.rate - min) / span) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export default function ProductHistoryChart({ history }: ProductHistoryChartProps) {
  const variant = preferredVariant(history.variants);
  if (!variant || variant.points.length === 0) {
    return null;
  }

  const first = variant.points[0];
  const latest = variant.points[variant.points.length - 1];
  const change = latest.rate - first.rate;
  const changeBps = Math.round(change * 10000);

  return (
    <section className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-sm text-sand-900 dark:text-sand-100">Rate history</div>
          <p className="mt-1 text-xs text-sand-500 dark:text-sand-400">
            {formatDate(history.firstDate)} to {formatDate(history.lastDate)} - daily change points
          </p>
          <p className="mt-1 text-xs text-sand-400 dark:text-sand-500">{variantLabel(variant)}</p>
        </div>
        <div className="text-right">
          <div className="nums text-xl font-bold text-accent-600 dark:text-accent-400">{formatRate(latest.rate)}</div>
          <div className="nums text-xs text-sand-500 dark:text-sand-400">
            {changeBps === 0 ? "No change" : `${changeBps > 0 ? "+" : ""}${changeBps} bps`}
          </div>
        </div>
      </div>

      <svg className="mt-4 h-40 w-full overflow-visible" viewBox="0 0 560 144" role="img" aria-label="Product rate history">
        <line x1="0" y1="128" x2="560" y2="128" stroke="currentColor" className="text-sand-200 dark:text-sand-800" strokeWidth="1" />
        <polyline points={chartPoints(variant.points)} fill="none" stroke="currentColor" className="text-accent-500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {variant.points.map((point, index) => {
          const coords = chartPoints(variant.points).split(" ")[index]?.split(",") ?? ["0", "0"];
          return <circle key={`${point.date}-${point.rate}`} cx={coords[0]} cy={coords[1]} r="3.5" className="fill-accent-500" />;
        })}
      </svg>

      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-sand-500 dark:text-sand-400">
        <span className="nums">{formatRate(first.rate)}</span>
        <span className="nums">{formatRate(latest.rate)}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-sand-500 dark:text-sand-400">
        CDR publishes current product data; historical trends are built by RateCheck from repeated official CDR snapshots.
      </p>
    </section>
  );
}
