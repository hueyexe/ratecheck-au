export interface FeatureDetailItem { type?: string; value?: string; info?: string; }
export interface EligibilityDetailItem { type?: string; value?: string; info?: string; }
export interface ConstraintDetailItem { constraintType?: string; additionalValue?: string; additionalInfo?: string; additionalInfoUri?: string; }
export interface FeeDetailItem { name?: string; feeType?: string; fixedAmount?: unknown; additionalValue?: unknown; additionalInfo?: unknown; additionalInfoUri?: string; }
export interface AdditionalInfoUriItem { description?: string; additionalInfoUri?: string; }

export interface ProductDetailSections {
  featureDetails: FeatureDetailItem[];
  eligibilityDetails: EligibilityDetailItem[];
  constraints: ConstraintDetailItem[];
  fees: FeeDetailItem[];
  additionalInfoUris: AdditionalInfoUriItem[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function objectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isPlainObject) : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function getProductDetailSections(file: unknown): ProductDetailSections {
  const sidecar = isPlainObject(file) ? file : {};
  const detail = isPlainObject(sidecar.detail) ? sidecar.detail : {};

  return {
    featureDetails: objectArray(detail.features).map((feature) => ({
      type: stringValue(feature.featureType),
      value: stringValue(feature.additionalValue),
      info: stringValue(feature.additionalInfo),
    })),
    eligibilityDetails: objectArray(detail.eligibility).map((eligibility) => ({
      type: stringValue(eligibility.eligibilityType),
      value: stringValue(eligibility.additionalValue),
      info: stringValue(eligibility.additionalInfo),
    })),
    constraints: objectArray(detail.constraints).map((constraint) => ({
      constraintType: stringValue(constraint.constraintType),
      additionalValue: stringValue(constraint.additionalValue),
      additionalInfo: stringValue(constraint.additionalInfo),
      additionalInfoUri: stringValue(constraint.additionalInfoUri),
    })),
    fees: objectArray(detail.fees).map((fee) => ({
      name: stringValue(fee.name),
      feeType: stringValue(fee.feeType),
      fixedAmount: fee.fixedAmount,
      additionalValue: fee.additionalValue,
      additionalInfo: fee.additionalInfo,
      additionalInfoUri: stringValue(fee.additionalInfoUri),
    })),
    additionalInfoUris: objectArray(detail.additionalInformationUris).map((link) => ({
      description: stringValue(link.description),
      additionalInfoUri: stringValue(link.additionalInfoUri),
    })),
  };
}

export function mergeProductDetailSections(dbSections: ProductDetailSections, sidecarSections: ProductDetailSections): ProductDetailSections {
  return {
    featureDetails: sidecarSections.featureDetails.length > 0 ? sidecarSections.featureDetails : dbSections.featureDetails,
    eligibilityDetails: sidecarSections.eligibilityDetails.length > 0 ? sidecarSections.eligibilityDetails : dbSections.eligibilityDetails,
    constraints: sidecarSections.constraints.length > 0 ? sidecarSections.constraints : dbSections.constraints,
    fees: sidecarSections.fees.length > 0 ? sidecarSections.fees : dbSections.fees,
    additionalInfoUris: sidecarSections.additionalInfoUris.length > 0 ? sidecarSections.additionalInfoUris : dbSections.additionalInfoUris,
  };
}
