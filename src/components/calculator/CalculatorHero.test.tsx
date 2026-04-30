import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import CalculatorHero from "./CalculatorHero";

describe("CalculatorHero", () => {
  test("renders the main repayment answer and key totals with numeric styling", () => {
    const html = renderToStaticMarkup(
      <CalculatorHero monthlyRepayment={3124.45} totalInterest={424802} totalRepayments={1124802} paidOffDate="March 2056" deposit={140000} lvr={80} />,
    );

    expect(html).toContain("Your repayment");
    expect(html).toContain("$3,124");
    expect(html).toContain("Total interest");
    expect(html).toContain("March 2056");
    expect(html).toContain("class=\"nums");
  });

  test("labels the repayment period from the selected frequency", () => {
    const html = renderToStaticMarkup(
      <CalculatorHero monthlyRepayment={829.58} repaymentFrequency="Weekly" totalInterest={701435} totalRepayments={1301435} paidOffDate="June 2056" deposit={200000} lvr={75} />,
    );

    expect(html).toContain("per week");
  });
});
