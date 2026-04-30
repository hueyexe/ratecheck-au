import type { MetaFile } from "../types";
import { useSEO } from "../hooks/useSEO";

interface AboutPageProps {
  meta: MetaFile | null;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export default function AboutPage({ meta }: AboutPageProps) {
  useSEO("About", "Free Australian mortgage rate comparison tool. No ads, no affiliate links, no bias.");

  const updatedAt = meta
    ? new Date(meta.generatedAt).toLocaleString("en-AU", {
        day: "numeric", month: "short", year: "numeric",
        hour: "numeric", minute: "2-digit",
        timeZone: "Australia/Sydney", timeZoneName: "short",
      })
    : "Unknown";

  return (
    <div className="max-w-3xl space-y-10">

      {/* Hero */}
      <section className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
          Free · No ads · No affiliate links · No bias
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-sand-900 dark:text-sand-100 leading-tight">
          Find a better home loan rate.<br />No strings attached.
        </h2>
        <p className="text-base text-sand-600 dark:text-sand-300 leading-7 max-w-2xl">
          Australian banks are legally required to publish their mortgage rates publicly.
          This tool collects those rates every 6 hours and puts them all in one place so you can
          compare them quickly — without signing up, without talking to a broker, and without
          anyone earning a commission from your click.
        </p>
        <a
          href="https://github.com/hueyexe/ratecheck-au"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-sand-200 dark:border-sand-700 text-sand-600 dark:text-sand-400 text-sm font-medium hover:border-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          Open source on GitHub
        </a>
      </section>

      {/* Live stats */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[
          { label: "Rates tracked", value: meta?.rateCount.toLocaleString() ?? "—", sub: "updated every 6 hours" },
          { label: "Banks covered", value: meta?.bankCount?.toString() ?? "—", sub: "across Australia" },
          { label: "Data size", value: meta ? formatBytes(meta.dbSizeBytes) : "—", sub: "runs entirely in your browser" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4">
            <div className="text-[11px] uppercase tracking-[0.1em] text-sand-400 dark:text-sand-500">{s.label}</div>
            <div className="mt-1.5 text-2xl font-bold nums text-sand-900 dark:text-sand-100">{s.value}</div>
            <div className="mt-0.5 text-xs text-sand-500 dark:text-sand-400">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* Where does the data come from */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100">Where does the data come from?</h3>
        <p className="text-sm text-sand-600 dark:text-sand-300 leading-7">
          RateCheck uses official Consumer Data Right product data published by registered data holders through a government initiative called
          the{" "}
          <a href="https://www.cdr.gov.au/" target="_blank" rel="noreferrer" className="text-accent-600 dark:text-accent-400 hover:underline">
            Consumer Data Right (CDR)
          </a>
          . It is a public feed of advertised rates and product details - updated regularly, no scraping, no guessing.
          We pull from that feed automatically and show you the results here.
        </p>
        <p className="text-sm text-sand-600 dark:text-sand-300 leading-7">
          It is not guaranteed to include every home loan in Australia. Some broker-only, negotiated, private, retention,
          and some non-participating lender offers may not appear. Your actual rate will depend on your situation,
          credit history, and what you negotiate with the lender.
        </p>
        <p className="text-sm text-sand-600 dark:text-sand-300 leading-7">
          CDR publishes current product data. Rate history starts from snapshots RateCheck has collected, so
          historical trends are built by RateCheck from repeated official CDR snapshots.
        </p>
      </section>

      {/* How to use it */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100">How do I use it?</h3>
        <ul className="space-y-3 text-sm text-sand-600 dark:text-sand-300 leading-7">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-xs font-bold flex items-center justify-center mt-0.5">1</span>
            <span>Use the <strong className="text-sand-800 dark:text-sand-200">Rates</strong> tab to see all products sorted by rate. Filter by variable or fixed, owner-occupied or investment, and repayment type.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-xs font-bold flex items-center justify-center mt-0.5">2</span>
            <span>Use the <strong className="text-sand-800 dark:text-sand-200">Banks</strong> tab to browse by lender and see their full product range.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-xs font-bold flex items-center justify-center mt-0.5">3</span>
            <span>Hit <strong className="text-sand-800 dark:text-sand-200">Compare</strong> to put up to 3 banks side by side.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-xs font-bold flex items-center justify-center mt-0.5">4</span>
            <span>Once you've found something promising, <strong className="text-sand-800 dark:text-sand-200">go directly to the lender</strong> to get the real details and apply.</span>
          </li>
        </ul>
      </section>

      {/* Disclaimer */}
      <section>
        <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-2">
          <div className="font-semibold text-amber-800 dark:text-amber-300">This is not financial advice.</div>
          <p className="text-sm text-amber-700 dark:text-amber-400 leading-6">
            The rates shown here are what banks advertise publicly. The rate you'd actually get depends on your
            income, deposit, credit history, and what you negotiate. Always speak to the lender directly — and
            consider getting independent financial advice — before making any decisions about a home loan.
          </p>
        </div>
      </section>

      {/* Freshness */}
      <section className="rounded-2xl bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-800 p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] text-sand-400 dark:text-sand-500">Last updated</div>
          <div className="mt-1 text-sm font-medium text-sand-900 dark:text-sand-100 nums">{updatedAt}</div>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-accent-600 dark:text-accent-400 shrink-0">
          <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
          Refreshes every 6 hours
        </span>
      </section>

    </div>
  );
}
