import { useLocation, Link } from "react-router-dom";
import type { MetaFile } from "../types";
import { useTheme } from "../theme";

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

  const tabClass = (active: boolean) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100"
        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
    }`;

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
              Australian Mortgage Rates
            </h1>
            {meta && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {meta.bankCount} banks · {meta.rateCount.toLocaleString()} rates · Updated {updatedDate}
              </p>
            )}
          </div>
          <button
            onClick={cycleTheme}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "system" ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            ) : theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        </div>

        <nav className="flex gap-0 -mb-px" aria-label="View tabs">
          <Link to="/banks" className={tabClass(isBanksActive)} aria-current={isBanksActive ? "page" : undefined}>
            Banks
          </Link>
          <Link to="/rates" className={tabClass(isRatesActive)} aria-current={isRatesActive ? "page" : undefined}>
            All Rates
          </Link>
        </nav>
      </div>
    </header>
  );
}
