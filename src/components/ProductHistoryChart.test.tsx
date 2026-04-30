import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import ProductHistoryChart from "./ProductHistoryChart";
import type { ProductHistoryFile } from "../types";

describe("ProductHistoryChart", () => {
  test("renders daily change-point history with cautious source copy", () => {
    const history: ProductHistoryFile = {
      key: "example-bank-basic-1",
      bankName: "Example Bank",
      productName: "Basic Home Loan",
      productId: "basic-1",
      firstDate: "2026-04-01",
      lastDate: "2026-04-04",
      variants: [{
        key: "VARIABLE|PRINCIPAL_AND_INTEREST|OWNER_OCCUPIED|0.0000|0.8000|",
        rateType: "VARIABLE",
        repaymentType: "PRINCIPAL_AND_INTEREST",
        loanPurpose: "OWNER_OCCUPIED",
        lvrMin: 0,
        lvrMax: 0.8,
        points: [
          { date: "2026-04-01", rate: 0.055, comparisonRate: 0.056 },
          { date: "2026-04-03", rate: 0.057, comparisonRate: 0.058 },
          { date: "2026-04-04", rate: 0.057, comparisonRate: 0.058 },
        ],
      }],
    };

    const html = renderToStaticMarkup(<ProductHistoryChart history={history} />);

    expect(html).toContain("Rate history");
    expect(html).toContain("daily change points");
    expect(html).toContain("5.50%");
    expect(html).toContain("5.70%");
    expect(html).toContain("historical trends are built by RateCheck");
    expect(html).toContain("<svg");
  });
});
