package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestProductHistoryKeyIncludesBankAndProductID(t *testing.T) {
	keyA := productHistoryKey("Example Bank", "home loan / 123")
	keyB := productHistoryKey("Other Bank", "home loan / 123")

	if keyA == keyB {
		t.Fatalf("expected bank name to be part of stable key, got %q for both banks", keyA)
	}
	if strings.ContainsAny(keyA, " /") {
		t.Fatalf("expected key to be URL/path safe, got %q", keyA)
	}
	if !strings.HasPrefix(keyA, "example-bank-home-loan-123-") {
		t.Fatalf("expected readable slug prefix, got %q", keyA)
	}
}

func TestWriteProductHistoryFilesWritesIndexAndProductJSON(t *testing.T) {
	ctx := context.Background()
	db, err := openDB(ctx, filepath.Join(t.TempDir(), "history.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()
	if err := ensureHistorySchema(ctx, db); err != nil {
		t.Fatalf("ensure history schema: %v", err)
	}

	for i, rate := range []float64{0.055, 0.057} {
		snapshotID, err := writeSnapshotAt(ctx, db, []MortgageRate{{
			BankName:       "Example Bank",
			ProductName:    "Basic Home Loan",
			ProductID:      "basic-1",
			RateType:       "VARIABLE",
			Rate:           rate,
			ComparisonRate: rate + 0.001,
			RepaymentType:  "PRINCIPAL_AND_INTEREST",
			LoanPurpose:    "OWNER_OCCUPIED",
			LvrMax:         0.8,
		}}, 1, 0, time.Date(2026, 4, 1+i, 10, 0, 0, 0, time.UTC))
		if err != nil {
			t.Fatalf("write snapshot %d: %v", i, err)
		}
		if err := recordDailyProductHistory(ctx, db, snapshotID); err != nil {
			t.Fatalf("record history %d: %v", i, err)
		}
	}

	outDir := t.TempDir()
	if err := writeProductHistoryFiles(ctx, db, outDir); err != nil {
		t.Fatalf("write product history files: %v", err)
	}

	indexData, err := os.ReadFile(filepath.Join(outDir, "history", "product-index.json"))
	if err != nil {
		t.Fatalf("read product index: %v", err)
	}
	var index ProductHistoryIndex
	if err := json.Unmarshal(indexData, &index); err != nil {
		t.Fatalf("decode product index: %v", err)
	}
	if len(index.Products) != 1 {
		t.Fatalf("expected one index entry, got %#v", index.Products)
	}

	productData, err := os.ReadFile(filepath.Join(outDir, "history", "products", index.Products[0].Key+".json"))
	if err != nil {
		t.Fatalf("read product history file: %v", err)
	}
	var product ProductHistoryFile
	if err := json.Unmarshal(productData, &product); err != nil {
		t.Fatalf("decode product history: %v", err)
	}
	if len(product.Variants) != 1 || len(product.Variants[0].Points) != 2 {
		t.Fatalf("expected one variant with two points, got %#v", product)
	}
}

func TestRecordDailyProductHistoryKeepsLatestRowPerDay(t *testing.T) {
	ctx := context.Background()
	db, err := openDB(ctx, filepath.Join(t.TempDir(), "history.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()
	if err := ensureHistorySchema(ctx, db); err != nil {
		t.Fatalf("ensure history schema: %v", err)
	}

	firstSnapshot, err := writeSnapshotAt(ctx, db, []MortgageRate{{
		BankName:       "Example Bank",
		ProductName:    "Basic Home Loan",
		ProductID:      "basic-1",
		RateType:       "VARIABLE",
		Rate:           0.055,
		ComparisonRate: 0.056,
		RepaymentType:  "PRINCIPAL_AND_INTEREST",
		LoanPurpose:    "OWNER_OCCUPIED",
		LvrMax:         0.8,
	}}, 1, 0, time.Date(2026, 4, 1, 8, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("write first snapshot: %v", err)
	}
	if err := recordDailyProductHistory(ctx, db, firstSnapshot); err != nil {
		t.Fatalf("record first history: %v", err)
	}

	latestSnapshot, err := writeSnapshotAt(ctx, db, []MortgageRate{{
		BankName:       "Example Bank",
		ProductName:    "Basic Home Loan",
		ProductID:      "basic-1",
		RateType:       "VARIABLE",
		Rate:           0.056,
		ComparisonRate: 0.057,
		RepaymentType:  "PRINCIPAL_AND_INTEREST",
		LoanPurpose:    "OWNER_OCCUPIED",
		LvrMax:         0.8,
	}}, 1, 0, time.Date(2026, 4, 1, 20, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("write latest snapshot: %v", err)
	}
	if err := recordDailyProductHistory(ctx, db, latestSnapshot); err != nil {
		t.Fatalf("record latest history: %v", err)
	}

	rows, err := loadProductHistoryRows(ctx, db)
	if err != nil {
		t.Fatalf("load history rows: %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("expected one daily row after same-day upsert, got %#v", rows)
	}
	if rows[0].Date != "2026-04-01" || rows[0].Rate != 0.056 || rows[0].ComparisonRate != 0.057 {
		t.Fatalf("expected latest same-day rate, got %#v", rows[0])
	}
}

func TestBuildProductHistoryDocumentsUsesDailyChangePoints(t *testing.T) {
	rows := []productHistoryRow{
		{
			Date:           "2026-04-01",
			BankName:       "Example Bank",
			ProductName:    "Basic Home Loan",
			ProductID:      "basic-1",
			RateType:       "VARIABLE",
			RepaymentType:  "PRINCIPAL_AND_INTEREST",
			LoanPurpose:    "OWNER_OCCUPIED",
			LvrMax:         0.8,
			Rate:           0.055,
			ComparisonRate: 0.056,
		},
		{
			Date:           "2026-04-02",
			BankName:       "Example Bank",
			ProductName:    "Basic Home Loan",
			ProductID:      "basic-1",
			RateType:       "VARIABLE",
			RepaymentType:  "PRINCIPAL_AND_INTEREST",
			LoanPurpose:    "OWNER_OCCUPIED",
			LvrMax:         0.8,
			Rate:           0.055,
			ComparisonRate: 0.056,
		},
		{
			Date:           "2026-04-03",
			BankName:       "Example Bank",
			ProductName:    "Basic Home Loan",
			ProductID:      "basic-1",
			RateType:       "VARIABLE",
			RepaymentType:  "PRINCIPAL_AND_INTEREST",
			LoanPurpose:    "OWNER_OCCUPIED",
			LvrMax:         0.8,
			Rate:           0.057,
			ComparisonRate: 0.058,
		},
		{
			Date:           "2026-04-04",
			BankName:       "Example Bank",
			ProductName:    "Basic Home Loan",
			ProductID:      "basic-1",
			RateType:       "VARIABLE",
			RepaymentType:  "PRINCIPAL_AND_INTEREST",
			LoanPurpose:    "OWNER_OCCUPIED",
			LvrMax:         0.8,
			Rate:           0.057,
			ComparisonRate: 0.058,
		},
	}

	index, files := buildProductHistoryDocuments(rows)

	if len(index.Products) != 1 {
		t.Fatalf("expected one product index entry, got %d", len(index.Products))
	}
	if index.Products[0].FirstDate != "2026-04-01" || index.Products[0].LastDate != "2026-04-04" {
		t.Fatalf("expected full available date range, got %#v", index.Products[0])
	}
	if len(files) != 1 {
		t.Fatalf("expected one product history file, got %d", len(files))
	}

	var history ProductHistoryFile
	for _, file := range files {
		history = file
	}
	if len(history.Variants) != 1 {
		t.Fatalf("expected one variant, got %d", len(history.Variants))
	}
	points := history.Variants[0].Points
	wantDates := []string{"2026-04-01", "2026-04-03", "2026-04-04"}
	if len(points) != len(wantDates) {
		t.Fatalf("expected %d change points, got %#v", len(wantDates), points)
	}
	for i, want := range wantDates {
		if points[i].Date != want {
			t.Fatalf("point %d date: got %q want %q", i, points[i].Date, want)
		}
	}
	if points[0].Rate != 0.055 || points[1].Rate != 0.057 || points[2].Rate != 0.057 {
		t.Fatalf("unexpected point rates: %#v", points)
	}
}
