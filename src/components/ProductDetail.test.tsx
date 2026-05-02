import { beforeAll, describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import initSqlJs from "sql.js";
import type { Database, SqlJsStatic } from "sql.js";

import ProductDetail from "./ProductDetail";

let SQL: SqlJsStatic;

beforeAll(async () => {
  SQL = await initSqlJs();
});

describe("ProductDetail", () => {
  test("treats JSON null and malformed detail items as empty detail data", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/product/CREDITUNIONSA_HL_442VS"]}>
        <Routes>
          <Route path="/product/:productId" element={<ProductDetail db={createProductDb()} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("Variable Home Loan Package Specials");
    expect(html).toContain("No loan application or monthly fee");
  });
});

function createProductDb(): Database {
  const db = new SQL.Database();
  db.run("CREATE TABLE snapshots (id INTEGER PRIMARY KEY, fetched_at TEXT)");
  db.run(`CREATE TABLE rates (
    snapshot_id INTEGER,
    bank_name TEXT,
    brand_group TEXT,
    product_name TEXT,
    product_id TEXT,
    description TEXT,
    application_uri TEXT,
    overview_uri TEXT,
    terms_uri TEXT,
    eligibility_uri TEXT,
    fees_uri TEXT,
    bundle_uri TEXT,
    rate_type TEXT,
    rate REAL,
    comparison_rate REAL,
    repayment_type TEXT,
    loan_purpose TEXT,
    lvr_min REAL,
    lvr_max REAL,
    fixed_term TEXT,
    feature_types TEXT,
    feature_details TEXT,
    product_tags TEXT,
    audience_tags TEXT,
    eligibility_types TEXT,
    eligibility_details TEXT,
    constraints TEXT,
    fees TEXT,
    rate_condition_details TEXT,
    additional_info_uris TEXT,
    is_tailored INTEGER,
    last_updated TEXT
  )`);
  db.run("INSERT INTO snapshots (id, fetched_at) VALUES (1, 'latest')");
  db.run(
    `INSERT INTO rates VALUES (1, 'Credit Union SA', 'Credit Union SA', 'Variable Home Loan Package Specials', 'CREDITUNIONSA_HL_442VS', 'Package special', '', '', '', '', '', '', 'VARIABLE', 0.0589, 0.0612, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0, 0.8, '', '[]', '[null,{"info":"Missing type"},{"type":"OTHER","info":"No loan application or monthly fee"}]', '[]', '[]', '[]', '[null,{"info":"Missing type"}]', 'null', 'null', 'null', 'null', 0, '2026-04-30')`,
  );
  return db;
}
