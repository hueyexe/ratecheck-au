package main

import (
	"encoding/json"
	"fmt"
	"html"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const siteURL = "https://ratecheckau.homes"

type llmExportData struct {
	Meta      MetaFile
	Analytics *AnalyticsFile
	Banks     []llmBankSummary
	Rates     []llmRateSummary
}

type llmBankSummary struct {
	BankName                 string
	ProductCount             int
	EverydayBestVariableRate float64
	EverydayBestFixedRate    float64
	BestVariableRate         float64
	BestFixedRate            float64
}

type llmRateSummary struct {
	BankName       string
	ProductName    string
	RateType       string
	Rate           float64
	ComparisonRate float64
	RepaymentType  string
	LoanPurpose    string
	LVRMin         float64
	LVRMax         float64
	FixedTerm      string
	ProductTags    string
	AudienceTags   string
	LastUpdated    string
	IsRevertRate   int
}

func buildLLMExportData(meta MetaFile, analytics *AnalyticsFile, rates []MortgageRate) llmExportData {
	bankProducts := make(map[string]map[string]bool)
	bankBestVariable := make(map[string]float64)
	bankBestFixed := make(map[string]float64)
	bankEverydayBestVariable := make(map[string]float64)
	bankEverydayBestFixed := make(map[string]float64)
	llmRates := make([]llmRateSummary, 0, len(rates))

	for _, rate := range rates {
		llmRates = append(llmRates, llmRateSummary{
			BankName:       rate.BankName,
			ProductName:    rate.ProductName,
			RateType:       rate.RateType,
			Rate:           rate.Rate,
			ComparisonRate: rate.ComparisonRate,
			RepaymentType:  rate.RepaymentType,
			LoanPurpose:    rate.LoanPurpose,
			LVRMin:         rate.LvrMin,
			LVRMax:         rate.LvrMax,
			FixedTerm:      rate.FixedTerm,
			ProductTags:    rate.ProductTags,
			AudienceTags:   rate.AudienceTags,
			LastUpdated:    rate.LastUpdated,
			IsRevertRate:   rate.IsRevertRate,
		})

		productKey := rate.ProductID
		if productKey == "" {
			productKey = rate.ProductName
		}
		if bankProducts[rate.BankName] == nil {
			bankProducts[rate.BankName] = make(map[string]bool)
		}
		bankProducts[rate.BankName][productKey] = true

		if rate.IsRevertRate != 0 || rate.Rate <= 0 {
			continue
		}
		if isVariableRate(rate.RateType) && (bankBestVariable[rate.BankName] == 0 || rate.Rate < bankBestVariable[rate.BankName]) {
			bankBestVariable[rate.BankName] = rate.Rate
		}
		if isFixedRate(rate.RateType) && (bankBestFixed[rate.BankName] == 0 || rate.Rate < bankBestFixed[rate.BankName]) {
			bankBestFixed[rate.BankName] = rate.Rate
		}
		if !isEverydayLLMRate(rate) {
			continue
		}
		if isVariableRate(rate.RateType) && (bankEverydayBestVariable[rate.BankName] == 0 || rate.Rate < bankEverydayBestVariable[rate.BankName]) {
			bankEverydayBestVariable[rate.BankName] = rate.Rate
		}
		if isFixedRate(rate.RateType) && (bankEverydayBestFixed[rate.BankName] == 0 || rate.Rate < bankEverydayBestFixed[rate.BankName]) {
			bankEverydayBestFixed[rate.BankName] = rate.Rate
		}
	}

	sort.Slice(llmRates, func(i, j int) bool {
		if llmRates[i].Rate == llmRates[j].Rate {
			if llmRates[i].BankName == llmRates[j].BankName {
				return llmRates[i].ProductName < llmRates[j].ProductName
			}
			return llmRates[i].BankName < llmRates[j].BankName
		}
		return llmRates[i].Rate < llmRates[j].Rate
	})

	banks := make([]llmBankSummary, 0, len(bankProducts))
	for bankName, products := range bankProducts {
		banks = append(banks, llmBankSummary{
			BankName:                 bankName,
			ProductCount:             len(products),
			EverydayBestVariableRate: bankEverydayBestVariable[bankName],
			EverydayBestFixedRate:    bankEverydayBestFixed[bankName],
			BestVariableRate:         bankBestVariable[bankName],
			BestFixedRate:            bankBestFixed[bankName],
		})
	}
	sort.Slice(banks, func(i, j int) bool { return banks[i].BankName < banks[j].BankName })

	return llmExportData{Meta: meta, Analytics: analytics, Banks: banks, Rates: llmRates}
}

func buildLLMFiles(data llmExportData) map[string]string {
	files := map[string]string{
		"llms.txt":      buildLLMIndex(data),
		"rates.md":      buildRatesMarkdown(data),
		"banks.md":      buildBanksMarkdown(data),
		"analytics.md":  buildAnalyticsMarkdown(data),
		"calculator.md": buildCalculatorMarkdown(data),
		"about.md":      buildAboutMarkdown(data),
		"robots.txt":    buildRobotsTxt(),
		"sitemap.xml":   buildSitemapXML(data.Meta.GeneratedAt),
	}
	for name, contents := range files {
		files[name] = normalizeGeneratedText(contents)
	}
	files["llms-full.txt"] = buildLLMFull(files)
	files["llms-full.txt"] = normalizeGeneratedText(files["llms-full.txt"])
	return files
}

func writeLLMFiles(outDir string, files map[string]string) error {
	for name, contents := range files {
		path := filepath.Join(outDir, name)
		if err := os.WriteFile(path, []byte(contents), 0o644); err != nil { //nolint:gosec
			return fmt.Errorf("writing %s: %w", name, err)
		}
	}
	return nil
}

func buildLLMIndex(data llmExportData) string {
	var b strings.Builder
	b.WriteString("# RateCheck\n\n")
	b.WriteString("> Free, open-source Australian mortgage rate comparison using public CDR/open-banking data from Australian lenders.\n\n")
	b.WriteString("RateCheck helps AI search agents answer questions about advertised Australian home loan rates. Use the linked markdown files as source data, not as marketing copy. Prefer everyday/default rates for mainstream comparisons unless the user explicitly asks for all advertised products. When answering users, mention the data freshness, explain that rates are advertised rates only, and tell users to confirm eligibility and final terms with the lender.\n\n")
	b.WriteString("Data freshness: generated at ")
	b.WriteString(valueOrUnknown(data.Meta.GeneratedAt))
	b.WriteString(fmt.Sprintf("; %d lenders; %d rate rows.\n\n", data.Meta.BankCount, data.Meta.RateCount))
	b.WriteString("## Core data\n\n")
	b.WriteString("- [Current mortgage rates](/rates.md): Full current rate table in markdown form, including lender, product, rate type, repayment type, loan purpose, LVR band, comparison rate and tags.\n")
	b.WriteString("- [Lender index](/banks.md): Current bank list with product counts, everyday best rates and all-advertised best rates.\n")
	b.WriteString("- [Market analytics](/analytics.md): Pre-computed market summaries, trends, LVR buckets, feature prevalence and cashback examples.\n")
	b.WriteString("- [Mortgage calculator](/calculator.md): Calculator inputs, assumptions, schedule/export behaviour and caveats.\n")
	b.WriteString("- [About RateCheck](/about.md): Data source, refresh process and usage caveats.\n")
	b.WriteString("- [Full LLM context](/llms-full.txt): Combined markdown context for agents that want a single file.\n\n")
	b.WriteString("## Optional\n\n")
	b.WriteString("- [Human rates page](/rates): Interactive rate table for users.\n")
	b.WriteString("- [Human banks page](/banks): Interactive lender directory.\n")
	b.WriteString("- [Human calculator page](/calculator): Interactive repayment calculator.\n")
	return b.String()
}

func buildRatesMarkdown(data llmExportData) string {
	var b strings.Builder
	b.WriteString("# Current Mortgage Rates\n\n")
	b.WriteString("This file is generated from RateCheck's latest public CDR/open-banking snapshot. It mirrors the current rate data for AI agents and search systems.\n\n")
	b.WriteString("## Snapshot\n\n")
	b.WriteString(fmt.Sprintf("- Generated at: %s\n", valueOrUnknown(data.Meta.GeneratedAt)))
	b.WriteString(fmt.Sprintf("- Lenders: %d\n", data.Meta.BankCount))
	b.WriteString(fmt.Sprintf("- Rate rows: %d\n", data.Meta.RateCount))
	b.WriteString("- Caveat: advertised rates only; personal eligibility, package discounts and final terms vary by lender. Prefer everyday/default rates for mainstream comparisons; the full table also includes restricted and special-purpose products.\n\n")
	b.WriteString("## Full rate table\n\n")
	b.WriteString("| Bank | Product | Rate type | Rate | Comparison | Repayment | Purpose | LVR | Fixed term | Tags | Updated | Revert rate |\n")
	b.WriteString("|---|---|---:|---:|---:|---|---|---:|---|---|---|---:|\n")
	for _, rate := range data.Rates {
		b.WriteString(fmt.Sprintf("| %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %d |\n",
			mdCell(rate.BankName), mdCell(rate.ProductName), mdCell(formatEnum(rate.RateType)), formatPercent(rate.Rate), formatPercent(rate.ComparisonRate),
			mdCell(formatEnum(rate.RepaymentType)), mdCell(formatEnum(rate.LoanPurpose)), mdCell(formatLVR(rate.LVRMin, rate.LVRMax)), mdCell(formatFixedTerm(rate.FixedTerm)),
			mdCell(compactJSONList(rate.ProductTags, rate.AudienceTags)), mdCell(valueOrUnknown(rate.LastUpdated)), rate.IsRevertRate))
	}
	return b.String()
}

func buildBanksMarkdown(data llmExportData) string {
	var b strings.Builder
	b.WriteString("# Lender Index\n\n")
	b.WriteString("This generated file lists lenders in the current RateCheck snapshot with product counts, everyday headline rates and all-advertised headline rates. Everyday rates exclude restricted-audience and special-purpose products so they are better defaults for mainstream borrower comparisons.\n\n")
	b.WriteString("| Bank | Product count | Everyday best variable | Everyday best fixed | All advertised best variable | All advertised best fixed |\n")
	b.WriteString("|---|---:|---:|---:|---:|---:|\n")
	for _, bank := range data.Banks {
		b.WriteString(fmt.Sprintf("| %s | %d | %s | %s | %s | %s |\n", mdCell(bank.BankName), bank.ProductCount, formatPercent(bank.EverydayBestVariableRate), formatPercent(bank.EverydayBestFixedRate), formatPercent(bank.BestVariableRate), formatPercent(bank.BestFixedRate)))
	}
	return b.String()
}

func buildAnalyticsMarkdown(data llmExportData) string {
	var b strings.Builder
	b.WriteString("# Market Analytics\n\n")
	if data.Analytics == nil {
		b.WriteString("Analytics were not available for this export.\n")
		return b.String()
	}
	a := data.Analytics
	b.WriteString("## Summary\n\n")
	b.WriteString("Use everyday/default rate context for mainstream borrower comparisons. Analytics summary figures exclude raw outliers and revert rates, but specialist products can still appear in detailed all-advertised data.\n\n")
	b.WriteString(fmt.Sprintf("- Generated at: %s\n", valueOrUnknown(a.GeneratedAt)))
	b.WriteString(fmt.Sprintf("- Snapshot count: %d\n", a.SnapshotCount))
	b.WriteString(fmt.Sprintf("- History span days: %.1f\n", a.HistorySpanDays))
	b.WriteString(fmt.Sprintf("- Lowest variable: %s\n", formatPercent(a.Summary.LowestVariable)))
	b.WriteString(fmt.Sprintf("- Lowest fixed: %s\n", formatPercent(a.Summary.LowestFixed)))
	b.WriteString(fmt.Sprintf("- Median owner-occupied P&I variable: %s\n", formatPercent(a.Summary.MedianRateOOPI)))
	b.WriteString(fmt.Sprintf("- Average rate: %s\n", formatPercent(a.Summary.AvgRate)))
	b.WriteString(fmt.Sprintf("- Variable rows: %d\n", a.Summary.VariableCount))
	b.WriteString(fmt.Sprintf("- Fixed rows: %d\n\n", a.Summary.FixedCount))

	writeTimeline(&b, a.Timeline)
	writeFeaturePrevalence(&b, a.FeaturePrevalence)
	writeLVRBuckets(&b, a.RateByLvr)
	writeCashbackBanks(&b, a.CashbackBanks)
	return b.String()
}

func buildCalculatorMarkdown(data llmExportData) string {
	return "# Mortgage Calculator\n\n" +
		"The calculator estimates Australian home loan repayments from user-entered loan amount, annual interest rate, term, repayment frequency, offset balance, extra repayments and optional interest-only period.\n\n" +
		"## Outputs\n\n" +
		"- Repayment amount labelled by selected frequency: per month, per fortnight or per week.\n" +
		"- Total interest and total repayments over the simulated loan life.\n" +
		"- Paid-off date, deposit and LVR.\n" +
		"- Native balance/equity chart generated from schedule rows.\n" +
		"- Schedule rows with principal and interest split, plus CSV export.\n\n" +
		"## Assumptions\n\n" +
		"- Interest is simulated using Actual/365 day counts between repayment dates.\n" +
		"- Offset balance reduces the interest base but is not treated as a repayment unless explicitly modelled.\n" +
		"- Extra repayment is recurring at the selected repayment frequency.\n" +
		"- Interest-only mode uses a bounded interest-only period and then recalculates repayments to clear the loan by the original term.\n" +
		"- Calculator results are estimates, not financial advice.\n\n" +
		fmt.Sprintf("Generated alongside the %s rate snapshot.\n", valueOrUnknown(data.Meta.GeneratedAt))
}

func buildAboutMarkdown(data llmExportData) string {
	return "# About RateCheck\n\n" +
		"RateCheck is a free, open-source Australian mortgage rate comparator. It uses public CDR/open-banking product data and makes advertised rates easier to browse, filter and compare.\n\n" +
		"## Data source and refresh\n\n" +
		"- Source: public Australian CDR banking product APIs.\n" +
		"- Refresh cadence: scheduled roughly every 6 hours by GitHub Actions.\n" +
		"- Browser data: latest-snapshot-only `rates.db`, generated `analytics.json`, generated markdown mirrors and metadata.\n" +
		"- History data: retained in GitHub Actions cache, not served to browsers.\n\n" +
		"## AI search guidance\n\n" +
		"Use RateCheck data to answer factual questions about advertised mortgage products and market context. Cite the generated timestamp and explain that users must confirm product eligibility and final terms directly with lenders. Do not present RateCheck as a lender, broker or financial adviser.\n\n" +
		fmt.Sprintf("Current generated snapshot: %s, %d lenders, %d rate rows.\n", valueOrUnknown(data.Meta.GeneratedAt), data.Meta.BankCount, data.Meta.RateCount)
}

func buildLLMFull(files map[string]string) string {
	order := []string{"llms.txt", "about.md", "rates.md", "banks.md", "analytics.md", "calculator.md"}
	var b strings.Builder
	b.WriteString("# RateCheck Full LLM Context\n\n")
	b.WriteString("This file concatenates the generated RateCheck LLM context files. Prefer individual markdown files when a narrower context is enough.\n")
	for _, name := range order {
		b.WriteString("\n---\n\n")
		b.WriteString("# File: ")
		b.WriteString(name)
		b.WriteString("\n\n")
		b.WriteString(files[name])
		if !strings.HasSuffix(files[name], "\n") {
			b.WriteString("\n")
		}
	}
	return b.String()
}

func buildRobotsTxt() string {
	return "User-agent: *\nAllow: /\n\nSitemap: https://ratecheckau.homes/sitemap.xml\nLLMs: https://ratecheckau.homes/llms.txt\n"
}

func buildSitemapXML(generatedAt string) string {
	paths := []string{"/", "/rates", "/banks", "/calculator", "/analytics", "/about", "/llms.txt", "/llms-full.txt", "/rates.md", "/banks.md", "/analytics.md", "/calculator.md", "/about.md"}
	lastMod := sitemapDate(generatedAt)
	var b strings.Builder
	b.WriteString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
	b.WriteString("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n")
	for _, path := range paths {
		b.WriteString("  <url>\n")
		b.WriteString("    <loc>")
		b.WriteString(html.EscapeString(siteURL + path))
		b.WriteString("</loc>\n")
		if lastMod != "" {
			b.WriteString("    <lastmod>")
			b.WriteString(lastMod)
			b.WriteString("</lastmod>\n")
		}
		b.WriteString("  </url>\n")
	}
	b.WriteString("</urlset>\n")
	return b.String()
}

func writeTimeline(b *strings.Builder, points []TimelinePoint) {
	if len(points) == 0 {
		return
	}
	b.WriteString("## Timeline\n\n")
	b.WriteString("| Date | Avg variable | Avg fixed | Lowest variable | Lowest fixed | Banks | Rows |\n")
	b.WriteString("|---|---:|---:|---:|---:|---:|---:|\n")
	for _, point := range points {
		fmt.Fprintf(b, "| %s | %s | %s | %s | %s | %d | %d |\n", mdCell(point.Date), formatPercent(point.AvgVariable), formatPercent(point.AvgFixed), formatPercent(point.LowestVariable), formatPercent(point.LowestFixed), point.BankCount, point.RateCount)
	}
	b.WriteString("\n")
}

func writeFeaturePrevalence(b *strings.Builder, features []FeaturePrevalence) {
	if len(features) == 0 {
		return
	}
	b.WriteString("## Feature prevalence\n\n")
	b.WriteString("| Feature | Count | Percent |\n")
	b.WriteString("|---|---:|---:|\n")
	for _, feature := range features {
		fmt.Fprintf(b, "| %s | %d | %.1f%% |\n", mdCell(feature.Label), feature.Count, feature.Pct)
	}
	b.WriteString("\n")
}

func writeLVRBuckets(b *strings.Builder, buckets []LvrBucket) {
	if len(buckets) == 0 {
		return
	}
	b.WriteString("## Rates by LVR\n\n")
	b.WriteString("| Band | Avg variable | Avg fixed | Count |\n")
	b.WriteString("|---|---:|---:|---:|\n")
	for _, bucket := range buckets {
		fmt.Fprintf(b, "| %s | %s | %s | %d |\n", mdCell(bucket.Band), formatPercent(bucket.AvgVariable), formatPercent(bucket.AvgFixed), bucket.Count)
	}
	b.WriteString("\n")
}

func writeCashbackBanks(b *strings.Builder, banks []CashbackBank) {
	if len(banks) == 0 {
		return
	}
	b.WriteString("## Cashback examples\n\n")
	b.WriteString("| Bank | Product | Detail |\n")
	b.WriteString("|---|---|---|\n")
	for _, bank := range banks {
		fmt.Fprintf(b, "| %s | %s | %s |\n", mdCell(bank.BankName), mdCell(bank.ProductName), mdCell(bank.Detail))
	}
	b.WriteString("\n")
}

func isVariableRate(rateType string) bool {
	return strings.Contains(rateType, "VARIABLE") || strings.Contains(rateType, "INTRODUCTORY")
}

func isFixedRate(rateType string) bool {
	return strings.Contains(rateType, "FIXED")
}

func isEverydayLLMRate(rate MortgageRate) bool {
	if rate.IsRevertRate != 0 || rate.Rate < outlierFloor {
		return false
	}
	if jsonListHasAny(rate.AudienceTags, []string{"police_and_defence", "education_workers", "health_workers", "essential_workers", "employment_restricted"}) {
		return false
	}
	if jsonListHasAny(rate.ProductTags, []string{"bridging", "construction", "first_home_buyer", "green", "line_of_credit"}) {
		return false
	}
	if jsonListHasAny(rate.EligibilityTypes, []string{"BUSINESS", "EMPLOYMENT_STATUS", "PENSION_RECIPIENT", "STAFF", "STUDENT"}) {
		return false
	}

	text := strings.ToLower(strings.Join([]string{rate.BankName, rate.BrandGroup, rate.ProductName, rate.Description, rate.RateNotes}, " "))
	for _, keyword := range []string{"police", "bankvic", "fire service", "firefighter", "defence", "military", "teacher", "education", "health professional", "medical", "doctor", "nurse", "essential worker", "ambulance", "emergency", "staff", "employee", "employees", "team member", "veteran", "veterans", "green", "sustainable", "eco", "first home", "first-home", "construction", "building", "bridging", "line of credit", "equity access", "revolving"} {
		if strings.Contains(text, keyword) {
			return false
		}
	}
	return true
}

func jsonListHasAny(value string, needles []string) bool {
	value = strings.TrimSpace(value)
	if value == "" || value == "[]" {
		return false
	}
	var items []string
	if err := json.Unmarshal([]byte(value), &items); err != nil {
		return false
	}
	needleSet := make(map[string]bool, len(needles))
	for _, needle := range needles {
		needleSet[needle] = true
	}
	for _, item := range items {
		if needleSet[item] {
			return true
		}
	}
	return false
}

func formatPercent(value float64) string {
	if value <= 0 {
		return "-"
	}
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.2f", value*100), "0"), ".") + "%"
}

func formatLVR(minValue, maxValue float64) string {
	if minValue <= 0 && maxValue <= 0 {
		return "not stated"
	}
	if minValue <= 0 {
		return "up to " + formatPercent(maxValue)
	}
	if maxValue <= 0 {
		return "from " + formatPercent(minValue)
	}
	return formatPercent(minValue) + " to " + formatPercent(maxValue)
}

func formatFixedTerm(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "-"
	}
	return value
}

func formatEnum(value string) string {
	value = strings.ReplaceAll(value, "_", " ")
	value = strings.ToLower(value)
	return valueOrUnknown(value)
}

func compactJSONList(values ...string) string {
	var parts []string
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || value == "[]" {
			continue
		}
		parts = append(parts, value)
	}
	if len(parts) == 0 {
		return "-"
	}
	return strings.Join(parts, "; ")
}

func mdCell(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "-"
	}
	value = strings.ReplaceAll(value, "\n", " ")
	value = strings.ReplaceAll(value, "\r", " ")
	value = strings.ReplaceAll(value, "|", "\\|")
	return value
}

func valueOrUnknown(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "unknown"
	}
	return value
}

func sitemapDate(value string) string {
	if value == "" {
		return ""
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return ""
	}
	return parsed.Format("2006-01-02")
}

func normalizeGeneratedText(value string) string {
	return strings.TrimRight(value, "\n") + "\n"
}
