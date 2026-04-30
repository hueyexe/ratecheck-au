interface CalculatorActionsProps {
  onReset: () => void;
  onExport: () => void;
  onShare: () => void;
  shareMessage: string;
}

export default function CalculatorActions({ onReset, onExport, onShare, shareMessage }: CalculatorActionsProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <ActionButton label="Reset" onClick={onReset} variant="quiet" />
        <ActionButton label="Export CSV" onClick={onExport} />
        <ActionButton label="Share scenario" onClick={onShare} />
      </div>
      {shareMessage && <p className="text-sm font-medium text-accent-700 dark:text-accent-300" role="status">{shareMessage}</p>}
    </div>
  );
}

function ActionButton({ label, onClick, variant = "default" }: { label: string; onClick: () => void; variant?: "default" | "quiet" }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${variant === "quiet" ? "border border-sand-200 text-sand-700 hover:bg-sand-100 dark:border-sand-700 dark:text-sand-200 dark:hover:bg-sand-800" : "bg-sand-900 text-sand-50 hover:bg-sand-800 dark:bg-sand-100 dark:text-sand-950 dark:hover:bg-sand-200"}`}>
      {label}
    </button>
  );
}
