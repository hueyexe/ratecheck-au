import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { RatesResultsSection } from "./DataRoutes";
import type { FilterState, RateRow } from "./types";

const filters: FilterState = { rateType: "", loanPurpose: "", repaymentType: "", maxLvr: 0, everydayOnly: true, search: "", sortKey: "rate", sortAsc: true, features: [], audience: [], fixedTerm: "" };

const row: RateRow = {
  rate_id: 1,
  bank_name: "Credit Union SA",
  brand_group: "Credit Union SA",
  product_name: "Variable Home Loan Package Specials",
  product_id: "credit-union-sa-variable-package",
  description: "Package variable home loan",
  rate_type: "VARIABLE",
  rate: 0.0554,
  comparison_rate: 0.0592,
  repayment_type: "PRINCIPAL_AND_INTEREST",
  loan_purpose: "OWNER_OCCUPIED",
  lvr_min: 0,
  lvr_max: 0,
  fixed_term: "",
  is_tailored: 0,
  product_tags: '["redraw","offset","extra_repayments","guarantor","package"]',
  last_updated: "2025-06-04T00:00:00.000+10:00",
};

describe("RatesPage", () => {
  test("keeps filters above the results table so product names keep usable width", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/rates"]}>
        <RatesResultsSection
          filters={filters}
          setFilters={() => undefined}
          totalRates={1}
          rates={[row]}
          profiles={new Map()}
          handleSort={() => undefined}
          requestHistory={() => []}
          selectedCompareKeys={new Set()}
          onToggleCompare={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('aria-label="Rates filters and results"');
    expect(html).toContain('class="grid min-w-0 gap-4"');
    expect(html).not.toContain("xl:grid-cols-[18rem_minmax(0,1fr)]");
    expect(html).not.toContain("xl:sticky");
  });
});
