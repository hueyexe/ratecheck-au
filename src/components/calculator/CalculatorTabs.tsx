export type CalculatorTab = "Overview" | "What-if" | "Schedule";

interface CalculatorTabsProps {
  activeTab: CalculatorTab;
  onChange: (tab: CalculatorTab) => void;
}

const tabs: CalculatorTab[] = ["Overview", "What-if", "Schedule"];

export default function CalculatorTabs({ activeTab, onChange }: CalculatorTabsProps) {
  return (
    <div className="rounded-full border border-sand-200 bg-sand-100 p-1 dark:border-sand-800 dark:bg-sand-900" role="tablist" aria-label="Calculator views">
      <div className="grid grid-cols-3 gap-1">
        {tabs.map((tab) => {
          const active = tab === activeTab;
          return (
            <button key={tab} type="button" role="tab" aria-selected={active} onClick={() => onChange(tab)} className={`min-h-[44px] rounded-full px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${active ? "bg-accent-500 text-white shadow-sm" : "text-sand-600 hover:bg-sand-50 dark:text-sand-300 dark:hover:bg-sand-800"}`}>
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}
