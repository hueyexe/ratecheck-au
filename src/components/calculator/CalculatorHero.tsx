import { formatCurrency, formatPercent } from "./format";
import type { RepaymentFrequency } from "../../calculator/core";

interface CalculatorHeroProps {
  monthlyRepayment: number;
  repaymentFrequency?: RepaymentFrequency;
  totalInterest: number;
  totalRepayments: number;
  paidOffDate: string;
  deposit: number;
  lvr: number;
}

const repaymentPeriods: Record<RepaymentFrequency, string> = {
  Monthly: "month",
  Fortnightly: "fortnight",
  Weekly: "week",
};

export default function CalculatorHero({ monthlyRepayment, repaymentFrequency = "Monthly", totalInterest, totalRepayments, paidOffDate, deposit, lvr }: CalculatorHeroProps) {
  const repaymentPeriod = repaymentPeriods[repaymentFrequency];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-accent-200 bg-accent-50 p-5 shadow-sm dark:border-accent-800 dark:bg-accent-950/30 md:p-7" aria-labelledby="calculator-answer">
      <div className="absolute right-4 top-4 h-20 w-20 rounded-full border border-accent-200/70 dark:border-accent-800/70" aria-hidden="true" />
      <p className="text-sm font-semibold text-accent-700 dark:text-accent-300">Your repayment</p>
      <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
        <h1 id="calculator-answer" className="nums text-4xl font-semibold tracking-tight text-sand-950 dark:text-sand-50 md:text-6xl">
          {formatCurrency(monthlyRepayment)}
        </h1>
        <span className="pb-2 text-sm font-medium text-sand-600 dark:text-sand-300">per {repaymentPeriod}</span>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-6 text-sand-700 dark:text-sand-300">A plain-English estimate based on the details below. Change the loan, rate or extras and the answer updates straight away.</p>

      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Total interest" value={formatCurrency(totalInterest)} />
        <Metric label="Total repayments" value={formatCurrency(totalRepayments)} />
        <Metric label="Paid off" value={paidOffDate} />
        <Metric label="Deposit" value={formatCurrency(deposit)} />
        <Metric label="LVR" value={formatPercent(lvr)} />
      </dl>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-sand-50/80 p-3 dark:bg-sand-900/60">
      <dt className="text-xs font-medium text-sand-500 dark:text-sand-400">{label}</dt>
      <dd className="nums mt-1 text-base font-semibold text-sand-950 dark:text-sand-50">{value}</dd>
    </div>
  );
}
