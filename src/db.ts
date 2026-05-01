import initSqlJs from "sql.js";
import type { Database } from "sql.js";
import type {
  FilterState,
  RateRow,
  BankSummary,
  BankSortKey,
  BankProduct,
  RateTrendPoint,
  RateHistoryPoint,
  DashboardStats,
  RateDistributionBucket,
  BestRateByBank,
  ExportRow,
} from "./types";

let db: Database | null = null;
let dbPromise: Promise<Database> | null = null;
const rateColumnCache = new WeakMap<Database, Set<string>>();
const rateHistoryCache = new WeakMap<Database, Map<string, RateTrendPoint[]>>();

export async function initDB(): Promise<Database> {
  if (db) return db;
  if (dbPromise) return dbPromise;

  dbPromise = Promise.all([
    initSqlJs({
      locateFile: (file: string) => `${import.meta.env.BASE_URL}${file}`,
    }),
    fetch(`${import.meta.env.BASE_URL}rates.db`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load database: ${r.statusText}`);
      return r.arrayBuffer();
    }),
  ])
    .then(([SQL, buf]) => {
      db = new SQL.Database(new Uint8Array(buf));
      return db;
    })
    .catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });

  return dbPromise;
}

const VARIABLE_TYPES = "'VARIABLE','INTRODUCTORY','BUNDLE_DISCOUNT_VARIABLE'";
const FIXED_TYPES = "'FIXED','BUNDLE_DISCOUNT_FIXED'";
const FEATURE_FILTER_MAP: Record<string, string> = {
  offset: "offset",
  redraw: "redraw",
  extra_repayments: "extra_repayments",
  package: "package",
  guarantor: "guarantor",
  cashback: "cashback",
  first_home_buyer: "first home buyer",
};
const AUDIENCE_FILTER_MAP: Record<string, string> = {
  education_workers: "education_workers",
  health_workers: "health_workers",
  police_and_defence: "police_and_defence",
  essential_workers: "essential_workers",
  first_home_buyer: "first_home_buyer",
};

// Bank name keywords that imply an audience tag — mirrors productProfile.ts AUDIENCE_KEYWORDS
const AUDIENCE_BANK_KEYWORDS: Record<string, string[]> = {
  police_and_defence: ["police", "bankvic", "fire service", "firefighter", "defence", "military"],
  education_workers: ["teacher", "education"],
  health_workers: ["health professional", "medical", "doctor", "nurse"],
  essential_workers: ["essential worker", "ambulance", "emergency"],
  first_home_buyer: ["first home"],
};
const EVERYDAY_EXCLUDED_PRODUCT_TAGS = ["bridging", "construction", "first_home_buyer", "green", "line_of_credit"];
const EVERYDAY_RESTRICTIVE_ELIGIBILITY_TYPES = ["BUSINESS", "EMPLOYMENT_STATUS", "PENSION_RECIPIENT", "STAFF", "STUDENT"];
const EVERYDAY_RESTRICTED_KEYWORDS = ["police", "bankvic", "fire service", "firefighter", "defence", "military", "teacher", "education", "health professional", "medical", "doctor", "nurse", "essential worker", "ambulance", "emergency", "staff", "employee", "employees", "team member"];
const EVERYDAY_SPECIAL_KEYWORDS = ["veteran", "veterans", "green", "sustainable", "eco", "first home", "first-home", "construction", "building", "bridging", "line of credit", "equity access", "revolving"];
const EVERYDAY_KEYWORD_COLUMNS = ["bank_name", "brand_group", "product_name", "description", "rate_notes"];
const BASE_RATE_COLUMNS = [
  "bank_name",
  "brand_group",
  "product_name",
  "product_id",
  "rate_type",
  "rate",
  "comparison_rate",
  "repayment_type",
  "loan_purpose",
  "lvr_min",
  "lvr_max",
  "fixed_term",
  "is_tailored",
  "last_updated",
];
const OPTIONAL_RATE_COLUMNS = [
  { name: "description", fallback: "'' AS description" },
  { name: "application_uri", fallback: "NULL AS application_uri" },
  { name: "overview_uri", fallback: "NULL AS overview_uri" },
  { name: "terms_uri", fallback: "NULL AS terms_uri" },
  { name: "eligibility_uri", fallback: "NULL AS eligibility_uri" },
  { name: "fees_uri", fallback: "NULL AS fees_uri" },
  { name: "bundle_uri", fallback: "NULL AS bundle_uri" },
  { name: "additional_info_uris", fallback: "NULL AS additional_info_uris" },
  { name: "effective_from", fallback: "NULL AS effective_from" },
  { name: "effective_to", fallback: "NULL AS effective_to" },
  { name: "feature_types", fallback: "NULL AS feature_types" },
  { name: "feature_details", fallback: "NULL AS feature_details" },
  { name: "product_tags", fallback: "NULL AS product_tags" },
  { name: "audience_tags", fallback: "NULL AS audience_tags" },
  { name: "eligibility_types", fallback: "NULL AS eligibility_types" },
  { name: "eligibility_details", fallback: "NULL AS eligibility_details" },
  { name: "constraints", fallback: "NULL AS constraints" },
  { name: "fees", fallback: "NULL AS fees" },
  { name: "rate_tiers", fallback: "NULL AS rate_tiers" },
  { name: "rate_conditions", fallback: "NULL AS rate_conditions" },
  { name: "rate_condition_details", fallback: "NULL AS rate_condition_details" },
  { name: "rate_notes", fallback: "NULL AS rate_notes" },
  { name: "is_revert_rate", fallback: "0 AS is_revert_rate" },
];

function latestSnapshotId(db: Database): number | null {
  const r = db.exec("SELECT id FROM snapshots ORDER BY id DESC LIMIT 1");
  if (!r.length || !r[0].values.length) return null;
  return r[0].values[0][0] as number;
}

function hasRateColumn(db: Database, columnName: string): boolean {
  let columns = rateColumnCache.get(db);
  if (!columns) {
    const result = db.exec("PRAGMA table_info(rates)");
    columns = new Set(
      result.flatMap((set) => set.values.map((row) => String(row[1]))),
    );
    rateColumnCache.set(db, columns);
  }
  return columns.has(columnName);
}

function rateSelectColumns(db: Database): string {
  return [
    ...BASE_RATE_COLUMNS,
    ...OPTIONAL_RATE_COLUMNS.map(({ name, fallback }) => (hasRateColumn(db, name) ? name : fallback)),
  ].join(", ");
}

export function buildEverydayWhereClause(alias = "rates"): { sql: string; params: string[] } {
  const prefix = `${alias}.`;
  const keywordParams: string[] = [];
  const keywordConditions = [...EVERYDAY_RESTRICTED_KEYWORDS, ...EVERYDAY_SPECIAL_KEYWORDS].flatMap((keyword) => {
    const param = `%${keyword}%`;
    return EVERYDAY_KEYWORD_COLUMNS.map((column) => {
      keywordParams.push(param);
      return `LOWER(COALESCE(${prefix}${column},'')) NOT LIKE ?`;
    });
  });

  return {
    sql: [
      `COALESCE(${prefix}is_revert_rate,0) = 0`,
      `${prefix}rate >= 0.04`,
      `NOT EXISTS (SELECT 1 FROM json_each(COALESCE(${prefix}audience_tags,'[]')))`,
      `NOT EXISTS (SELECT 1 FROM json_each(COALESCE(${prefix}product_tags,'[]')) WHERE value IN (${EVERYDAY_EXCLUDED_PRODUCT_TAGS.map(() => "?").join(",")}))`,
      `NOT EXISTS (SELECT 1 FROM json_each(COALESCE(${prefix}eligibility_types,'[]')) WHERE value IN (${EVERYDAY_RESTRICTIVE_ELIGIBILITY_TYPES.map(() => "?").join(",")}))`,
      ...keywordConditions,
    ].join(" AND "),
    params: [...EVERYDAY_EXCLUDED_PRODUCT_TAGS, ...EVERYDAY_RESTRICTIVE_ELIGIBILITY_TYPES, ...keywordParams],
  };
}

export function getScopeRateFloor(everydayOnly: boolean): number {
  return everydayOnly ? 0.04 : 0;
}

function buildFilteredWhere(filters: FilterState, sid: number): { sql: string; params: (string | number)[] } {
  const conditions: string[] = ["snapshot_id = ?"];
  const params: (string | number)[] = [sid];

  if (filters.everydayOnly && filters.audience.length === 0) {
    const everyday = buildEverydayWhereClause();
    conditions.push(everyday.sql);
    params.push(...everyday.params);
  }

  if (filters.rateType === "VARIABLE") {
    conditions.push(`rate_type IN (${VARIABLE_TYPES})`);
  } else if (filters.rateType === "FIXED") {
    conditions.push(`rate_type IN (${FIXED_TYPES})`);
  }

  if (filters.loanPurpose) {
    conditions.push("(loan_purpose = ? OR loan_purpose = 'UNCONSTRAINED')");
    params.push(filters.loanPurpose);
  }

  if (filters.repaymentType) {
    conditions.push("(repayment_type = ? OR repayment_type = 'UNCONSTRAINED')");
    params.push(filters.repaymentType);
  }

  if (filters.maxLvr > 0) {
    conditions.push("(lvr_max <= ? OR lvr_max = 0)");
    params.push(filters.maxLvr);
  }

  if (filters.features.length > 0) {
    for (const feature of filters.features) {
      const mapped = FEATURE_FILTER_MAP[feature] ?? feature;
      conditions.push("(product_tags LIKE ? OR feature_types LIKE ?)");
      params.push(`%"${mapped}"%`, `%"${mapped.toUpperCase()}"%`);
    }
  }

  if (filters.audience.length > 0) {
    for (const aud of filters.audience) {
      const mapped = AUDIENCE_FILTER_MAP[aud] ?? aud;
      const keywords = AUDIENCE_BANK_KEYWORDS[aud] ?? [];
      const bankClauses = keywords.map(() => "LOWER(bank_name) LIKE ?");
      const allClauses = [`audience_tags LIKE ?`, ...bankClauses];
      conditions.push(`(${allClauses.join(" OR ")})`);
      params.push(`%"${mapped}"%`, ...keywords.map((k) => `%${k}%`));
    }
  }

  if (filters.fixedTerm) {
    conditions.push("fixed_term = ?");
    params.push(filters.fixedTerm);
  }

  if (filters.search) {
    conditions.push("(bank_name LIKE ? OR product_name LIKE ? OR rate_type LIKE ? OR repayment_type LIKE ? OR loan_purpose LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q, q, q);
  }

  return { sql: conditions.join(" AND "), params };
}

export function queryRates(db: Database, filters: FilterState): RateRow[] {
  const sid = latestSnapshotId(db);
  if (sid === null) return [];
  const { sql: whereSql, params } = buildFilteredWhere(filters, sid);

  const sortColMap: Record<FilterState["sortKey"], string> = {
    rate: "rate",
    comparison_rate: "comparison_rate",
    bank_name: "bank_name",
    product_name: "product_name",
    rate_type: "rate_type",
    repayment_type: "repayment_type",
    loan_purpose: "loan_purpose",
    lvr_max: "lvr_max",
  };
  const orderCol = sortColMap[filters.sortKey] ?? "rate";
  const orderDir = filters.sortAsc ? "ASC" : "DESC";

  const sql = `SELECT ${rateSelectColumns(db)} FROM rates WHERE ${whereSql} ORDER BY ${orderCol} ${orderDir}`;

  const result = db.exec(sql, params);
  if (!result.length) return [];

  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as unknown as RateRow;
  });
}

export function queryExportRows(db: Database, filters: FilterState): ExportRow[] {
  const sid = latestSnapshotId(db);
  if (sid === null) return [];
  const { sql: whereSql, params } = buildFilteredWhere(filters, sid);
  const result = db.exec(
    `
    SELECT
      bank_name,
      brand_group,
      product_name,
      product_id,
      rate_type,
      rate,
      comparison_rate,
      repayment_type,
      loan_purpose,
      lvr_min,
      lvr_max,
      fixed_term,
      COALESCE(product_tags, '') AS product_tags,
      COALESCE(audience_tags, '') AS audience_tags,
      COALESCE(feature_types, '') AS feature_types,
      last_updated
    FROM rates
    WHERE ${whereSql}
    ORDER BY rate ASC, comparison_rate ASC
  `,
    params,
  );
  if (!result.length) return [];
  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as unknown as ExportRow;
  });
}

export function queryRateHistory(
  db: Database,
  productId: string,
  rateType: string,
  repaymentType: string,
  loanPurpose: string,
): RateHistoryPoint[] {
  const sql = `
    SELECT s.fetched_at as date, r.rate
    FROM rates r
    JOIN snapshots s ON r.snapshot_id = s.id
    WHERE r.product_id = ? AND r.rate_type = ? AND r.repayment_type = ? AND r.loan_purpose = ?
    ORDER BY s.fetched_at ASC
  `;
  const result = db.exec(sql, [productId, rateType, repaymentType, loanPurpose]);
  if (!result.length) return [];
  return result[0].values.map((row) => ({
    date: row[0] as string,
    rate: row[1] as number,
  }));
}

export function queryDashboardStats(db: Database, everydayOnly = false): DashboardStats {
  const sid = latestSnapshotId(db);
  if (sid === null) return { lowestVariable: 0, lowestFixed: 0, avgRate: 0, bankCount: 0, rateCount: 0 };
  const everyday = everydayOnly ? buildEverydayWhereClause("r") : null;

  const stats = db.exec(
    `
    SELECT
      MIN(CASE WHEN rate_type IN (${VARIABLE_TYPES}) THEN rate END) as lowest_var,
      MIN(CASE WHEN rate_type IN (${FIXED_TYPES}) THEN rate END) as lowest_fixed,
      AVG(rate) as avg_rate,
      COUNT(DISTINCT bank_name) as bank_count,
      COUNT(*) as rate_count
    FROM rates r WHERE r.snapshot_id = ?${everyday ? ` AND ${everyday.sql}` : ""}
  `,
    everyday ? [sid, ...everyday.params] : [sid],
  );

  if (!stats.length) return { lowestVariable: 0, lowestFixed: 0, avgRate: 0, bankCount: 0, rateCount: 0 };
  const row = stats[0].values[0];
  return {
    lowestVariable: (row[0] as number) || 0,
    lowestFixed: (row[1] as number) || 0,
    avgRate: (row[2] as number) || 0,
    bankCount: (row[3] as number) || 0,
    rateCount: (row[4] as number) || 0,
  };
}

export function queryRateDistribution(db: Database, everydayOnly = false): RateDistributionBucket[] {
  const sid = latestSnapshotId(db);
  if (sid === null) return [];
  const everyday = everydayOnly ? buildEverydayWhereClause("r") : null;
  const rateFloor = getScopeRateFloor(everydayOnly);

  const result = db.exec(
    `
    SELECT
      CAST(ROUND(rate * 200) / 200.0 AS TEXT) || '-' || CAST((ROUND(rate * 200) + 1) / 200.0 AS TEXT) as bucket_label,
      ROUND(rate * 200) / 200.0 as bucket_start,
      SUM(CASE WHEN rate_type IN (${VARIABLE_TYPES}) THEN 1 ELSE 0 END) as variable_count,
      SUM(CASE WHEN rate_type IN (${FIXED_TYPES}) THEN 1 ELSE 0 END) as fixed_count
    FROM rates r
    WHERE r.snapshot_id = ? AND r.rate > ?${everyday ? ` AND ${everyday.sql}` : ""}
    GROUP BY bucket_start
    ORDER BY bucket_start
  `,
    everyday ? [sid, rateFloor, ...everyday.params] : [sid, rateFloor],
  );

  if (!result.length) return [];
  return result[0].values.map((row) => ({
    bucket: `${((row[1] as number) * 100).toFixed(1)}%`,
    variable: row[2] as number,
    fixed: row[3] as number,
  }));
}

export function queryBestRatesByBank(db: Database, limit: number = 15, everydayOnly = true): BestRateByBank[] {
  const sid = latestSnapshotId(db);
  if (sid === null) return [];
  const everyday = everydayOnly ? buildEverydayWhereClause("r") : null;
  const rateFloor = getScopeRateFloor(everydayOnly);

  const result = db.exec(
    `
    SELECT bank_name, MIN(rate) as best_rate, product_name
    FROM rates r
    WHERE r.snapshot_id = ? AND r.rate > ?${everyday ? ` AND ${everyday.sql}` : ""}
    GROUP BY bank_name
    ORDER BY best_rate ASC
    LIMIT ?
  `,
    everyday ? [sid, rateFloor, ...everyday.params, limit] : [sid, rateFloor, limit],
  );

  if (!result.length) return [];
  return result[0].values.map((row) => ({
    bank_name: row[0] as string,
    rate: row[1] as number,
    product_name: row[2] as string,
  }));
}

export function queryBanks(db: Database, everydayOnly = true): BankSummary[] {
  const sid = latestSnapshotId(db);
  if (sid === null) return [];
  const everyday = everydayOnly ? buildEverydayWhereClause("rates") : null;

  const result = db.exec(
    `
    WITH all_rates AS (
      SELECT * FROM rates
      WHERE snapshot_id = ? AND rate > 0
    ),
    scoped_rates AS (
      SELECT * FROM all_rates rates
      ${everyday ? `WHERE ${everyday.sql}` : ""}
    )
    SELECT
      ar.bank_name,
      MAX(ar.brand_group) as brand_group,
      COUNT(DISTINCT ar.product_id) as product_count,
      (SELECT MIN(sr.rate) FROM scoped_rates sr WHERE sr.bank_name = ar.bank_name AND sr.rate_type IN (${VARIABLE_TYPES})) as best_var,
      (SELECT MIN(sr.rate) FROM scoped_rates sr WHERE sr.bank_name = ar.bank_name AND sr.rate_type IN (${FIXED_TYPES})) as best_fixed,
      (SELECT sr2.product_name FROM scoped_rates sr2 WHERE sr2.bank_name = ar.bank_name ORDER BY sr2.rate ASC, sr2.comparison_rate ASC LIMIT 1) as best_product
    FROM all_rates ar
    GROUP BY ar.bank_name
    ORDER BY best_var IS NULL, best_var ASC
  `,
    everyday ? [sid, ...everyday.params] : [sid],
  );

  if (!result.length) return [];
  return result[0].values.map((row) => ({
    bank_name: row[0] as string,
    brand_group: (row[1] as string) || "",
    product_count: row[2] as number,
    best_variable_rate: (row[3] as number) ?? null,
    best_fixed_rate: (row[4] as number) ?? null,
    best_product_name: (row[5] as string) || "",
  }));
}

export function sortBanks(banks: BankSummary[], sortKey: BankSortKey, sortAsc: boolean): BankSummary[] {
  const value = (bank: BankSummary) => {
    switch (sortKey) {
      case "best_variable_rate":
        return bank.best_variable_rate ?? Number.POSITIVE_INFINITY;
      case "best_fixed_rate":
        return bank.best_fixed_rate ?? Number.POSITIVE_INFINITY;
      case "product_count":
        return bank.product_count;
      case "bank_name":
        return bank.bank_name.toLowerCase();
    }
  };

  return [...banks].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (typeof av === "string" && typeof bv === "string") {
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return a.bank_name.localeCompare(b.bank_name);
  });
}

export function queryBankProducts(db: Database, bankName: string, filters?: FilterState): BankProduct[] {
  const sid = latestSnapshotId(db);
  if (sid === null) return [];

  const conditions: string[] = ["snapshot_id = ?", "bank_name = ?"];
  const params: (string | number)[] = [sid, bankName];

  if (filters) {
    if (filters.rateType === "VARIABLE") {
      conditions.push(`rate_type IN (${VARIABLE_TYPES})`);
    } else if (filters.rateType === "FIXED") {
      conditions.push(`rate_type IN (${FIXED_TYPES})`);
    }
    if (filters.loanPurpose) {
      conditions.push("(loan_purpose = ? OR loan_purpose = 'UNCONSTRAINED')");
      params.push(filters.loanPurpose);
    }
    if (filters.repaymentType) {
      conditions.push("(repayment_type = ? OR repayment_type = 'UNCONSTRAINED')");
      params.push(filters.repaymentType);
    }
    if (filters.maxLvr > 0) {
      conditions.push("(lvr_max <= ? OR lvr_max = 0)");
      params.push(filters.maxLvr);
    }
    if (filters.search) {
      conditions.push("(product_name LIKE ? OR rate_type LIKE ? OR repayment_type LIKE ? OR loan_purpose LIKE ?)");
      const q = `%${filters.search}%`;
      params.push(q, q, q, q);
    }
  }

  const sql = `SELECT ${rateSelectColumns(db)} FROM rates WHERE ${conditions.join(" AND ")} ORDER BY rate ASC`;
  const res = db.exec(sql, params);
  if (!res.length) return [];

  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as unknown as BankProduct;
  });
}

export function queryProductById(db: Database, productId: string): BankProduct[] {
  const sid = latestSnapshotId(db);
  if (sid === null) return [];

  const res = db.exec(
    `SELECT ${rateSelectColumns(db)} FROM rates WHERE snapshot_id = ? AND product_id = ? ORDER BY rate ASC`,
    [sid, productId],
  );
  if (!res.length) return [];

  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as unknown as BankProduct;
  });
}

export function queryRateTrend(
  db: Database,
  productId: string,
  rateType: string,
  repaymentType: string,
  loanPurpose: string,
): { trend: "up" | "down" | "stable" | null; change: number | null; history: RateTrendPoint[] } {
  const history = queryRateHistory(db, productId, rateType, repaymentType, loanPurpose);
  if (history.length < 2) {
    return { trend: null, change: null, history };
  }
  const first = history[0].rate;
  const last = history[history.length - 1].rate;
  const change = last - first;
  const trend = change < 0 ? "down" : change > 0 ? "up" : "stable";
  return { trend, change, history };
}

export function queryTopPicks(db: Database): BankProduct[] {
  const sid = latestSnapshotId(db);
  if (sid === null) return [];

  const result = db.exec(
    `
    SELECT ${rateSelectColumns(db)}
    FROM rates
    WHERE snapshot_id = ?
      AND rate_type IN (${VARIABLE_TYPES})
      AND (repayment_type = 'PRINCIPAL_AND_INTEREST' OR repayment_type = 'UNCONSTRAINED')
      AND (loan_purpose = 'OWNER_OCCUPIED' OR loan_purpose = 'UNCONSTRAINED')
      AND rate > 0.03
    ORDER BY rate ASC
    LIMIT 10
  `,
    [sid],
  );

  if (!result.length) return [];
  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as unknown as BankProduct;
  });
}

export function queryRateHistoryByProduct(
  db: Database,
  productId: string,
  rateType: string,
  repaymentType: string,
  loanPurpose: string,
): RateTrendPoint[] {
  const cacheKey = `${productId}::${rateType}::${repaymentType}::${loanPurpose}`;
  let historyCache = rateHistoryCache.get(db);
  if (!historyCache) {
    historyCache = new Map();
    rateHistoryCache.set(db, historyCache);
  }
  const cached = historyCache.get(cacheKey);
  if (cached) return cached;

  const sql = `
    SELECT s.fetched_at as date, r.rate
    FROM rates r
    JOIN snapshots s ON r.snapshot_id = s.id
    WHERE r.product_id = ?
      AND r.rate_type = ?
      AND r.repayment_type = ?
      AND r.loan_purpose = ?
    ORDER BY s.fetched_at ASC
  `;
  const result = db.exec(sql, [productId, rateType, repaymentType, loanPurpose]);
  if (!result.length) {
    historyCache.set(cacheKey, []);
    return [];
  }
  const points = result[0].values.map((row) => ({
    date: row[0] as string,
    rate: row[1] as number,
  }));
  historyCache.set(cacheKey, points);
  return points;
}
