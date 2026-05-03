export interface FilterState {
  rateType: string;
  loanPurpose: string;
  repaymentType: string;
  maxLvr: number;
  bigFourOnly: boolean;
  everydayOnly: boolean;
  search: string;
  sortKey: "rate" | "comparison_rate" | "bank_name" | "product_name" | "rate_type" | "repayment_type" | "loan_purpose" | "lvr_max";
  sortAsc: boolean;
  features: string[];
  audience: string[];
  fixedTerm: string;
}

export interface RateRow {
  rate_id: number;
  bank_name: string;
  brand_group: string;
  product_name: string;
  product_id: string;
  description: string;
  application_uri?: string | null;
  overview_uri?: string | null;
  terms_uri?: string | null;
  eligibility_uri?: string | null;
  fees_uri?: string | null;
  bundle_uri?: string | null;
  additional_info_uris?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  rate_type: string;
  rate: number;
  comparison_rate: number;
  repayment_type: string;
  loan_purpose: string;
  lvr_min: number;
  lvr_max: number;
  fixed_term: string;
  is_tailored: number;
  is_revert_rate?: number | null;
  feature_types?: string | null;
  feature_details?: string | null;
  product_tags?: string | null;
  audience_tags?: string | null;
  eligibility_types?: string | null;
  eligibility_details?: string | null;
  constraints?: string | null;
  fees?: string | null;
  rate_tiers?: string | null;
  rate_conditions?: string | null;
  rate_condition_details?: string | null;
  rate_notes?: string | null;
  last_updated: string;
}

export interface BankSummary {
  bank_name: string;
  brand_group: string;
  product_count: number;
  best_variable_rate: number | null;
  best_fixed_rate: number | null;
  best_product_name: string;
}

export type BankSortKey = "best_variable_rate" | "best_fixed_rate" | "product_count" | "bank_name";

export interface BankProduct {
  bank_name: string;
  brand_group: string;
  product_name: string;
  product_id: string;
  description: string;
  application_uri?: string | null;
  overview_uri?: string | null;
  terms_uri?: string | null;
  eligibility_uri?: string | null;
  fees_uri?: string | null;
  bundle_uri?: string | null;
  additional_info_uris?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  rate_type: string;
  rate: number;
  comparison_rate: number;
  repayment_type: string;
  loan_purpose: string;
  lvr_min: number;
  lvr_max: number;
  fixed_term: string;
  is_tailored: number;
  is_revert_rate?: number | null;
  feature_types?: string | null;
  feature_details?: string | null;
  product_tags?: string | null;
  audience_tags?: string | null;
  eligibility_types?: string | null;
  eligibility_details?: string | null;
  constraints?: string | null;
  fees?: string | null;
  rate_tiers?: string | null;
  rate_conditions?: string | null;
  rate_condition_details?: string | null;
  rate_notes?: string | null;
  last_updated: string;
}

export interface RateTrendPoint {
  date: string;
  rate: number;
}

export interface DashboardStats {
  lowestVariable: number;
  lowestFixed: number;
  avgRate: number;
  bankCount: number;
  rateCount: number;
}

export interface RateDistributionBucket {
  bucket: string;
  variable: number;
  fixed: number;
}

export interface BestRateByBank {
  bank_name: string;
  rate: number;
  product_name: string;
}

export interface RateHistoryPoint {
  date: string;
  rate: number;
}

export interface ProductHistoryPoint {
  date: string;
  rate: number;
  comparisonRate: number;
}

export interface ProductHistoryVariant {
  key: string;
  rateType: string;
  repaymentType: string;
  loanPurpose: string;
  lvrMin: number;
  lvrMax: number;
  fixedTerm?: string;
  points: ProductHistoryPoint[];
}

export interface ProductHistoryFile {
  key: string;
  bankName: string;
  productName: string;
  productId: string;
  firstDate: string;
  lastDate: string;
  variants: ProductHistoryVariant[];
}

export interface MetaFile {
  generatedAt: string;
  bankCount: number;
  rateCount: number;
  dbSizeBytes: number;
  snapshotCount?: number;
  historySpanDays?: number;
}

export interface AnalyticsJSON {
  generatedAt: string;
  snapshotCount: number;
  historySpanDays: number;
  outlierFloor: number;
  summary: {
    lowestVariable: number;
    lowestFixed: number;
    avgRate: number;
    medianRateOOPI: number;
    bankCount: number;
    rateCount: number;
    variableCount: number;
    fixedCount: number;
    lowerCount: number;
    higherCount: number;
    flatCount: number;
  };
  timeline: Array<{
    date: string;
    avgVariable: number;
    avgFixed: number;
    lowestVariable: number;
    lowestFixed: number;
    bankCount: number;
    rateCount: number;
  }>;
  topMovers: Array<{
    bankName: string;
    productName: string;
    rateType: string;
    currentRate: number;
    pastRate: number;
    changeBps: number;
    snapshots: number;
  }>;
  trendBuckets: Array<{ bucket: string; count: number }>;
  rateDistribution: Array<{ bucket: string; variable: number; fixed: number }>;
  featurePrevalence: Array<{ feature: string; label: string; count: number; pct: number }>;
  rateByLvr: Array<{ band: string; avgVariable: number; avgFixed: number; count: number }>;
  variableVsFixed: Array<{ date: string; variablePct: number; variableCount: number; fixedCount: number }>;
  cashbackBanks: Array<{ bankName: string; productName: string; detail: string }>;
}

export interface ExportRow {
  bank_name: string;
  brand_group: string;
  product_name: string;
  product_id: string;
  rate_type: string;
  rate: number;
  comparison_rate: number;
  repayment_type: string;
  loan_purpose: string;
  lvr_min: number;
  lvr_max: number;
  fixed_term: string;
  product_tags: string;
  audience_tags: string;
  feature_types: string;
  last_updated: string;
}

export const DEFAULT_FILTERS: FilterState = {
  rateType: "",
  loanPurpose: "",
  repaymentType: "",
  maxLvr: 0,
  bigFourOnly: false,
  everydayOnly: true,
  search: "",
  sortKey: "rate",
  sortAsc: true,
  features: [],
  audience: [],
  fixedTerm: "",
};
