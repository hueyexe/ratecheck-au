import { beforeAll, describe, expect, test } from "bun:test";
import initSqlJs from "sql.js";
import type { Database, SqlJsStatic } from "sql.js";

import { queryBanks } from "./db";

let SQL: SqlJsStatic;

beforeAll(async () => {
  SQL = await initSqlJs();
});

function createBankDb(): Database {
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE snapshots (
      id INTEGER PRIMARY KEY,
      fetched_at TEXT NOT NULL,
      bank_count INTEGER NOT NULL,
      rate_count INTEGER NOT NULL,
      error_count INTEGER NOT NULL
    );
    CREATE TABLE rates (
      snapshot_id INTEGER NOT NULL,
      bank_name TEXT NOT NULL,
      brand_group TEXT NOT NULL DEFAULT '',
      product_name TEXT NOT NULL,
      product_id TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      rate_type TEXT NOT NULL,
      rate REAL NOT NULL,
      comparison_rate REAL NOT NULL DEFAULT 0,
      product_tags TEXT NOT NULL DEFAULT '[]',
      audience_tags TEXT NOT NULL DEFAULT '[]',
      eligibility_types TEXT NOT NULL DEFAULT '[]',
      is_revert_rate INTEGER NOT NULL DEFAULT 0,
      rate_notes TEXT NOT NULL DEFAULT ''
    );
  `);
  db.run("INSERT INTO snapshots (id, fetched_at, bank_count, rate_count, error_count) VALUES (1, '2026-04-30T00:00:00Z', 2, 4, 0)");
  const insert = db.prepare(`
    INSERT INTO rates (
      snapshot_id, bank_name, brand_group, product_name, product_id, description,
      rate_type, rate, comparison_rate, product_tags, audience_tags, eligibility_types,
      is_revert_rate, rate_notes
    ) VALUES (?, ?, '', ?, ?, '', ?, ?, ?, ?, ?, ?, 0, '')
  `);
  insert.run([1, "Mixed Bank", "Veterans Special", "mixed-veterans", "VARIABLE", 0.0325, 0, "[]", "[]", '["OTHER"]']);
  insert.run([1, "Mixed Bank", "Everyday Variable", "mixed-everyday", "VARIABLE", 0.0554, 0.0592, "[]", "[]", '["MIN_AGE"]']);
  insert.run([1, "Special Bank", "Green Home Loan", "special-green", "VARIABLE", 0.0279, 0.0279, '["green"]', "[]", '["MIN_AGE"]']);
  insert.free();
  return db;
}

describe("queryBanks scope", () => {
  test("everyday scope keeps bank rows and product counts while scoping headline rates", () => {
    const banks = queryBanks(createBankDb(), true);
    const mixed = banks.find((bank) => bank.bank_name === "Mixed Bank");
    const special = banks.find((bank) => bank.bank_name === "Special Bank");

    expect(mixed?.product_count).toBe(2);
    expect(mixed?.best_variable_rate).toBe(0.0554);
    expect(mixed?.best_product_name).toBe("Everyday Variable");
    expect(special?.product_count).toBe(1);
    expect(special?.best_variable_rate).toBeNull();
  });

  test("all-advertised scope includes positive niche lows in headline rates", () => {
    const banks = queryBanks(createBankDb(), false);
    const mixed = banks.find((bank) => bank.bank_name === "Mixed Bank");
    const special = banks.find((bank) => bank.bank_name === "Special Bank");

    expect(mixed?.best_variable_rate).toBe(0.0325);
    expect(mixed?.best_product_name).toBe("Veterans Special");
    expect(special?.best_variable_rate).toBe(0.0279);
  });
});
