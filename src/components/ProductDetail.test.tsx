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
      <MemoryRouter initialEntries={["/product/Credit%20Union%20SA/CREDITUNIONSA_HL_442VS"]}>
        <Routes>
          <Route path="/product/:bankName/:productId" element={<ProductDetail db={createProductDb()} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("Variable Home Loan Package Specials");
    expect(html).toContain("No loan application or monthly fee");
  });

  test("renders CDR fee amount objects without crashing", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/product/Credit%20Union%20SA/CREDITUNIONSA_HL_442VS"]}>
        <Routes>
          <Route path="/product/:bankName/:productId" element={<ProductDetail db={createProductDb({ fees: '[{"name":"Establishment Fee","fixedAmount":{"amount":"300.00"}}]' })} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("Establishment Fee");
    expect(html).toContain("$300.00");
  });

  test("loads the bank-scoped product when product IDs collide", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/product/Bank%20B/shared-id"]}>
        <Routes>
          <Route path="/product/:bankName/:productId" element={<ProductDetail db={createCollidingProductDb()} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("Shared ID Loan B");
    expect(html).toContain("All Bank B products");
    expect(html).not.toContain("Shared ID Loan A");
  });

  test("renders core product details when the browser DB omits bulky detail columns", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/product/Bank%20B/slim-id"]}>
        <Routes>
          <Route path="/product/:bankName/:productId" element={<ProductDetail db={createSlimProductDb()} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("Slim Loan");
    expect(html).toContain("All Bank B products");
    expect(html).toContain("5.79%");
  });

  test("summarises listed product features and location limitations", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/product/Bank%20B/slim-id"]}>
        <Routes>
          <Route path="/product/:bankName/:productId" element={<ProductDetail db={createSlimProductDb()} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("What this product says it includes");
    expect(html).toContain("Redraw");
    expect(html).toContain("Listed");
    expect(html).toContain("Offset account");
    expect(html).toContain("Not listed");
    expect(html).toContain("Location-specific rates");
    expect(html).toContain("does not currently have reliable state, rural, regional, or metro fields");
  });
});

function createProductDb(overrides: { fees?: string } = {}): Database {
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
    `INSERT INTO rates VALUES (1, 'Credit Union SA', 'Credit Union SA', 'Variable Home Loan Package Specials', 'CREDITUNIONSA_HL_442VS', 'Package special', '', '', '', '', '', '', 'VARIABLE', 0.0589, 0.0612, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0, 0.8, '', '[]', '[null,{"info":"Missing type"},{"type":"OTHER","info":"No loan application or monthly fee"}]', '[]', '[]', '[]', '[null,{"info":"Missing type"}]', 'null', '${overrides.fees ?? "null"}', 'null', 'null', 0, '2026-04-30')`,
  );
  return db;
}

function createCollidingProductDb(): Database {
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
    `INSERT INTO rates VALUES (1, 'Bank A', 'Bank A', 'Shared ID Loan A', 'shared-id', 'First bank product', '', '', '', '', '', '', 'VARIABLE', 0.0559, 0.0612, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0, 0.8, '', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]', 0, '2026-04-30')`,
  );
  db.run(
    `INSERT INTO rates VALUES (1, 'Bank B', 'Bank B', 'Shared ID Loan B', 'shared-id', 'Second bank product', '', '', '', '', '', '', 'VARIABLE', 0.0579, 0.0602, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0, 0.8, '', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]', 0, '2026-04-30')`,
  );
  return db;
}

function createSlimProductDb(): Database {
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
    additional_info_uris TEXT,
    effective_from TEXT,
    effective_to TEXT,
    rate_type TEXT,
    rate REAL,
    comparison_rate REAL,
    repayment_type TEXT,
    loan_purpose TEXT,
    lvr_min REAL,
    lvr_max REAL,
    fixed_term TEXT,
    feature_types TEXT,
    product_tags TEXT,
    audience_tags TEXT,
    eligibility_types TEXT,
    rate_condition_details TEXT,
    rate_notes TEXT,
    is_tailored INTEGER,
    is_revert_rate INTEGER,
    last_updated TEXT
  )`);
  db.run("INSERT INTO snapshots (id, fetched_at) VALUES (1, 'latest')");
  db.run(
    `INSERT INTO rates VALUES (1, 'Bank B', 'Bank B', 'Slim Loan', 'slim-id', 'Slim browser row', '', '', '', '', '', '', '[]', '', '', 'VARIABLE', 0.0579, 0.0602, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0, 0.8, '', '["REDRAW"]', '["redraw"]', '[]', '[]', '[]', '', 0, 0, '2026-05-03')`,
  );
  return db;
}
