import { beforeAll, describe, expect, test } from "bun:test";
import initSqlJs from "sql.js";
import type { Database, SqlJsStatic } from "sql.js";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import ComparePage, { ComparePageView } from "./ComparePage";
import { buildCompareKey, serialiseCompareKeys } from "../compareKeys";
import type { RateRow } from "../types";

let SQL: SqlJsStatic;

beforeAll(async () => {
  SQL = await initSqlJs();
});

const rows: RateRow[] = [
  {
    rate_id: 1,
    bank_name: "Bank A",
    brand_group: "Group A",
    product_name: "Basic Variable",
    product_id: "a",
    description: "Has offset and redraw",
    rate_type: "VARIABLE",
    rate: 0.055,
    comparison_rate: 0.056,
    repayment_type: "PRINCIPAL_AND_INTEREST",
    loan_purpose: "OWNER_OCCUPIED",
    lvr_min: 0,
    lvr_max: 0.8,
    fixed_term: "",
    is_tailored: 0,
    product_tags: '["offset","redraw"]',
    last_updated: "2025-06-04T00:00:00.000+10:00",
  },
  {
    rate_id: 2,
    bank_name: "Bank B",
    brand_group: "Group B",
    product_name: "Fixed Two Year",
    product_id: "b",
    description: "Fixed option",
    rate_type: "FIXED",
    rate: 0.057,
    comparison_rate: 0.059,
    repayment_type: "PRINCIPAL_AND_INTEREST",
    loan_purpose: "OWNER_OCCUPIED",
    lvr_min: 0,
    lvr_max: 0.8,
    fixed_term: "P2Y",
    is_tailored: 0,
    last_updated: "2026-04-30",
  },
  {
    rate_id: 3,
    bank_name: "Bank C",
    brand_group: "Group C",
    product_name: "Percent Product",
    product_id: "product%7Cabc",
    description: "Product id contains encoded-looking text",
    rate_type: "VARIABLE",
    rate: 0.058,
    comparison_rate: 0.06,
    repayment_type: "PRINCIPAL_AND_INTEREST",
    loan_purpose: "OWNER_OCCUPIED",
    lvr_min: 0,
    lvr_max: 0.8,
    fixed_term: "",
    is_tailored: 0,
    last_updated: "2026-04-30",
  },
];

describe("ComparePageView", () => {
  test("renders a grouped comparison for selected rows", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/compare"]}>
        <ComparePageView rows={rows} invalidCount={0} />
      </MemoryRouter>,
    );

    expect(html).toContain("Compare loans");
    expect(html).toContain("Bank A");
    expect(html).toContain("Basic Variable");
    expect(html).toContain("Interest rate");
    expect(html).toContain("5.50%");
    expect(html).toContain("Offset");
    expect(html).toContain("4 Jun 2025");
    expect(html).not.toContain("2025-06-04T00:00:00.000+10:00");
  });

  test("renders a clear empty state", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/compare"]}>
        <ComparePageView rows={[]} invalidCount={2} />
      </MemoryRouter>,
    );

    expect(html).toContain("No loans selected");
    expect(html).toContain("Choose loans from the rates table");
    expect(html).toContain("2 invalid selections were ignored");
  });

  test("reports malformed compare URL selections", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/compare?products=bad"]}>
        <ComparePage db={createCompareDb()} />
      </MemoryRouter>,
    );

    expect(html).toContain("1 invalid selection was ignored");
  });

  test("counts encoded malformed compare URL selections as one item", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/compare?products=bad%2Ckey"]}>
        <ComparePage db={createCompareDb()} />
      </MemoryRouter>,
    );

    expect(html).toContain("1 invalid selection was ignored");
  });

  test("resolves selected products from the compare URL", () => {
    const key = buildCompareKey(rows[0]);
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={[`/compare?products=${serialiseCompareKeys([key])}`]}>
        <ComparePage db={createCompareDb()} />
      </MemoryRouter>,
    );

    expect(html).toContain("Bank A");
    expect(html).toContain("Basic Variable");
  });

  test("does not double-decode compare URL key content", () => {
    const key = buildCompareKey(rows[2]);
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={[`/compare?products=${serialiseCompareKeys([key])}`]}>
        <ComparePage db={createCompareDb()} />
      </MemoryRouter>,
    );

    expect(html).toContain("Bank C");
    expect(html).toContain("Percent Product");
  });
});

function createCompareDb(): Database {
  const db = new SQL.Database();
  db.run("CREATE TABLE snapshots (id INTEGER PRIMARY KEY, fetched_at TEXT)");
  db.run(`CREATE TABLE rates (
    snapshot_id INTEGER,
    bank_name TEXT,
    brand_group TEXT,
    product_name TEXT,
    product_id TEXT,
    description TEXT,
    rate_type TEXT,
    rate REAL,
    comparison_rate REAL,
    repayment_type TEXT,
    loan_purpose TEXT,
    lvr_min REAL,
    lvr_max REAL,
    fixed_term TEXT,
    is_tailored INTEGER,
    product_tags TEXT,
    last_updated TEXT
  )`);
  db.run("INSERT INTO snapshots (id, fetched_at) VALUES (1, 'latest')");
  db.run(
    `INSERT INTO rates VALUES (1, 'Bank A', 'Group A', 'Basic Variable', 'a', 'Has offset and redraw', 'VARIABLE', 0.055, 0.056, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0, 0.8, '', 0, '["offset","redraw"]', '2026-04-30')`,
  );
  db.run(
    `INSERT INTO rates VALUES (1, 'Bank B', 'Group B', 'Fixed Two Year', 'b', 'Fixed option', 'FIXED', 0.057, 0.059, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0, 0.8, 'P2Y', 0, NULL, '2026-04-30')`,
  );
  db.run(
    `INSERT INTO rates VALUES (1, 'Bank C', 'Group C', 'Percent Product', 'product%7Cabc', 'Product id contains encoded-looking text', 'VARIABLE', 0.058, 0.06, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0, 0.8, '', 0, NULL, '2026-04-30')`,
  );
  return db;
}
