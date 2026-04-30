import type { ScheduleInterval } from "../../calculator/scheduleInterval";
import type { ScheduleRow } from "../../calculator/simulation";
import { formatCurrency, formatSignedCurrency } from "./format";

interface ScheduleViewProps {
  rows: ScheduleRow[];
  interval: ScheduleInterval;
  onIntervalChange?: (interval: ScheduleInterval) => void;
}

const intervals: { value: ScheduleInterval; label: string }[] = [
  { value: "Monthly", label: "Monthly" },
  { value: "Yearly", label: "Yearly" },
  { value: "AllTransactions", label: "All" },
];

export default function ScheduleView({ rows, interval, onIntervalChange }: ScheduleViewProps) {
  return (
    <section className="rounded-[1.75rem] border border-sand-200 bg-sand-50 p-4 shadow-sm dark:border-sand-800 dark:bg-sand-900 md:p-6" aria-labelledby="schedule-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="schedule-heading" className="text-lg font-semibold text-sand-950 dark:text-sand-50">Repayment schedule</h2>
          <p className="mt-1 text-sm text-sand-600 dark:text-sand-400">A clear look at principal, interest and the balance left.</p>
        </div>
        {onIntervalChange && (
          <div className="flex flex-wrap gap-2" aria-label="Schedule interval">
            {intervals.map((item) => (
              <button key={item.value} type="button" onClick={() => onIntervalChange(item.value)} className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors ${interval === item.value ? "bg-accent-500 text-white" : "border border-sand-200 text-sand-700 hover:bg-sand-100 dark:border-sand-700 dark:text-sand-200 dark:hover:bg-sand-800"}`}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-sand-200 text-xs uppercase tracking-wide text-sand-500 dark:border-sand-800 dark:text-sand-400">
            <tr>
              <th className="py-3 pr-4 font-semibold">Payment</th>
              <th className="py-3 pr-4 font-semibold">Date</th>
              <th className="py-3 pr-4 font-semibold">Type</th>
              <th className="py-3 pr-4 text-right font-semibold">Amount</th>
              <th className="py-3 pr-4 text-right font-semibold">Principal</th>
              <th className="py-3 pr-4 text-right font-semibold">Interest</th>
              <th className="py-3 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100 dark:divide-sand-800">
            {rows.slice(0, 240).map((row) => <ScheduleTableRow key={`${row.index}-${row.date}-${row.type}`} row={row} />)}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 md:hidden">
        {rows.slice(0, 60).map((row) => <ScheduleCard key={`${row.index}-${row.date}-${row.type}`} row={row} />)}
      </div>
    </section>
  );
}

function ScheduleTableRow({ row }: { row: ScheduleRow }) {
  return (
    <tr>
      <td className="py-3 pr-4 font-medium text-sand-900 dark:text-sand-100" aria-label={`Payment ${row.index}`}>Payment <span className="nums">{row.index}</span></td>
      <td className="py-3 pr-4 text-sand-600 dark:text-sand-300">{formatDate(row.date)}</td>
      <td className="py-3 pr-4 text-sand-600 dark:text-sand-300">{row.label}</td>
      <NumberCell value={row.amount} signed />
      <NumberCell value={row.principalAmount} />
      <NumberCell value={row.interestAmount} />
      <NumberCell value={row.balance} last />
    </tr>
  );
}

function NumberCell({ value, signed = false, last = false }: { value: number; signed?: boolean; last?: boolean }) {
  return <td className={`nums py-3 text-right text-sand-900 dark:text-sand-100 ${last ? "" : "pr-4"}`}>{signed ? formatSignedCurrency(value) : formatCurrency(value)}</td>;
}

function ScheduleCard({ row }: { row: ScheduleRow }) {
  return (
    <article className="rounded-2xl border border-sand-200 bg-sand-100 p-4 dark:border-sand-800 dark:bg-sand-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sand-950 dark:text-sand-50" aria-label={`Payment ${row.index}`}>Payment <span className="nums">{row.index}</span></h3>
          <p className="mt-1 text-sm text-sand-600 dark:text-sand-400">{formatDate(row.date)}</p>
          <p className="mt-1 text-sm font-medium text-sand-700 dark:text-sand-200">{row.label}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-sand-500 dark:text-sand-400">Balance</p>
          <p className="nums font-semibold text-sand-950 dark:text-sand-50">{formatCurrency(row.balance)}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <ScheduleMetric label="Amount" value={row.amount} signed />
        <ScheduleMetric label="Principal" value={row.principalAmount} />
        <ScheduleMetric label="Interest" value={row.interestAmount} />
      </dl>
    </article>
  );
}

function ScheduleMetric({ label, value, signed = false }: { label: string; value: number; signed?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-sand-500 dark:text-sand-400">{label}</dt>
      <dd className="nums mt-1 font-semibold text-sand-900 dark:text-sand-100">{signed ? formatSignedCurrency(value) : formatCurrency(value)}</dd>
    </div>
  );
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}
