package main

import (
	"context"
	"encoding/json"
	"fmt"
	"mime"
	"net/http"
	"strconv"
	"strings"
)

var validRateTypes = map[string]bool{
	"FIXED":                    true,
	"VARIABLE":                 true,
	"INTRODUCTORY":             true,
	"BUNDLE_DISCOUNT_FIXED":    true,
	"BUNDLE_DISCOUNT_VARIABLE": true,
}

// normalizeLVR handles banks that report LVR as whole numbers (80) vs decimals (0.80).
func normalizeLVR(v float64) float64 {
	if v > 1 {
		return v / 100
	}
	return v
}

type featureDetail struct {
	Type  string `json:"type"`
	Value string `json:"value,omitempty"`
	Info  string `json:"info,omitempty"`
	URI   string `json:"uri,omitempty"`
}

type eligibilityDetail struct {
	Type  string `json:"type"`
	Value string `json:"value,omitempty"`
	Info  string `json:"info,omitempty"`
	URI   string `json:"uri,omitempty"`
}

type productMetadata struct {
	applicationURI     string
	overviewURI        string
	termsURI           string
	eligibilityURI     string
	feesURI            string
	bundleURI          string
	additionalInfoURIs string
	effectiveFrom      string
	effectiveTo        string
	featureTypes       string
	featureDetails     string
	productTags        string
	audienceTags       string
	eligibilityTypes   string
	eligibilityDetails string
	constraints        string
	fees               string
}

func jsonArrayString(values []string) string {
	if len(values) == 0 {
		return "[]"
	}
	data, err := json.Marshal(values)
	if err != nil {
		return "[]"
	}
	return string(data)
}

func jsonMarshalOrEmpty(v any) string {
	if v == nil {
		return "[]"
	}
	data, err := json.Marshal(v)
	if err != nil {
		return "[]"
	}
	return string(data)
}

func appendUnique(values []string, value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return values
	}
	for _, existing := range values {
		if existing == value {
			return values
		}
	}
	return append(values, value)
}

func appendIfContainsAny(values []string, haystack string, needles []string, value string) []string {
	for _, needle := range needles {
		if strings.Contains(haystack, needle) {
			return appendUnique(values, value)
		}
	}
	return values
}

func collectProductMetadata(product BankingProductV6, detail *BankingProductDetailV7) productMetadata {
	textParts := []string{
		product.BrandName,
		product.Brand,
		product.Name,
		product.Description,
	}
	var filteredTextParts []string
	for _, part := range textParts {
		if strings.TrimSpace(part) == "" {
			continue
		}
		filteredTextParts = append(filteredTextParts, part)
	}
	text := strings.ToLower(strings.Join(filteredTextParts, " "))

	var featureTypes []string
	var productTags []string
	var fDetails []featureDetail
	for _, feature := range detail.Features {
		featureTypes = appendUnique(featureTypes, feature.FeatureType)
		switch feature.FeatureType {
		case "OFFSET":
			productTags = appendUnique(productTags, "offset")
		case "REDRAW":
			productTags = appendUnique(productTags, "redraw")
		case "EXTRA_REPAYMENTS":
			productTags = appendUnique(productTags, "extra_repayments")
		case "GUARANTOR":
			productTags = appendUnique(productTags, "guarantor")
		case "CASHBACK_OFFER":
			productTags = appendUnique(productTags, "cashback")
		}
		// Capture details for features that have meaningful additional info
		if feature.AdditionalValue != "" || feature.AdditionalInfo != "" || feature.AdditionalInfoURI != "" {
			fDetails = append(fDetails, featureDetail{
				Type:  feature.FeatureType,
				Value: feature.AdditionalValue,
				Info:  feature.AdditionalInfo,
				URI:   feature.AdditionalInfoURI,
			})
		}
	}

	var eligibilityTypes []string
	var audienceTags []string
	var eDetails []eligibilityDetail
	for _, eligibility := range detail.Eligibility {
		eligibilityTypes = appendUnique(eligibilityTypes, eligibility.EligibilityType)
		switch eligibility.EligibilityType {
		case "BUSINESS":
			audienceTags = appendUnique(audienceTags, "business")
		case "PENSION_RECIPIENT":
			audienceTags = appendUnique(audienceTags, "pensioners")
		case "STAFF":
			audienceTags = appendUnique(audienceTags, "staff_only")
		case "STUDENT":
			audienceTags = appendUnique(audienceTags, "students")
		case "EMPLOYMENT_STATUS":
			audienceTags = appendUnique(audienceTags, "employment_restricted")
		}
		if eligibility.AdditionalValue != "" || eligibility.AdditionalInfo != "" || eligibility.AdditionalInfoURI != "" {
			eDetails = append(eDetails, eligibilityDetail{
				Type:  eligibility.EligibilityType,
				Value: eligibility.AdditionalValue,
				Info:  eligibility.AdditionalInfo,
				URI:   eligibility.AdditionalInfoURI,
			})
		}
	}

	if len(detail.Bundles) > 0 || detail.AdditionalInformation.BundleURI != "" {
		productTags = appendUnique(productTags, "package")
	}

	productTags = appendIfContainsAny(productTags, text, []string{"package", "bundle"}, "package")
	productTags = appendIfContainsAny(productTags, text, []string{"offset"}, "offset")
	productTags = appendIfContainsAny(productTags, text, []string{"redraw"}, "redraw")
	productTags = appendIfContainsAny(productTags, text, []string{"bridg"}, "bridging")
	productTags = appendIfContainsAny(productTags, text, []string{"line of credit", "equity access", "revolving"}, "line_of_credit")
	productTags = appendIfContainsAny(productTags, text, []string{"construction", "building"}, "construction")
	productTags = appendIfContainsAny(productTags, text, []string{"first home"}, "first_home_buyer")
	productTags = appendIfContainsAny(productTags, text, []string{"green", "eco"}, "green")

	audienceTags = appendIfContainsAny(audienceTags, text, []string{"police", "bankvic", "fire service", "firefighter", "defence", "military"}, "police_and_defence")
	audienceTags = appendIfContainsAny(audienceTags, text, []string{"teacher", "education"}, "education_workers")
	audienceTags = appendIfContainsAny(audienceTags, text, []string{"health professional", "medical", "doctor", "nurse"}, "health_workers")
	audienceTags = appendIfContainsAny(audienceTags, text, []string{"essential worker", "ambulance", "emergency"}, "essential_workers")

	return productMetadata{
		applicationURI:     product.ApplicationURI,
		overviewURI:        detail.AdditionalInformation.OverviewURI,
		termsURI:           detail.AdditionalInformation.TermsURI,
		eligibilityURI:     detail.AdditionalInformation.EligibilityURI,
		feesURI:            detail.AdditionalInformation.FeesAndPricingURI,
		bundleURI:          detail.AdditionalInformation.BundleURI,
		additionalInfoURIs: jsonMarshalOrEmpty(detail.AdditionalInformation.AdditionalInformationURIs),
		effectiveFrom:      product.EffectiveFrom,
		effectiveTo:        product.EffectiveTo,
		featureTypes:       jsonArrayString(featureTypes),
		featureDetails:     jsonMarshalOrEmpty(fDetails),
		productTags:        jsonArrayString(productTags),
		audienceTags:       jsonArrayString(audienceTags),
		eligibilityTypes:   jsonArrayString(eligibilityTypes),
		eligibilityDetails: jsonMarshalOrEmpty(eDetails),
		constraints:        jsonMarshalOrEmpty(detail.Constraints),
		fees:               jsonMarshalOrEmpty(detail.Fees),
	}
}

func collectRateConditions(lendingRate BankingProductLendingRateV3) string {
	var values []string
	for _, condition := range lendingRate.ApplicabilityConditions {
		values = appendUnique(values, condition.RateApplicabilityType)
	}
	return jsonArrayString(values)
}

func collectRateConditionDetails(lendingRate BankingProductLendingRateV3) string {
	return jsonMarshalOrEmpty(lendingRate.ApplicabilityConditions)
}

func collectRateTiers(lendingRate BankingProductLendingRateV3) string {
	return jsonMarshalOrEmpty(lendingRate.Tiers)
}

// isRevertRate detects rates that are likely "revert rates" — the higher rate a bank
// charges if you don't qualify for their advertised discount. These are published
// alongside the advertised rate for the same product/LVR/purpose/repayment combination.
// We detect them by: no comparison rate AND rate > 0.07 AND same product has a lower rate.
func isRevertRate(rate float64, compRate float64, allRatesForProduct []float64) bool {
	if compRate > 0 {
		return false // has a comparison rate — it's a real advertised rate
	}
	if rate <= 0.07 {
		return false // low enough to be a normal rate
	}
	// Check if there's a lower rate for the same product
	for _, r := range allRatesForProduct {
		if r < rate && r > 0.04 {
			return true
		}
	}
	return false
}

func fetchBankRates(ctx context.Context, client *http.Client, brand BankBrand) ([]MortgageRate, error) {
	products, err := fetchProducts(ctx, client, brand.BaseURL)
	if err != nil {
		return nil, err
	}

	var rates []MortgageRate
	for _, p := range products {
		if p.IsTailored {
			continue
		}
		detail, err := fetchProductDetail(ctx, client, brand.BaseURL, p.ProductID)
		if err != nil {
			continue // skip individual product errors
		}
		metadata := collectProductMetadata(p, detail)

		// Collect all rates for this product to detect revert rates
		var productRates []float64
		for _, lr := range detail.LendingRates {
			if !validRateTypes[lr.LendingRateType] {
				continue
			}
			r, _ := strconv.ParseFloat(lr.Rate, 64)
			if r > 0 {
				productRates = append(productRates, r)
			}
		}

		for _, lr := range detail.LendingRates {
			if !validRateTypes[lr.LendingRateType] {
				continue
			}
			rate, _ := strconv.ParseFloat(lr.Rate, 64)
			compRate, _ := strconv.ParseFloat(lr.ComparisonRate, 64)

			// Skip clearly invalid rates (CDR data quality issues like Bank of Sydney 71.9%)
			if rate <= 0 || rate > 0.20 {
				continue
			}

			var lvrMin, lvrMax float64
			for _, t := range lr.Tiers {
				if t.UnitOfMeasure == "PERCENT" {
					lvrMin = normalizeLVR(t.MinimumValue)
					lvrMax = normalizeLVR(t.MaximumValue)
					break
				}
			}

			fixedTerm := ""
			if lr.LendingRateType == "FIXED" {
				fixedTerm = lr.AdditionalValue
			}

			bankName := brand.BrandName
			if p.BrandName != "" {
				bankName = p.BrandName
			}

			revertRate := 0
			if isRevertRate(rate, compRate, productRates) {
				revertRate = 1
			}

			rates = append(rates, MortgageRate{
				BankName:             bankName,
				BrandGroup:           p.Brand,
				ProductName:          p.Name,
				ProductID:            p.ProductID,
				Description:          p.Description,
				ApplicationURI:       metadata.applicationURI,
				OverviewURI:          metadata.overviewURI,
				TermsURI:             metadata.termsURI,
				EligibilityURI:       metadata.eligibilityURI,
				FeesURI:              metadata.feesURI,
				BundleURI:            metadata.bundleURI,
				AdditionalInfoURIs:   metadata.additionalInfoURIs,
				EffectiveFrom:        metadata.effectiveFrom,
				EffectiveTo:          metadata.effectiveTo,
				RateType:             lr.LendingRateType,
				Rate:                 rate,
				ComparisonRate:       compRate,
				RepaymentType:        lr.RepaymentType,
				LoanPurpose:          lr.LoanPurpose,
				LvrMin:               lvrMin,
				LvrMax:               lvrMax,
				FixedTerm:            fixedTerm,
				FeatureTypes:         metadata.featureTypes,
				FeatureDetails:       metadata.featureDetails,
				ProductTags:          metadata.productTags,
				AudienceTags:         metadata.audienceTags,
				EligibilityTypes:     metadata.eligibilityTypes,
				EligibilityDetails:   metadata.eligibilityDetails,
				Constraints:          metadata.constraints,
				Fees:                 metadata.fees,
				RateTiers:            collectRateTiers(lr),
				RateConditions:       collectRateConditions(lr),
				RateConditionDetails: collectRateConditionDetails(lr),
				RateNotes:            lr.AdditionalInfo,
				IsTailored:           p.IsTailored,
				IsRevertRate:         revertRate,
				LastUpdated:          p.LastUpdated,
			})
		}
	}
	return rates, nil
}

func fetchProducts(ctx context.Context, client *http.Client, baseURL string) ([]BankingProductV6, error) {
	var all []BankingProductV6
	page := 1
	for {
		url := fmt.Sprintf("%s/cds-au/v1/banking/products?product-category=RESIDENTIAL_MORTGAGES&page-size=100&page=%d", baseURL, page)

		resp, err := doProductsRequest(ctx, client, url, "4")
		if err != nil {
			return nil, err
		}
		// Retry with v3 on 406 (bank doesn't support v4 yet)
		if resp.StatusCode == http.StatusNotAcceptable {
			_ = resp.Body.Close()
			resp, err = doProductsRequest(ctx, client, url, "3")
			if err != nil {
				return nil, err
			}
		}
		if resp.StatusCode != http.StatusOK {
			_ = resp.Body.Close()
			if resp.StatusCode == http.StatusNotFound {
				return nil, fmt.Errorf("products endpoint not found (404) for %s", baseURL)
			}
			if resp.StatusCode == http.StatusNotAcceptable {
				return nil, fmt.Errorf("products API version not supported (406) for %s", baseURL)
			}
			return nil, fmt.Errorf("products API returned %d for %s", resp.StatusCode, baseURL)
		}

		contentType := resp.Header.Get("Content-Type")
		mediaType, _, err := mime.ParseMediaType(contentType)
		if err != nil || !strings.HasPrefix(mediaType, "application/json") && !strings.HasPrefix(mediaType, "text/json") {
			_ = resp.Body.Close()
			return nil, fmt.Errorf("expected JSON response, got %q for %s", contentType, baseURL)
		}

		var result ProductsResponse
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			_ = resp.Body.Close()
			return nil, err
		}
		_ = resp.Body.Close()
		all = append(all, result.Data.Products...)

		if result.Links.Next == "" || len(result.Data.Products) == 0 {
			break
		}
		page++
	}
	return all, nil
}

func doProductsRequest(ctx context.Context, client *http.Client, url, version string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-v", version)
	return client.Do(req)
}

func fetchProductDetail(ctx context.Context, client *http.Client, baseURL, productID string) (*BankingProductDetailV7, error) {
	url := fmt.Sprintf("%s/cds-au/v1/banking/products/%s", baseURL, productID)

	for _, version := range []string{"6", "5", "4"} {
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("x-v", version)
		req.Header.Set("x-min-v", "4")

		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusNotAcceptable || resp.StatusCode == http.StatusNotFound {
			continue
		}

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("product detail API returned %d for product %s", resp.StatusCode, productID)
		}

		contentType := resp.Header.Get("Content-Type")
		mediaType, _, err := mime.ParseMediaType(contentType)
		if err != nil || !strings.HasPrefix(mediaType, "application/json") && !strings.HasPrefix(mediaType, "text/json") {
			return nil, fmt.Errorf("expected JSON response, got %q for product %s", contentType, productID)
		}

		var result ProductDetailResponse
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return nil, err
		}
		return &result.Data.BankingProductDetailV7, nil
	}

	return nil, fmt.Errorf("product detail API failed for product %s after trying versions 6, 5, 4", productID)
}
