package main

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	_ "modernc.org/sqlite"
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

func TestOptimizeDBReportsActiveReaders(t *testing.T) {
	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), "history.db")
	db, err := openDB(ctx, dbPath)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()

	if _, err := writeSnapshotAt(ctx, db, []MortgageRate{{
		BankName:       "Example Bank",
		ProductName:    "Basic Home Loan",
		ProductID:      "basic-1",
		RateType:       "VARIABLE",
		Rate:           0.055,
		ComparisonRate: 0.056,
		RepaymentType:  "PRINCIPAL_AND_INTEREST",
		LoanPurpose:    "OWNER_OCCUPIED",
	}}, 1, 0, time.Date(2026, 4, 1, 10, 0, 0, 0, time.UTC)); err != nil {
		t.Fatalf("write snapshot: %v", err)
	}

	reader, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("open reader db: %v", err)
	}
	defer reader.Close()

	rows, err := reader.QueryContext(ctx, `SELECT id FROM snapshots`)
	if err != nil {
		t.Fatalf("open reader rows: %v", err)
	}
	defer rows.Close()

	if err := optimizeDB(ctx, db); err == nil || !strings.Contains(err.Error(), "database is locked") {
		t.Fatalf("expected active reader lock, got %v", err)
	}
}

func TestOptimizeDBFileCheckpointsStandaloneHistoryDB(t *testing.T) {
	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), "history.db")
	db, err := openDB(ctx, dbPath)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}

	if _, err := writeSnapshotAt(ctx, db, []MortgageRate{{
		BankName:       "Example Bank",
		ProductName:    "Basic Home Loan",
		ProductID:      "basic-1",
		RateType:       "VARIABLE",
		Rate:           0.055,
		ComparisonRate: 0.056,
		RepaymentType:  "PRINCIPAL_AND_INTEREST",
		LoanPurpose:    "OWNER_OCCUPIED",
	}}, 1, 0, time.Date(2026, 4, 1, 10, 0, 0, 0, time.UTC)); err != nil {
		t.Fatalf("write snapshot: %v", err)
	}
	if err := db.Close(); err != nil {
		t.Fatalf("close db before optimize: %v", err)
	}

	if err := optimizeDBFile(ctx, dbPath); err != nil {
		t.Fatalf("optimize standalone db: %v", err)
	}

	if info, err := os.Stat(dbPath + "-wal"); err == nil && info.Size() > 0 {
		t.Fatalf("expected checkpointed wal, got %s with %d bytes", dbPath+"-wal", info.Size())
	}
}
