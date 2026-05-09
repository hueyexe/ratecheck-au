import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { createDefaultCalculatorState } from "../../calculator/state";
import CalculatorControls from "./CalculatorControls";

describe("CalculatorControls", () => {
  test("explains calculator inputs in borrower language", () => {
    const html = renderToStaticMarkup(<CalculatorControls state={createDefaultCalculatorState()} onChange={() => undefined} />);

    expect(html).toContain("Home value");
    expect(html).toContain("Estimated purchase price or current property value");
    expect(html).toContain("Interest rate to test");
    expect(html).toContain("Use the advertised rate for repayments");
    expect(html).toContain("Money sitting in offset");
    expect(html).toContain("This does not repay the loan");
    expect(html).toContain("Extra paid each repayment");
    expect(html).toContain("Added on top of the scheduled");
  });
});
