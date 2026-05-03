package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
)

type ProductDetailIndex struct {
	Products []ProductDetailIndexEntry `json:"products"`
}

type ProductDetailIndexEntry struct {
	Key         string `json:"key"`
	BankName    string `json:"bankName"`
	ProductName string `json:"productName"`
	ProductID   string `json:"productId"`
}

type ProductDetailFile struct {
	Key         string          `json:"key"`
	BankName    string          `json:"bankName"`
	ProductName string          `json:"productName"`
	ProductID   string          `json:"productId"`
	Detail      json.RawMessage `json:"detail"`
}

func writeProductDetailFiles(ctx context.Context, db *sql.DB, outDir string) error {
	latestID, err := latestSnapshotID(ctx, db)
	if err != nil {
		return err
	}

	rows, err := db.QueryContext(ctx, `
		SELECT product_id, bank_name, product_name, detail_json
		FROM product_details
		WHERE snapshot_id = ? AND detail_json <> ''
		ORDER BY bank_name, product_name, product_id
	`, latestID)
	if err != nil {
		return fmt.Errorf("loading product detail rows: %w", err)
	}
	defer rows.Close()

	index := ProductDetailIndex{}
	files := make(map[string]ProductDetailFile)
	for rows.Next() {
		var productID, bankName, productName, detailJSON string
		if err := rows.Scan(&productID, &bankName, &productName, &detailJSON); err != nil {
			return fmt.Errorf("scanning product detail row: %w", err)
		}
		key := productHistoryKey(bankName, productID)
		entry := ProductDetailIndexEntry{Key: key, BankName: bankName, ProductName: productName, ProductID: productID}
		index.Products = append(index.Products, entry)
		files[key] = ProductDetailFile{
			Key:         key,
			BankName:    bankName,
			ProductName: productName,
			ProductID:   productID,
			Detail:      json.RawMessage(detailJSON),
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("product detail rows: %w", err)
	}

	detailDir := filepath.Join(outDir, "product-details")
	productsDir := filepath.Join(detailDir, "products")
	if err := os.RemoveAll(detailDir); err != nil {
		return fmt.Errorf("clearing product detail output: %w", err)
	}
	if err := os.MkdirAll(productsDir, 0o750); err != nil {
		return fmt.Errorf("creating product detail output: %w", err)
	}
	if err := writeJSON(filepath.Join(detailDir, "product-index.json"), index); err != nil {
		return fmt.Errorf("writing product detail index: %w", err)
	}

	keys := make([]string, 0, len(files))
	for key := range files {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		if err := writeJSON(filepath.Join(productsDir, key+".json"), files[key]); err != nil {
			return fmt.Errorf("writing product detail %s: %w", key, err)
		}
	}
	return nil
}
