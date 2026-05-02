import { useState, useEffect, lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { MetaFile } from "./types";
import Header from "./components/Header";
const CalculatorPage = lazy(() => import("./components/CalculatorPage"));
import LoadingSkeleton from "./components/LoadingSkeleton";

const AboutPage = lazy(() => import("./components/AboutPage"));
const AnalyticsRoute = lazy(() => import("./AnalyticsRoute"));
const DataRoutes = lazy(() => import("./DataRoutes"));

function Shell({ meta, children, mainClassName = "max-w-7xl mx-auto p-4 md:p-6" }: { meta: MetaFile | null; children: ReactNode; mainClassName?: string }) {
  return (
    <div className="min-h-screen bg-sand-50 dark:bg-sand-950 text-sand-900 dark:text-sand-100">
      <Header meta={meta} />
      <main className={mainClassName}>{children}</main>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  const isCalculatorRoute = pathname === "/calculator";
  const isAboutRoute = pathname === "/about";
  const isAnalyticsRoute = pathname === "/analytics";
  const [meta, setMeta] = useState<MetaFile | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(import.meta.env.BASE_URL + "meta.json")
      .then((r) => r.json())
      .then((metaData: MetaFile) => {
        if (!cancelled) setMeta(metaData);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  if (isCalculatorRoute) {
    return (
      <Shell meta={meta}>
        <Suspense fallback={<LoadingSkeleton />}>
          <CalculatorPage generatedAt={meta?.generatedAt} />
        </Suspense>
      </Shell>
    );
  }

  if (isAnalyticsRoute) {
    return (
      <Shell meta={meta} mainClassName="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <Suspense fallback={<LoadingSkeleton />}>
          <AnalyticsRoute />
        </Suspense>
      </Shell>
    );
  }

  if (isAboutRoute) {
    return (
      <Shell meta={meta} mainClassName="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <Suspense fallback={<LoadingSkeleton />}>
          <AboutPage meta={meta} />
        </Suspense>
      </Shell>
    );
  }

  return <Suspense fallback={<LoadingSkeleton />}><DataRoutes meta={meta} /></Suspense>;
}
