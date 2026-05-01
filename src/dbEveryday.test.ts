import { describe, expect, test } from "bun:test";

import { buildEverydayWhereClause, getScopeRateFloor } from "./db";

describe("buildEverydayWhereClause", () => {
  test("builds a conservative SQL predicate for everyday headline rates", () => {
    const clause = buildEverydayWhereClause("r");

    expect(clause.sql).toContain("COALESCE(r.is_revert_rate,0) = 0");
    expect(clause.sql).toContain("r.rate >= 0.04");
    expect(clause.sql).toContain("json_each(COALESCE(r.audience_tags,'[]'))");
    expect(clause.sql).toContain("LOWER(COALESCE(r.bank_name,'')) NOT LIKE ?");
    expect(clause.params).toContain("green");
    expect(clause.params).toContain("EMPLOYMENT_STATUS");
    expect(clause.params).toContain("%veteran%");
  });
});

describe("getScopeRateFloor", () => {
  test("uses the market floor for everyday scope and any positive rate for all-advertised scope", () => {
    expect(getScopeRateFloor(true)).toBe(0.04);
    expect(getScopeRateFloor(false)).toBe(0);
  });
});
