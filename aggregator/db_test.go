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

func TestWriteSnapshotPersistsRawProductDetailJSON(t *testing.T) {
	ctx := context.Background()
	db, err := openDB(ctx, filepath.Join(t.TempDir(), "rates.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()

	rawDetail := `{"productId":"p1","name":"Complete Detail Loan","lendingRates":[{"lendingRateType":"VARIABLE","rate":"0.055","calculationFrequency":"P1D"}],"fees":[{"name":"Service fee","fixedAmount":{"amount":"10.00"}}]}`
	_, err = writeSnapshotAt(ctx, db, []MortgageRate{
		{
			BankName:          "Example Bank",
			ProductName:       "Complete Detail Loan",
			ProductID:         "p1",
			RateType:          "VARIABLE",
			Rate:              0.055,
			RepaymentType:     "PRINCIPAL_AND_INTEREST",
			LoanPurpose:       "OWNER_OCCUPIED",
			ProductDetailJSON: rawDetail,
		},
		{
			BankName:          "Example Bank",
			ProductName:       "Complete Detail Loan",
			ProductID:         "p1",
			RateType:          "VARIABLE",
			Rate:              0.056,
			RepaymentType:     "INTEREST_ONLY",
			LoanPurpose:       "OWNER_OCCUPIED",
			ProductDetailJSON: rawDetail,
		},
	}, 1, 0, time.Date(2026, 4, 1, 10, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("write snapshot: %v", err)
	}

	var count int
	var detailJSON string
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*), detail_json FROM product_details WHERE product_id = 'p1'`).Scan(&count, &detailJSON); err != nil {
		t.Fatalf("read product detail: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one raw product detail per snapshot/product, got %d", count)
	}
	if !strings.Contains(detailJSON, `"calculationFrequency":"P1D"`) || !strings.Contains(detailJSON, `"fixedAmount":{"amount":"10.00"}`) {
		t.Fatalf("expected raw product detail JSON to preserve unrendered CDR fields, got %s", detailJSON)
	}
}

func TestWriteSnapshotPersistsRawProductDetailsForCollidingProductIDsAcrossBanks(t *testing.T) {
	ctx := context.Background()
	db, err := openDB(ctx, filepath.Join(t.TempDir(), "rates.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()

	_, err = writeSnapshotAt(ctx, db, []MortgageRate{
		{
			BankName:          "Bank A",
			ProductName:       "Shared ID Loan A",
			ProductID:         "shared-id",
			RateType:          "VARIABLE",
			Rate:              0.055,
			RepaymentType:     "PRINCIPAL_AND_INTEREST",
			LoanPurpose:       "OWNER_OCCUPIED",
			ProductDetailJSON: `{"productId":"shared-id","name":"Shared ID Loan A"}`,
		},
		{
			BankName:          "Bank B",
			ProductName:       "Shared ID Loan B",
			ProductID:         "shared-id",
			RateType:          "VARIABLE",
			Rate:              0.056,
			RepaymentType:     "PRINCIPAL_AND_INTEREST",
			LoanPurpose:       "OWNER_OCCUPIED",
			ProductDetailJSON: `{"productId":"shared-id","name":"Shared ID Loan B"}`,
		},
	}, 2, 0, time.Date(2026, 4, 1, 10, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("write snapshot: %v", err)
	}

	var count int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM product_details WHERE product_id = 'shared-id'`).Scan(&count); err != nil {
		t.Fatalf("read product detail count: %v", err)
	}
	if count != 2 {
		t.Fatalf("expected both bank-scoped product details, got %d", count)
	}
}

func TestOpenDBMigratesProductDetailsPrimaryKeyToBankScoped(t *testing.T) {
	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), "rates.db")
	legacyDB, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("open legacy db: %v", err)
	}
	if _, err := legacyDB.ExecContext(ctx, `
		CREATE TABLE product_details (
		  snapshot_id INTEGER NOT NULL,
		  product_id TEXT NOT NULL,
		  bank_name TEXT NOT NULL DEFAULT '',
		  product_name TEXT NOT NULL DEFAULT '',
		  detail_json TEXT NOT NULL DEFAULT '{}',
		  PRIMARY KEY (snapshot_id, product_id)
		);
	`); err != nil {
		t.Fatalf("create legacy product details table: %v", err)
	}
	if err := legacyDB.Close(); err != nil {
		t.Fatalf("close legacy db: %v", err)
	}

	db, err := openDB(ctx, dbPath)
	if err != nil {
		t.Fatalf("open migrated db: %v", err)
	}
	defer db.Close()

	rows, err := db.QueryContext(ctx, `PRAGMA table_info(product_details)`)
	if err != nil {
		t.Fatalf("read product details schema: %v", err)
	}
	defer rows.Close()

	bankNamePrimaryKeyPosition := 0
	for rows.Next() {
		var (
			cid        int
			name       string
			typeName   string
			notNull    int
			defaultVal sql.NullString
			pk         int
		)
		if err := rows.Scan(&cid, &name, &typeName, &notNull, &defaultVal, &pk); err != nil {
			t.Fatalf("scan schema row: %v", err)
		}
		if name == "bank_name" {
			bankNamePrimaryKeyPosition = pk
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("schema rows: %v", err)
	}
	if bankNamePrimaryKeyPosition == 0 {
		t.Fatal("expected bank_name to be part of product_details primary key")
	}
}

func TestWriteProductDetailFilesExportsRawProductDetailJSON(t *testing.T) {
	ctx := context.Background()
	db, err := openDB(ctx, filepath.Join(t.TempDir(), "rates.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()

	rawDetail := `{"productId":"p1","name":"Complete Detail Loan","lendingRates":[{"lendingRateType":"VARIABLE","rate":"0.055","calculationFrequency":"P1D"}],"fees":[{"name":"Service fee","fixedAmount":{"amount":"10.00"}}]}`
	if _, err := writeSnapshotAt(ctx, db, []MortgageRate{{
		BankName:          "Example Bank",
		ProductName:       "Complete Detail Loan",
		ProductID:         "p1",
		RateType:          "VARIABLE",
		Rate:              0.055,
		RepaymentType:     "PRINCIPAL_AND_INTEREST",
		LoanPurpose:       "OWNER_OCCUPIED",
		ProductDetailJSON: rawDetail,
	}}, 1, 0, time.Date(2026, 4, 1, 10, 0, 0, 0, time.UTC)); err != nil {
		t.Fatalf("write snapshot: %v", err)
	}

	outDir := t.TempDir()
	if err := writeProductDetailFiles(ctx, db, outDir); err != nil {
		t.Fatalf("write product detail files: %v", err)
	}

	key := productHistoryKey("Example Bank", "p1")
	indexBytes, err := os.ReadFile(filepath.Join(outDir, "product-details", "product-index.json"))
	if err != nil {
		t.Fatalf("read product detail index: %v", err)
	}
	if !strings.Contains(string(indexBytes), key) || !strings.Contains(string(indexBytes), "Complete Detail Loan") {
		t.Fatalf("expected product detail index to include product, got %s", string(indexBytes))
	}

	detailBytes, err := os.ReadFile(filepath.Join(outDir, "product-details", "products", key+".json"))
	if err != nil {
		t.Fatalf("read product detail file: %v", err)
	}
	detailText := string(detailBytes)
	if !strings.Contains(detailText, `"calculationFrequency": "P1D"`) || !strings.Contains(detailText, `"fixedAmount": {`) {
		t.Fatalf("expected raw CDR product detail fields in static file, got %s", detailText)
	}
}

func TestWriteStrippedDBOmitsBulkyDetailColumns(t *testing.T) {
	ctx := context.Background()
	db, err := openDB(ctx, filepath.Join(t.TempDir(), "history.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()

	largeFees := `[{"name":"Service fee","fixedAmount":{"amount":"10.00"},"additionalInfo":"` + strings.Repeat("large fee note ", 1000) + `"}]`
	if _, err := writeSnapshotAt(ctx, db, []MortgageRate{{
		BankName:             "Example Bank",
		ProductName:          "Full Detail Loan",
		ProductID:            "full-detail-1",
		Description:          "A complete product row",
		RateType:             "VARIABLE",
		Rate:                 0.055,
		ComparisonRate:       0.056,
		RepaymentType:        "PRINCIPAL_AND_INTEREST",
		LoanPurpose:          "OWNER_OCCUPIED",
		FeatureTypes:         `["REDRAW"]`,
		FeatureDetails:       `[{"featureType":"REDRAW","additionalInfo":"Available"}]`,
		EligibilityDetails:   `[{"eligibilityType":"NATURAL_PERSON","additionalInfo":"Individuals only"}]`,
		Constraints:          `[{"constraintType":"MIN_LIMIT","additionalValue":"100000"}]`,
		Fees:                 largeFees,
		RateTiers:            `[{"name":"LVR","minimumValue":"0","maximumValue":"0.80"}]`,
		RateConditions:       `[{"additionalInfo":"Condition"}]`,
		RateConditionDetails: `[{"rateApplicabilityType":"NEW_CUSTOMERS"}]`,
		ProductTags:          `["redraw"]`,
		ProductDetailJSON:    `{"productId":"full-detail-1","fees":[{"name":"Service fee","fixedAmount":{"amount":"10.00"}}]}`,
	}}, 1, 0, time.Date(2026, 5, 3, 10, 0, 0, 0, time.UTC)); err != nil {
		t.Fatalf("write snapshot: %v", err)
	}

	destPath := filepath.Join(t.TempDir(), "rates.db")
	if err := writeStrippedDB(ctx, db, destPath); err != nil {
		t.Fatalf("write stripped db: %v", err)
	}

	stripped, err := sql.Open("sqlite", destPath)
	if err != nil {
		t.Fatalf("open stripped db: %v", err)
	}
	defer stripped.Close()

	for _, column := range []string{"feature_details", "eligibility_details", "constraints", "fees", "rate_tiers", "rate_conditions"} {
		exists, err := columnExists(ctx, stripped, "rates", column)
		if err != nil {
			t.Fatalf("check column %s: %v", column, err)
		}
		if exists {
			t.Fatalf("expected stripped DB to omit bulky column %s", column)
		}
	}

	for _, column := range []string{"description", "feature_types", "product_tags", "rate_condition_details", "rate_notes", "is_revert_rate"} {
		exists, err := columnExists(ctx, stripped, "rates", column)
		if err != nil {
			t.Fatalf("check column %s: %v", column, err)
		}
		if !exists {
			t.Fatalf("expected stripped DB to keep interactive column %s", column)
		}
	}

	var rateCount int
	if err := stripped.QueryRowContext(ctx, `SELECT COUNT(*) FROM rates`).Scan(&rateCount); err != nil {
		t.Fatalf("count stripped rates: %v", err)
	}
	if rateCount != 1 {
		t.Fatalf("expected all rates copied, got %d", rateCount)
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
