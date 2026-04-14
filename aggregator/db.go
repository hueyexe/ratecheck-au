package main

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

const schema = `
CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fetched_at TEXT NOT NULL,
  bank_count INTEGER NOT NULL,
  rate_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id INTEGER NOT NULL,
  bank_name TEXT NOT NULL,
  brand_group TEXT NOT NULL DEFAULT '',
  product_name TEXT NOT NULL,
  product_id TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  application_uri TEXT NOT NULL DEFAULT '',
  overview_uri TEXT NOT NULL DEFAULT '',
  terms_uri TEXT NOT NULL DEFAULT '',
  eligibility_uri TEXT NOT NULL DEFAULT '',
  fees_uri TEXT NOT NULL DEFAULT '',
  bundle_uri TEXT NOT NULL DEFAULT '',
  rate_type TEXT NOT NULL,
  rate REAL NOT NULL,
  comparison_rate REAL NOT NULL DEFAULT 0,
  repayment_type TEXT NOT NULL DEFAULT '',
  loan_purpose TEXT NOT NULL DEFAULT '',
  lvr_min REAL NOT NULL DEFAULT 0,
  lvr_max REAL NOT NULL DEFAULT 0,
  fixed_term TEXT NOT NULL DEFAULT '',
  feature_types TEXT NOT NULL DEFAULT '[]',
  product_tags TEXT NOT NULL DEFAULT '[]',
  audience_tags TEXT NOT NULL DEFAULT '[]',
  eligibility_types TEXT NOT NULL DEFAULT '[]',
  rate_conditions TEXT NOT NULL DEFAULT '[]',
  rate_notes TEXT NOT NULL DEFAULT '',
  is_tailored INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id)
);

CREATE INDEX IF NOT EXISTS idx_rates_snapshot ON rates(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_rates_filter ON rates(snapshot_id, rate_type, repayment_type, loan_purpose, lvr_max, rate);
CREATE INDEX IF NOT EXISTS idx_rates_search ON rates(snapshot_id, bank_name, product_name);
`

func openDB(ctx context.Context, path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}
	for _, pragma := range []string{
		"PRAGMA journal_mode=WAL",
		"PRAGMA page_size=4096",
	} {
		if _, err := db.ExecContext(ctx, pragma); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("setting %s: %w", pragma, err)
		}
	}
	if _, err := db.ExecContext(ctx, schema); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("creating schema: %w", err)
	}
	if err := migrateRatesSchema(ctx, db); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func migrateRatesSchema(ctx context.Context, db *sql.DB) error {
	type migration struct {
		column     string
		definition string
	}

	migrations := []migration{
		{column: "description", definition: `ALTER TABLE rates ADD COLUMN description TEXT NOT NULL DEFAULT ''`},
		{column: "application_uri", definition: `ALTER TABLE rates ADD COLUMN application_uri TEXT NOT NULL DEFAULT ''`},
		{column: "overview_uri", definition: `ALTER TABLE rates ADD COLUMN overview_uri TEXT NOT NULL DEFAULT ''`},
		{column: "terms_uri", definition: `ALTER TABLE rates ADD COLUMN terms_uri TEXT NOT NULL DEFAULT ''`},
		{column: "eligibility_uri", definition: `ALTER TABLE rates ADD COLUMN eligibility_uri TEXT NOT NULL DEFAULT ''`},
		{column: "fees_uri", definition: `ALTER TABLE rates ADD COLUMN fees_uri TEXT NOT NULL DEFAULT ''`},
		{column: "bundle_uri", definition: `ALTER TABLE rates ADD COLUMN bundle_uri TEXT NOT NULL DEFAULT ''`},
		{column: "feature_types", definition: `ALTER TABLE rates ADD COLUMN feature_types TEXT NOT NULL DEFAULT '[]'`},
		{column: "product_tags", definition: `ALTER TABLE rates ADD COLUMN product_tags TEXT NOT NULL DEFAULT '[]'`},
		{column: "audience_tags", definition: `ALTER TABLE rates ADD COLUMN audience_tags TEXT NOT NULL DEFAULT '[]'`},
		{column: "eligibility_types", definition: `ALTER TABLE rates ADD COLUMN eligibility_types TEXT NOT NULL DEFAULT '[]'`},
		{column: "rate_conditions", definition: `ALTER TABLE rates ADD COLUMN rate_conditions TEXT NOT NULL DEFAULT '[]'`},
		{column: "rate_notes", definition: `ALTER TABLE rates ADD COLUMN rate_notes TEXT NOT NULL DEFAULT ''`},
	}

	for _, migration := range migrations {
		hasColumn, err := columnExists(ctx, db, "rates", migration.column)
		if err != nil {
			return fmt.Errorf("checking rates schema for %s: %w", migration.column, err)
		}
		if hasColumn {
			continue
		}
		if _, err := db.ExecContext(ctx, migration.definition); err != nil {
			return fmt.Errorf("adding %s column: %w", migration.column, err)
		}
	}
	return nil
}

func columnExists(ctx context.Context, db *sql.DB, table, column string) (bool, error) {
	rows, err := db.QueryContext(ctx, fmt.Sprintf(`PRAGMA table_info(%s)`, table))
	if err != nil {
		return false, err
	}
	defer rows.Close()

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
			return false, err
		}
		if name == column {
			return true, nil
		}
	}
	if err := rows.Err(); err != nil {
		return false, err
	}
	return false, nil
}

func writeSnapshot(ctx context.Context, db *sql.DB, rates []MortgageRate, bankCount, errCount int) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("beginning transaction: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	var snapshotID int64
	err = tx.QueryRowContext(ctx,
		`INSERT INTO snapshots (fetched_at, bank_count, rate_count, error_count) VALUES (?, ?, ?, ?) RETURNING id`,
		time.Now().UTC().Format(time.RFC3339), bankCount, len(rates), errCount,
	).Scan(&snapshotID)
	if err != nil {
		return fmt.Errorf("inserting snapshot: %w", err)
	}

	stmt, err := tx.PrepareContext(ctx, `INSERT INTO rates (
		snapshot_id, bank_name, brand_group, product_name, product_id, description,
		application_uri, overview_uri, terms_uri, eligibility_uri, fees_uri, bundle_uri,
		rate_type, rate, comparison_rate, repayment_type, loan_purpose, lvr_min, lvr_max, fixed_term,
		feature_types, product_tags, audience_tags, eligibility_types, rate_conditions, rate_notes,
		is_tailored, last_updated
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return fmt.Errorf("preparing statement: %w", err)
	}
	defer stmt.Close()

	for _, r := range rates {
		tailored := 0
		if r.IsTailored {
			tailored = 1
		}
		if _, err := stmt.ExecContext(
			ctx,
			snapshotID, r.BankName, r.BrandGroup, r.ProductName, r.ProductID, r.Description,
			r.ApplicationURI, r.OverviewURI, r.TermsURI, r.EligibilityURI, r.FeesURI, r.BundleURI,
			r.RateType, r.Rate, r.ComparisonRate, r.RepaymentType, r.LoanPurpose, r.LvrMin, r.LvrMax, r.FixedTerm,
			r.FeatureTypes, r.ProductTags, r.AudienceTags, r.EligibilityTypes, r.RateConditions, r.RateNotes,
			tailored, r.LastUpdated,
		); err != nil {
			return fmt.Errorf("inserting rate: %w", err)
		}
	}

	return tx.Commit()
}

func pruneOldSnapshots(ctx context.Context, db *sql.DB, keepDays int) error {
	cutoff := time.Now().UTC().AddDate(0, 0, -keepDays).Format(time.RFC3339)
	if _, err := db.ExecContext(ctx, `DELETE FROM rates WHERE snapshot_id IN (SELECT id FROM snapshots WHERE fetched_at < ?)`, cutoff); err != nil {
		return fmt.Errorf("pruning old rates: %w", err)
	}
	if _, err := db.ExecContext(ctx, `DELETE FROM snapshots WHERE fetched_at < ?`, cutoff); err != nil {
		return fmt.Errorf("pruning old snapshots: %w", err)
	}
	return nil
}

func optimizeDB(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, `PRAGMA journal_mode=delete`); err != nil {
		return fmt.Errorf("setting journal_mode=delete: %w", err)
	}
	if _, err := db.ExecContext(ctx, `VACUUM`); err != nil {
		return fmt.Errorf("vacuuming: %w", err)
	}
	return nil
}
