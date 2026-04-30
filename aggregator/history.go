package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
	"unicode"
)

const productHistorySchema = `
CREATE TABLE IF NOT EXISTS product_rate_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_key TEXT NOT NULL,
  variant_key TEXT NOT NULL,
  date TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_id TEXT NOT NULL,
  rate_type TEXT NOT NULL,
  repayment_type TEXT NOT NULL,
  loan_purpose TEXT NOT NULL,
  lvr_min REAL NOT NULL DEFAULT 0,
  lvr_max REAL NOT NULL DEFAULT 0,
  fixed_term TEXT NOT NULL DEFAULT '',
  rate REAL NOT NULL,
  comparison_rate REAL NOT NULL DEFAULT 0,
  last_seen_at TEXT NOT NULL,
  UNIQUE(product_key, variant_key, date)
);

CREATE INDEX IF NOT EXISTS idx_product_rate_history_product ON product_rate_history(product_key, variant_key, date);
`

type ProductHistoryIndex struct {
	Products []ProductHistoryIndexEntry `json:"products"`
}

type ProductHistoryIndexEntry struct {
	Key          string `json:"key"`
	BankName     string `json:"bankName"`
	ProductName  string `json:"productName"`
	ProductID    string `json:"productId"`
	FirstDate    string `json:"firstDate"`
	LastDate     string `json:"lastDate"`
	VariantCount int    `json:"variantCount"`
}

type ProductHistoryFile struct {
	Key         string                  `json:"key"`
	BankName    string                  `json:"bankName"`
	ProductName string                  `json:"productName"`
	ProductID   string                  `json:"productId"`
	FirstDate   string                  `json:"firstDate"`
	LastDate    string                  `json:"lastDate"`
	Variants    []ProductHistoryVariant `json:"variants"`
}

type ProductHistoryVariant struct {
	Key           string                `json:"key"`
	RateType      string                `json:"rateType"`
	RepaymentType string                `json:"repaymentType"`
	LoanPurpose   string                `json:"loanPurpose"`
	LvrMin        float64               `json:"lvrMin"`
	LvrMax        float64               `json:"lvrMax"`
	FixedTerm     string                `json:"fixedTerm,omitempty"`
	Points        []ProductHistoryPoint `json:"points"`
}

type ProductHistoryPoint struct {
	Date           string  `json:"date"`
	Rate           float64 `json:"rate"`
	ComparisonRate float64 `json:"comparisonRate"`
}

type productHistoryRow struct {
	Date           string
	BankName       string
	ProductName    string
	ProductID      string
	RateType       string
	RepaymentType  string
	LoanPurpose    string
	LvrMin         float64
	LvrMax         float64
	FixedTerm      string
	Rate           float64
	ComparisonRate float64
}

func ensureHistorySchema(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, productHistorySchema); err != nil {
		return fmt.Errorf("creating product history schema: %w", err)
	}
	return nil
}

func recordDailyProductHistory(ctx context.Context, db *sql.DB, snapshotID int64) error {
	var fetchedAt string
	if err := db.QueryRowContext(ctx, `SELECT fetched_at FROM snapshots WHERE id = ?`, snapshotID).Scan(&fetchedAt); err != nil {
		return fmt.Errorf("reading snapshot date: %w", err)
	}
	day, err := snapshotDay(fetchedAt)
	if err != nil {
		return err
	}

	rows, err := db.QueryContext(ctx, `
		SELECT bank_name, product_name, product_id, rate_type, repayment_type, loan_purpose,
		       lvr_min, lvr_max, fixed_term, rate, comparison_rate
		FROM rates
		WHERE snapshot_id = ?
		ORDER BY bank_name, product_name, product_id, rate_type, repayment_type, loan_purpose, lvr_max, fixed_term
	`, snapshotID)
	if err != nil {
		return fmt.Errorf("reading snapshot rates for product history: %w", err)
	}
	defer rows.Close()

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("beginning product history transaction: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO product_rate_history (
			product_key, variant_key, date, bank_name, product_name, product_id,
			rate_type, repayment_type, loan_purpose, lvr_min, lvr_max, fixed_term,
			rate, comparison_rate, last_seen_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(product_key, variant_key, date) DO UPDATE SET
			bank_name = excluded.bank_name,
			product_name = excluded.product_name,
			product_id = excluded.product_id,
			rate_type = excluded.rate_type,
			repayment_type = excluded.repayment_type,
			loan_purpose = excluded.loan_purpose,
			lvr_min = excluded.lvr_min,
			lvr_max = excluded.lvr_max,
			fixed_term = excluded.fixed_term,
			rate = excluded.rate,
			comparison_rate = excluded.comparison_rate,
			last_seen_at = excluded.last_seen_at
	`)
	if err != nil {
		return fmt.Errorf("preparing product history upsert: %w", err)
	}
	defer stmt.Close()

	for rows.Next() {
		var row productHistoryRow
		if err := rows.Scan(
			&row.BankName, &row.ProductName, &row.ProductID, &row.RateType, &row.RepaymentType, &row.LoanPurpose,
			&row.LvrMin, &row.LvrMax, &row.FixedTerm, &row.Rate, &row.ComparisonRate,
		); err != nil {
			return fmt.Errorf("scanning product history rate: %w", err)
		}
		row.Date = day
		productKey := productHistoryKey(row.BankName, row.ProductID)
		variantKey := productHistoryVariantKey(row)
		if _, err := stmt.ExecContext(ctx,
			productKey, variantKey, row.Date, row.BankName, row.ProductName, row.ProductID,
			row.RateType, row.RepaymentType, row.LoanPurpose, row.LvrMin, row.LvrMax, row.FixedTerm,
			row.Rate, row.ComparisonRate, fetchedAt,
		); err != nil {
			return fmt.Errorf("upserting product history row: %w", err)
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("product history rows: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("committing product history: %w", err)
	}
	return nil
}

func snapshotDay(fetchedAt string) (string, error) {
	parsed, err := time.Parse(time.RFC3339, fetchedAt)
	if err != nil {
		return "", fmt.Errorf("parsing snapshot date %q: %w", fetchedAt, err)
	}
	return parsed.UTC().Format(time.DateOnly), nil
}

func loadProductHistoryRows(ctx context.Context, db *sql.DB) ([]productHistoryRow, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT date, bank_name, product_name, product_id, rate_type, repayment_type, loan_purpose,
		       lvr_min, lvr_max, fixed_term, rate, comparison_rate
		FROM product_rate_history
		ORDER BY product_key, variant_key, date
	`)
	if err != nil {
		return nil, fmt.Errorf("loading product history rows: %w", err)
	}
	defer rows.Close()

	var historyRows []productHistoryRow
	for rows.Next() {
		var row productHistoryRow
		if err := rows.Scan(
			&row.Date, &row.BankName, &row.ProductName, &row.ProductID, &row.RateType, &row.RepaymentType, &row.LoanPurpose,
			&row.LvrMin, &row.LvrMax, &row.FixedTerm, &row.Rate, &row.ComparisonRate,
		); err != nil {
			return nil, fmt.Errorf("scanning product history row: %w", err)
		}
		historyRows = append(historyRows, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("product history row iteration: %w", err)
	}
	return historyRows, nil
}

func writeProductHistoryFiles(ctx context.Context, db *sql.DB, outDir string) error {
	rows, err := loadProductHistoryRows(ctx, db)
	if err != nil {
		return err
	}
	index, files := buildProductHistoryDocuments(rows)

	historyDir := filepath.Join(outDir, "history")
	productsDir := filepath.Join(historyDir, "products")
	if err := os.RemoveAll(historyDir); err != nil {
		return fmt.Errorf("clearing product history output: %w", err)
	}
	if err := os.MkdirAll(productsDir, 0o750); err != nil {
		return fmt.Errorf("creating product history output: %w", err)
	}
	if err := writeJSON(filepath.Join(historyDir, "product-index.json"), index); err != nil {
		return fmt.Errorf("writing product history index: %w", err)
	}

	keys := make([]string, 0, len(files))
	for key := range files {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		if err := writeJSON(filepath.Join(productsDir, key+".json"), files[key]); err != nil {
			return fmt.Errorf("writing product history %s: %w", key, err)
		}
	}
	return nil
}

func writeJSON(path string, value any) error {
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return err
	}
	return nil
}

func productHistoryKey(bankName, productID string) string {
	readable := strings.Trim(slugPart(bankName)+"-"+slugPart(productID), "-")
	if readable == "" {
		readable = "product"
	}
	if len(readable) > 72 {
		readable = strings.Trim(readable[:72], "-")
	}
	h := fnv.New32a()
	_, _ = h.Write([]byte(bankName))
	_, _ = h.Write([]byte{0})
	_, _ = h.Write([]byte(productID))
	return fmt.Sprintf("%s-%08x", readable, h.Sum32())
}

func slugPart(value string) string {
	var b strings.Builder
	lastHyphen := false
	for _, r := range strings.ToLower(value) {
		if r > unicode.MaxASCII {
			continue
		}
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			lastHyphen = false
			continue
		}
		if !lastHyphen {
			b.WriteByte('-')
			lastHyphen = true
		}
	}
	return strings.Trim(b.String(), "-")
}

func productHistoryVariantKey(row productHistoryRow) string {
	return strings.Join([]string{
		row.RateType,
		row.RepaymentType,
		row.LoanPurpose,
		fmt.Sprintf("%.4f", row.LvrMin),
		fmt.Sprintf("%.4f", row.LvrMax),
		row.FixedTerm,
	}, "|")
}

func buildProductHistoryDocuments(rows []productHistoryRow) (ProductHistoryIndex, map[string]ProductHistoryFile) {
	sort.Slice(rows, func(i, j int) bool {
		pi := productHistoryKey(rows[i].BankName, rows[i].ProductID)
		pj := productHistoryKey(rows[j].BankName, rows[j].ProductID)
		if pi != pj {
			return pi < pj
		}
		vi := productHistoryVariantKey(rows[i])
		vj := productHistoryVariantKey(rows[j])
		if vi != vj {
			return vi < vj
		}
		return rows[i].Date < rows[j].Date
	})

	files := make(map[string]ProductHistoryFile)
	variantRows := make(map[string][]productHistoryRow)
	variantOrderByProduct := make(map[string][]string)

	for _, row := range rows {
		productKey := productHistoryKey(row.BankName, row.ProductID)
		file := files[productKey]
		if file.Key == "" {
			file = ProductHistoryFile{
				Key:         productKey,
				BankName:    row.BankName,
				ProductName: row.ProductName,
				ProductID:   row.ProductID,
				FirstDate:   row.Date,
				LastDate:    row.Date,
			}
		}
		if row.Date < file.FirstDate {
			file.FirstDate = row.Date
		}
		if row.Date > file.LastDate {
			file.LastDate = row.Date
		}
		files[productKey] = file

		variantKey := productKey + "::" + productHistoryVariantKey(row)
		if len(variantRows[variantKey]) == 0 {
			variantOrderByProduct[productKey] = append(variantOrderByProduct[productKey], variantKey)
		}
		variantRows[variantKey] = append(variantRows[variantKey], row)
	}

	var index ProductHistoryIndex
	productKeys := make([]string, 0, len(files))
	for key := range files {
		productKeys = append(productKeys, key)
	}
	sort.Strings(productKeys)

	for _, productKey := range productKeys {
		file := files[productKey]
		for _, variantKey := range variantOrderByProduct[productKey] {
			rows := variantRows[variantKey]
			if len(rows) == 0 {
				continue
			}
			first := rows[0]
			variant := ProductHistoryVariant{
				Key:           productHistoryVariantKey(first),
				RateType:      first.RateType,
				RepaymentType: first.RepaymentType,
				LoanPurpose:   first.LoanPurpose,
				LvrMin:        first.LvrMin,
				LvrMax:        first.LvrMax,
				FixedTerm:     first.FixedTerm,
				Points:        dailyChangePoints(rows),
			}
			file.Variants = append(file.Variants, variant)
		}
		files[productKey] = file
		index.Products = append(index.Products, ProductHistoryIndexEntry{
			Key:          file.Key,
			BankName:     file.BankName,
			ProductName:  file.ProductName,
			ProductID:    file.ProductID,
			FirstDate:    file.FirstDate,
			LastDate:     file.LastDate,
			VariantCount: len(file.Variants),
		})
	}

	return index, files
}

func dailyChangePoints(rows []productHistoryRow) []ProductHistoryPoint {
	if len(rows) == 0 {
		return nil
	}
	points := []ProductHistoryPoint{{Date: rows[0].Date, Rate: rows[0].Rate, ComparisonRate: rows[0].ComparisonRate}}
	for _, row := range rows[1:] {
		last := points[len(points)-1]
		if row.Rate != last.Rate || row.ComparisonRate != last.ComparisonRate {
			points = append(points, ProductHistoryPoint{Date: row.Date, Rate: row.Rate, ComparisonRate: row.ComparisonRate})
		}
	}
	lastRow := rows[len(rows)-1]
	lastPoint := points[len(points)-1]
	if lastRow.Date != lastPoint.Date {
		points = append(points, ProductHistoryPoint{Date: lastRow.Date, Rate: lastRow.Rate, ComparisonRate: lastRow.ComparisonRate})
	}
	return points
}
