import { beforeAll, describe, expect, test } from "bun:test";
import initSqlJs from "sql.js";
import type { Database, SqlJsStatic } from "sql.js";

import { buildCompareKey } from "./compareKeys";
import { queryRatesByCompareKeys } from "./db";
import type { RateRow } from "./types";

let SQL: SqlJsStatic;

beforeAll(async () => {
  SQL = await initSqlJs();
});

function createDb(): Database {
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
    last_updated TEXT
  )`);
  db.run("INSERT INTO snapshots (id, fetched_at) VALUES (1, 'old'), (2, 'latest')");
  db.run(
    `INSERT INTO rates VALUES
    (2, 'Bank A', 'Group A', 'Loan A', 'a', 'Desc A', 'VARIABLE', 0.055, 0.056, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0, 0.8, '', 0, '2026-04-30'),
    (2, 'Bank A', 'Group A', 'Loan A duplicate tier', 'a', 'Desc A', 'VARIABLE', 0.058, 0.059, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0, 0.8, '', 0, '2026-04-30'),
    (2, 'Bank B', 'Group B', 'Loan B 1 year', 'b', 'Desc B', 'FIXED', 0.057, 0.059, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0, 0.8, 'P1Y', 0, '2026-04-30'),
    (2, 'Bank B', 'Group B', 'Loan B 2 years', 'b', 'Desc B', 'FIXED', 0.057, 0.059, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0, 0.8, 'P2Y', 0, '2026-04-30'),
    (2, 'Bank C', 'Group C', 'High precision LVR', 'c', 'Desc C', 'VARIABLE', 0.052, 0.053, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0.800001, 0.9, '', 0, '2026-04-30'),
    (2, 'Bank A', 'Group A', 'Loan A exact duplicate', 'a', 'Desc A', 'VARIABLE', 0.055, 0.056, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0, 0.8, '', 0, '2026-04-30'),
    (1, 'Bank A', 'Group A', 'Old Loan A', 'a', 'Old', 'VARIABLE', 0.061, 0.062, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED', 0, 0.8, '', 0, '2026-04-01')`,
  );
  return db;
}

type CompareTestRow = Pick<RateRow, "product_id" | "rate_type" | "rate" | "comparison_rate" | "repayment_type" | "loan_purpose" | "lvr_min" | "lvr_max" | "fixed_term"> & { rate_id: number };

function rowKey(row: CompareTestRow): string {
  return buildCompareKey({ ...row } as RateRow);
}

describe("queryRatesByCompareKeys", () => {
  test("returns latest matching rows in requested key order", () => {
    const db = createDb();
    const first = rowKey({ rate_id: 4, product_id: "b", rate_type: "FIXED", rate: 0.057, comparison_rate: 0.059, repayment_type: "PRINCIPAL_AND_INTEREST", loan_purpose: "OWNER_OCCUPIED", lvr_min: 0, lvr_max: 0.8, fixed_term: "P2Y" });
    const second = rowKey({ rate_id: 1, product_id: "a", rate_type: "VARIABLE", rate: 0.055, comparison_rate: 0.056, repayment_type: "PRINCIPAL_AND_INTEREST", loan_purpose: "OWNER_OCCUPIED", lvr_min: 0, lvr_max: 0.8, fixed_term: "" });

    const rows = queryRatesByCompareKeys(db, [first, "bad", second]);

    expect(rows.map((row) => row.product_id)).toEqual(["b", "a"]);
    expect(rows[0].product_name).toBe("Loan B 2 years");
    expect(rows[1].product_name).toBe("Loan A");
  });

  test("resolves rows with high precision LVR values", () => {
    const db = createDb();
    const key = rowKey({ rate_id: 5, product_id: "c", rate_type: "VARIABLE", rate: 0.052, comparison_rate: 0.053, repayment_type: "PRINCIPAL_AND_INTEREST", loan_purpose: "OWNER_OCCUPIED", lvr_min: 0.800001, lvr_max: 0.9, fixed_term: "" });

    const rows = queryRatesByCompareKeys(db, [key]);

    expect(rows.map((row) => row.product_name)).toEqual(["High precision LVR"]);
  });

  test("resolves only the selected row when compare fields are duplicated", () => {
    const db = createDb();
    const key = rowKey({ rate_id: 6, product_id: "a", rate_type: "VARIABLE", rate: 0.055, comparison_rate: 0.056, repayment_type: "PRINCIPAL_AND_INTEREST", loan_purpose: "OWNER_OCCUPIED", lvr_min: 0, lvr_max: 0.8, fixed_term: "" });

    const rows = queryRatesByCompareKeys(db, [key]);

    expect(rows.map((row) => row.product_name)).toEqual(["Loan A exact duplicate"]);
  });
});
