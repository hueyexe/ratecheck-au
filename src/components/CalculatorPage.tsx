import { useEffect, useMemo, useReducer, useState } from "react";
import { buildBalanceSeries, buildEquitySeries } from "../calculator/chart";
import { scheduleRowsToCsv } from "../calculator/exportSchedule";
import { filterScheduleRowsByInterval } from "../calculator/scheduleInterval";
import { decodeCalculatorState, encodeCalculatorState } from "../calculator/shareState";
import { calculatorReducer, createDefaultCalculatorState, isCalculatorState } from "../calculator/state";
import { simulateLoan } from "../calculator/simulation";
import type { CalculatorState } from "../calculator/state";
import { useSEO } from "../hooks/useSEO";
import BalanceChart from "./calculator/BalanceChart";
import CalculatorActions from "./calculator/CalculatorActions";
import CalculatorControls from "./calculator/CalculatorControls";
import CalculatorHero from "./calculator/CalculatorHero";
import CalculatorTabs from "./calculator/CalculatorTabs";
import type { CalculatorTab } from "./calculator/CalculatorTabs";
import ScheduleView from "./calculator/ScheduleView";
import { formatCurrency, formatMonthYear, formatPercent } from "./calculator/format";

export default function CalculatorPage() {
  useSEO("Calculator", "Estimate home loan repayments, rate changes, offset effects and repayment schedules.");

  const [state, dispatch] = useReducer(calculatorReducer, undefined, createInitialState);
  const [activeTab, setActiveTab] = useState<CalculatorTab>("Overview");
  const [shareMessage, setShareMessage] = useState("");

  const result = useMemo(
    () =>
      simulateLoan({
        loanAmount: state.loanAmount,
        annualInterestRate: state.annualInterestRate,
        termYears: state.termYears,
        termMonths: state.termMonths,
        startDate: "2026-04-28",
        firstRepaymentDate: "2026-05-28",
        repaymentFrequency: state.repaymentFrequency,
        repaymentType: "PrincipalAndInterest",
        interestOnlyMonths: state.repaymentType === "InterestOnly" ? state.interestOnlyMonths : 0,
        extraRepayment: state.extraRepayment,
        offset: {
          startingBalance: state.offsetBalance,
          endWhenFullyOffset: false,
          drawRepaymentsFromOffset: false,
        },
      }),
    [state],
  );
  const balanceSeries = useMemo(() => buildBalanceSeries(result.rows), [result.rows]);
  const equitySeries = useMemo(
    () => buildEquitySeries(result.rows, { propertyValue: state.propertyValue, annualGrowthRate: state.propertyGrowthRate, startDate: "2026-04-28" }),
    [result.rows, state.propertyGrowthRate, state.propertyValue],
  );
  const visibleRows = useMemo(() => filterScheduleRowsByInterval(result.rows, state.scheduleInterval), [result.rows, state.scheduleInterval]);
  const deposit = Math.max(0, state.propertyValue - state.loanAmount);
  const lvr = state.propertyValue > 0 ? (state.loanAmount / state.propertyValue) * 100 : 0;

  useEffect(() => {
    if (!shareMessage) return;
    const timeout = window.setTimeout(() => setShareMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [shareMessage]);

  const updateState = (patch: Partial<CalculatorState>) => {
    dispatch({ type: "patch", patch });
  };

  const exportCsv = () => {
    const csv = scheduleRowsToCsv(result.rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ratecheck-calculator-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const shareScenario = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("calc", encodeCalculatorState(state));
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url.toString()).then(
        () => setShareMessage("Share link copied."),
        () => setShareMessage(url.toString()),
      );
      return;
    }
    setShareMessage(url.toString());
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-accent-700 dark:text-accent-300">Mortgage calculator</p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-sand-950 dark:text-sand-50 md:text-5xl">Work out the repayment before you compare rates.</h1>
        <p className="max-w-2xl text-base leading-7 text-sand-600 dark:text-sand-300">A quick home loan estimate for Australian buyers and refinancers. No rates database needed, just your scenario.</p>
      </div>

      <CalculatorActions onReset={() => dispatch({ type: "reset" })} onExport={exportCsv} onShare={shareScenario} shareMessage={shareMessage} />

      <div className="grid gap-5 lg:grid-cols-[minmax(320px,380px)_1fr] lg:items-start">
        <aside className="order-2 lg:order-1 lg:sticky lg:top-28">
          <CalculatorControls state={state} onChange={updateState} />
        </aside>

        <section className="order-1 space-y-5 lg:order-2">
          <CalculatorHero monthlyRepayment={result.summary.monthlyRepayment} repaymentFrequency={state.repaymentFrequency} totalInterest={result.summary.totalInterest} totalRepayments={result.summary.totalRepayments} paidOffDate={formatMonthYear(result.summary.paidOffDate)} deposit={deposit} lvr={lvr} />
          <CalculatorTabs activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === "Overview" && (
            <div className="space-y-5">
              <BalanceChart balanceSeries={balanceSeries} equitySeries={equitySeries} />
              <SummaryStrip propertyValue={state.propertyValue} loanAmount={state.loanAmount} annualInterestRate={state.annualInterestRate} propertyGrowthRate={state.propertyGrowthRate} lvr={lvr} />
            </div>
          )}

          {activeTab === "What-if" && <WhatIfPanel state={state} onChange={updateState} monthlyRepayment={result.summary.monthlyRepayment} />}

          {activeTab === "Schedule" && <ScheduleView rows={visibleRows} interval={state.scheduleInterval} onIntervalChange={(scheduleInterval) => updateState({ scheduleInterval })} />}
        </section>
      </div>
    </div>
  );
}

function createInitialState(): CalculatorState {
  if (typeof window === "undefined") return createDefaultCalculatorState();
  const encoded = new URLSearchParams(window.location.search).get("calc");
  return decodeCalculatorState<CalculatorState>(encoded ?? "", isCalculatorState) ?? createDefaultCalculatorState();
}

function SummaryStrip({ propertyValue, loanAmount, annualInterestRate, propertyGrowthRate, lvr }: { propertyValue: number; loanAmount: number; annualInterestRate: number; propertyGrowthRate: number; lvr: number }) {
  return (
    <dl className="grid gap-3 rounded-[1.75rem] border border-sand-200 bg-sand-50 p-4 dark:border-sand-800 dark:bg-sand-900 sm:grid-cols-5">
      <SummaryMetric label="Home value" value={formatCurrency(propertyValue)} />
      <SummaryMetric label="Loan" value={formatCurrency(loanAmount)} />
      <SummaryMetric label="Rate" value={formatPercent(annualInterestRate)} />
      <SummaryMetric label="Growth" value={formatPercent(propertyGrowthRate)} />
      <SummaryMetric label="LVR" value={formatPercent(lvr)} />
    </dl>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-sand-500 dark:text-sand-400">{label}</dt>
      <dd className="nums mt-1 text-lg font-semibold text-sand-950 dark:text-sand-50">{value}</dd>
    </div>
  );
}

function WhatIfPanel({ state, onChange, monthlyRepayment }: { state: CalculatorState; onChange: (patch: Partial<CalculatorState>) => void; monthlyRepayment: number }) {
  const extras = [0, 100, 250, 500];
  return (
    <section className="rounded-[1.75rem] border border-sand-200 bg-sand-50 p-5 shadow-sm dark:border-sand-800 dark:bg-sand-900" aria-labelledby="what-if-heading">
      <h2 id="what-if-heading" className="text-lg font-semibold text-sand-950 dark:text-sand-50">What if I pay a bit more?</h2>
      <p className="mt-1 text-sm leading-6 text-sand-600 dark:text-sand-400">Try a regular extra repayment and watch the main answer change. Even small amounts can trim interest over time.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {extras.map((extra) => (
          <button key={extra} type="button" onClick={() => onChange({ extraRepayment: extra })} className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition-colors ${state.extraRepayment === extra ? "bg-accent-500 text-white" : "border border-sand-200 text-sand-700 hover:bg-sand-100 dark:border-sand-700 dark:text-sand-200 dark:hover:bg-sand-800"}`}>
            <span className="nums">+{formatCurrency(extra)}</span>
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-accent-50 p-4 dark:bg-accent-950/30">
        <p className="text-sm font-medium text-sand-600 dark:text-sand-300">Estimated monthly repayment</p>
        <p className="nums mt-1 text-3xl font-semibold text-sand-950 dark:text-sand-50">{formatCurrency(monthlyRepayment)}</p>
      </div>
    </section>
  );
}
