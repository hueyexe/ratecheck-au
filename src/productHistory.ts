function slugPart(value: string): string {
  let slug = "";
  let lastHyphen = false;
  for (const char of value.toLowerCase()) {
    const code = char.charCodeAt(0);
    const isAsciiLetter = code >= 97 && code <= 122;
    const isDigit = code >= 48 && code <= 57;
    if (isAsciiLetter || isDigit) {
      slug += char;
      lastHyphen = false;
      continue;
    }
    if (code > 127) continue;
    if (!lastHyphen) {
      slug += "-";
      lastHyphen = true;
    }
  }
  return slug.replace(/^-+|-+$/g, "");
}

function fnv32a(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function productHistoryKey(bankName: string, productId: string): string {
  let readable = `${slugPart(bankName)}-${slugPart(productId)}`.replace(/^-+|-+$/g, "");
  if (!readable) readable = "product";
  if (readable.length > 72) readable = readable.slice(0, 72).replace(/-+$/g, "");
  return `${readable}-${fnv32a(`${bankName}\0${productId}`)}`;
}

export function productHistoryUrl(baseUrl: string, bankName: string, productId: string): string {
  return `${baseUrl}history/products/${productHistoryKey(bankName, productId)}.json`;
}

export function productDetailUrl(baseUrl: string, bankName: string, productId: string): string {
  return `${baseUrl}product-details/products/${productHistoryKey(bankName, productId)}.json`;
}
