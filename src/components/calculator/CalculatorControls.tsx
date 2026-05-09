import { useId } from "react";

import type { RepaymentFrequency, RepaymentType } from "../../calculator/core";
import type { CalculatorState } from "../../calculator/state";

interface CalculatorControlsProps {
  state: CalculatorState;
  onChange: (patch: Partial<CalculatorState>) => void;
}

export default function CalculatorControls({ state, onChange }: CalculatorControlsProps) {
  const deposit = Math.max(0, state.propertyValue - state.loanAmount);

  return (
    <section className="rounded-[1.75rem] border border-sand-200 bg-sand-50 p-4 shadow-sm dark:border-sand-800 dark:bg-sand-900 md:p-5" aria-labelledby="calculator-controls-heading">
      <div>
        <h2 id="calculator-controls-heading" className="text-lg font-semibold text-sand-950 dark:text-sand-50">Loan details</h2>
        <p className="mt-1 text-sm text-sand-600 dark:text-sand-400">Start with the big numbers, then tune the what-if options.</p>
      </div>

      <div className="mt-5 grid gap-4">
        <NumberField label="Home value" help="Estimated purchase price or current property value." value={state.propertyValue} step={10000} prefix="$" onChange={(propertyValue) => onChange({ propertyValue, loanAmount: Math.min(state.loanAmount, propertyValue) })} />
        <NumberField label="Deposit" help="Home value minus loan amount." value={deposit} step={5000} prefix="$" onChange={(value) => onChange({ loanAmount: Math.max(0, state.propertyValue - value) })} />
        <NumberField label="Loan amount" help="How much you expect to borrow after your deposit." value={state.loanAmount} step={5000} prefix="$" onChange={(loanAmount) => onChange({ loanAmount: Math.min(state.propertyValue, loanAmount) })} />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Interest rate to test" help="Use the advertised rate for repayments, or the comparison rate when you want a broader cost estimate." value={state.annualInterestRate} step={0.05} suffix="%" onChange={(annualInterestRate) => onChange({ annualInterestRate })} />
          <NumberField label="Term" help="How long the loan is repaid over in this estimate." value={state.termYears} step={1} suffix="years" onChange={(termYears) => onChange({ termYears })} />
        </div>
        <Segmented label="Repayments" help="How often repayments are made." value={state.repaymentFrequency} options={["Weekly", "Fortnightly", "Monthly"]} onChange={(repaymentFrequency) => onChange({ repaymentFrequency: repaymentFrequency as RepaymentFrequency })} />
        <Segmented label="Loan type" help="Principal and interest repays the loan balance. Interest only pays interest for the selected period." value={state.repaymentType} options={["PrincipalAndInterest", "InterestOnly"]} optionLabels={{ PrincipalAndInterest: "Principal + interest", InterestOnly: "Interest only" }} onChange={(repaymentType) => onChange({ repaymentType: repaymentType as RepaymentType })} />
        {state.repaymentType === "InterestOnly" && <NumberField label="Interest-only period" help="How long the estimate pays interest only before principal repayments start." value={Math.round(state.interestOnlyMonths / 12)} step={1} suffix="years" onChange={(years) => onChange({ interestOnlyMonths: years * 12 })} />}
        <NumberField label="Money sitting in offset" help="This does not repay the loan. It reduces the balance used to calculate interest while the money stays there." value={state.offsetBalance} step={1000} prefix="$" onChange={(offsetBalance) => onChange({ offsetBalance })} />
        <NumberField label="Extra paid each repayment" help="Added on top of the scheduled weekly, fortnightly, or monthly repayment." value={state.extraRepayment} step={100} prefix="$" onChange={(extraRepayment) => onChange({ extraRepayment })} />
      </div>
    </section>
  );
}

function NumberField({ label, help, value, step, prefix, suffix, onChange }: { label: string; help?: string; value: number; step: number; prefix?: string; suffix?: string; onChange: (value: number) => void }) {
  const id = useId();
  const helpId = `${id}-help`;

  return (
    <div className="block">
      <label htmlFor={id} className="text-sm font-medium text-sand-700 dark:text-sand-300">{label}</label>
      {help && <p id={helpId} className="mt-1 text-xs leading-5 text-sand-500 dark:text-sand-400">{help}</p>}
      <span className="mt-1 flex min-h-[48px] items-center rounded-2xl border border-sand-200 bg-sand-100 px-3 focus-within:border-accent-500 focus-within:ring-2 focus-within:ring-accent-500/20 dark:border-sand-700 dark:bg-sand-950">
        {prefix && <span className="nums text-sm text-sand-500 dark:text-sand-400">{prefix}</span>}
        <input id={id} aria-describedby={help ? helpId : undefined} className="nums w-full bg-transparent px-2 py-3 text-base font-medium text-sand-950 outline-none dark:text-sand-50" type="number" min="0" step={step} value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Math.max(0, Number(event.target.value)))} />
        {suffix && <span className="text-sm text-sand-500 dark:text-sand-400">{suffix}</span>}
      </span>
    </div>
  );
}

function Segmented({ label, help, value, options, optionLabels, onChange }: { label: string; help?: string; value: string; options: string[]; optionLabels?: Record<string, string>; onChange: (value: string) => void }) {
  const id = useId();
  const helpId = `${id}-help`;

  return (
    <div>
      <p id={id} className="text-sm font-medium text-sand-700 dark:text-sand-300">{label}</p>
      {help && <p id={helpId} className="mt-1 text-xs leading-5 text-sand-500 dark:text-sand-400">{help}</p>}
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby={id} aria-describedby={help ? helpId : undefined}>
        {options.map((option) => {
          const active = option === value;
          return (
            <button key={option} type="button" aria-pressed={active} onClick={() => onChange(option)} className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${active ? "bg-accent-500 text-white" : "border border-sand-200 text-sand-700 hover:bg-sand-100 dark:border-sand-700 dark:text-sand-200 dark:hover:bg-sand-800"}`}>
              {optionLabels?.[option] ?? option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
