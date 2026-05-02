const productionBaseUrl = "https://ratecheckau.homes/";
const calculatorInstructions = [
  "Before calculating, ask me for the loan amount, rate, term, repayment frequency, repayment type, extra repayments and offset balance.",
  "Use the calculator context to explain assumptions, then show the calculation clearly as an estimate.",
];

export interface AICopyPromptOptions {
  pageName: string;
  pageDescription: string;
  sourcePath: string;
  generatedAt: string | null | undefined;
  baseUrl: string;
}

export function getAICopyBaseUrl(baseUrl: string): string {
  if (/^https?:\/\//.test(baseUrl)) return ensureTrailingSlash(baseUrl);
  return productionBaseUrl;
}

export function buildAICopyPrompt({ pageName, pageDescription, sourcePath, generatedAt, baseUrl }: AICopyPromptOptions): string {
  const root = getAICopyBaseUrl(baseUrl);
  const normalizedSourcePath = sourcePath.replace(/^\/+/g, "");
  const pageUrl = new URL(normalizedSourcePath, root).toString();
  const coreUrl = new URL("llms.txt", root).toString();
  const fullUrl = new URL("llms-full.txt", root).toString();
  const freshness = formatFreshness(generatedAt);

  return [
    "You are helping me understand Australian advertised home loan rates using RateCheck public CDR/open-banking data.",
    "",
    "Use this RateCheck context as source material:",
    `- Current page: ${pageName}`,
    `- Page purpose: ${pageDescription}`,
    `- Data freshness: ${freshness}`,
    `- Core context: ${coreUrl}`,
    `- Page context: ${pageUrl}`,
    `- Full context if needed: ${fullUrl}`,
    "",
    "Prefer everyday/default rates for mainstream comparisons unless I explicitly ask for all advertised products.",
    ...(normalizedSourcePath === "calculator.md" ? calculatorInstructions : []),
    "Please compare options carefully. Explain that these are advertised rates only, not financial advice, and that I need to confirm eligibility and final terms directly with the lender.",
  ].join("\n");
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function formatFreshness(generatedAt: string | null | undefined): string {
  if (!generatedAt) return "unknown";
  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
    timeZoneName: "short",
  });
}
