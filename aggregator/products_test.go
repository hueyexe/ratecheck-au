package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
		Fees:        []BankingProductFeeV2{{Name: "Establishment fee", FeeType: "UPFRONT", FeeMethodUType: "fixedAmount", FixedAmount: json.RawMessage(`{"amount":"600.00"}`), AdditionalInfoURI: "https://bank.example/fees"}},
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
			MinimumValue:          "0",
			MaximumValue:          "80",
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

func TestFetchBankRatesAcceptsSpecStringTiersAndObjectFees(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/cds-au/v1/banking/products":
			_, _ = w.Write([]byte(`{
				"data": {"products": [{
					"productId": "commbank-simple",
					"name": "Simple Home Loan",
					"brand": "Commonwealth Bank of Australia",
					"brandName": "CommBank",
					"description": "Owner occupied home loan",
					"productCategory": "RESIDENTIAL_MORTGAGES",
					"isTailored": false,
					"lastUpdated": "2026-05-01T00:00:00Z"
				}]},
				"links": {}
			}`))
		case "/cds-au/v1/banking/products/commbank-simple":
			_, _ = w.Write([]byte(`{
				"data": {
					"productId": "commbank-simple",
					"name": "Simple Home Loan",
					"brand": "Commonwealth Bank of Australia",
					"brandName": "CommBank",
					"description": "Owner occupied home loan",
					"productCategory": "RESIDENTIAL_MORTGAGES",
					"features": [{"featureType": "OFFSET", "additionalInfo": "Offset account available"}],
					"fees": [{
						"name": "Loan service fee",
						"feeType": "PERIODIC",
						"feeMethodUType": "fixedAmount",
						"fixedAmount": {"amount": "10.00"},
						"discounts": [{
							"description": "Package discount",
							"discountType": "ELIGIBILITY_ONLY",
							"discountMethodUType": "fixedAmount",
							"fixedAmount": {"amount": "10.00"},
							"eligibility": [{"discountEligibilityType": "OTHER", "additionalInfo": "Package holders"}]
						}]
					}],
					"lendingRates": [{
						"lendingRateType": "VARIABLE",
						"rate": "0.0584",
						"comparisonRate": "0.0597",
						"repaymentType": "PRINCIPAL_AND_INTEREST",
						"loanPurpose": "OWNER_OCCUPIED",
						"calculationFrequency": "P1D",
						"applicationType": "PERIODIC",
						"applicationFrequency": "P1M",
						"interestPaymentDue": "IN_ARREARS",
						"tiers": [{
							"name": "LVR",
							"unitOfMeasure": "PERCENT",
							"minimumValue": "0",
							"maximumValue": "0.80",
							"rateApplicationMethod": "WHOLE_BALANCE",
							"additionalInfo": "For home loans with LVR up to 80%"
						}]
					}]
				}
			}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	rates, err := fetchBankRates(context.Background(), server.Client(), BankBrand{BrandName: "CommBank", BaseURL: server.URL})
	if err != nil {
		t.Fatalf("fetch bank rates: %v", err)
	}
	if len(rates) != 1 {
		t.Fatalf("expected one decoded rate, got %d", len(rates))
	}
	if rates[0].BankName != "CommBank" || rates[0].LvrMin != 0 || rates[0].LvrMax != 0.8 {
		t.Fatalf("expected CommBank rate with parsed LVR 0-0.8, got %#v", rates[0])
	}
	if !strings.Contains(rates[0].Fees, `"fixedAmount":{"amount":"10.00"}`) || !strings.Contains(rates[0].Fees, `"eligibility"`) {
		t.Fatalf("expected nested fee amount and discount eligibility data to be preserved, got %s", rates[0].Fees)
	}
	if !strings.Contains(rates[0].RateTiers, `"maximumValue":"0.80"`) || !strings.Contains(rates[0].RateTiers, `"rateApplicationMethod":"WHOLE_BALANCE"`) {
		t.Fatalf("expected rate tier JSON to preserve CDR string values and metadata, got %s", rates[0].RateTiers)
	}
	if !strings.Contains(rates[0].ProductDetailJSON, `"calculationFrequency"`) || !strings.Contains(rates[0].ProductDetailJSON, `"P1D"`) || !strings.Contains(rates[0].ProductDetailJSON, `"interestPaymentDue"`) {
		t.Fatalf("expected raw product detail JSON to preserve unrendered lending-rate fields, got %s", rates[0].ProductDetailJSON)
	}
}
