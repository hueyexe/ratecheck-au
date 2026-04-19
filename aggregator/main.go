package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"

	"golang.org/x/sync/errgroup"
)

const userAgent = "ratecheck-au/1.0"

type uaTransport struct {
	rt http.RoundTripper
}

func (t *uaTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req.Header.Set("User-Agent", userAgent)
	return t.rt.RoundTrip(req)
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	ctx := context.Background()

	transport := &uaTransport{rt: http.DefaultTransport}
	regClient := &http.Client{Transport: transport, Timeout: 60 * time.Second}

	brands, err := fetchBankBrands(ctx, regClient)
	if err != nil {
		return fmt.Errorf("fetching bank brands: %w", err)
	}
	fmt.Fprintf(os.Stderr, "Found %d bank brands\n", len(brands))

	var (
		mu       sync.Mutex
		allRates []MortgageRate
		errCount int
		bankSet  = make(map[string]bool)
	)

	g, gCtx := errgroup.WithContext(ctx)
	g.SetLimit(10)

	for _, b := range brands {
		b := b
		g.Go(func() error {
			bankClient := &http.Client{Transport: transport, Timeout: 30 * time.Second}
			rates, err := fetchBankRates(gCtx, bankClient, b)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				fmt.Fprintf(os.Stderr, "error fetching %s: %v\n", b.BrandName, err)
				errCount++
				return nil
			}
			allRates = append(allRates, rates...)
			if len(rates) > 0 {
				bankSet[b.BrandName] = true
			}
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return err
	}

	sort.Slice(allRates, func(i, j int) bool {
		return allRates[i].Rate < allRates[j].Rate
	})

	// Resolve output directory
	outDir := resolveOutDir()
	repoRoot := filepath.Dir(outDir)
	if err := os.MkdirAll(outDir, 0o750); err != nil {
		return fmt.Errorf("creating output dir: %w", err)
	}

	// history.db lives at repo root — never inside public/, never served to browsers.
	// On first run, bootstrap from the existing rates.db which contains full history.
	historyPath := filepath.Join(repoRoot, "history.db")
	ratesPath := filepath.Join(outDir, "rates.db")
	if _, err := os.Stat(historyPath); os.IsNotExist(err) {
		if _, err2 := os.Stat(ratesPath); err2 == nil {
			fmt.Fprintf(os.Stderr, "Bootstrapping history.db from existing rates.db\n")
			if err3 := copyFile(ratesPath, historyPath); err3 != nil {
				return fmt.Errorf("bootstrapping history.db: %w", err3)
			}
		}
	}
	histDB, err := openDB(ctx, historyPath)
	if err != nil {
		return fmt.Errorf("opening history database: %w", err)
	}

	if err := writeSnapshot(ctx, histDB, allRates, len(bankSet), errCount); err != nil {
		_ = histDB.Close()
		return fmt.Errorf("writing snapshot: %w", err)
	}

	if err := pruneOldSnapshots(ctx, histDB, 30); err != nil {
		_ = histDB.Close()
		return fmt.Errorf("pruning old snapshots: %w", err)
	}

	if err := optimizeDB(ctx, histDB); err != nil {
		_ = histDB.Close()
		return fmt.Errorf("optimizing history db: %w", err)
	}

	// Re-open after VACUUM (connection is still valid but let's be safe)
	histDB2, err := openDB(ctx, historyPath)
	if err != nil {
		_ = histDB.Close()
		return fmt.Errorf("re-opening history database: %w", err)
	}
	_ = histDB.Close()

	// Compute analytics.json from full history
	analytics, err := computeAnalytics(ctx, histDB2)
	if err != nil {
		_ = histDB2.Close()
		return fmt.Errorf("computing analytics: %w", err)
	}
	if err := writeAnalytics(filepath.Join(outDir, "analytics.json"), analytics); err != nil {
		_ = histDB2.Close()
		return fmt.Errorf("writing analytics: %w", err)
	}
	fmt.Fprintf(os.Stderr, "Wrote analytics.json (%d timeline points, %d movers)\n",
		len(analytics.Timeline), len(analytics.TopMovers))

	// rates.db — latest snapshot only, served to browsers
	if err := writeStrippedDB(ctx, histDB2, ratesPath); err != nil {
		_ = histDB2.Close()
		return fmt.Errorf("writing stripped rates.db: %w", err)
	}
	_ = histDB2.Close()

	fi, err := os.Stat(ratesPath)
	if err != nil {
		return fmt.Errorf("stat rates.db: %w", err)
	}

	if err := writeMeta(filepath.Join(outDir, "meta.json"), MetaFile{
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		BankCount:   len(bankSet),
		RateCount:   len(allRates),
		DBSizeBytes: fi.Size(),
	}); err != nil {
		return fmt.Errorf("writing meta: %w", err)
	}

	fmt.Printf("Fetched %d rates from %d banks (%d errors)\n", len(allRates), len(bankSet), errCount)
	return nil
}

func resolveOutDir() string {
	if wd, err := os.Getwd(); err == nil {
		if filepath.Base(wd) == "aggregator" {
			return filepath.Join(filepath.Dir(wd), "public")
		}
		return filepath.Join(wd, "public")
	}
	exe, _ := os.Executable()
	return filepath.Join(filepath.Dir(filepath.Dir(exe)), "public")
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = out.ReadFrom(in)
	return err
}
