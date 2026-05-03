package main

import (
	"encoding/json"
	"fmt"
	"strconv"
)

// Output types

type MortgageRate struct {
	BankName             string  `json:"bankName"`
	BrandGroup           string  `json:"brandGroup"`
	ProductName          string  `json:"productName"`
	ProductID            string  `json:"productId"`
	ProductDetailJSON    string  `json:"productDetailJson"`
	Description          string  `json:"description"`
	ApplicationURI       string  `json:"applicationUri"`
	OverviewURI          string  `json:"overviewUri"`
	TermsURI             string  `json:"termsUri"`
	EligibilityURI       string  `json:"eligibilityUri"`
	FeesURI              string  `json:"feesUri"`
	BundleURI            string  `json:"bundleUri"`
	AdditionalInfoURIs   string  `json:"additionalInfoUris"`
	EffectiveFrom        string  `json:"effectiveFrom"`
	EffectiveTo          string  `json:"effectiveTo"`
	RateType             string  `json:"rateType"`
	Rate                 float64 `json:"rate"`
	ComparisonRate       float64 `json:"comparisonRate"`
	RepaymentType        string  `json:"repaymentType"`
	LoanPurpose          string  `json:"loanPurpose"`
	LvrMin               float64 `json:"lvrMin"`
	LvrMax               float64 `json:"lvrMax"`
	FixedTerm            string  `json:"fixedTerm"`
	FeatureTypes         string  `json:"featureTypes"`
	FeatureDetails       string  `json:"featureDetails"`
	ProductTags          string  `json:"productTags"`
	AudienceTags         string  `json:"audienceTags"`
	EligibilityTypes     string  `json:"eligibilityTypes"`
	EligibilityDetails   string  `json:"eligibilityDetails"`
	Constraints          string  `json:"constraints"`
	Fees                 string  `json:"fees"`
	RateTiers            string  `json:"rateTiers"`
	RateConditions       string  `json:"rateConditions"`
	RateConditionDetails string  `json:"rateConditionDetails"`
	RateNotes            string  `json:"rateNotes"`
	IsTailored           bool    `json:"isTailored"`
	IsRevertRate         int     `json:"isRevertRate"`
	LastUpdated          string  `json:"lastUpdated"`
}

// CDR Register API types

type RegisterResponse struct {
	Data []DataHolderBrandSummary `json:"data"`
}

type DataHolderBrandSummary struct {
	BrandName     string   `json:"brandName"`
	PublicBaseUri string   `json:"publicBaseUri"`
	Industries    []string `json:"industries"`
}

// CDR Banking Products API types

type ProductsResponse struct {
	Data  ProductsData   `json:"data"`
	Links PaginatedLinks `json:"links"`
}

type ProductsData struct {
	Products []BankingProductV6 `json:"products"`
}

type PaginatedLinks struct {
	Next string `json:"next"`
}

type BankingProductV6 struct {
	ProductID             string                                `json:"productId"`
	EffectiveFrom         string                                `json:"effectiveFrom"`
	EffectiveTo           string                                `json:"effectiveTo"`
	Name                  string                                `json:"name"`
	Description           string                                `json:"description"`
	Brand                 string                                `json:"brand"`
	BrandName             string                                `json:"brandName"`
	ApplicationURI        string                                `json:"applicationUri"`
	IsTailored            bool                                  `json:"isTailored"`
	LastUpdated           string                                `json:"lastUpdated"`
	ProductCategory       string                                `json:"productCategory"`
	AdditionalInformation BankingProductAdditionalInformationV2 `json:"additionalInformation"`
}

// CDR Product Detail API types

type ProductDetailResponse struct {
	Data ProductDetailData `json:"data"`
}

type ProductDetailData struct {
	BankingProductDetailV7
}

type BankingProductDetailV7 struct {
	BankingProductV6
	RawJSON      string                        `json:"-"`
	Bundles      []BankingProductBundle        `json:"bundles"`
	Features     []BankingProductFeatureV4     `json:"features"`
	Constraints  []BankingProductConstraintV3  `json:"constraints"`
	Eligibility  []BankingProductEligibilityV2 `json:"eligibility"`
	Fees         []BankingProductFeeV2         `json:"fees"`
	LendingRates []BankingProductLendingRateV3 `json:"lendingRates"`
}

type BankingProductAdditionalInformationV2 struct {
	OverviewURI               string                                   `json:"overviewUri"`
	TermsURI                  string                                   `json:"termsUri"`
	EligibilityURI            string                                   `json:"eligibilityUri"`
	FeesAndPricingURI         string                                   `json:"feesAndPricingUri"`
	BundleURI                 string                                   `json:"bundleUri"`
	AdditionalInformationURIs []BankingProductAdditionalInformationURI `json:"additionalInformationUris"`
}

type BankingProductAdditionalInformationURI struct {
	Description       string `json:"description"`
	AdditionalInfoURI string `json:"additionalInfoUri"`
}

type BankingProductBundle struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type BankingProductFeatureV4 struct {
	FeatureType       string `json:"featureType"`
	AdditionalValue   string `json:"additionalValue"`
	AdditionalInfo    string `json:"additionalInfo"`
	AdditionalInfoURI string `json:"additionalInfoUri"`
}

type BankingProductEligibilityV2 struct {
	EligibilityType   string `json:"eligibilityType"`
	AdditionalValue   string `json:"additionalValue"`
	AdditionalInfo    string `json:"additionalInfo"`
	AdditionalInfoURI string `json:"additionalInfoUri"`
}

type BankingProductConstraintV3 struct {
	ConstraintType    string `json:"constraintType"`
	AdditionalValue   string `json:"additionalValue"`
	AdditionalInfo    string `json:"additionalInfo"`
	AdditionalInfoURI string `json:"additionalInfoUri"`
}

type BankingProductFeeV2 struct {
	Name              string                     `json:"name"`
	FeeType           string                     `json:"feeType"`
	FeeMethodUType    string                     `json:"feeMethodUType"`
	FixedAmount       json.RawMessage            `json:"fixedAmount,omitempty"`
	RateBased         json.RawMessage            `json:"rateBased,omitempty"`
	Variable          json.RawMessage            `json:"variable,omitempty"`
	FeeCap            string                     `json:"feeCap"`
	FeeCapPeriod      string                     `json:"feeCapPeriod"`
	Currency          string                     `json:"currency"`
	AdditionalValue   string                     `json:"additionalValue"`
	AdditionalInfo    string                     `json:"additionalInfo"`
	AdditionalInfoURI string                     `json:"additionalInfoUri"`
	Discounts         []BankingProductDiscountV2 `json:"discounts"`
}

type BankingProductDiscountV2 struct {
	Description         string          `json:"description"`
	DiscountType        string          `json:"discountType"`
	DiscountMethodUType string          `json:"discountMethodUType"`
	FixedAmount         json.RawMessage `json:"fixedAmount,omitempty"`
	RateBased           json.RawMessage `json:"rateBased,omitempty"`
	AdditionalValue     string          `json:"additionalValue"`
	AdditionalInfo      string          `json:"additionalInfo"`
	AdditionalInfoURI   string          `json:"additionalInfoUri"`
	Eligibility         json.RawMessage `json:"eligibility,omitempty"`
}

type BankingProductLendingRateV3 struct {
	LendingRateType         string                          `json:"lendingRateType"`
	Rate                    string                          `json:"rate"`
	ComparisonRate          string                          `json:"comparisonRate"`
	RepaymentType           string                          `json:"repaymentType"`
	LoanPurpose             string                          `json:"loanPurpose"`
	Tiers                   []BankingProductRateTierV4      `json:"tiers"`
	ApplicabilityConditions []BankingProductRateConditionV2 `json:"applicabilityConditions"`
	AdditionalValue         string                          `json:"additionalValue"`
	AdditionalInfo          string                          `json:"additionalInfo"`
}

type BankingProductRateConditionV2 struct {
	RateApplicabilityType string `json:"rateApplicabilityType"`
	AdditionalValue       string `json:"additionalValue"`
	AdditionalInfo        string `json:"additionalInfo"`
	AdditionalInfoURI     string `json:"additionalInfoUri"`
}

type BankingProductRateTierV4 struct {
	Name                    string                          `json:"name"`
	UnitOfMeasure           string                          `json:"unitOfMeasure"`
	MinimumValue            CDRNumberString                 `json:"minimumValue"`
	MaximumValue            CDRNumberString                 `json:"maximumValue"`
	RateApplicationMethod   string                          `json:"rateApplicationMethod"`
	ApplicabilityConditions []BankingProductRateConditionV2 `json:"applicabilityConditions"`
	AdditionalInfo          string                          `json:"additionalInfo"`
	AdditionalInfoURI       string                          `json:"additionalInfoUri"`
}

type CDRNumberString string

func (v *CDRNumberString) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		*v = ""
		return nil
	}

	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		*v = CDRNumberString(s)
		return nil
	}

	var n json.Number
	if err := json.Unmarshal(data, &n); err == nil {
		*v = CDRNumberString(n.String())
		return nil
	}

	return fmt.Errorf("expected CDR number string, got %s", string(data))
}

func (v CDRNumberString) MarshalJSON() ([]byte, error) {
	return json.Marshal(string(v))
}

func (v CDRNumberString) Float64() float64 {
	if v == "" {
		return 0
	}
	parsed, err := strconv.ParseFloat(string(v), 64)
	if err != nil {
		return 0
	}
	return parsed
}
