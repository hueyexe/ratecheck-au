import { lazy, Suspense, useCallback, useState } from "react";
import type { Database } from "sql.js";
import { useUrlFilters } from "./hooks/useUrlState";
import type { ExportRow } from "./types";
import AnalyticsPage from "./components/AnalyticsPage";

const CompareDrawer = lazy(() => import("./components/CompareDrawer"));

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [loadingDrawer, setLoadingDrawer] = useState(false);
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

  const openDrawer = useCallback(() => {
    setActionError("");
    setLoadingDrawer(true);
    void ensureDb()
      .then(() => {
        setDrawerMounted(true);
        setDrawerOpen(true);
      })
      .catch(() => setActionError("Compare could not load the latest rates. Check your connection and try again."))
      .finally(() => setLoadingDrawer(false));
  }, [ensureDb]);

  return (
    <>
      {actionError && (
        <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" role="alert">
          {actionError}
        </div>
      )}
      <AnalyticsPage analyticsUrl={import.meta.env.BASE_URL + "analytics.json"} onDownloadCsv={downloadCsv} />
      <button
        onClick={openDrawer}
        disabled={loadingDrawer}
        className="fixed right-4 md:right-6 px-4 py-3 min-h-[44px] rounded-full bg-accent-500 hover:bg-accent-600 disabled:bg-sand-300 disabled:text-sand-600 text-white font-medium text-sm shadow-lg transition-all duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 z-30"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        aria-label="Compare banks"
      >
        <span className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          {loadingDrawer ? "Loading..." : "Compare"}
        </span>
      </button>

      {drawerMounted && db && (
        <Suspense fallback={null}>
          <CompareDrawer db={db} isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
