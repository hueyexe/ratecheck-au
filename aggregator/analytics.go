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

// AnalyticsFile is written to public/analytics.json each run.
type AnalyticsFile struct {
	GeneratedAt     string              `json:"generatedAt"`
	SnapshotCount   int                 `json:"snapshotCount"`
	HistorySpanDays float64             `json:"historySpanDays"`
	OutlierFloor    float64             `json:"outlierFloor"`
	Summary         AnalyticsSummary    `json:"summary"`
	Timeline        []TimelinePoint     `json:"timeline"`
	TopMovers       []TopMover          `json:"topMovers"`
	TrendBuckets    []TrendBucket       `json:"trendBuckets"`
	RateDistribution []DistributionBucket `json:"rateDistribution"`
}

type AnalyticsSummary struct {
	LowestVariable float64 `json:"lowestVariable"`
	LowestFixed    float64 `json:"lowestFixed"`
	AvgRate        float64 `json:"avgRate"`
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

	// Latest snapshot summary (with outlier floor)
	latestID, err := latestSnapshotID(ctx, db)
	if err != nil {
		return nil, err
	}

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
		WHERE snapshot_id = ? AND rate > ?
	`, latestID, outlierFloor)
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
	af.Summary = s

	// Movement counts across all history
	if err := db.QueryRowContext(ctx, `
		WITH h AS (
			SELECT rate,
				LAG(rate) OVER (PARTITION BY product_id, rate_type, repayment_type, loan_purpose ORDER BY snapshot_id) AS prev
			FROM rates WHERE rate > ?
		)
		SELECT
			SUM(CASE WHEN prev IS NOT NULL AND rate < prev THEN 1 ELSE 0 END),
			SUM(CASE WHEN prev IS NOT NULL AND rate > prev THEN 1 ELSE 0 END),
			SUM(CASE WHEN prev IS NOT NULL AND rate = prev THEN 1 ELSE 0 END)
		FROM h
	`, outlierFloor).Scan(&af.Summary.LowerCount, &af.Summary.HigherCount, &af.Summary.FlatCount); err != nil {
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
		WHERE r.rate > ?
		GROUP BY s.id, s.fetched_at
		ORDER BY s.fetched_at ASC
	`, outlierFloor)
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
		if avgV.Valid {
			tp.AvgVariable = round4(avgV.Float64)
		}
		if avgF.Valid {
			tp.AvgFixed = round4(avgF.Float64)
		}
		if loV2.Valid {
			tp.LowestVariable = round4(loV2.Float64)
		}
		if loF2.Valid {
			tp.LowestFixed = round4(loF2.Float64)
		}
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
			FROM rates WHERE rate > ?
		)
		SELECT bank_name, product_name, rate_type, current_rate, past_rate, snapshots
		FROM ranked
		WHERE rn = 1 AND past_rate IS NOT NULL
		ORDER BY ABS((current_rate - past_rate) * 10000.0) DESC
		LIMIT 10
	`, outlierFloor)
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
			FROM rates WHERE rate > ?
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
	`, outlierFloor)
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
		WHERE snapshot_id = ? AND rate > ?
		GROUP BY bucket
		ORDER BY rate ASC
	`, latestID, outlierFloor)
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

	return af, nil
}

func writeAnalytics(path string, af *AnalyticsFile) error {
	data, err := json.Marshal(af)
	if err != nil {
		return fmt.Errorf("marshaling analytics: %w", err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("writing analytics: %w", err)
	}
	return os.Chmod(path, 0o644)
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
