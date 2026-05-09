import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import CalculatorHero from "./CalculatorHero";

describe("CalculatorHero", () => {
  test("renders the main repayment answer and key totals with numeric styling", () => {
    const html = renderToStaticMarkup(
      <CalculatorHero monthlyRepayment={3124.45} repaymentFrequency="Monthly" repaymentType="PrincipalAndInterest" interestOnlyMonths={0} offsetBalance={20000} extraRepayment={250} totalInterest={424802} totalRepayments={1124802} paidOffDate="March 2056" deposit={140000} lvr={80} />,
    );

    expect(html).toContain("Estimated repayment");
    expect(html).toContain("$3,124");
    expect(html).toContain("Total interest");
    expect(html).toContain("March 2056");
    expect(html).toContain("class=\"nums");
  });

  test("labels the repayment period from the selected frequency", () => {
    const html = renderToStaticMarkup(
      <CalculatorHero monthlyRepayment={829.58} repaymentFrequency="Weekly" repaymentType="PrincipalAndInterest" interestOnlyMonths={0} offsetBalance={0} extraRepayment={0} totalInterest={701435} totalRepayments={1301435} paidOffDate="June 2056" deposit={200000} lvr={75} />,
    );

    expect(html).toContain("per week");
  });

  test("explains assumptions and metric meanings", () => {
    const html = renderToStaticMarkup(
      <CalculatorHero monthlyRepayment={3124.45} repaymentFrequency="Monthly" repaymentType="PrincipalAndInterest" interestOnlyMonths={0} offsetBalance={20000} extraRepayment={250} totalInterest={424802} totalRepayments={1124802} paidOffDate="March 2056" deposit={140000} lvr={80} />,
    );

    expect(html).toContain("Estimated repayment");
    expect(html).toContain("Assumptions used");
    expect(html).toContain("principal and interest");
    expect(html).toContain("offset reduces interest");
    expect(html).toContain("extra repayments reduce principal");
    expect(html).toContain("Estimated interest paid over the loan");
    expect(html).toContain("Loan amount divided by home value");
  });

  test("explains a fixed interest-only period before principal and interest repayments", () => {
    const html = renderToStaticMarkup(
      <CalculatorHero monthlyRepayment={2150} repaymentFrequency="Monthly" repaymentType="InterestOnly" interestOnlyMonths={60} offsetBalance={0} extraRepayment={0} totalInterest={560000} totalRepayments={1260000} paidOffDate="April 2056" deposit={160000} lvr={80} />,
    );

    expect(html).toContain("interest only for 5 years, then principal and interest");
  });
});
