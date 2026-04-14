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
} from "./types";

let db: Database | null = null;

export async function initDB(): Promise<Database> {
  if (db) return db;

  const [SQL, buf] = await Promise.all([
    initSqlJs({
      locateFile: (file: string) => `${import.meta.env.BASE_URL}${file}`,
    }),
    fetch(`${import.meta.env.BASE_URL}rates.db`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load database: ${r.statusText}`);
      return r.arrayBuffer();
    }),
  ]);

  db = new SQL.Database(new Uint8Array(buf));
  return db;
}

const VARIABLE_TYPES = "'VARIABLE','INTRODUCTORY','BUNDLE_DISCOUNT_VARIABLE'";
const FIXED_TYPES = "'FIXED','BUNDLE_DISCOUNT_FIXED'";
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
  { name: "feature_types", fallback: "NULL AS feature_types" },
  { name: "product_tags", fallback: "NULL AS product_tags" },
  { name: "audience_tags", fallback: "NULL AS audience_tags" },
  { name: "eligibility_types", fallback: "NULL AS eligibility_types" },
  { name: "rate_conditions", fallback: "NULL AS rate_conditions" },
  { name: "rate_notes", fallback: "NULL AS rate_notes" },
];

function latestSnapshotId(db: Database): number | null {
  const r = db.exec("SELECT id FROM snapshots ORDER BY id DESC LIMIT 1");
  if (!r.length || !r[0].values.length) return null;
  return r[0].values[0][0] as number;
}

function hasRateColumn(db: Database, columnName: string): boolean {
  const result = db.exec("PRAGMA table_info(rates)");
  return result.some((set) => set.values.some((row) => row[1] === columnName));
}

function rateSelectColumns(db: Database): string {
  return [
    ...BASE_RATE_COLUMNS,
    ...OPTIONAL_RATE_COLUMNS.map(({ name, fallback }) => (hasRateColumn(db, name) ? name : fallback)),
  ].join(", ");
}

export function queryRates(db: Database, filters: FilterState): RateRow[] {
  const sid = latestSnapshotId(db);
  if (sid === null) return [];

  const conditions: string[] = ["snapshot_id = ?"];
  const params: (string | number)[] = [sid];

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
    conditions.push("(bank_name LIKE ? OR product_name LIKE ? OR rate_type LIKE ? OR repayment_type LIKE ? OR loan_purpose LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q, q, q);
  }

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

  const sql = `SELECT ${rateSelectColumns(db)} FROM rates WHERE ${conditions.join(" AND ")} ORDER BY ${orderCol} ${orderDir}`;

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

export function queryDashboardStats(db: Database): DashboardStats {
  const sid = latestSnapshotId(db);
  if (sid === null) return { lowestVariable: 0, lowestFixed: 0, avgRate: 0, bankCount: 0, rateCount: 0 };

  const stats = db.exec(
    `
    SELECT
      MIN(CASE WHEN rate_type IN (${VARIABLE_TYPES}) THEN rate END) as lowest_var,
      MIN(CASE WHEN rate_type IN (${FIXED_TYPES}) THEN rate END) as lowest_fixed,
      AVG(rate) as avg_rate,
      COUNT(DISTINCT bank_name) as bank_count,
      COUNT(*) as rate_count
    FROM rates WHERE snapshot_id = ?
  `,
    [sid],
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

export function queryRateDistribution(db: Database): RateDistributionBucket[] {
  const sid = latestSnapshotId(db);
  if (sid === null) return [];

  const result = db.exec(
    `
    SELECT
      CAST(ROUND(rate * 200) / 200.0 AS TEXT) || '-' || CAST((ROUND(rate * 200) + 1) / 200.0 AS TEXT) as bucket_label,
      ROUND(rate * 200) / 200.0 as bucket_start,
      SUM(CASE WHEN rate_type IN (${VARIABLE_TYPES}) THEN 1 ELSE 0 END) as variable_count,
      SUM(CASE WHEN rate_type IN (${FIXED_TYPES}) THEN 1 ELSE 0 END) as fixed_count
    FROM rates
    WHERE snapshot_id = ? AND rate > 0.03
    GROUP BY bucket_start
    ORDER BY bucket_start
  `,
    [sid],
  );

  if (!result.length) return [];
  return result[0].values.map((row) => ({
    bucket: `${((row[1] as number) * 100).toFixed(1)}%`,
    variable: row[2] as number,
    fixed: row[3] as number,
  }));
}

export function queryBestRatesByBank(db: Database, limit: number = 15): BestRateByBank[] {
  const sid = latestSnapshotId(db);
  if (sid === null) return [];

  const result = db.exec(
    `
    SELECT bank_name, MIN(rate) as best_rate, product_name
    FROM rates
    WHERE snapshot_id = ? AND rate > 0.03
    GROUP BY bank_name
    ORDER BY best_rate ASC
    LIMIT ?
  `,
    [sid, limit],
  );

  if (!result.length) return [];
  return result[0].values.map((row) => ({
    bank_name: row[0] as string,
    rate: row[1] as number,
    product_name: row[2] as string,
  }));
}

export function queryBanks(db: Database): BankSummary[] {
  const sid = latestSnapshotId(db);
  if (sid === null) return [];

  const result = db.exec(
    `
    SELECT
      bank_name,
      MAX(brand_group) as brand_group,
      COUNT(DISTINCT product_id) as product_count,
      MIN(CASE WHEN rate_type IN (${VARIABLE_TYPES}) THEN rate END) as best_var,
      MIN(CASE WHEN rate_type IN (${FIXED_TYPES}) THEN rate END) as best_fixed,
      (SELECT product_name FROM rates r2 WHERE r2.snapshot_id = ? AND r2.bank_name = rates.bank_name AND r2.rate = (SELECT MIN(r3.rate) FROM rates r3 WHERE r3.snapshot_id = ? AND r3.bank_name = rates.bank_name AND r3.rate > 0.03) AND r2.rate > 0.03 LIMIT 1) as best_product
    FROM rates
    WHERE snapshot_id = ? AND rate > 0.03
    GROUP BY bank_name
    ORDER BY best_var ASC
  `,
    [sid, sid, sid],
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
