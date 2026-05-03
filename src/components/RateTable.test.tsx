import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { buildCompareKey } from "../compareKeys";
import type { FilterState, RateRow } from "../types";
import { DEFAULT_FILTERS } from "../types";
import { buildProductProfile, getProductProfileKey } from "../productProfile";
import RateTable, { FeatureSummary } from "./RateTable";

const filters: FilterState = { ...DEFAULT_FILTERS };
const row: RateRow = {
  rate_id: 1,
  bank_name: "Bank A",
  brand_group: "Group A",
  product_name: "Offset Loan",
  product_id: "a",
  description: "Includes offset",
  rate_type: "VARIABLE",
  rate: 0.055,
  comparison_rate: 0.056,
  repayment_type: "PRINCIPAL_AND_INTEREST",
  loan_purpose: "OWNER_OCCUPIED",
  lvr_min: 0,
  lvr_max: 0.8,
  fixed_term: "",
  is_tailored: 0,
  product_tags: '["offset"]',
  last_updated: "2026-04-30",
};

const featureRichRow: RateRow = {
  ...row,
  rate_id: 2,
  product_id: "b",
  product_name: "Feature Rich Loan",
  product_tags: '["offset","redraw","extra_repayments","guarantor","package"]',
};

describe("RateTable", () => {
  test("renders compare controls and labelled feature chips", () => {
    const selected = new Set([buildCompareKey(row)]);
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/rates"]}>
        <RateTable rates={[row]} filters={filters} profiles={new Map()} selectedCompareKeys={selected} onToggleCompare={() => undefined} onSort={() => undefined} />
      </MemoryRouter>,
    );

    expect(html).toContain("Selected for compare");
    expect(html).toContain("Offset");
  });

  test("uses plain-English rate movement copy", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/rates"]}>
        <RateTable
          rates={[row]}
          filters={filters}
          profiles={new Map()}
          selectedCompareKeys={new Set()}
          onToggleCompare={() => undefined}
          onSort={() => undefined}
          onRequestHistory={() => [
            { date: "2026-04-01", rate: 0.057 },
            { date: "2026-04-30", rate: 0.055 },
          ]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("down 0.20 percentage points");
    expect(html).not.toContain("bps");
  });

  test("disables unselected compare controls after four loans are selected", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/rates"]}>
        <RateTable rates={[row]} filters={filters} profiles={new Map()} selectedCompareKeys={new Set(["one", "two", "three", "four"])} onToggleCompare={() => undefined} onSort={() => undefined} />
      </MemoryRouter>,
    );

    expect(html).toContain("Limit reached");
    expect(html).toContain("Compare limit reached - remove a selected loan first");
    expect(html).toContain("disabled");
  });

  test("uses compact desktop feature summaries for dense rows", () => {
    const html = renderToStaticMarkup(<FeatureSummary tags={["offset", "redraw", "extra_repayments"]} />);

    expect(html).toContain('aria-label="Features: Offset, Redraw, Extra repayments"');
    expect(html).toContain("+1");
  });

  test("lets mobile feature chip groups shrink and wrap inside the card", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/rates"]}>
        <RateTable rates={[featureRichRow]} filters={filters} profiles={new Map()} selectedCompareKeys={new Set()} onToggleCompare={() => undefined} onSort={() => undefined} />
      </MemoryRouter>,
    );

    expect(html).toContain("inline-flex min-w-0 max-w-full flex-wrap gap-1");
    expect(html).toContain("md:hidden min-w-0 max-w-full space-y-2");
    expect(html).toContain("rounded-2xl min-w-0 max-w-full bg-white");
  });

  test("does not duplicate product feature labels in mobile callouts", () => {
    const profile = buildProductProfile(featureRichRow);
    const profiles = new Map([[getProductProfileKey(featureRichRow), profile]]);
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/rates"]}>
        <RateTable rates={[featureRichRow]} filters={filters} profiles={profiles} selectedCompareKeys={new Set()} onToggleCompare={() => undefined} onSort={() => undefined} />
      </MemoryRouter>,
    );

    expect(html.split(">Offset<").length - 1).toBe(1);
    expect(html.split(">Redraw<").length - 1).toBe(1);
  });
});
