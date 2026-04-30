export function bankPath(bankName: string): string {
  return `/bank/${encodeURIComponent(bankName)}`;
}

export function productPath(productId: string): string {
  return `/product/${encodeURIComponent(productId)}`;
}

export function ratesSearchPath(query: string): string {
  const params = new URLSearchParams();
  params.set("q", query);
  return `/rates?${params.toString()}`;
}
