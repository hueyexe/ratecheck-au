import { beforeAll, describe, expect, test } from "bun:test";
import initSqlJs from "sql.js";
import type { Database, SqlJsStatic } from "sql.js";

import { queryRateHistoryByProduct } from "./db";

let SQL: SqlJsStatic;

beforeAll(async () => {
  SQL = await initSqlJs();
});

describe("bank-scoped product identity", () => {
  test("rate history stays scoped to the selected bank when product IDs collide", () => {
    const history = queryRateHistoryByProduct(
      createCollidingHistoryDb(),
      "Bank B",
      "shared-id",
      "VARIABLE",
      "PRINCIPAL_AND_INTEREST",
      "OWNER_OCCUPIED",
    );

    expect(history).toEqual([
      { date: "2026-05-01", rate: 0.06 },
      { date: "2026-05-02", rate: 0.059 },
    ]);
  });
});

function createCollidingHistoryDb(): Database {
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE snapshots (
      id INTEGER PRIMARY KEY,
      fetched_at TEXT NOT NULL
    );
    CREATE TABLE rates (
      snapshot_id INTEGER NOT NULL,
      bank_name TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_id TEXT NOT NULL,
      rate_type TEXT NOT NULL,
      rate REAL NOT NULL,
      repayment_type TEXT NOT NULL,
      loan_purpose TEXT NOT NULL
    );
  `);
  db.run("INSERT INTO snapshots (id, fetched_at) VALUES (1, '2026-05-01'), (2, '2026-05-02')");
  db.run(`
    INSERT INTO rates VALUES
      (1, 'Bank A', 'Shared Loan A', 'shared-id', 'VARIABLE', 0.055, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED'),
      (2, 'Bank A', 'Shared Loan A', 'shared-id', 'VARIABLE', 0.056, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED'),
      (1, 'Bank B', 'Shared Loan B', 'shared-id', 'VARIABLE', 0.060, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED'),
      (2, 'Bank B', 'Shared Loan B', 'shared-id', 'VARIABLE', 0.059, 'PRINCIPAL_AND_INTEREST', 'OWNER_OCCUPIED')
  `);
  return db;
}
