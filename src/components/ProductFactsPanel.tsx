import { getProductFactRows, locationSpecificRatesCopy } from "../productFacts";
import type { ProductFactInput } from "../productFacts";

interface ProductFactsPanelProps {
  product: ProductFactInput;
}

export default function ProductFactsPanel({ product }: ProductFactsPanelProps) {
  const facts = getProductFactRows(product);

  return (
    <section
      className="mt-4 rounded-2xl border border-sand-200 bg-sand-50 p-4 dark:border-sand-800 dark:bg-sand-900"
      aria-labelledby="product-facts-heading"
    >
      <h3 id="product-facts-heading" className="text-sm font-semibold text-sand-950 dark:text-sand-50">
        What this product says it includes
      </h3>
      <div className="mt-3 grid gap-2">
        {facts.map((fact) => (
          <div key={fact.key} className="rounded-2xl border border-sand-200 bg-white p-3 dark:border-sand-800 dark:bg-sand-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-sand-900 dark:text-sand-100">{fact.label}</p>
                <p className="mt-1 text-xs leading-5 text-sand-600 dark:text-sand-400">{fact.description}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  fact.listed
                    ? "bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300"
                    : "bg-sand-100 text-sand-600 dark:bg-sand-800 dark:text-sand-300"
                }`}
              >
                {fact.status}
              </span>
            </div>
          </div>
        ))}
        <div className="rounded-2xl border border-sand-200 bg-white p-3 dark:border-sand-800 dark:bg-sand-950">
          <p className="text-sm font-semibold text-sand-900 dark:text-sand-100">Location-specific rates</p>
          <p className="mt-1 text-xs leading-5 text-sand-600 dark:text-sand-400">{locationSpecificRatesCopy}</p>
        </div>
      </div>
    </section>
  );
}
