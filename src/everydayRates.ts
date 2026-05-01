export interface EverydayRateInput {
  bank_name: string;
  brand_group?: string;
  product_name: string;
  description?: string | null;
  product_tags?: string | null;
  audience_tags?: string | null;
  eligibility_types?: string | null;
  rate_notes?: string | null;
  is_revert_rate?: number | null;
  rate?: number | null;
}

export interface EverydayRateClassification {
  isEveryday: boolean;
  isRestricted: boolean;
  isSpecialScenario: boolean;
  reasons: string[];
}

const outlierFloor = 0.04;
const restrictiveEligibilityTypes = new Set(["BUSINESS", "EMPLOYMENT_STATUS", "PENSION_RECIPIENT", "STAFF", "STUDENT"]);
const specialProductTags = new Set(["bridging", "construction", "first_home_buyer", "green", "line_of_credit"]);
const restrictedAudienceKeywords = ["police", "bankvic", "fire service", "firefighter", "defence", "military", "teacher", "education", "health professional", "medical", "doctor", "nurse", "essential worker", "ambulance", "emergency", "staff", "employee", "employees", "team member"];
const specialPurposeKeywords = ["veteran", "veterans", "green", "sustainable", "eco", "first home", "first-home", "construction", "building", "bridging", "line of credit", "equity access", "revolving"];

export function parseJsonStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
  } catch {
    return [];
  }
}

export function classifyEverydayRate(rate: EverydayRateInput): EverydayRateClassification {
  const reasons: string[] = [];
  const productTags = parseJsonStringArray(rate.product_tags);
  const audienceTags = parseJsonStringArray(rate.audience_tags);
  const eligibilityTypes = parseJsonStringArray(rate.eligibility_types);
  const text = [rate.bank_name, rate.brand_group ?? "", rate.product_name, rate.description ?? "", rate.rate_notes ?? ""]
    .join(" ")
    .toLowerCase();
  const isRestricted = audienceTags.length > 0 || eligibilityTypes.some((type) => restrictiveEligibilityTypes.has(type)) || restrictedAudienceKeywords.some((needle) => text.includes(needle));
  const isOutlierOrRevert = rate.is_revert_rate === 1 || (typeof rate.rate === "number" && rate.rate > 0 && rate.rate < outlierFloor);
  const isSpecialScenario = isOutlierOrRevert || productTags.some((tag) => specialProductTags.has(tag)) || specialPurposeKeywords.some((needle) => text.includes(needle));

  if (rate.is_revert_rate === 1) reasons.push("revert rate");
  if (typeof rate.rate === "number" && rate.rate > 0 && rate.rate < outlierFloor) reasons.push("below market floor");
  if (isRestricted) reasons.push("restricted audience");
  if (isSpecialScenario) reasons.push("special purpose");

  return {
    isEveryday: reasons.length === 0,
    isRestricted,
    isSpecialScenario,
    reasons,
  };
}

export function isEverydayRate(rate: EverydayRateInput): boolean {
  return classifyEverydayRate(rate).isEveryday;
}
