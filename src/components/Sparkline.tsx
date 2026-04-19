import type { RateTrendPoint } from "../types";

interface SparklineProps {
  data: RateTrendPoint[];
  width?: number;
  height?: number;
}

export default function Sparkline({ data, width = 60, height = 20 }: SparklineProps) {
  if (data.length < 2) {
    return <span className="text-[10px] text-gray-300">--</span>;
  }

  const first = data[0].rate;
  const last = data[data.length - 1].rate;
  const trend = last < first ? "down" : last > first ? "up" : "stable";
  const color = trend === "down" ? "#10b981" : trend === "up" ? "#f43f5e" : "#6b7280";
  const changeBps = Math.round((last - first) * 10000);

  const minRate = Math.min(...data.map((d) => d.rate));
  const maxRate = Math.max(...data.map((d) => d.rate));
  const range = maxRate - minRate || 0.01;
  const points = data
    .map((d, i) => {
      const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
      const y = height - (((d.rate - minRate) / range) * height * 0.78 + height * 0.1);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex items-center gap-1" title={`${trend === "down" ? "Down" : trend === "up" ? "Up" : "Flat"} ${Math.abs(changeBps)} bps over history`}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="shrink-0">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
      <span className={`text-[9px] font-medium ${trend === "down" ? "text-emerald-500" : trend === "up" ? "text-rose-500" : "text-gray-400"}`} aria-hidden="true">
        {trend === "down" ? "↓" : trend === "up" ? "↑" : "•"}
      </span>
    </div>
  );
}
