import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useTheme } from "../theme";
import type { DashboardStats, RateDistributionBucket, BestRateByBank } from "../types";

interface DashboardProps {
  stats: DashboardStats | null;
  distribution: RateDistributionBucket[];
  bestRates: BestRateByBank[];
}

const STAT_CARDS = [
  { key: "lowestVariable" as const, label: "Lowest Variable", color: "border-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" },
  { key: "lowestFixed" as const, label: "Lowest Fixed", color: "border-blue-500", textColor: "text-blue-600 dark:text-blue-400" },
  { key: "avgRate" as const, label: "Average Rate", color: "border-violet-500", textColor: "text-violet-600 dark:text-violet-400" },
  { key: "bankCount" as const, label: "Total Banks", color: "border-indigo-500", textColor: "text-indigo-600 dark:text-indigo-400" },
] as const;

function formatRate(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

export default function Dashboard({ stats, distribution, bestRates }: DashboardProps) {
  const { resolved } = useTheme();
  const dark = resolved === "dark";
  const gridColor = dark ? "#374151" : "#e5e7eb";
  const textColor = dark ? "#9ca3af" : "#6b7280";

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className={`rounded-2xl bg-white dark:bg-gray-900 border-t-4 ${card.color} p-4 md:p-6 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200`}
          >
            <div className="text-sm text-gray-500 dark:text-gray-400">{card.label}</div>
            <div className={`text-2xl md:text-3xl font-bold font-mono mt-1 ${card.textColor}`}>
              {card.key === "bankCount" ? stats[card.key] : formatRate(stats[card.key])}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rate Distribution */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-4 md:p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Rate Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distribution} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: textColor }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: textColor }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: dark ? "#1f2937" : "#fff",
                  border: `1px solid ${dark ? "#374151" : "#e5e7eb"}`,
                  borderRadius: "0.75rem",
                  color: dark ? "#f3f4f6" : "#111827",
                  fontSize: 13,
                }}
              />
              <Bar dataKey="variable" name="Variable" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fixed" name="Fixed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Best Rates by Bank */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-4 md:p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Best Rates by Bank</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bestRates} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: textColor }}
                tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                domain={["dataMin - 0.002", "dataMax + 0.002"]}
              />
              <YAxis
                type="category"
                dataKey="bank_name"
                tick={{ fontSize: 11, fill: textColor }}
                width={120}
                tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 20) + "..." : v}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: dark ? "#1f2937" : "#fff",
                  border: `1px solid ${dark ? "#374151" : "#e5e7eb"}`,
                  borderRadius: "0.75rem",
                  color: dark ? "#f3f4f6" : "#111827",
                  fontSize: 13,
                }}
                formatter={(value) => [formatRate(Number(value)), "Rate"]}
              />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {bestRates.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? "#6366f1" : "#8b5cf6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
