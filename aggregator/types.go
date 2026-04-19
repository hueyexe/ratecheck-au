package main

// Output types

type MortgageRate struct {
	BankName           string  `json:"bankName"`
	BrandGroup         string  `json:"brandGroup"`
	ProductName        string  `json:"productName"`
	ProductID          string  `json:"productId"`
	Description        string  `json:"description"`
	ApplicationURI     string  `json:"applicationUri"`
	OverviewURI        string  `json:"overviewUri"`
	TermsURI           string  `json:"termsUri"`
	EligibilityURI     string  `json:"eligibilityUri"`
	FeesURI            string  `json:"feesUri"`
	BundleURI          string  `json:"bundleUri"`
	RateType           string  `json:"rateType"`
	Rate               float64 `json:"rate"`
	ComparisonRate     float64 `json:"comparisonRate"`
	RepaymentType      string  `json:"repaymentType"`
	LoanPurpose        string  `json:"loanPurpose"`
	LvrMin             float64 `json:"lvrMin"`
	LvrMax             float64 `json:"lvrMax"`
	FixedTerm          string  `json:"fixedTerm"`
	FeatureTypes       string  `json:"featureTypes"`
	FeatureDetails     string  `json:"featureDetails"`
	ProductTags        string  `json:"productTags"`
	AudienceTags       string  `json:"audienceTags"`
	EligibilityTypes   string  `json:"eligibilityTypes"`
	EligibilityDetails string  `json:"eligibilityDetails"`
	RateConditions     string  `json:"rateConditions"`
	RateNotes          string  `json:"rateNotes"`
	IsTailored         bool    `json:"isTailored"`
	IsRevertRate       int     `json:"isRevertRate"`
	LastUpdated        string  `json:"lastUpdated"`
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
	Bundles      []BankingProductBundle        `json:"bundles"`
	Features     []BankingProductFeatureV4     `json:"features"`
	Eligibility  []BankingProductEligibilityV2 `json:"eligibility"`
	LendingRates []BankingProductLendingRateV3 `json:"lendingRates"`
}

type BankingProductAdditionalInformationV2 struct {
	OverviewURI       string `json:"overviewUri"`
	TermsURI          string `json:"termsUri"`
	EligibilityURI    string `json:"eligibilityUri"`
	FeesAndPricingURI string `json:"feesAndPricingUri"`
	BundleURI         string `json:"bundleUri"`
}

type BankingProductBundle struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type BankingProductFeatureV4 struct {
	FeatureType     string `json:"featureType"`
	AdditionalValue string `json:"additionalValue"`
	AdditionalInfo  string `json:"additionalInfo"`
}

type BankingProductEligibilityV2 struct {
	EligibilityType string `json:"eligibilityType"`
	AdditionalValue string `json:"additionalValue"`
	AdditionalInfo  string `json:"additionalInfo"`
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
}

type BankingProductRateTierV4 struct {
	Name          string  `json:"name"`
	UnitOfMeasure string  `json:"unitOfMeasure"`
	MinimumValue  float64 `json:"minimumValue"`
	MaximumValue  float64 `json:"maximumValue"`
}
