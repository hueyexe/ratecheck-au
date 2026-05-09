import { formatCurrency, formatPercent } from "./format";
import type { RepaymentFrequency, RepaymentType } from "../../calculator/core";

interface CalculatorHeroProps {
  monthlyRepayment: number;
  repaymentFrequency?: RepaymentFrequency;
  repaymentType: RepaymentType;
  interestOnlyMonths: number;
  offsetBalance: number;
  extraRepayment: number;
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

function formatRepaymentType(value: RepaymentType, interestOnlyMonths: number): string {
  if (value !== "InterestOnly") return "principal and interest";
  if (interestOnlyMonths <= 0) return "interest only";

  const interestOnlyYears = interestOnlyMonths / 12;
  const period = Number.isInteger(interestOnlyYears) ? `${interestOnlyYears} ${interestOnlyYears === 1 ? "year" : "years"}` : `${interestOnlyMonths} months`;
  return `interest only for ${period}, then principal and interest`;
}

function assumptions(repaymentFrequency: RepaymentFrequency, repaymentType: RepaymentType, interestOnlyMonths: number, offsetBalance: number, extraRepayment: number): string[] {
  return [
    formatRepaymentType(repaymentType, interestOnlyMonths),
    `${repaymentFrequency.toLowerCase()} repayments`,
    offsetBalance > 0 ? "offset reduces interest" : "no offset balance",
    extraRepayment > 0 ? "extra repayments reduce principal" : "no extra repayment",
  ];
}

export default function CalculatorHero({ monthlyRepayment, repaymentFrequency = "Monthly", repaymentType, interestOnlyMonths, offsetBalance, extraRepayment, totalInterest, totalRepayments, paidOffDate, deposit, lvr }: CalculatorHeroProps) {
  const repaymentPeriod = repaymentPeriods[repaymentFrequency];
  const assumptionItems = assumptions(repaymentFrequency, repaymentType, interestOnlyMonths, offsetBalance, extraRepayment);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-accent-200 bg-accent-50 p-5 shadow-sm dark:border-accent-800 dark:bg-accent-950/30 md:p-7" aria-labelledby="calculator-answer">
      <div className="absolute right-4 top-4 h-20 w-20 rounded-full border border-accent-200/70 dark:border-accent-800/70" aria-hidden="true" />
      <p className="text-sm font-semibold text-accent-700 dark:text-accent-300">Estimated repayment</p>
      <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
        <h1 id="calculator-answer" className="nums text-4xl font-semibold tracking-tight text-sand-950 dark:text-sand-50 md:text-6xl">
          {formatCurrency(monthlyRepayment)}
        </h1>
        <span className="pb-2 text-sm font-medium text-sand-600 dark:text-sand-300">per {repaymentPeriod}</span>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-6 text-sand-700 dark:text-sand-300">A plain-English estimate based on the details below. Change the loan, rate or extras and the answer updates straight away.</p>

      <div className="mt-5 rounded-2xl bg-white/75 p-4 text-sm text-sand-700 dark:bg-sand-900/60 dark:text-sand-300">
        <p className="font-semibold text-sand-950 dark:text-sand-50">Assumptions used</p>
        <p className="mt-1 leading-6">{assumptionItems.join(", ")}.</p>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Total interest" value={formatCurrency(totalInterest)} description="Estimated interest paid over the loan." />
        <Metric label="Total repayments" value={formatCurrency(totalRepayments)} description="Principal, interest and regular extra repayments in this estimate." />
        <Metric label="Paid off" value={paidOffDate} description="Estimated final repayment date if assumptions stay the same." />
        <Metric label="Deposit" value={formatCurrency(deposit)} description="Home value minus loan amount." />
        <Metric label="LVR" value={formatPercent(lvr)} description="Loan amount divided by home value." />
      </dl>
    </section>
  );
}

function Metric({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-2xl bg-sand-50/80 p-3 dark:bg-sand-900/60">
      <dt className="text-xs font-medium text-sand-500 dark:text-sand-400">{label}</dt>
      <dd className="nums mt-1 text-base font-semibold text-sand-950 dark:text-sand-50">{value}</dd>
      <dd className="mt-1 text-[11px] leading-4 text-sand-500 dark:text-sand-400">{description}</dd>
    </div>
  );
}
