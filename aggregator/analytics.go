package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"time"
)

const outlierFloor = 0.04 // exclude specialist/subsidised products from market stats
const revertRateCeil = 0.20 // exclude clearly invalid CDR data (e.g. Bank of Sydney 71.9%)

// AnalyticsFile is written to public/analytics.json each run.
type AnalyticsFile struct {
	GeneratedAt      string               `json:"generatedAt"`
	SnapshotCount    int                  `json:"snapshotCount"`
	HistorySpanDays  float64              `json:"historySpanDays"`
	OutlierFloor     float64              `json:"outlierFloor"`
	Summary          AnalyticsSummary     `json:"summary"`
	Timeline         []TimelinePoint      `json:"timeline"`
	TopMovers        []TopMover           `json:"topMovers"`
	TrendBuckets     []TrendBucket        `json:"trendBuckets"`
	RateDistribution []DistributionBucket `json:"rateDistribution"`
	FeaturePrevalence []FeaturePrevalence `json:"featurePrevalence"`
	RateByLvr        []LvrBucket          `json:"rateByLvr"`
	VariableVsFixed  []VsFixedPoint       `json:"variableVsFixed"`
	CashbackBanks    []CashbackBank       `json:"cashbackBanks"`
}

type AnalyticsSummary struct {
	LowestVariable float64 `json:"lowestVariable"`
	LowestFixed    float64 `json:"lowestFixed"`
	AvgRate        float64 `json:"avgRate"`
	MedianRateOOPI float64 `json:"medianRateOOPI"`
	BankCount      int     `json:"bankCount"`
	RateCount      int     `json:"rateCount"`
	VariableCount  int     `json:"variableCount"`
	FixedCount     int     `json:"fixedCount"`
	LowerCount     int     `json:"lowerCount"`
	HigherCount    int     `json:"higherCount"`
	FlatCount      int     `json:"flatCount"`
}

type TimelinePoint struct {
	Date           string  `json:"date"`
	AvgVariable    float64 `json:"avgVariable"`
	AvgFixed       float64 `json:"avgFixed"`
	LowestVariable float64 `json:"lowestVariable"`
	LowestFixed    float64 `json:"lowestFixed"`
	BankCount      int     `json:"bankCount"`
	RateCount      int     `json:"rateCount"`
}

type TopMover struct {
	BankName    string  `json:"bankName"`
	ProductName string  `json:"productName"`
	RateType    string  `json:"rateType"`
	CurrentRate float64 `json:"currentRate"`
	PastRate    float64 `json:"pastRate"`
	ChangeBps   float64 `json:"changeBps"`
	Snapshots   int     `json:"snapshots"`
}

type TrendBucket struct {
	Bucket string `json:"bucket"`
	Count  int    `json:"count"`
}

type DistributionBucket struct {
	Bucket   string `json:"bucket"`
	Variable int    `json:"variable"`
	Fixed    int    `json:"fixed"`
}

type FeaturePrevalence struct {
	Feature string  `json:"feature"`
	Label   string  `json:"label"`
	Count   int     `json:"count"`
	Pct     float64 `json:"pct"`
}

type LvrBucket struct {
	Band        string  `json:"band"`
	AvgVariable float64 `json:"avgVariable"`
	AvgFixed    float64 `json:"avgFixed"`
	Count       int     `json:"count"`
}

type VsFixedPoint struct {
	Date        string  `json:"date"`
	VariablePct float64 `json:"variablePct"`
	VariableCount int   `json:"variableCount"`
	FixedCount  int     `json:"fixedCount"`
}

type CashbackBank struct {
	BankName    string `json:"bankName"`
	ProductName string `json:"productName"`
	Detail      string `json:"detail"`
}

func computeAnalytics(ctx context.Context, db *sql.DB) (*AnalyticsFile, error) {
	af := &AnalyticsFile{
		GeneratedAt:  time.Now().UTC().Format(time.RFC3339),
		OutlierFloor: outlierFloor,
	}

	// Snapshot span
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*), ROUND(julianday(MAX(fetched_at)) - julianday(MIN(fetched_at)), 1)
		FROM snapshots
	`).Scan(&af.SnapshotCount, &af.HistorySpanDays); err != nil {
		return nil, fmt.Errorf("snapshot span: %w", err)
	}

	latestID, err := latestSnapshotID(ctx, db)
	if err != nil {
		return nil, err
	}

	// Latest snapshot summary
	row := db.QueryRowContext(ctx, `
		SELECT
			MIN(CASE WHEN rate_type IN ('VARIABLE','INTRODUCTORY','BUNDLE_DISCOUNT_VARIABLE') THEN rate END),
			MIN(CASE WHEN rate_type IN ('FIXED','BUNDLE_DISCOUNT_FIXED') THEN rate END),
			AVG(rate),
			COUNT(DISTINCT bank_name),
			COUNT(*),
			SUM(CASE WHEN rate_type IN ('VARIABLE','INTRODUCTORY','BUNDLE_DISCOUNT_VARIABLE') THEN 1 ELSE 0 END),
			SUM(CASE WHEN rate_type IN ('FIXED','BUNDLE_DISCOUNT_FIXED') THEN 1 ELSE 0 END)
		FROM rates
		WHERE snapshot_id = ? AND rate > ? AND rate < ? AND COALESCE(is_revert_rate,0) = 0
	`, latestID, outlierFloor, revertRateCeil)
	var s AnalyticsSummary
	var loV, loF sql.NullFloat64
	if err := row.Scan(&loV, &loF, &s.AvgRate, &s.BankCount, &s.RateCount, &s.VariableCount, &s.FixedCount); err != nil {
		return nil, fmt.Errorf("summary: %w", err)
	}
	if loV.Valid {
		s.LowestVariable = round4(loV.Float64)
	}
	if loF.Valid {
		s.LowestFixed = round4(loF.Float64)
	}
	s.AvgRate = round4(s.AvgRate)

	// Median rate for owner-occupied P&I variable (more useful than mean for everyday users)
	medianRows, err := db.QueryContext(ctx, `
		SELECT rate FROM rates
		WHERE snapshot_id = ? AND rate > ? AND rate < ?
		  AND rate_type IN ('VARIABLE','INTRODUCTORY','BUNDLE_DISCOUNT_VARIABLE')
		  AND (loan_purpose = 'OWNER_OCCUPIED' OR loan_purpose = 'UNCONSTRAINED')
		  AND (repayment_type = 'PRINCIPAL_AND_INTEREST' OR repayment_type = 'UNCONSTRAINED')
		  AND COALESCE(is_revert_rate,0) = 0
		ORDER BY rate ASC
	`, latestID, outlierFloor, revertRateCeil)
	if err != nil {
		return nil, fmt.Errorf("median query: %w", err)
	}
	var medianRates []float64
	defer func() { _ = medianRows.Close() }()
	for medianRows.Next() {
		var r float64
		if err := medianRows.Scan(&r); err != nil {
			return nil, fmt.Errorf("median scan: %w", err)
		}
		medianRates = append(medianRates, r)
	}
	if n := len(medianRates); n > 0 {
		if n%2 == 0 {
			s.MedianRateOOPI = round4((medianRates[n/2-1] + medianRates[n/2]) / 2)
		} else {
			s.MedianRateOOPI = round4(medianRates[n/2])
		}
	}

	af.Summary = s

	// Movement counts across all history
	if err := db.QueryRowContext(ctx, `
		WITH h AS (
			SELECT rate,
				LAG(rate) OVER (PARTITION BY product_id, rate_type, repayment_type, loan_purpose ORDER BY snapshot_id) AS prev
			FROM rates WHERE rate > ? AND rate < ? AND COALESCE(is_revert_rate,0) = 0
		)
		SELECT
			SUM(CASE WHEN prev IS NOT NULL AND rate < prev THEN 1 ELSE 0 END),
			SUM(CASE WHEN prev IS NOT NULL AND rate > prev THEN 1 ELSE 0 END),
			SUM(CASE WHEN prev IS NOT NULL AND rate = prev THEN 1 ELSE 0 END)
		FROM h
	`, outlierFloor, revertRateCeil).Scan(&af.Summary.LowerCount, &af.Summary.HigherCount, &af.Summary.FlatCount); err != nil {
		return nil, fmt.Errorf("movement counts: %w", err)
	}

	// Timeline — one row per snapshot
	rows, err := db.QueryContext(ctx, `
		SELECT
			s.fetched_at,
			AVG(CASE WHEN r.rate_type IN ('VARIABLE','INTRODUCTORY','BUNDLE_DISCOUNT_VARIABLE') THEN r.rate END),
			AVG(CASE WHEN r.rate_type IN ('FIXED','BUNDLE_DISCOUNT_FIXED') THEN r.rate END),
			MIN(CASE WHEN r.rate_type IN ('VARIABLE','INTRODUCTORY','BUNDLE_DISCOUNT_VARIABLE') THEN r.rate END),
			MIN(CASE WHEN r.rate_type IN ('FIXED','BUNDLE_DISCOUNT_FIXED') THEN r.rate END),
			COUNT(DISTINCT r.bank_name),
			COUNT(*)
		FROM rates r
		JOIN snapshots s ON r.snapshot_id = s.id
		WHERE r.rate > ? AND r.rate < ? AND COALESCE(r.is_revert_rate,0) = 0
		GROUP BY s.id, s.fetched_at
		ORDER BY s.fetched_at ASC
	`, outlierFloor, revertRateCeil)
	if err != nil {
		return nil, fmt.Errorf("timeline: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var tp TimelinePoint
		var avgV, avgF, loV2, loF2 sql.NullFloat64
		if err := rows.Scan(&tp.Date, &avgV, &avgF, &loV2, &loF2, &tp.BankCount, &tp.RateCount); err != nil {
			return nil, fmt.Errorf("timeline row: %w", err)
		}
		if avgV.Valid { tp.AvgVariable = round4(avgV.Float64) }
		if avgF.Valid { tp.AvgFixed = round4(avgF.Float64) }
		if loV2.Valid { tp.LowestVariable = round4(loV2.Float64) }
		if loF2.Valid { tp.LowestFixed = round4(loF2.Float64) }
		af.Timeline = append(af.Timeline, tp)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("timeline rows: %w", err)
	}

	// Top movers
	moverRows, err := db.QueryContext(ctx, `
		WITH ranked AS (
			SELECT
				bank_name, product_name, rate_type, rate AS current_rate,
				LAG(rate) OVER (PARTITION BY product_id, rate_type, repayment_type, loan_purpose ORDER BY snapshot_id) AS past_rate,
				COUNT(*) OVER (PARTITION BY product_id, rate_type, repayment_type, loan_purpose) AS snapshots,
				ROW_NUMBER() OVER (PARTITION BY product_id, rate_type, repayment_type, loan_purpose ORDER BY snapshot_id DESC) AS rn
			FROM rates WHERE rate > ? AND rate < ? AND COALESCE(is_revert_rate,0) = 0
		)
		SELECT bank_name, product_name, rate_type, current_rate, past_rate, snapshots
		FROM ranked
		WHERE rn = 1 AND past_rate IS NOT NULL
		ORDER BY ABS((current_rate - past_rate) * 10000.0) DESC
		LIMIT 10
	`, outlierFloor, revertRateCeil)
	if err != nil {
		return nil, fmt.Errorf("top movers: %w", err)
	}
	defer moverRows.Close()
	for moverRows.Next() {
		var m TopMover
		if err := moverRows.Scan(&m.BankName, &m.ProductName, &m.RateType, &m.CurrentRate, &m.PastRate, &m.Snapshots); err != nil {
			return nil, fmt.Errorf("mover row: %w", err)
		}
		m.CurrentRate = round4(m.CurrentRate)
		m.PastRate = round4(m.PastRate)
		m.ChangeBps = math.Round((m.CurrentRate-m.PastRate)*10000*10) / 10
		af.TopMovers = append(af.TopMovers, m)
	}
	if err := moverRows.Err(); err != nil {
		return nil, fmt.Errorf("mover rows: %w", err)
	}

	// Trend buckets
	bucketRows, err := db.QueryContext(ctx, `
		WITH h AS (
			SELECT rate - LAG(rate) OVER (PARTITION BY product_id, rate_type, repayment_type, loan_purpose ORDER BY snapshot_id) AS delta
			FROM rates WHERE rate > ? AND rate < ? AND COALESCE(is_revert_rate,0) = 0
		)
		SELECT
			CASE
				WHEN delta IS NULL THEN 'No history'
				WHEN delta < -0.001 THEN 'Falling fast'
				WHEN delta < 0 THEN 'Falling'
				WHEN delta = 0 THEN 'Flat'
				WHEN delta <= 0.001 THEN 'Rising'
				ELSE 'Rising fast'
			END AS bucket,
			COUNT(*) AS cnt
		FROM h
		GROUP BY bucket
		ORDER BY CASE bucket
			WHEN 'Falling fast' THEN 1 WHEN 'Falling' THEN 2 WHEN 'Flat' THEN 3
			WHEN 'Rising' THEN 4 WHEN 'Rising fast' THEN 5 ELSE 6
		END
	`, outlierFloor, revertRateCeil)
	if err != nil {
		return nil, fmt.Errorf("trend buckets: %w", err)
	}
	defer bucketRows.Close()
	for bucketRows.Next() {
		var b TrendBucket
		if err := bucketRows.Scan(&b.Bucket, &b.Count); err != nil {
			return nil, fmt.Errorf("bucket row: %w", err)
		}
		af.TrendBuckets = append(af.TrendBuckets, b)
	}
	if err := bucketRows.Err(); err != nil {
		return nil, fmt.Errorf("bucket rows: %w", err)
	}

	// Rate distribution (latest snapshot)
	distRows, err := db.QueryContext(ctx, `
		SELECT
			PRINTF('%.1f%%', ROUND(rate * 100, 1)) AS bucket,
			SUM(CASE WHEN rate_type IN ('VARIABLE','INTRODUCTORY','BUNDLE_DISCOUNT_VARIABLE') THEN 1 ELSE 0 END),
			SUM(CASE WHEN rate_type IN ('FIXED','BUNDLE_DISCOUNT_FIXED') THEN 1 ELSE 0 END)
		FROM rates
		WHERE snapshot_id = ? AND rate > ? AND rate < ? AND COALESCE(is_revert_rate,0) = 0
		GROUP BY bucket
		ORDER BY rate ASC
	`, latestID, outlierFloor, revertRateCeil)
	if err != nil {
		return nil, fmt.Errorf("distribution: %w", err)
	}
	defer distRows.Close()
	for distRows.Next() {
		var d DistributionBucket
		if err := distRows.Scan(&d.Bucket, &d.Variable, &d.Fixed); err != nil {
			return nil, fmt.Errorf("dist row: %w", err)
		}
		af.RateDistribution = append(af.RateDistribution, d)
	}
	if err := distRows.Err(); err != nil {
		return nil, fmt.Errorf("dist rows: %w", err)
	}

	// Feature prevalence (latest snapshot)
	totalCount := s.RateCount
	featureLabels := map[string]string{
		"offset":           "Offset account",
		"redraw":           "Redraw facility",
		"extra_repayments": "Extra repayments",
		"cashback":         "Cashback offer",
		"guarantor":        "Guarantor option",
		"package":          "Package deal",
		"first_home_buyer": "First home buyer",
		"green":            "Green/eco loan",
	}
	for tag, label := range featureLabels {
		var count int
		if err := db.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM rates WHERE snapshot_id = ? AND product_tags LIKE ? AND rate > ? AND rate < ? AND COALESCE(is_revert_rate,0) = 0`,
			latestID, `%"`+tag+`"%`, outlierFloor, revertRateCeil,
		).Scan(&count); err != nil {
			continue
		}
		if count == 0 {
			continue
		}
		pct := 0.0
		if totalCount > 0 {
			pct = math.Round(float64(count)/float64(totalCount)*1000) / 10
		}
		af.FeaturePrevalence = append(af.FeaturePrevalence, FeaturePrevalence{
			Feature: tag,
			Label:   label,
			Count:   count,
			Pct:     pct,
		})
	}

	// Rate by LVR band (latest snapshot, variable OO P&I)
	lvrBands := []struct{ band, min, max string }{
		{"≤60% LVR", "0", "0.60"},
		{"60–80% LVR", "0.60", "0.80"},
		{"80–95% LVR", "0.80", "0.95"},
	}
	for _, b := range lvrBands {
		var avgVar, avgFix sql.NullFloat64
		var cnt int
		if err := db.QueryRowContext(ctx, `
			SELECT
				AVG(CASE WHEN rate_type IN ('VARIABLE','INTRODUCTORY','BUNDLE_DISCOUNT_VARIABLE') THEN rate END),
				AVG(CASE WHEN rate_type IN ('FIXED','BUNDLE_DISCOUNT_FIXED') THEN rate END),
				COUNT(*)
			FROM rates
			WHERE snapshot_id = ? AND rate > ? AND rate < ?
			  AND lvr_max > ? AND lvr_max <= ?
			  AND COALESCE(is_revert_rate,0) = 0
		`, latestID, outlierFloor, revertRateCeil, b.min, b.max).Scan(&avgVar, &avgFix, &cnt); err != nil {
			continue
		}
		bucket := LvrBucket{Band: b.band, Count: cnt}
		if avgVar.Valid { bucket.AvgVariable = round4(avgVar.Float64) }
		if avgFix.Valid { bucket.AvgFixed = round4(avgFix.Float64) }
		af.RateByLvr = append(af.RateByLvr, bucket)
	}

	// Variable vs fixed split over time
	vsRows, err := db.QueryContext(ctx, `
		SELECT
			s.fetched_at,
			SUM(CASE WHEN r.rate_type IN ('VARIABLE','INTRODUCTORY','BUNDLE_DISCOUNT_VARIABLE') THEN 1 ELSE 0 END) AS var_count,
			SUM(CASE WHEN r.rate_type IN ('FIXED','BUNDLE_DISCOUNT_FIXED') THEN 1 ELSE 0 END) AS fix_count
		FROM rates r
		JOIN snapshots s ON r.snapshot_id = s.id
		WHERE r.rate > ? AND r.rate < ? AND COALESCE(r.is_revert_rate,0) = 0
		GROUP BY s.id, s.fetched_at
		ORDER BY s.fetched_at ASC
	`, outlierFloor, revertRateCeil)
	if err != nil {
		return nil, fmt.Errorf("variable vs fixed: %w", err)
	}
	defer vsRows.Close()
	for vsRows.Next() {
		var vp VsFixedPoint
		if err := vsRows.Scan(&vp.Date, &vp.VariableCount, &vp.FixedCount); err != nil {
			return nil, fmt.Errorf("vs fixed row: %w", err)
		}
		total := vp.VariableCount + vp.FixedCount
		if total > 0 {
			vp.VariablePct = math.Round(float64(vp.VariableCount)/float64(total)*1000) / 10
		}
		af.VariableVsFixed = append(af.VariableVsFixed, vp)
	}
	if err := vsRows.Err(); err != nil {
		return nil, fmt.Errorf("vs fixed rows: %w", err)
	}

	// Cashback banks (latest snapshot)
	cbRows, err := db.QueryContext(ctx, `
		SELECT DISTINCT bank_name, product_name,
			COALESCE((
				SELECT json_extract(fd.value, '$.info')
				FROM json_each(feature_details) fd
				WHERE json_extract(fd.value, '$.type') = 'CASHBACK_OFFER'
				  AND json_extract(fd.value, '$.info') != ''
				LIMIT 1
			), '') AS detail
		FROM rates
		WHERE snapshot_id = ? AND product_tags LIKE '%"cashback"%'
		  AND rate > ? AND rate < ? AND COALESCE(is_revert_rate,0) = 0
		ORDER BY bank_name
	`, latestID, outlierFloor, revertRateCeil)
	if err != nil {
		return nil, fmt.Errorf("cashback banks: %w", err)
	}
	defer cbRows.Close()
	seen := map[string]bool{}
	for cbRows.Next() {
		var cb CashbackBank
		if err := cbRows.Scan(&cb.BankName, &cb.ProductName, &cb.Detail); err != nil {
			return nil, fmt.Errorf("cashback row: %w", err)
		}
		if seen[cb.BankName] {
			continue
		}
		seen[cb.BankName] = true
		af.CashbackBanks = append(af.CashbackBanks, cb)
	}
	if err := cbRows.Err(); err != nil {
		return nil, fmt.Errorf("cashback rows: %w", err)
	}

	return af, nil
}

func writeAnalytics(path string, af *AnalyticsFile) error {
	data, err := json.Marshal(af)
	if err != nil {
		return fmt.Errorf("marshaling analytics: %w", err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil { //nolint:gosec
		return fmt.Errorf("writing analytics: %w", err)
	}
	return os.Chmod(path, 0o644) //nolint:gosec
}

func latestSnapshotID(ctx context.Context, db *sql.DB) (int64, error) {
	var id int64
	if err := db.QueryRowContext(ctx, `SELECT MAX(id) FROM snapshots`).Scan(&id); err != nil {
		return 0, fmt.Errorf("latest snapshot id: %w", err)
	}
	return id, nil
}

func round4(v float64) float64 {
	return math.Round(v*10000) / 10000
}
