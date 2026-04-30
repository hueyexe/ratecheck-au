import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { Database } from "sql.js";
import type { FilterState, MetaFile } from "./types";
import { initDB, queryBestRatesByBank, queryDashboardStats, queryRateDistribution, queryRateHistoryByProduct, queryRates } from "./db";
import { useUrlFilters } from "./hooks/useUrlState";
import { buildProductProfile, getProductProfileKey } from "./productProfile";
import { shouldResetScroll } from "./scrollRestoration";
import Header from "./components/Header";
import Filters from "./components/Filters";
import LoadingSkeleton from "./components/LoadingSkeleton";
import RateTable from "./components/RateTable";
import SiteFeedback from "./components/SiteFeedback";

const BankDetail = lazy(() => import("./components/BankDetail"));
const BanksView = lazy(() => import("./components/BanksView"));
const CompareDrawer = lazy(() => import("./components/CompareDrawer"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const ProductDetail = lazy(() => import("./components/ProductDetail"));

function ScrollToTop() {
  const { pathname } = useLocation();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    if (shouldResetScroll(previousPathname.current, pathname)) {
      window.scrollTo({ top: 0, left: 0 });
    }
    previousPathname.current = pathname;
  }, [pathname]);

  return null;
}

function RatesPage({
  stats,
  distribution,
  bestRates,
  filters,
  setFilters,
  totalRates,
  rates,
  profiles,
  handleSort,
  db,
}: {
  stats: ReturnType<typeof queryDashboardStats> | null;
  distribution: ReturnType<typeof queryRateDistribution>;
  bestRates: ReturnType<typeof queryBestRatesByBank>;
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  totalRates: number;
  rates: ReturnType<typeof queryRates>;
  profiles: Map<string, ReturnType<typeof buildProductProfile>>;
  handleSort: (key: FilterState["sortKey"]) => void;
  db: Database;
}) {
  const requestHistory = useCallback(
    (productId: string, rateType: string, repaymentType: string, loanPurpose: string) => {
      return queryRateHistoryByProduct(db, productId, rateType, repaymentType, loanPurpose);
    },
    [db],
  );

  return (
    <>
      <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 rounded-2xl bg-sand-200 dark:bg-sand-800 animate-pulse" />)}</div>}>
        <Dashboard stats={stats} distribution={distribution} bestRates={bestRates} />
      </Suspense>
      <Filters filters={filters} onChange={setFilters} total={totalRates} filtered={rates.length} />
      <RateTable rates={rates} filters={filters} onSort={handleSort} profiles={profiles} onRequestHistory={requestHistory} />
    </>
  );
}

export default function DataRoutes({ meta }: { meta: MetaFile | null }) {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  const [db, setDb] = useState<Database | null>(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useUrlFilters();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const isRatesRoute = pathname === "/rates";

  useEffect(() => {
    let cancelled = false;

    initDB()
      .then((database) => {
        if (!cancelled) setDb(database);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => (db && isRatesRoute ? queryDashboardStats(db) : null), [db, isRatesRoute]);
  const distribution = useMemo(() => (db && isRatesRoute ? queryRateDistribution(db) : []), [db, isRatesRoute]);
  const bestRates = useMemo(() => (db && isRatesRoute ? queryBestRatesByBank(db, 12) : []), [db, isRatesRoute]);
  const rawRates = useMemo(() => (db && isRatesRoute ? queryRates(db, filters) : []), [db, filters, isRatesRoute]);
  const rateProfiles = useMemo(() => {
    const profiles = new Map<string, ReturnType<typeof buildProductProfile>>();
    for (const rate of rawRates) {
      const key = getProductProfileKey(rate);
      if (!profiles.has(key)) {
        profiles.set(key, buildProductProfile(rate));
      }
    }
    return profiles;
  }, [rawRates]);
  const rates = useMemo(
    () => (filters.everydayOnly && filters.audience.length === 0 ? rawRates.filter((rate) => rateProfiles.get(getProductProfileKey(rate))?.isEveryday) : rawRates),
    [filters.everydayOnly, filters.audience.length, rawRates, rateProfiles],
  );
  const totalRates = rawRates.length;

  const handleSort = useCallback((key: FilterState["sortKey"]) => {
    setFilters({
      ...filters,
      sortKey: key,
      sortAsc: filters.sortKey === key ? !filters.sortAsc : true,
    });
  }, [filters, setFilters]);

  const openDrawer = useCallback(() => {
    setDrawerMounted(true);
    setDrawerOpen(true);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-sand-50 dark:bg-sand-950">
        <div className="text-center p-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-rose-600 dark:text-rose-400">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-rose-600 dark:text-rose-400 font-medium">Failed to load</p>
          <p className="text-sm text-sand-500 dark:text-sand-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!db) {
    return <LoadingSkeleton />;
  }

  const activeDb = db;

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-sand-950 text-sand-900 dark:text-sand-100">
      <ScrollToTop />
      <Header meta={meta} />
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <Suspense fallback={<LoadingSkeleton />}>
          <div className="animate-fade-up">
            <Routes>
              <Route path="/" element={<Navigate to="/banks" replace />} />
              <Route path="/banks" element={<BanksView db={activeDb} />} />
              <Route path="/bank/:bankName" element={<BankDetail db={activeDb} />} />
              <Route path="/product/:productId" element={<ProductDetail db={activeDb} />} />
              <Route path="/rates" element={<RatesPage stats={stats} distribution={distribution} bestRates={bestRates} filters={filters} setFilters={setFilters} totalRates={totalRates} rates={rates} profiles={rateProfiles} handleSort={handleSort} db={activeDb} />} />
              <Route path="*" element={<Navigate to="/banks" replace />} />
            </Routes>
          </div>
        </Suspense>
      </main>

      {pathname === "/rates" && (
        <button
          onClick={openDrawer}
          className="fixed right-4 md:right-6 px-4 py-3 min-h-[44px] rounded-full bg-accent-500 hover:bg-accent-600 text-white font-medium text-sm shadow-lg transition-all duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 z-30"
          style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
          aria-label="Compare banks"
        >
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Compare
          </span>
        </button>
      )}

      {drawerMounted && (
        <Suspense fallback={null}>
          <CompareDrawer db={activeDb} isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </Suspense>
      )}
      <SiteFeedback meta={meta} />
    </div>
  );
}
