package main

import (
	"strings"
	"testing"
	"time"
)

func TestBuildLLMFilesIncludesSpecShapeAndData(t *testing.T) {
	files := buildLLMFiles(llmExportData{
		Meta: MetaFile{
			GeneratedAt: time.Date(2026, 4, 30, 1, 2, 3, 0, time.UTC).Format(time.RFC3339),
			BankCount:   2,
			RateCount:   3,
			DBSizeBytes: 1234,
		},
		Analytics: &AnalyticsFile{
			Summary: AnalyticsSummary{LowestVariable: 0.055, LowestFixed: 0.052, MedianRateOOPI: 0.061, BankCount: 2, RateCount: 3},
		},
		Banks: []llmBankSummary{{BankName: "Example Bank", ProductCount: 2, BestVariableRate: 0.055, BestFixedRate: 0.052}},
		Rates: []llmRateSummary{{
			BankName:       "Example Bank",
			ProductName:    "Basic Home Loan",
			RateType:       "VARIABLE",
			Rate:           0.055,
			ComparisonRate: 0.056,
			RepaymentType:  "PRINCIPAL_AND_INTEREST",
			LoanPurpose:    "OWNER_OCCUPIED",
			LVRMax:         0.8,
		}},
	})

	llms := files["llms.txt"]
	if !strings.HasPrefix(llms, "# RateCheck\n\n> Free, open-source Australian mortgage rate comparison") {
		t.Fatalf("llms.txt did not start with expected title and blockquote:\n%s", llms)
	}
	for _, want := range []string{"## Core data", "[Current mortgage rates](/rates.md)", "[Full LLM context](/llms-full.txt)"} {
		if !strings.Contains(llms, want) {
			t.Fatalf("llms.txt missing %q:\n%s", want, llms)
		}
	}

	rates := files["rates.md"]
	for _, want := range []string{"# Current Mortgage Rates", "Example Bank", "Basic Home Loan", "5.5%"} {
		if !strings.Contains(rates, want) {
			t.Fatalf("rates.md missing %q:\n%s", want, rates)
		}
	}
}

func TestBuildLLMFilesIncludesDiscoveryFiles(t *testing.T) {
	files := buildLLMFiles(llmExportData{Meta: MetaFile{GeneratedAt: "2026-04-30T00:00:00Z"}})

	robots := files["robots.txt"]
	if !strings.Contains(robots, "Sitemap: https://ratecheckau.homes/sitemap.xml") {
		t.Fatalf("robots.txt missing sitemap:\n%s", robots)
	}
	if !strings.Contains(robots, "LLMs: https://ratecheckau.homes/llms.txt") {
		t.Fatalf("robots.txt missing llms directive:\n%s", robots)
	}

	sitemap := files["sitemap.xml"]
	for _, want := range []string{"https://ratecheckau.homes/rates.md", "https://ratecheckau.homes/calculator"} {
		if !strings.Contains(sitemap, want) {
			t.Fatalf("sitemap.xml missing %q:\n%s", want, sitemap)
		}
	}
}

func TestBuildLLMFilesEndWithSingleTrailingNewline(t *testing.T) {
	files := buildLLMFiles(llmExportData{
		Meta:      MetaFile{GeneratedAt: "2026-04-30T00:00:00Z"},
		Analytics: &AnalyticsFile{Summary: AnalyticsSummary{LowestVariable: 0.055}},
	})

	for name, contents := range files {
		if !strings.HasSuffix(contents, "\n") {
			t.Fatalf("%s should end with a trailing newline", name)
		}
		if strings.HasSuffix(contents, "\n\n") {
			t.Fatalf("%s should not end with a blank line", name)
		}
	}
}

func TestBuildLLMExportDataIncludesFullRateRows(t *testing.T) {
	data := buildLLMExportData(MetaFile{}, nil, []MortgageRate{
		{BankName: "Bank B", ProductName: "Loan B", RateType: "FIXED", Rate: 0.057, ComparisonRate: 0.059, RepaymentType: "PRINCIPAL_AND_INTEREST", LoanPurpose: "OWNER_OCCUPIED", FixedTerm: "2", LvrMax: 0.8},
		{BankName: "Bank A", ProductName: "Loan A", RateType: "VARIABLE", Rate: 0.052, ComparisonRate: 0.054, RepaymentType: "PRINCIPAL_AND_INTEREST", LoanPurpose: "OWNER_OCCUPIED", LvrMax: 0.7},
	})

	if len(data.Rates) != 2 {
		t.Fatalf("expected 2 rate rows, got %d", len(data.Rates))
	}
	if data.Rates[0].BankName != "Bank A" {
		t.Fatalf("expected rates sorted by rate, got %#v", data.Rates)
	}
	if len(data.Banks) != 2 {
		t.Fatalf("expected 2 bank summaries, got %d", len(data.Banks))
	}
}
