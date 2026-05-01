import { useState, useMemo } from "react";
import type { Database } from "sql.js";
import { queryBestRatesByBank, queryRates } from "../db";
import type { RateRow } from "../types";
import { DEFAULT_FILTERS } from "../types";
import MaterialIcon from "./MaterialIcon";

interface CompareDrawerProps {
  db: Database;
  isOpen: boolean;
  onClose: () => void;
}

export default function CompareDrawer({ db, isOpen, onClose }: CompareDrawerProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const banks = useMemo(() => queryBestRatesByBank(db, 100).map((b) => b.bank_name), [db]);

  const compared = useMemo(() => {
    if (selected.length === 0) return [];
    return selected.map((bank) => {
      const rates = queryRates(db, { ...DEFAULT_FILTERS, search: bank });
      const best = rates.reduce<Record<string, RateRow>>((acc, r) => {
        const key = r.rate_type.includes("FIXED") ? "fixed" : "variable";
        if (!acc[key] || r.rate < acc[key].rate) acc[key] = r;
        return acc;
      }, {});
      return { bank, best };
    });
  }, [db, selected]);

  const toggle = (bank: string) => {
    setSelected((prev) =>
      prev.includes(bank) ? prev.filter((b) => b !== bank) : prev.length < 3 ? [...prev, bank] : prev
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 dark:bg-black/60 z-40 animate-fade-up" style={{ animationDuration: "200ms" }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-sand-900 z-50 shadow-2xl dark:border-l dark:border-sand-700 animate-slide-in-right">
        <div className="flex items-center justify-between p-4 border-b border-sand-200 dark:border-sand-700">
          <h2 className="text-lg font-bold text-sand-900 dark:text-sand-100">Compare Banks</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-sand-600 dark:text-sand-200 hover:bg-sand-100 dark:hover:bg-sand-800 transition-colors"
            aria-label="Close comparison drawer"
          >
            <MaterialIcon name="arrow_back" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100%-60px)]">
          <p className="text-sm text-sand-500 dark:text-sand-400 mb-3">
            Pick up to 3 banks to compare side by side ({selected.length}/3)
          </p>

          <div className="flex flex-wrap gap-2 mb-6 max-h-48 overflow-y-auto">
            {banks.map((bank) => (
              <button
                key={bank}
                onClick={() => toggle(bank)}
                className={`px-3 py-2.5 min-h-[44px] rounded-full text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
                  selected.includes(bank)
                    ? "bg-accent-500 text-white"
                    : "bg-sand-100 dark:bg-sand-800 text-sand-700 dark:text-sand-200 hover:bg-sand-200 dark:hover:bg-sand-700"
                } ${!selected.includes(bank) && selected.length >= 3 ? "opacity-40 cursor-not-allowed" : ""}`}
                disabled={!selected.includes(bank) && selected.length >= 3}
              >
                {bank}
              </button>
            ))}
          </div>

          {compared.length > 0 && (
            <div className="space-y-4">
              {compared.map(({ bank, best }) => (
                <div key={bank} className="rounded-2xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-950/40 p-4">
                  <h3 className="font-semibold text-sm text-sand-900 dark:text-sand-100 mb-3">{bank}</h3>
                  {Object.entries(best).map(([type, row]) => (
                    <div key={type} className="flex items-center justify-between py-1.5 border-t border-sand-100 dark:border-sand-700 first:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          type === "fixed"
                            ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                            : "bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300"
                        }`}>
                          {type === "fixed" ? "Fixed" : "Variable"}
                        </span>
                        <span className="text-xs text-sand-500 dark:text-sand-400 truncate">{row.product_name}</span>
                      </div>
                      <span className="nums font-bold text-sm text-sand-900 dark:text-sand-100 shrink-0 ml-2">{(row.rate * 100).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {selected.length === 0 && (
            <div className="text-center py-12 text-sand-400 dark:text-sand-500 text-sm">
              Select banks above to compare their best rates
            </div>
          )}
        </div>
      </div>
    </>
  );
}
