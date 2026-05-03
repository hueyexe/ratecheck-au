import { classifyEverydayRate, parseJsonStringArray } from "./everydayRates";

interface ProductProfileInput {
  bank_name: string;
  brand_group?: string;
  product_id?: string;
  product_name: string;
  description: string;
  rate?: number | null;
  rate_type?: string;
  repayment_type?: string;
  loan_purpose?: string;
  is_revert_rate?: number | null;
  feature_types?: string | null;
  product_tags?: string | null;
  audience_tags?: string | null;
  eligibility_types?: string | null;
  application_uri?: string | null;
  overview_uri?: string | null;
  terms_uri?: string | null;
  eligibility_uri?: string | null;
  fees_uri?: string | null;
  bundle_uri?: string | null;
  rate_notes?: string | null;
}

interface ProductProfileLink {
  label: string;
  url: string;
}

export interface ProductProfile {
  audienceTags: string[];
  productTags: string[];
  featureTypes: string[];
  eligibilityTypes: string[];
  highlightTags: string[];
  links: ProductProfileLink[];
  fitLabel: "Everyday" | "Specialist" | "Special scenario";
  fitTone: "emerald" | "violet" | "amber";
  isEveryday: boolean;
  isRestricted: boolean;
  isSpecialScenario: boolean;
}

const productProfileCache = new Map<string, ProductProfile>();

export function getProductProfileKey(product: ProductProfileInput): string {
  return [
    product.bank_name,
    product.product_id ?? product.product_name,
    product.rate_type ?? "",
    product.repayment_type ?? "",
    product.loan_purpose ?? "",
  ].join("::");
}

const AUDIENCE_KEYWORDS: Array<{ tag: string; needles: string[] }> = [
  { tag: "police_and_defence", needles: ["police", "bankvic", "fire service", "firefighter", "defence", "military"] },
  { tag: "education_workers", needles: ["teacher", "education"] },
  { tag: "health_workers", needles: ["health professional", "medical", "doctor", "nurse"] },
  { tag: "essential_workers", needles: ["essential worker", "ambulance", "emergency"] },
  { tag: "staff_only", needles: ["staff", "employee", "employees", "team member"] },
];

const PRODUCT_KEYWORDS: Array<{ tag: string; needles: string[] }> = [
  { tag: "offset", needles: ["offset"] },
  { tag: "redraw", needles: ["redraw"] },
  { tag: "package", needles: [" package", "package ", "bundle"] },
  { tag: "bridging", needles: ["bridg"] },
  { tag: "line_of_credit", needles: ["line of credit", "equity access", "revolving"] },
  { tag: "construction", needles: ["construction", "building"] },
  { tag: "first_home_buyer", needles: ["first home"] },
  { tag: "green", needles: ["green", "eco"] },
  { tag: "guarantor", needles: ["guarantor", "guarantee"] },
];

const FEATURE_TAGS: Record<string, string> = {
  OFFSET: "offset",
  REDRAW: "redraw",
  EXTRA_REPAYMENTS: "extra_repayments",
  GUARANTOR: "guarantor",
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function getKeywordTags(text: string, config: Array<{ tag: string; needles: string[] }>): string[] {
  const normalized = text.toLowerCase();
  return config
    .filter(({ needles }) => needles.some((needle) => normalized.includes(needle)))
    .map(({ tag }) => tag);
}

export function formatAudienceTag(tag: string): string {
  switch (tag) {
    case "police_and_defence":
      return "Police & defence";
    case "education_workers":
      return "Teachers & education";
    case "health_workers":
      return "Medical professionals";
    case "essential_workers":
      return "Essential workers";
    case "staff_only":
      return "Staff only";
    case "students":
      return "Students";
    case "pensioners":
      return "Pensioners";
    case "business":
      return "Business";
    case "employment_restricted":
      return "Employment restricted";
    default:
      return tag.replaceAll("_", " ");
  }
}

export function formatProductTag(tag: string): string {
  switch (tag) {
    case "offset":
      return "Offset";
    case "redraw":
      return "Redraw";
    case "extra_repayments":
      return "Extra repayments";
    case "package":
      return "Package";
    case "bridging":
      return "Bridging";
    case "line_of_credit":
      return "Line of credit";
    case "construction":
      return "Construction";
    case "first_home_buyer":
      return "First home buyer";
    case "green":
      return "Green";
    case "guarantor":
      return "Guarantor";
    default:
      return tag.replaceAll("_", " ");
  }
}

export function getBankAudienceTags(bankName: string, brandGroup: string = ""): string[] {
  return unique(getKeywordTags(`${bankName} ${brandGroup}`, AUDIENCE_KEYWORDS));
}

export function buildProductProfile(product: ProductProfileInput): ProductProfile {
  const cacheKey = [
    product.product_id ?? "",
    product.bank_name,
    product.brand_group ?? "",
    product.product_name,
    product.description,
    String(product.rate ?? ""),
    product.rate_type ?? "",
    product.repayment_type ?? "",
    product.loan_purpose ?? "",
    String(product.is_revert_rate ?? ""),
    product.feature_types ?? "",
    product.product_tags ?? "",
    product.audience_tags ?? "",
    product.eligibility_types ?? "",
    product.rate_notes ?? "",
  ].join("::");

  const cached = productProfileCache.get(cacheKey);
  if (cached) return cached;

  const text = [product.bank_name, product.brand_group ?? "", product.product_name, product.description ?? "", product.rate_notes ?? ""]
    .filter((value) => value.length > 0)
    .join(" ")
    .toLowerCase();
  const featureTypes = unique(parseJsonStringArray(product.feature_types));
  const explicitAudienceTags = parseJsonStringArray(product.audience_tags);
  const eligibilityTypes = unique(parseJsonStringArray(product.eligibility_types));
  const audienceTags = unique([
    ...explicitAudienceTags,
    ...getBankAudienceTags(product.bank_name, product.brand_group),
    ...getKeywordTags(text, AUDIENCE_KEYWORDS),
    ...eligibilityTypes
      .filter((type) => ["BUSINESS", "EMPLOYMENT_STATUS", "PENSION_RECIPIENT", "STAFF", "STUDENT"].includes(type))
      .map((type) => {
        switch (type) {
          case "BUSINESS":
            return "business";
          case "PENSION_RECIPIENT":
            return "pensioners";
          case "STAFF":
            return "staff_only";
          case "STUDENT":
            return "students";
          default:
            return "employment_restricted";
        }
      }),
  ]);
  const productTags = unique([
    ...parseJsonStringArray(product.product_tags),
    ...featureTypes.map((type) => FEATURE_TAGS[type]).filter(Boolean),
    ...getKeywordTags(text, PRODUCT_KEYWORDS),
  ]);
  const everydayClassification = classifyEverydayRate({
    ...product,
    product_tags: JSON.stringify(productTags),
    audience_tags: JSON.stringify(audienceTags),
    eligibility_types: JSON.stringify(eligibilityTypes),
  });
  const isRestricted = everydayClassification.isRestricted;
  const isSpecialScenario = everydayClassification.isSpecialScenario;
  const isEveryday = everydayClassification.isEveryday;

  const profile: ProductProfile = {
    audienceTags,
    productTags,
    featureTypes,
    eligibilityTypes,
    highlightTags: unique([...audienceTags.map(formatAudienceTag), ...productTags.map(formatProductTag)]).slice(0, 3),
    links: [
      { label: "Apply", url: product.application_uri ?? "" },
      { label: "Overview", url: product.overview_uri ?? "" },
      { label: "Terms", url: product.terms_uri ?? "" },
      { label: "Eligibility", url: product.eligibility_uri ?? "" },
      { label: "Pricing", url: product.fees_uri ?? "" },
      { label: "Bundle", url: product.bundle_uri ?? "" },
    ].filter((link) => Boolean(link.url)),
    fitLabel: isRestricted ? "Specialist" : isSpecialScenario ? "Special scenario" : "Everyday",
    fitTone: isRestricted ? "violet" : isSpecialScenario ? "amber" : "emerald",
    isEveryday,
    isRestricted,
    isSpecialScenario,
  };

  productProfileCache.set(cacheKey, profile);
  return profile;
}
