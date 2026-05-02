import { useCallback, useState } from "react";
import type { Database } from "sql.js";
import { useUrlFilters } from "./hooks/useUrlState";
import type { ExportRow } from "./types";
import AnalyticsPage from "./components/AnalyticsPage";

const CSV_HEADERS: Array<keyof ExportRow> = [
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
  "product_tags",
  "audience_tags",
  "feature_types",
  "last_updated",
];

async function loadDatabase(): Promise<Database> {
  const { initDB } = await import("./db");
  return initDB();
}

export default function AnalyticsRoute() {
  const [filters] = useUrlFilters();
  const [db, setDb] = useState<Database | null>(null);
  const [actionError, setActionError] = useState("");

  const ensureDb = useCallback(async () => {
    if (db) return db;
    const database = await loadDatabase();
    setDb(database);
    return database;
  }, [db]);

  const downloadCsv = useCallback(async () => {
    setActionError("");
    try {
      const [{ queryExportRows }, { rowsToCsv }, { downloadTextFile }] = await Promise.all([
        import("./db"),
        import("./utils/csv"),
        import("./utils/download"),
      ]);
      const database = await ensureDb();
      const rows = queryExportRows(database, filters);
      const csv = rowsToCsv(rows, CSV_HEADERS);

      downloadTextFile({
        filename: `mortgage-rates-${new Date().toISOString().slice(0, 10)}.csv`,
        text: csv,
        mimeType: "text/csv;charset=utf-8;",
      });
    } catch {
      setActionError("CSV could not be prepared. Check your connection and try again.");
    }
  }, [ensureDb, filters]);

  return (
    <>
      {actionError && (
        <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" role="alert">
          {actionError}
        </div>
      )}
      <AnalyticsPage analyticsUrl={import.meta.env.BASE_URL + "analytics.json"} onDownloadCsv={downloadCsv} />
    </>
  );
}
