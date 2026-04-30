import type { ChartPoint } from "../../calculator/chart";
import { formatCurrency } from "./format";

interface BalanceChartProps {
  balanceSeries: ChartPoint[];
  equitySeries: ChartPoint[];
}

function buildPath(points: ChartPoint[], width: number, height: number, maxValue: number): string {
  if (points.length === 0) return "";
  const maxIndex = Math.max(points.length - 1, 1);
  return points
    .map((point, index) => {
      const x = (index / maxIndex) * width;
      const y = height - (point.value / maxValue) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function BalanceChart({ balanceSeries, equitySeries }: BalanceChartProps) {
  const width = 640;
  const height = 260;
  const maxValue = Math.max(1, ...balanceSeries.map((point) => point.value), ...equitySeries.map((point) => point.value));
  const balancePath = buildPath(balanceSeries, width, height, maxValue);
  const equityPath = buildPath(equitySeries, width, height, maxValue);
  const openingBalance = balanceSeries[0]?.value ?? 0;
  const finalEquity = equitySeries.at(-1)?.value ?? 0;

  return (
    <section className="rounded-[1.75rem] border border-sand-200 bg-sand-50 p-4 shadow-sm dark:border-sand-800 dark:bg-sand-900 md:p-6" aria-labelledby="balance-chart-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="balance-chart-heading" className="text-lg font-semibold text-sand-950 dark:text-sand-50">Balance and equity over time</h2>
          <p className="mt-1 text-sm text-sand-600 dark:text-sand-400">See the loan shrink while your ownership grows.</p>
        </div>
        <div className="flex gap-3 text-xs font-medium text-sand-600 dark:text-sand-300">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent-600" aria-hidden="true" />Loan balance</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sand-700 dark:bg-sand-200" aria-hidden="true" />Home equity</span>
        </div>
      </div>

      <svg className="mt-5 h-auto w-full overflow-visible" viewBox={`0 0 ${width} ${height + 34}`} role="img" aria-label="Balance and equity over time">
        <title>Balance and equity over time</title>
        <desc>Line chart comparing loan balance and home equity across the loan term.</desc>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <line key={tick} x1="0" x2={width} y1={height - height * tick} y2={height - height * tick} stroke="currentColor" className="text-sand-200 dark:text-sand-800" strokeWidth="1" />
        ))}
        <path d={equityPath} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-sand-700 dark:text-sand-200" />
        <path d={balancePath} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-accent-600 dark:text-accent-300" />
        <text x="0" y={height + 28} className="nums fill-sand-500 text-[13px] dark:fill-sand-400">{formatCurrency(openingBalance)}</text>
        <text x={width} y={height + 28} textAnchor="end" className="nums fill-sand-500 text-[13px] dark:fill-sand-400">{formatCurrency(finalEquity)} equity</text>
      </svg>
    </section>
  );
}
