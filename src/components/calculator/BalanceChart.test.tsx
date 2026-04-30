import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import BalanceChart from "./BalanceChart";

describe("BalanceChart", () => {
  test("renders an accessible native SVG for balance and equity", () => {
    const html = renderToStaticMarkup(
      <BalanceChart
        balanceSeries={[{ date: "2026-05-28", value: 600000, label: "Balance" }, { date: "2027-05-28", value: 580000, label: "Balance" }]}
        equitySeries={[{ date: "2026-05-28", value: 200000, label: "Equity" }, { date: "2027-05-28", value: 230000, label: "Equity" }]}
      />,
    );

    expect(html).toContain("<svg");
    expect(html).toContain("role=\"img\"");
    expect(html).toContain("Balance and equity over time");
    expect(html).toContain("Loan balance");
    expect(html).toContain("Home equity");
  });
});
