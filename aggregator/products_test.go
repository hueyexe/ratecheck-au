package main

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestCollectProductMetadataCapturesRicherProductDetails(t *testing.T) {
	metadata := collectProductMetadata(BankingProductV6{
		ProductID:      "p1",
		Name:           "Basic Home Loan",
		Description:    "Simple home loan",
		ApplicationURI: "https://bank.example/apply",
		EffectiveFrom:  "2026-04-01T00:00:00Z",
		EffectiveTo:    "2026-12-31T00:00:00Z",
	}, &BankingProductDetailV7{
		BankingProductV6: BankingProductV6{
			AdditionalInformation: BankingProductAdditionalInformationV2{
				AdditionalInformationURIs: []BankingProductAdditionalInformationURI{{
					Description:       "Offset account guide",
					AdditionalInfoURI: "https://bank.example/offset",
				}},
			},
		},
		Features:    []BankingProductFeatureV4{{FeatureType: "OFFSET", AdditionalInfoURI: "https://bank.example/features/offset"}},
		Eligibility: []BankingProductEligibilityV2{{EligibilityType: "NATURAL_PERSON", AdditionalInfoURI: "https://bank.example/eligibility"}},
		Constraints: []BankingProductConstraintV3{{ConstraintType: "MIN_LVR", AdditionalValue: "0.6", AdditionalInfoURI: "https://bank.example/constraints"}},
		Fees:        []BankingProductFeeV2{{Name: "Establishment fee", FeeType: "UPFRONT", FeeMethodUType: "FIXED", FixedAmount: "600.00", AdditionalInfoURI: "https://bank.example/fees"}},
	})

	for name, value := range map[string]string{
		"constraints":           metadata.constraints,
		"fees":                  metadata.fees,
		"additional info links": metadata.additionalInfoURIs,
	} {
		if value == "" || value == "[]" {
			t.Fatalf("expected %s to be captured, got %q", name, value)
		}
	}
	if !strings.Contains(metadata.constraints, "MIN_LVR") || !strings.Contains(metadata.fees, "Establishment fee") {
		t.Fatalf("expected rich CDR details, got constraints=%s fees=%s", metadata.constraints, metadata.fees)
	}
	if metadata.effectiveFrom != "2026-04-01T00:00:00Z" || metadata.effectiveTo != "2026-12-31T00:00:00Z" {
		t.Fatalf("expected effective dates, got %#v", metadata)
	}
}

func TestCollectRateDetailsCapturesFullTiersAndConditionDetails(t *testing.T) {
	lendingRate := BankingProductLendingRateV3{
		Tiers: []BankingProductRateTierV4{{
			Name:                  "Under 80% LVR",
			UnitOfMeasure:         "PERCENT",
			MinimumValue:          0,
			MaximumValue:          80,
			RateApplicationMethod: "PER_TIER",
			AdditionalInfo:        "Lower LVR tier",
			AdditionalInfoURI:     "https://bank.example/tiers",
			ApplicabilityConditions: []BankingProductRateConditionV2{{
				RateApplicabilityType: "NEW_CUSTOMER",
				AdditionalInfo:        "New customers only",
			}},
		}},
		ApplicabilityConditions: []BankingProductRateConditionV2{{
			RateApplicabilityType: "ONLINE_ONLY",
			AdditionalValue:       "Apply online",
			AdditionalInfo:        "Online applications only",
			AdditionalInfoURI:     "https://bank.example/conditions",
		}},
	}

	rateTiers := collectRateTiers(lendingRate)
	rateConditionDetails := collectRateConditionDetails(lendingRate)

	if !json.Valid([]byte(rateTiers)) || !strings.Contains(rateTiers, "PER_TIER") || !strings.Contains(rateTiers, "NEW_CUSTOMER") {
		t.Fatalf("expected full tier details as JSON, got %s", rateTiers)
	}
	if !json.Valid([]byte(rateConditionDetails)) || !strings.Contains(rateConditionDetails, "ONLINE_ONLY") || !strings.Contains(rateConditionDetails, "https://bank.example/conditions") {
		t.Fatalf("expected detailed rate conditions as JSON, got %s", rateConditionDetails)
	}
}
