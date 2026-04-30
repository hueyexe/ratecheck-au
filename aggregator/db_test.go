package main

import (
	"context"
	"path/filepath"
	"testing"
	"time"
)

func TestWriteSnapshotPersistsRicherProductDetails(t *testing.T) {
	ctx := context.Background()
	db, err := openDB(ctx, filepath.Join(t.TempDir(), "rates.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()

	_, err = writeSnapshotAt(ctx, db, []MortgageRate{{
		BankName:             "Example Bank",
		ProductName:          "Basic Home Loan",
		ProductID:            "basic-1",
		AdditionalInfoURIs:   `[{"description":"Guide","additionalInfoUri":"https://bank.example/guide"}]`,
		EffectiveFrom:        "2026-04-01T00:00:00Z",
		EffectiveTo:          "2026-12-31T00:00:00Z",
		RateType:             "VARIABLE",
		Rate:                 0.055,
		ComparisonRate:       0.056,
		RepaymentType:        "PRINCIPAL_AND_INTEREST",
		LoanPurpose:          "OWNER_OCCUPIED",
		Constraints:          `[{"constraintType":"MIN_LVR","additionalValue":"0.6"}]`,
		Fees:                 `[{"name":"Establishment fee","feeType":"UPFRONT"}]`,
		RateTiers:            `[{"name":"Under 80% LVR","unitOfMeasure":"PERCENT"}]`,
		RateConditionDetails: `[{"rateApplicabilityType":"ONLINE_ONLY","additionalInfo":"Apply online"}]`,
	}}, 1, 0, time.Date(2026, 4, 1, 10, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("write snapshot: %v", err)
	}

	var additionalInfoURIs, effectiveFrom, effectiveTo, constraints, fees, rateTiers, rateConditionDetails string
	if err := db.QueryRowContext(ctx, `
		SELECT additional_info_uris, effective_from, effective_to, constraints, fees, rate_tiers, rate_condition_details
		FROM rates
		WHERE product_id = 'basic-1'
	`).Scan(&additionalInfoURIs, &effectiveFrom, &effectiveTo, &constraints, &fees, &rateTiers, &rateConditionDetails); err != nil {
		t.Fatalf("read rich fields: %v", err)
	}

	if additionalInfoURIs == "[]" || constraints == "[]" || fees == "[]" || rateTiers == "[]" || rateConditionDetails == "[]" {
		t.Fatalf("expected rich JSON fields, got additional=%s constraints=%s fees=%s tiers=%s conditions=%s", additionalInfoURIs, constraints, fees, rateTiers, rateConditionDetails)
	}
	if effectiveFrom != "2026-04-01T00:00:00Z" || effectiveTo != "2026-12-31T00:00:00Z" {
		t.Fatalf("expected effective dates, got %q %q", effectiveFrom, effectiveTo)
	}
}
