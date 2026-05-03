export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-sand-50 dark:bg-sand-950">
      {/* Header skeleton */}
      <div className="border-b border-sand-200 dark:border-sand-800 bg-sand-50 dark:bg-sand-950 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-200 dark:bg-accent-900 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-24 bg-sand-200 dark:bg-sand-800 rounded-full animate-pulse" />
              <div className="h-3 w-40 bg-sand-200 dark:bg-sand-800 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            {[48, 40, 56, 36].map((w, i) => (
              <div key={i} className="h-8 rounded-full bg-sand-200 dark:bg-sand-800 animate-pulse" style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
        {/* Hero + supporting stats */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
          <div className="rounded-2xl bg-accent-200 dark:bg-accent-900 h-32 animate-pulse" />
          <div className="grid grid-cols-3 md:grid-cols-1 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-sand-200 dark:border-sand-800 bg-white dark:bg-sand-900 p-4 h-20 animate-pulse" />
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-sand-200 dark:border-sand-800 bg-white dark:bg-sand-900 p-5 h-72 animate-pulse" />
          ))}
        </div>

        {/* Loading message */}
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-sand-500 dark:text-sand-400">
          <span className="w-2 h-2 rounded-full bg-accent-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-accent-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-accent-400 animate-bounce" style={{ animationDelay: "300ms" }} />
          <span className="ml-1">Fetching the latest CDR rate snapshot…</span>
        </div>

        {/* Table rows */}
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 animate-pulse"
              style={{ opacity: 1 - i * 0.1 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
