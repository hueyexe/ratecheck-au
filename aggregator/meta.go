package main

import (
	"encoding/json"
	"fmt"
	"os"
)

type MetaFile struct {
	GeneratedAt string `json:"generatedAt"`
	BankCount   int    `json:"bankCount"`
	RateCount   int    `json:"rateCount"`
	DBSizeBytes int64  `json:"dbSizeBytes"`
}

func writeMeta(path string, m MetaFile) error {
	data, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling meta: %w", err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("writing meta: %w", err)
	}
	return nil
}
