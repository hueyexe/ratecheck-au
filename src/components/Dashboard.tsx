import type { DashboardStats, RateDistributionBucket, BestRateByBank } from "../types";

interface DashboardProps {
  stats: DashboardStats | null;
  distribution: RateDistributionBucket[];
  bestRates: BestRateByBank[];
}

function formatRate(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function RateBar({ label, count, max, tone }: { label: string; count: number; max: number; tone: "variable" | "fixed" }) {
  const width = max > 0 ? Math.max(6, (count / max) * 100) : 0;
  const bg = tone === "variable" ? "bg-accent-500" : "bg-accent-300";
  return (
    <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 py-0.5">
      <div className="text-[11px] text-sand-500 dark:text-sand-400 nums">{label}</div>
      <div className="h-2 rounded-full bg-sand-100 dark:bg-sand-800 overflow-hidden">
        <div className={`h-full rounded-full ${bg} transition-all duration-500`} style={{ width: `${width}%` }} />
      </div>
      <div className="text-right text-[11px] text-sand-600 dark:text-sand-300 nums">{count}</div>
    </div>
  );
}

function BankBar({ name, rate, max, rank }: { name: string; rate: number; max: number; rank: number }) {
  const minRate = 0.04;
  const width = max > minRate ? Math.max(8, ((max - rate) / (max - minRate)) * 100) : 8;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-3 py-0.5">
      <div className="flex items-center gap-2 min-w-0">
        {rank <= 3 && (
          <span className="shrink-0 w-4 h-4 rounded-full bg-accent-100 dark:bg-accent-900 text-accent-700 dark:text-accent-300 text-[9px] font-bold flex items-center justify-center">
            {rank}
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate text-[11px] text-sand-700 dark:text-sand-300">{name}</div>
          <div className="h-1.5 rounded-full bg-sand-100 dark:bg-sand-800 overflow-hidden mt-1">
            <div className="h-full rounded-full bg-accent-500 transition-all duration-500" style={{ width: `${width}%` }} />
          </div>
        </div>
      </div>
      <div className="text-right text-[11px] font-medium text-sand-800 dark:text-sand-200 nums">{formatRate(rate)}</div>
    </div>
  );
}

export default function Dashboard({ stats, distribution, bestRates }: DashboardProps) {
  if (!stats) return null;

  const maxDistribution = distribution.reduce((max, b) => Math.max(max, b.variable, b.fixed), 0);
  const maxBestRate = bestRates.reduce((max, b) => Math.max(max, b.rate), 0);

  return (
    <div className="space-y-5">
      {/* Hero stat + supporting stats */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
        {/* Hero: lowest variable */}
        <div className="rounded-2xl bg-accent-500 text-white p-5 md:p-6 flex flex-col justify-between min-h-[120px]">
          <div className="text-sm font-medium opacity-80">Today's lowest variable rate</div>
          <div className="mt-2">
            <div className="text-5xl md:text-6xl font-bold nums tracking-tight leading-none">
              {formatRate(stats.lowestVariable)}
            </div>
            <div className="text-sm opacity-70 mt-2">from {stats.bankCount} lenders</div>
          </div>
        </div>

        {/* Supporting stats */}
        <div className="grid grid-cols-3 md:grid-cols-1 gap-3 md:gap-3">
          <div className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 flex flex-col justify-between">
            <div className="text-[11px] uppercase tracking-[0.1em] text-sand-500 dark:text-sand-400">Lowest Fixed</div>
            <div className="text-xl font-bold nums text-sky-600 dark:text-sky-400 mt-1">{formatRate(stats.lowestFixed)}</div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 flex flex-col justify-between">
            <div className="text-[11px] uppercase tracking-[0.1em] text-sand-500 dark:text-sand-400">Market Avg</div>
            <div className="text-xl font-bold nums text-sand-700 dark:text-sand-300 mt-1">{formatRate(stats.avgRate)}</div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 flex flex-col justify-between">
            <div className="text-[11px] uppercase tracking-[0.1em] text-sand-500 dark:text-sand-400">Products</div>
            <div className="text-xl font-bold nums text-sand-700 dark:text-sand-300 mt-1">{stats.rateCount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 md:p-5">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h3 className="text-sm font-semibold text-sand-800 dark:text-sand-200">Rate distribution</h3>
            <div className="flex items-center gap-3 text-[10px] text-sand-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-500 inline-block" />Variable</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-300 inline-block" />Fixed</span>
            </div>
          </div>
          <div className="space-y-0.5">
            {distribution.slice(0, 14).map((bucket) => (
              <div key={bucket.bucket} className="grid grid-cols-2 gap-2">
                <RateBar label={bucket.bucket} count={bucket.variable} max={maxDistribution} tone="variable" />
                <RateBar label="" count={bucket.fixed} max={maxDistribution} tone="fixed" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 md:p-5">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h3 className="text-sm font-semibold text-sand-800 dark:text-sand-200">Best rates by bank</h3>
            <div className="text-[10px] text-sand-400">lower is better</div>
          </div>
          <div className="space-y-1">
            {bestRates.slice(0, 10).map((bank, i) => (
              <BankBar key={bank.bank_name} name={bank.bank_name} rate={bank.rate} max={maxBestRate} rank={i + 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
