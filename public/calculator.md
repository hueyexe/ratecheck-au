# Mortgage Calculator

The calculator estimates Australian home loan repayments from user-entered loan amount, annual interest rate, term, repayment frequency, offset balance, extra repayments and optional interest-only period.

## Questions to ask first

- What is the loan amount?
- What annual interest rate should be used?
- What loan term should be used, in years and months?
- Should repayments be monthly, fortnightly or weekly?
- Is the loan principal-and-interest or interest-only? If interest-only, how many months?
- Are there regular extra repayments?
- Is there an offset balance that should reduce interest?

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

## Python example

```python
from math import pow

def repayment_amount(balance, annual_rate, payments_per_year, remaining_payments):
    if remaining_payments <= 0:
        return 0.0
    periodic_rate = annual_rate / payments_per_year
    if periodic_rate == 0:
        return balance / remaining_payments
    return balance * periodic_rate / (1 - pow(1 + periodic_rate, -remaining_payments))

def simulate_home_loan(loan_amount, annual_rate, years, payments_per_year=12, extra_repayment=0.0, offset_balance=0.0):
    scheduled_payments = int(years * payments_per_year)
    repayment = repayment_amount(loan_amount, annual_rate, payments_per_year, scheduled_payments)
    balance = loan_amount
    total_interest = 0.0
    rows = []
    for payment_number in range(1, scheduled_payments + 1):
        interest_base = max(0.0, balance - offset_balance)
        interest = interest_base * annual_rate / payments_per_year
        principal = min(balance, repayment + extra_repayment - interest)
        if principal < 0:
            principal = 0.0
        balance = max(0.0, balance + interest - repayment - extra_repayment)
        total_interest += interest
        rows.append({"payment": payment_number, "interest": interest, "principal": principal, "balance": balance})
        if balance <= 0:
            break
    return {"repayment": repayment, "total_interest": total_interest, "payments": len(rows), "rows": rows}
```

This is an estimate, not financial advice. Confirm repayment calculations, fees and product terms with the lender.

Generated alongside the 2026-05-17T01:51:31Z rate snapshot.
