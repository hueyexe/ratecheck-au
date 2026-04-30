export type RepaymentFrequency = "Monthly" | "Fortnightly" | "Weekly";
export type RepaymentType = "PrincipalAndInterest" | "InterestOnly";

export type CalculatorInput = {
  annualInterestRate: number;
  loanAmount: number;
  termYears: number;
  termMonths?: number;
  repaymentFrequency: RepaymentFrequency;
  repaymentType?: RepaymentType;
  extraRepayment?: number;
  lumpSumAmount?: number;
  lumpSumMonth?: number;
  offsetBalance?: number;
  upfrontFees?: number;
  splitLoan?: SplitLoanInput;
};

export type PrincipalInput = {
  annualInterestRate: number;
  repayment: number;
  termYears: number;
  termMonths?: number;
  repaymentFrequency: RepaymentFrequency;
};

export interface SplitLoanInput {
  enabled: boolean;
  loanAmount: number;
  annualInterestRate: number;
  termYears: number;
  termMonths?: number;
  repaymentFrequency?: RepaymentFrequency;
  repaymentType?: RepaymentType;
  extraRepayment?: number;
  lumpSumAmount?: number;
  lumpSumMonth?: number;
  offsetBalance?: number;
}

type NormalizedLoanInput = {
  annualInterestRate: number;
  loanAmount: number;
  termYears: number;
  termMonths: number;
  repaymentFrequency: RepaymentFrequency;
  repaymentType: RepaymentType;
  extraRepayment: number;
  lumpSumAmount: number;
  lumpSumMonth: number;
  offsetBalance: number;
  upfrontFees: number;
};

export type LoanRepaymentRow = {
  period: number;
  scheduledPayment: number;
  extraRepayment: number;
  lumpSumRepayment: number;
  totalPayment: number;
  interestAmount: number;
  principalAmount: number;
  endingBalance: number;
  cumulativeInterest: number;
  cumulativePayment: number;
};

export type LoanRepaymentPlan = {
  termMonths: number;
  scheduledTermMonths: number;
  scheduledPeriodicRepayment: number;
  scheduledPeriodicTerm: number;
  payoffMonths: number;
  payoffPeriods: number;
  totalPrincipal: number;
  totalExtraRepayment: number;
  totalLumpSumRepayment: number;
  totalInterest: number;
  totalRepayments: number;
  totalFees: number;
  amortizationRows: LoanRepaymentRow[];
};

export interface ScenarioComparison {
  totalInterestSaved: number;
  totalRepaymentsSaved: number;
  totalMonthsSaved: number;
}

export interface CalculatorSummary {
  loanAmount: number;
  propertyValue: number;
  annualInterestRate: number;
  repaymentFrequency: RepaymentFrequency;
  repaymentType: RepaymentType;
  termYears: number;
  termMonths: number;
  scheduledPeriodicRepayment: number;
  monthlyEquivalentRepayment: number;
  periodicRepayment: number;
  lvr: number;
  deposit: number;
  totalInterest: number;
  totalRepayments: number;
  totalFees: number;
  payoffMonths: number;
  payoffPeriods: number;
  scheduledTermMonths: number;
  totalPrincipal: number;
  extraRepayment: number;
  lumpSumAmount: number;
  lumpSumMonth: number;
  offsetBalance: number;
  amortizationRows: LoanRepaymentRow[];
  scenarioComparison: ScenarioComparison;
}

const paymentFrequencyPerYear: Record<RepaymentFrequency, number> = {
  Monthly: 12,
  Fortnightly: 26,
  Weekly: 52,
};

const roundCents = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const normalizeNumber = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
};

const normalizeRepaymentType = (value: RepaymentType | undefined): RepaymentType => {
  return value === "InterestOnly" ? "InterestOnly" : "PrincipalAndInterest";
};

const normalizeFrequency = (value: RepaymentFrequency | undefined): RepaymentFrequency => {
  if (value === "Fortnightly" || value === "Weekly") {
    return value;
  }
  return "Monthly";
};

const normalizeTermMonths = (years: number, months = 0): number => {
  const normalizedYears = Math.max(0, Math.floor(normalizeNumber(years)));
  const normalizedMonths = Math.max(0, Math.floor(normalizeNumber(months)));
  return Math.max(0, normalizedYears * 12 + normalizedMonths);
};

const toMonths = (periodCount: number, frequency: RepaymentFrequency): number => {
  const perYear = paymentFrequencyPerYear[frequency] ?? paymentFrequencyPerYear.Monthly;
  return (periodCount / perYear) * 12;
};

const periodsForLoan = (termYears: number, termMonths: number, frequency: RepaymentFrequency): number => {
  const totalMonths = normalizeTermMonths(termYears, termMonths);
  const perYear = paymentFrequencyPerYear[frequency] ?? paymentFrequencyPerYear.Monthly;
  return (totalMonths / 12) * perYear;
};

const periodRate = (annualInterestRate: number, frequency: RepaymentFrequency): number => {
  const normalizedRate = normalizeNumber(annualInterestRate);
  const perYear = paymentFrequencyPerYear[frequency] ?? paymentFrequencyPerYear.Monthly;
  return normalizedRate / 100 / perYear;
};

const monthlyFactor = (frequency: RepaymentFrequency): number => {
  const perYear = paymentFrequencyPerYear[frequency] ?? paymentFrequencyPerYear.Monthly;
  return perYear / 12;
};

const normalizeLoanInput = (input: CalculatorInput): NormalizedLoanInput => {
  return {
    annualInterestRate: normalizeNumber(input.annualInterestRate),
    loanAmount: normalizeNumber(input.loanAmount),
    termYears: Math.max(0, Math.floor(normalizeNumber(input.termYears))),
    termMonths: Math.floor(normalizeNumber(input.termMonths ?? 0)),
    repaymentFrequency: normalizeFrequency(input.repaymentFrequency),
    repaymentType: normalizeRepaymentType(input.repaymentType),
    extraRepayment: normalizeNumber(input.extraRepayment ?? 0),
    lumpSumAmount: normalizeNumber(input.lumpSumAmount ?? 0),
    lumpSumMonth: Math.max(0, Math.floor(normalizeNumber(input.lumpSumMonth ?? 0))),
    offsetBalance: normalizeNumber(input.offsetBalance ?? 0),
    upfrontFees: normalizeNumber(input.upfrontFees ?? 0),
  };
};

const normalizeSplitInput = (main: NormalizedLoanInput, split: SplitLoanInput | undefined): NormalizedLoanInput => {
  if (!split?.enabled) {
    return {
      ...main,
      loanAmount: 0,
    };
  }

  return {
    annualInterestRate: normalizeNumber(split.annualInterestRate),
    loanAmount: normalizeNumber(split.loanAmount),
    termYears: Math.max(0, Math.floor(normalizeNumber(split.termYears))),
    termMonths: Math.floor(normalizeNumber(split.termMonths ?? 0)),
    repaymentFrequency: normalizeFrequency(split.repaymentFrequency ?? main.repaymentFrequency),
    repaymentType: normalizeRepaymentType(split.repaymentType ?? main.repaymentType),
    extraRepayment: normalizeNumber(split.extraRepayment ?? 0),
    lumpSumAmount: normalizeNumber(split.lumpSumAmount ?? 0),
    lumpSumMonth: Math.max(0, Math.floor(normalizeNumber(split.lumpSumMonth ?? 0))),
    offsetBalance: normalizeNumber(split.offsetBalance ?? 0),
    upfrontFees: 0,
  };
};

function calculateScheduledPayment(input: NormalizedLoanInput): number {
  const termMonths = normalizeTermMonths(input.termYears, input.termMonths);
  const paymentPeriods = periodsForLoan(input.termYears, input.termMonths, input.repaymentFrequency);

  if (termMonths === 0 || input.loanAmount === 0 || paymentPeriods <= 0) {
    return 0;
  }

  if (input.repaymentType === "InterestOnly") {
    return roundCents(input.loanAmount * periodRate(input.annualInterestRate, input.repaymentFrequency));
  }

  const rate = periodRate(input.annualInterestRate, input.repaymentFrequency);
  if (rate === 0) {
    return roundCents(input.loanAmount / paymentPeriods);
  }

  const growth = (1 + rate) ** paymentPeriods;
  const annuity = (rate * growth) / (growth - 1);
  return roundCents(input.loanAmount * annuity);
}

export function calculateMonthlyRepayment(input: Omit<CalculatorInput, "repaymentType"> & { repaymentType?: RepaymentType }): number {
  const normalized = normalizeLoanInput(input);
  return calculateScheduledPayment(normalized);
}

export function calculatePrincipalValue(input: PrincipalInput): number {
  const termMonths = normalizeTermMonths(input.termYears, input.termMonths);
  if (input.repayment === 0 || termMonths === 0) {
    return 0;
  }

  const termPeriods = periodsForLoan(input.termYears, input.termMonths ?? 0, input.repaymentFrequency);
  if (termPeriods <= 0) {
    return 0;
  }

  const normalizedRate = normalizeNumber(input.annualInterestRate) / 100;
  const rate = normalizedRate / paymentFrequencyPerYear[input.repaymentFrequency];

  if (rate === 0) {
    return roundCents(input.repayment * termPeriods);
  }

  const growth = (1 + rate) ** termPeriods;
  return roundCents(input.repayment * ((growth - 1) / (rate * growth)));
}

function runRepaymentSchedule(input: NormalizedLoanInput): LoanRepaymentPlan {
  const scheduledPeriodicRepayment = calculateScheduledPayment(input);
  const scheduledTermMonths = normalizeTermMonths(input.termYears, input.termMonths);
  const scheduledTermPeriods = periodsForLoan(input.termYears, input.termMonths, input.repaymentFrequency);
  const rate = periodRate(input.annualInterestRate, input.repaymentFrequency);

  if (input.loanAmount === 0 || scheduledTermMonths === 0 || scheduledTermPeriods <= 0) {
    return {
      termMonths: input.termYears * 12 + input.termMonths,
      scheduledTermMonths,
      scheduledPeriodicRepayment,
      scheduledPeriodicTerm: scheduledTermPeriods,
      payoffMonths: 0,
      payoffPeriods: 0,
      totalPrincipal: 0,
      totalExtraRepayment: 0,
      totalLumpSumRepayment: 0,
      totalInterest: 0,
      totalRepayments: input.upfrontFees,
      totalFees: input.upfrontFees,
      amortizationRows: [],
    };
  }

  const rows: LoanRepaymentRow[] = [];
  let balance = roundCents(input.loanAmount);
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;
  let cumulativePayment = 0;
  let cumulativeExtra = 0;
  let cumulativeLump = 0;
  const amortizationLimit = Math.max(1, Math.ceil(scheduledTermPeriods));
  const lumpMonth = Math.max(0, input.lumpSumMonth);
  let finalPayoffPeriod = 0;

  for (let period = 1; period <= amortizationLimit; period += 1) {
    const interestBase = Math.max(0, balance - input.offsetBalance);
    const rawInterest = interestBase * rate;
    const interestAmount = roundCents(rawInterest);

    const maxSchedPayment = input.repaymentType === "InterestOnly"
      ? interestAmount
      : Math.min(scheduledPeriodicRepayment, interestAmount + balance);

    const principalScheduled = Math.max(0, roundCents(maxSchedPayment - interestAmount));
    const lumpSumRepayment = period === lumpMonth ? Math.min(input.lumpSumAmount, Math.max(0, balance - principalScheduled)) : 0;
    const extraRepayment = Math.min(input.extraRepayment, Math.max(0, balance - principalScheduled - lumpSumRepayment));
    const principalThisPeriod = principalScheduled + lumpSumRepayment + extraRepayment;

    const totalPayment = roundCents(interestAmount + principalThisPeriod);
    const principalPaid = Math.min(balance, principalThisPeriod);

    balance = roundCents(Math.max(0, balance - principalPaid));

    cumulativeInterest += interestAmount;
    cumulativePrincipal += principalPaid;
    cumulativePayment += totalPayment;
    cumulativeExtra += extraRepayment;
    cumulativeLump += lumpSumRepayment;

    rows.push({
      period,
      scheduledPayment: maxSchedPayment,
      extraRepayment,
      lumpSumRepayment,
      totalPayment,
      interestAmount,
      principalAmount: principalPaid,
      endingBalance: balance,
      cumulativeInterest: roundCents(cumulativeInterest),
      cumulativePayment: roundCents(cumulativePayment),
    });

    if (balance <= 0) {
      finalPayoffPeriod = period;
      break;
    }
  }

  const totalRepayments = roundCents(cumulativePayment + input.upfrontFees);
  const payoffPeriods = finalPayoffPeriod > 0 ? finalPayoffPeriod : amortizationLimit;
  const payoffMonths = roundCents(toMonths(payoffPeriods, input.repaymentFrequency));

  return {
    termMonths: normalizeTermMonths(input.termYears, input.termMonths),
    scheduledTermMonths,
    scheduledPeriodicRepayment,
    scheduledPeriodicTerm: scheduledTermPeriods,
    payoffMonths,
    payoffPeriods,
    totalPrincipal: roundCents(cumulativePrincipal),
    totalExtraRepayment: roundCents(cumulativeExtra),
    totalLumpSumRepayment: roundCents(cumulativeLump),
    totalInterest: roundCents(cumulativeInterest),
    totalRepayments,
    totalFees: input.upfrontFees,
    amortizationRows: rows,
  };
}

function combinePlanRows(primaryRows: LoanRepaymentRow[], splitRows: LoanRepaymentRow[], periodCap = 120): LoanRepaymentRow[] {
  const rowCount = Math.min(periodCap, Math.max(primaryRows.length, splitRows.length));
  const result: LoanRepaymentRow[] = [];
  for (let period = 1; period <= rowCount; period += 1) {
    const primary = primaryRows.find((row) => row.period === period);
    const split = splitRows.find((row) => row.period === period);
    const principalAmount = roundCents((primary?.principalAmount ?? 0) + (split?.principalAmount ?? 0));
    const extraRepayment = roundCents((primary?.extraRepayment ?? 0) + (split?.extraRepayment ?? 0));
    const lumpSumRepayment = roundCents((primary?.lumpSumRepayment ?? 0) + (split?.lumpSumRepayment ?? 0));
    const interestAmount = roundCents((primary?.interestAmount ?? 0) + (split?.interestAmount ?? 0));
    const totalPayment = roundCents(interestAmount + principalAmount);

    result.push({
      period,
      scheduledPayment: roundCents((primary?.scheduledPayment ?? 0) + (split?.scheduledPayment ?? 0)),
      extraRepayment,
      lumpSumRepayment,
      totalPayment,
      interestAmount,
      principalAmount,
      endingBalance: roundCents((primary?.endingBalance ?? 0) + (split?.endingBalance ?? 0)),
      cumulativeInterest: roundCents((primary?.cumulativeInterest ?? 0) + (split?.cumulativeInterest ?? 0)),
      cumulativePayment: roundCents((primary?.cumulativePayment ?? 0) + (split?.cumulativePayment ?? 0)),
    });
  }
  return result;
}

export function calculateRepaymentPlan(input: CalculatorInput): LoanRepaymentPlan {
  const normalized = normalizeLoanInput(input);
  const split = normalizeSplitInput(normalized, input.splitLoan);
  const primaryLoanAmount = Math.max(0, normalized.loanAmount - (split.loanAmount || 0));

  if (!split.loanAmount) {
    return runRepaymentSchedule(normalized);
  }

  const primary = runRepaymentSchedule({
    ...normalized,
    loanAmount: primaryLoanAmount,
  });

  if (primaryLoanAmount === 0) {
    return runRepaymentSchedule(split);
  }

  const splitPlan = runRepaymentSchedule({
    ...split,
    upfrontFees: 0,
  });

  const combinedRows = combinePlanRows(primary.amortizationRows, splitPlan.amortizationRows, 180);

  return {
    termMonths: normalized.termYears * 12 + normalized.termMonths,
    scheduledTermMonths: Math.max(primary.scheduledTermMonths, splitPlan.scheduledTermMonths),
    scheduledPeriodicRepayment: roundCents(primary.scheduledPeriodicRepayment + splitPlan.scheduledPeriodicRepayment),
    scheduledPeriodicTerm: primary.scheduledPeriodicTerm + splitPlan.scheduledPeriodicTerm,
    payoffPeriods: Math.max(primary.payoffPeriods, splitPlan.payoffPeriods),
    payoffMonths: Math.max(primary.payoffMonths, splitPlan.payoffMonths),
    totalPrincipal: roundCents(primary.totalPrincipal + splitPlan.totalPrincipal),
    totalExtraRepayment: roundCents(primary.totalExtraRepayment + splitPlan.totalExtraRepayment),
    totalLumpSumRepayment: roundCents(primary.totalLumpSumRepayment + splitPlan.totalLumpSumRepayment),
    totalInterest: roundCents(primary.totalInterest + splitPlan.totalInterest),
    totalRepayments: roundCents(primary.totalRepayments + splitPlan.totalRepayments),
    totalFees: roundCents(primary.totalFees + splitPlan.totalFees),
    amortizationRows: combinedRows,
  };
}

export function calculateTotalRepayment(input: CalculatorInput): number {
  const normalized = normalizeLoanInput(input);
  const hasExtras =
    normalized.extraRepayment > 0 ||
    normalized.lumpSumAmount > 0 ||
    normalized.lumpSumMonth > 0 ||
    normalized.offsetBalance > 0 ||
    normalized.upfrontFees > 0;
  const hasSplit = Boolean(input.splitLoan?.enabled && input.splitLoan.loanAmount > 0);
  const isInterestOnly = normalized.repaymentType === "InterestOnly";

  if (!hasExtras && !hasSplit && !isInterestOnly) {
    const paymentPeriods = periodsForLoan(normalized.termYears, normalized.termMonths, normalized.repaymentFrequency);
    const scheduledPayment = calculateScheduledPayment(normalized);
    return roundCents(scheduledPayment * paymentPeriods);
  }

  return calculateRepaymentPlan(input).totalRepayments;
}

export function calculateTotalInterest(input: CalculatorInput): number {
  const normalized = normalizeLoanInput(input);
  const hasExtras =
    normalized.extraRepayment > 0 ||
    normalized.lumpSumAmount > 0 ||
    normalized.lumpSumMonth > 0 ||
    normalized.offsetBalance > 0 ||
    normalized.upfrontFees > 0;
  const hasSplit = Boolean(input.splitLoan?.enabled && input.splitLoan.loanAmount > 0);
  const isInterestOnly = normalized.repaymentType === "InterestOnly";

  if (!hasExtras && !hasSplit && !isInterestOnly) {
    return calculateTotalRepayment(input) - normalized.loanAmount;
  }

  return calculateRepaymentPlan(input).totalInterest;
}

export function calculateLvr(input: { propertyValue: number; loanAmount: number }): number {
  const propertyValue = normalizeNumber(input.propertyValue);
  const loanAmount = normalizeNumber(input.loanAmount);
  if (propertyValue === 0) {
    return 0;
  }
  return loanAmount / propertyValue;
}

export function calculateDeposit(input: { propertyValue: number; loanAmount: number }): number {
  const propertyValue = normalizeNumber(input.propertyValue);
  const loanAmount = normalizeNumber(input.loanAmount);
  return roundCents(Math.max(0, propertyValue - loanAmount));
}

export function calculateSummary(input: CalculatorInput & { propertyValue: number }): CalculatorSummary {
  const normalized = normalizeLoanInput(input);
  const plan = calculateRepaymentPlan(input);
  const baselinePlan = calculateRepaymentPlan({
    ...input,
    extraRepayment: 0,
    lumpSumAmount: 0,
    lumpSumMonth: 0,
    offsetBalance: 0,
  });
  const scenarioComparison: ScenarioComparison = {
    totalInterestSaved: roundCents(Math.max(0, baselinePlan.totalInterest - plan.totalInterest)),
    totalRepaymentsSaved: roundCents(Math.max(0, baselinePlan.totalRepayments - plan.totalRepayments)),
    totalMonthsSaved: Math.max(0, baselinePlan.payoffMonths - plan.payoffMonths),
  };
  const periodicRepayment = calculateMonthlyRepayment(input);
  const loanAmount = normalizeNumber(input.loanAmount);

  return {
    loanAmount,
    propertyValue: normalizeNumber(input.propertyValue),
    annualInterestRate: normalized.annualInterestRate,
    repaymentFrequency: normalized.repaymentFrequency,
    repaymentType: normalized.repaymentType,
    termYears: normalized.termYears,
    termMonths: normalized.termMonths,
    periodicRepayment,
    scheduledPeriodicRepayment: periodicRepayment,
    monthlyEquivalentRepayment: roundCents(periodicRepayment * monthlyFactor(normalized.repaymentFrequency)),
    lvr: calculateLvr({ propertyValue: input.propertyValue, loanAmount }),
    deposit: calculateDeposit({ propertyValue: input.propertyValue, loanAmount }),
    totalInterest: plan.totalInterest,
    totalRepayments: plan.totalRepayments,
    totalFees: plan.totalFees,
    payoffMonths: plan.payoffMonths,
    payoffPeriods: plan.payoffPeriods,
    scheduledTermMonths: plan.scheduledTermMonths,
    totalPrincipal: loanAmount,
    extraRepayment: normalized.extraRepayment,
    lumpSumAmount: normalized.lumpSumAmount,
    lumpSumMonth: normalized.lumpSumMonth,
    offsetBalance: normalized.offsetBalance,
    amortizationRows: plan.amortizationRows,
    scenarioComparison,
  };
}

export function calculateAdvancedSummary(input: CalculatorInput & { propertyValue: number }): CalculatorSummary {
  return calculateSummary(input);
}

export function toCurrencyAmount(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(roundCents(normalizeNumber(value)));
}
