import { useLocation, Link } from "react-router-dom";
import type { MetaFile } from "../types";
import { useTheme } from "../theme";
import MaterialIcon from "./MaterialIcon";

interface HeaderProps {
  meta: MetaFile | null;
}

export default function Header({ meta }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const cycleTheme = () => {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };

  const updatedDate = meta
    ? new Date(meta.generatedAt).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const isBanksActive =
    location.pathname === "/" ||
    location.pathname === "/banks" ||
    location.pathname.startsWith("/bank/") ||
    location.pathname.startsWith("/product/");
  const isRatesActive = location.pathname === "/rates";
  const isAnalyticsActive = location.pathname === "/analytics";
  const isAboutActive = location.pathname === "/about";

  const tabClass = (active: boolean) =>
    `px-3 py-2 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap ${
      active
        ? "bg-accent-500 text-white shadow-sm"
        : "text-sand-600 dark:text-sand-400 hover:bg-sand-100 dark:hover:bg-sand-800"
    }`;

  return (
    <header className="border-b border-sand-200 dark:border-sand-800 bg-sand-50/95 dark:bg-sand-950/95 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {/* Top row: logo + theme toggle */}
        <div className="flex items-center justify-between py-3 gap-4">
          <Link to="/banks" className="flex items-center gap-2.5 group min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-xl bg-accent-500 flex items-center justify-center shadow-sm group-hover:bg-accent-600 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" aria-hidden="true">
                <path d="M3 17l5-5 4 4 9-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-sand-900 dark:text-sand-100 leading-tight tracking-tight">
                Rate<span className="text-accent-500">Check</span>
              </div>
              {meta && (
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-sand-500 dark:text-sand-400 leading-none mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse inline-block" aria-hidden="true" />
                  <span className="nums">{meta.bankCount} banks · {meta.rateCount.toLocaleString()} rates · {updatedDate}</span>
                </div>
              )}
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            <Link to="/banks" className={tabClass(isBanksActive)} aria-current={isBanksActive ? "page" : undefined}>Banks</Link>
            <Link to="/rates" className={tabClass(isRatesActive)} aria-current={isRatesActive ? "page" : undefined}>Rates</Link>
            <Link to="/analytics" className={tabClass(isAnalyticsActive)} aria-current={isAnalyticsActive ? "page" : undefined}>Analytics</Link>
            <Link to="/about" className={tabClass(isAboutActive)} aria-current={isAboutActive ? "page" : undefined}>About</Link>
          </nav>

          <button
            onClick={cycleTheme}
            className="p-2.5 rounded-full text-sand-500 dark:text-sand-400 hover:bg-sand-100 dark:hover:bg-sand-800 transition-colors shrink-0"
            aria-label="Toggle theme"
          >
            <MaterialIcon
              name={theme === "system" ? "settings" : theme === "dark" ? "dark_mode" : "light_mode"}
              className="w-5 h-5"
            />
          </button>
        </div>

        {/* Mobile nav — scrollable pill row */}
        <nav
          className="md:hidden flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4"
          aria-label="Main navigation"
          style={{ scrollbarWidth: "none" }}
        >
          <Link to="/banks" className={tabClass(isBanksActive)} aria-current={isBanksActive ? "page" : undefined}>Banks</Link>
          <Link to="/rates" className={tabClass(isRatesActive)} aria-current={isRatesActive ? "page" : undefined}>Rates</Link>
          <Link to="/analytics" className={tabClass(isAnalyticsActive)} aria-current={isAnalyticsActive ? "page" : undefined}>Analytics</Link>
          <Link to="/about" className={tabClass(isAboutActive)} aria-current={isAboutActive ? "page" : undefined}>About</Link>
        </nav>
      </div>
    </header>
  );
}
