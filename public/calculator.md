# Mortgage Calculator

The calculator estimates Australian home loan repayments from user-entered loan amount, annual interest rate, term, repayment frequency, offset balance, extra repayments and optional interest-only period.

## Outputs

- Repayment amount labelled by selected frequency: per month, per fortnight or per week.
- Total interest and total repayments over the simulated loan life.
- Paid-off date, deposit and LVR.
- Native balance/equity chart generated from schedule rows.
- Schedule rows with principal and interest split, plus CSV export.

## Assumptions

- Interest is simulated using Actual/365 day counts between repayment dates.
- Offset balance reduces the interest base but is not treated as a repayment unless explicitly modelled.
- Extra repayment is recurring at the selected repayment frequency.
- Interest-only mode uses a bounded interest-only period and then recalculates repayments to clear the loan by the original term.
- Calculator results are estimates, not financial advice.

Generated alongside the 2026-05-01T19:03:41Z rate snapshot.
