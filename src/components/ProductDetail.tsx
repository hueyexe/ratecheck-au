import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import type { Database } from "sql.js";
import { queryProductById } from "../db";
import { buildProductProfile, formatAudienceTag, formatProductTag } from "../productProfile";
import MaterialIcon from "./MaterialIcon";
import { useSEO } from "../hooks/useSEO";

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
  useSEO(product?.product_name || "Product", product ? `${product.bank_name} — ${product.product_name}. Rate: ${formatRate(product.rate)}.` : undefined);

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sand-500 dark:text-sand-400 text-sm">No product found.</p>
        <Link to="/banks" className="text-accent-600 dark:text-accent-400 text-sm mt-2 inline-flex items-center gap-1 hover:underline">
          <MaterialIcon name="arrow_back" className="w-4 h-4" />
          Back to all banks
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link to={`/bank/${encodeURIComponent(product.bank_name)}`} className="text-sm text-sand-500 dark:text-sand-400 hover:text-accent-600 dark:hover:text-accent-400 mb-3 inline-flex items-center gap-1 py-2 -my-2 transition-colors">
        <MaterialIcon name="arrow_back" className="w-4 h-4" />
        Back to {product.bank_name}
      </Link>
      <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-100">{product.product_name}</h2>
      <p className="mt-2 text-sm text-sand-500 dark:text-sand-400 leading-6">{product.description || "No description available."}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
          profile?.fitTone === "emerald"
            ? "bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300"
            : profile?.fitTone === "violet"
              ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        }`}>
          {profile?.fitLabel}
        </span>
        {profile?.audienceTags.map((tag) => (
          <span key={tag} className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
            {formatAudienceTag(tag)}
          </span>
        ))}
        {profile?.productTags.map((tag) => (
          <span key={tag} className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-sand-100 text-sand-700 dark:bg-sand-800 dark:text-sand-300">
            {formatProductTag(tag)}
          </span>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
          <div className="text-sand-500 dark:text-sand-400 text-xs uppercase tracking-wide">Rate</div>
          <div className="nums font-bold text-2xl text-accent-600 dark:text-accent-400 mt-1">{formatRate(product.rate)}</div>
        </div>
        <div className="rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
          <div className="text-sand-500 dark:text-sand-400 text-xs uppercase tracking-wide">Comparison rate</div>
          <div className="nums font-bold text-2xl text-sand-700 dark:text-sand-300 mt-1">{formatRate(product.comparison_rate)}</div>
        </div>
      </div>

      {product.rate_notes && (
        <div className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4 text-sm text-sand-600 dark:text-sand-300">
          <div className="font-semibold text-sand-900 dark:text-sand-100 mb-1">Rate notes</div>
          {product.rate_notes}
        </div>
      )}

      {profile && profile.links.length > 0 && (
        <div className="mt-4 rounded-2xl border border-sand-200 dark:border-sand-800 p-4">
          <div className="font-semibold text-sm text-sand-900 dark:text-sand-100 mb-3">Useful links</div>
          <div className="flex flex-wrap gap-2">
            {profile.links.map((link) => (
              <a
                key={`${link.label}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex px-3 py-1.5 rounded-full text-xs font-medium bg-sand-100 text-sand-700 hover:bg-accent-100 hover:text-accent-700 dark:bg-sand-800 dark:text-sand-300 dark:hover:bg-accent-900/30 dark:hover:text-accent-300 transition-colors"
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
