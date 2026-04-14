import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import type { Database } from "sql.js";
import { queryProductById } from "../db";
import { buildProductProfile, formatAudienceTag, formatProductTag } from "../productProfile";

interface ProductDetailProps {
  db: Database;
}

function formatRate(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

export default function ProductDetail({ db }: ProductDetailProps) {
  const { productId = "" } = useParams<{ productId: string }>();
  const products = useMemo(() => queryProductById(db, productId), [db, productId]);
  const product = products[0];
  const profile = useMemo(() => (products[0] ? buildProductProfile(products[0]) : null), [products]);

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-400 text-sm">No product found.</p>
        <Link to="/banks" className="text-primary-600 dark:text-primary-400 text-sm mt-2 inline-block hover:underline">
          ← Back to all banks
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link to={`/bank/${encodeURIComponent(product.bank_name)}`} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 inline-block">
        ← Back to {product.bank_name}
      </Link>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{product.product_name}</h2>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{product.description || "No description available."}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
          profile?.fitTone === "emerald"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            : profile?.fitTone === "violet"
              ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        }`}>
          {profile?.fitLabel}
        </span>
        {profile?.audienceTags.map((tag) => (
          <span key={tag} className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            {formatAudienceTag(tag)}
          </span>
        ))}
        {profile?.productTags.map((tag) => (
          <span key={tag} className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {formatProductTag(tag)}
          </span>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-gray-500 dark:text-gray-400">Rate</div>
          <div className="font-mono font-semibold text-lg text-gray-900 dark:text-gray-100">{formatRate(product.rate)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-gray-500 dark:text-gray-400">Comparison</div>
          <div className="font-mono font-semibold text-lg text-gray-900 dark:text-gray-100">{formatRate(product.comparison_rate)}</div>
        </div>
      </div>
      {product.rate_notes && (
        <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
          <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">Rate notes</div>
          {product.rate_notes}
        </div>
      )}
      {profile && profile.links.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-3">Useful links</div>
          <div className="flex flex-wrap gap-2">
            {profile.links.map((link) => (
              <a
                key={`${link.label}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
