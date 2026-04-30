import { calculateMonthlyRepayment } from "./core";
import type { RepaymentFrequency, RepaymentType } from "./core";

export type SimulationMode = "NewLoan" | "ExistingLoan";
export type ScheduleRowType = "interest" | "scheduledRepayment" | "extraRepayment" | "lumpSum" | "fee" | "withdrawal";
export type RateChangeBehaviour = "KeepRepayment" | "RecalculateRepayment" | "MinimumRepayment";

export type ExtraTransaction = {
  date: string;
  type: Extract<ScheduleRowType, "extraRepayment" | "lumpSum" | "fee" | "withdrawal">;
  amount: number;
  label?: string;
  partId?: string;
};

export type RateChange = {
  date: string;
  annualInterestRate: number;
  behaviour: RateChangeBehaviour;
  minimumRepayment?: number;
  partId?: string;
};

export type LoanPartInput = {
  partId: string;
  loanAmount: number;
  annualInterestRate: number;
  termYears?: number;
  termMonths?: number;
  repaymentFrequency?: RepaymentFrequency;
  repaymentType?: RepaymentType;
  interestOnlyMonths?: number;
};

export type SimulationInput = {
  loanAmount: number;
  annualInterestRate: number;
  termYears: number;
  termMonths?: number;
  startDate: string;
  firstRepaymentDate: string;
  repaymentFrequency: RepaymentFrequency;
  repaymentType?: RepaymentType;
  mode?: SimulationMode;
  interestOnlyMonths?: number;
  offset?: {
    startingBalance: number;
    endWhenFullyOffset?: boolean;
    drawRepaymentsFromOffset?: boolean;
  };
  transactions?: ExtraTransaction[];
  extraTransactions?: ExtraTransaction[];
  extraRepayment?: number;
  rateChanges?: RateChange[];
  loanParts?: LoanPartInput[];
  maxRows?: number;
};

export type ScheduleRow = {
  index: number;
  date: string;
  type: ScheduleRowType;
  label: string;
  amount: number;
  interestAmount: number;
  principalAmount: number;
  balance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
  paidInAdvance: number;
  partId?: string;
  annualInterestRate?: number;
  offsetBalance?: number;
};

export type SimulationSummary = {
  openingBalance: number;
  finalBalance: number;
  paidOffDate: string;
  finalOffsetBalance: number;
  monthlyRepayment: number;
  totalInterest: number;
  totalRepayments: number;
  totalPrincipal: number;
};

export type SimulationResult = {
  rows: ScheduleRow[];
  summary: SimulationSummary;
  partSummaries?: Record<string, SimulationSummary>;
};

type SinglePartInput = SimulationInput & { partId?: string };

const msPerDay = 86_400_000;

export function simulateLoan(input: SimulationInput): SimulationResult {
  if (input.loanParts?.length) {
    const partResults = input.loanParts.map((part) => {
      const scopedTransactions = (input.transactions ?? input.extraTransactions ?? []).filter((transaction) => !transaction.partId || transaction.partId === part.partId);
      const scopedRateChanges = (input.rateChanges ?? []).filter((change) => !change.partId || change.partId === part.partId);
      return simulateSinglePart({
        ...input,
        loanAmount: part.loanAmount,
        annualInterestRate: part.annualInterestRate,
        termYears: part.termYears ?? input.termYears,
        termMonths: part.termMonths ?? input.termMonths,
        repaymentFrequency: part.repaymentFrequency ?? input.repaymentFrequency,
        repaymentType: part.repaymentType ?? input.repaymentType,
        interestOnlyMonths: part.interestOnlyMonths ?? input.interestOnlyMonths,
        transactions: scopedTransactions,
        extraTransactions: undefined,
        rateChanges: scopedRateChanges,
        loanParts: undefined,
        partId: part.partId,
      });
    });

    let index = 1;
    const rows = partResults.flatMap((result) => result.rows).map((row) => ({ ...row, index: index++ }));
    const partSummaries = Object.fromEntries(input.loanParts.map((part, i) => [part.partId, partResults[i].summary]));

    return {
      rows,
      summary: combineSummaries(input.startDate, partResults.map((result) => result.summary)),
      partSummaries,
    };
  }

  return simulateSinglePart(input);
}

function simulateSinglePart(input: SinglePartInput): SimulationResult {
  const repaymentType = input.repaymentType ?? "PrincipalAndInterest";
  const openingBalance = roundCents(input.loanAmount);
  let balance = openingBalance;
  let offsetBalance = Math.max(0, input.offset?.startingBalance ?? 0);
  let annualInterestRate = Math.max(0, input.annualInterestRate);
  let payment = calculatePayment(balance, annualInterestRate, input.termYears, input.termMonths ?? 0, input.repaymentFrequency, repaymentType);
  let currentDate = parseDate(input.startDate);
  let paymentDate = parseDate(input.firstRepaymentDate);
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;
  let totalRepayments = 0;
  let paymentsMade = 0;
  let index = 1;
  const rows: ScheduleRow[] = [];
  const rateChanges = [...(input.rateChanges ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const transactions = [...(input.transactions ?? input.extraTransactions ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const totalPeriods = totalPaymentPeriods(input.termYears, input.termMonths ?? 0, input.repaymentFrequency);
  const interestOnlyPeriods = Math.min(totalPeriods, Math.max(0, Math.ceil(((input.interestOnlyMonths ?? 0) / 12) * periodsPerYear(input.repaymentFrequency))));
  const recurringExtraRepayment = Math.max(0, input.extraRepayment ?? 0);
  const maxIterations = Math.max(totalPeriods + 2_000, 1);
  let rateChangeIndex = 0;
  let recalculatedAfterInterestOnly = interestOnlyPeriods === 0;
  let firstScheduledRepayment = 0;

  if (input.offset?.endWhenFullyOffset && offsetBalance >= balance) {
    return {
      rows: [],
      summary: {
        openingBalance,
        finalBalance: 0,
        paidOffDate: input.startDate,
        finalOffsetBalance: roundCents(offsetBalance),
        monthlyRepayment: roundCents(payment),
        totalInterest: 0,
        totalRepayments: 0,
        totalPrincipal: 0,
      },
    };
  }

  for (let iteration = 0; balance > 0.005 && iteration < maxIterations; iteration += 1) {
    const paymentIso = formatDate(paymentDate);

    while (rateChangeIndex < rateChanges.length && rateChanges[rateChangeIndex].date <= paymentIso) {
      const change = rateChanges[rateChangeIndex];
      annualInterestRate = Math.max(0, change.annualInterestRate);
      if (change.behaviour !== "KeepRepayment") {
        const remainingPeriods = Math.max(1, totalPeriods - paymentsMade);
        const recalculated = calculatePaymentForPeriods(balance, annualInterestRate, remainingPeriods, input.repaymentFrequency, repaymentType);
        payment = change.behaviour === "MinimumRepayment" ? Math.max(recalculated, change.minimumRepayment ?? 0) : recalculated;
      }
      rateChangeIndex += 1;
    }

    if (!recalculatedAfterInterestOnly && paymentsMade >= interestOnlyPeriods) {
      const remainingPeriods = Math.max(1, totalPeriods - paymentsMade);
      payment = calculatePaymentForPeriods(balance, annualInterestRate, remainingPeriods, input.repaymentFrequency, "PrincipalAndInterest");
      recalculatedAfterInterestOnly = true;
    }

    const days = Math.max(0, daysBetween(currentDate, paymentDate));
    const interestBase = Math.max(0, balance - offsetBalance);
    const interest = roundCents(interestBase * (annualInterestRate / 100) * (days / 365));

    if (interest > 0) {
      balance = roundCents(balance + interest);
      cumulativeInterest = roundCents(cumulativeInterest + interest);
      pushRow(rows, input.maxRows, {
        index: index++,
        date: paymentIso,
        type: "interest",
        label: "Interest",
        amount: -interest,
        interestAmount: interest,
        principalAmount: 0,
        balance,
        cumulativeInterest,
        cumulativePrincipal,
        paidInAdvance: 0,
        partId: input.partId,
        annualInterestRate,
        offsetBalance: roundCents(offsetBalance),
      });
    }

    const transactionsForDate = transactions.filter((transaction) => transaction.date === paymentIso);
    for (const transaction of transactionsForDate) {
      const reducesBalance = transaction.type === "extraRepayment" || transaction.type === "lumpSum";
      const amount = roundCents(Math.max(0, transaction.amount));
      const principalAmount = reducesBalance ? Math.min(balance, amount) : 0;
      balance = roundCents(reducesBalance ? Math.max(0, balance - principalAmount) : balance + amount);
      if (reducesBalance) {
        cumulativePrincipal = roundCents(cumulativePrincipal + principalAmount);
        totalRepayments = roundCents(totalRepayments + principalAmount);
      }
      pushRow(rows, input.maxRows, {
        index: index++,
        date: paymentIso,
        type: transaction.type,
        label: transaction.label ?? defaultLabel(transaction.type),
        amount: reducesBalance ? amount : -amount,
        interestAmount: 0,
        principalAmount,
        balance,
        cumulativeInterest,
        cumulativePrincipal,
        paidInAdvance: 0,
        partId: input.partId,
        annualInterestRate,
        offsetBalance: roundCents(offsetBalance),
      });
    }

    const inInterestOnlyPeriod = paymentsMade < interestOnlyPeriods;
    const scheduledPayment = inInterestOnlyPeriod ? interest : payment;
    const repaymentAmount = roundCents(Math.min(balance, scheduledPayment));
    const interestPaid = Math.min(interest, repaymentAmount);
    const principalAmount = roundCents(Math.max(0, repaymentAmount - interestPaid));
    balance = roundCents(Math.max(0, balance - repaymentAmount));
    cumulativePrincipal = roundCents(cumulativePrincipal + principalAmount);
    totalRepayments = roundCents(totalRepayments + repaymentAmount);
    if (input.offset?.drawRepaymentsFromOffset) {
      offsetBalance = roundCents(Math.max(0, offsetBalance - repaymentAmount));
    }
    if (firstScheduledRepayment === 0) {
      firstScheduledRepayment = repaymentAmount;
    }

    pushRow(rows, input.maxRows, {
      index: index++,
      date: paymentIso,
      type: "scheduledRepayment",
      label: "Minimum repayment",
      amount: repaymentAmount,
      interestAmount: 0,
      principalAmount,
      balance,
      cumulativeInterest,
      cumulativePrincipal,
      paidInAdvance: 0,
      partId: input.partId,
      annualInterestRate,
      offsetBalance: roundCents(offsetBalance),
    });

    if (recurringExtraRepayment > 0 && balance > 0.005) {
      const extraAmount = roundCents(Math.min(balance, recurringExtraRepayment));
      balance = roundCents(Math.max(0, balance - extraAmount));
      cumulativePrincipal = roundCents(cumulativePrincipal + extraAmount);
      totalRepayments = roundCents(totalRepayments + extraAmount);
      pushRow(rows, input.maxRows, {
        index: index++,
        date: paymentIso,
        type: "extraRepayment",
        label: "Extra repayment",
        amount: extraAmount,
        interestAmount: 0,
        principalAmount: extraAmount,
        balance,
        cumulativeInterest,
        cumulativePrincipal,
        paidInAdvance: 0,
        partId: input.partId,
        annualInterestRate,
        offsetBalance: roundCents(offsetBalance),
      });
    }

    paymentsMade += 1;
    currentDate = paymentDate;
    paymentDate = nextPaymentDate(paymentDate, input.repaymentFrequency);

    if (input.maxRows && rows.length >= input.maxRows) {
      break;
    }
  }

  const finalBalance = balance <= 0.005 ? 0 : roundCents(balance);
  return {
    rows,
    summary: {
      openingBalance,
      finalBalance,
      paidOffDate: finalBalance === 0 ? rows.at(-1)?.date ?? input.startDate : formatDate(currentDate),
      finalOffsetBalance: roundCents(offsetBalance),
      monthlyRepayment: roundCents(firstScheduledRepayment || payment),
      totalInterest: cumulativeInterest,
      totalRepayments,
      totalPrincipal: cumulativePrincipal,
    },
  };
}

function calculatePayment(
  loanAmount: number,
  annualInterestRate: number,
  termYears: number,
  termMonths: number,
  repaymentFrequency: RepaymentFrequency,
  repaymentType: RepaymentType,
): number {
  return calculateMonthlyRepayment({ loanAmount, annualInterestRate, termYears, termMonths, repaymentFrequency, repaymentType });
}

function calculatePaymentForPeriods(
  loanAmount: number,
  annualInterestRate: number,
  periods: number,
  frequency: RepaymentFrequency,
  repaymentType: RepaymentType,
): number {
  if (repaymentType === "InterestOnly") {
    return roundCents(loanAmount * (annualInterestRate / 100 / periodsPerYear(frequency)));
  }
  const rate = annualInterestRate / 100 / periodsPerYear(frequency);
  if (rate === 0) {
    return roundCents(loanAmount / periods);
  }
  const growth = (1 + rate) ** periods;
  return roundCents(loanAmount * ((rate * growth) / (growth - 1)));
}

function periodsPerYear(frequency: RepaymentFrequency): number {
  if (frequency === "Monthly") return 12;
  return frequency === "Fortnightly" ? 26 : 52;
}

function totalPaymentPeriods(termYears: number, termMonths: number, frequency: RepaymentFrequency): number {
  return Math.max(1, Math.ceil(((termYears * 12 + termMonths) / 12) * periodsPerYear(frequency)));
}

function nextPaymentDate(date: Date, frequency: RepaymentFrequency): Date {
  if (frequency === "Monthly") return addMonths(date, 1);
  return addDays(date, frequency === "Fortnightly" ? 14 : 7);
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function defaultLabel(type: ScheduleRowType): string {
  if (type === "extraRepayment") return "Extra repayment";
  if (type === "lumpSum") return "Lump sum";
  if (type === "fee") return "Fee";
  if (type === "withdrawal") return "Withdrawal";
  if (type === "interest") return "Interest";
  return "Minimum repayment";
}

function pushRow(rows: ScheduleRow[], maxRows: number | undefined, row: ScheduleRow): void {
  if (!maxRows || rows.length < maxRows) {
    rows.push(row);
  }
}

function combineSummaries(startDate: string, summaries: SimulationSummary[]): SimulationSummary {
  return {
    openingBalance: roundCents(summaries.reduce((total, summary) => total + summary.openingBalance, 0)),
    finalBalance: roundCents(summaries.reduce((total, summary) => total + summary.finalBalance, 0)),
    paidOffDate: summaries.map((summary) => summary.paidOffDate).sort().at(-1) ?? startDate,
    finalOffsetBalance: roundCents(summaries.reduce((total, summary) => total + summary.finalOffsetBalance, 0)),
    monthlyRepayment: roundCents(summaries.reduce((total, summary) => total + summary.monthlyRepayment, 0)),
    totalInterest: roundCents(summaries.reduce((total, summary) => total + summary.totalInterest, 0)),
    totalRepayments: roundCents(summaries.reduce((total, summary) => total + summary.totalRepayments, 0)),
    totalPrincipal: roundCents(summaries.reduce((total, summary) => total + summary.totalPrincipal, 0)),
  };
}
