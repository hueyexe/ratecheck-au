import { describe, expect, test } from "bun:test";

import { buildAICopyPrompt, getAICopyBaseUrl } from "./aiCopy";

describe("buildAICopyPrompt", () => {
  test("builds a page-specific RateCheck prompt with absolute source links", () => {
    const prompt = buildAICopyPrompt({
      pageName: "Rates",
      pageDescription: "Use this when comparing advertised rates and lender options.",
      sourcePath: "rates.md",
      generatedAt: "2026-04-30T03:14:32Z",
      baseUrl: "https://ratecheckau.homes/",
    });

    expect(prompt).toContain("Current page: Rates");
    expect(prompt).toContain("Use this when comparing advertised rates and lender options.");
    expect(prompt).toContain("Core context: https://ratecheckau.homes/llms.txt");
    expect(prompt).toContain("Page context: https://ratecheckau.homes/rates.md");
    expect(prompt).toContain("Full context if needed: https://ratecheckau.homes/llms-full.txt");
    expect(prompt).toContain("Prefer everyday/default rates for mainstream comparisons unless I explicitly ask for all advertised products.");
    expect(prompt).toContain("advertised rates only");
    expect(prompt).toContain("not financial advice");
    expect(prompt).toContain("confirm eligibility and final terms directly with the lender");
  });

  test("keeps missing freshness explicit rather than inventing a date", () => {
    const prompt = buildAICopyPrompt({
      pageName: "Calculator",
      pageDescription: "Use this when checking repayment assumptions.",
      sourcePath: "calculator.md",
      generatedAt: null,
      baseUrl: "https://ratecheckau.homes",
    });

    expect(prompt).toContain("Data freshness: unknown");
    expect(prompt).toContain("Page context: https://ratecheckau.homes/calculator.md");
    expect(prompt).toContain("Before calculating, ask me for the loan amount, rate, term, repayment frequency, repayment type, extra repayments and offset balance");
    expect(prompt).toContain("Use the calculator context to explain assumptions");
  });
});

describe("getAICopyBaseUrl", () => {
  test("uses the canonical production site for local Vite base paths", () => {
    expect(getAICopyBaseUrl("/")).toBe("https://ratecheckau.homes/");
  });

  test("keeps absolute deployment bases", () => {
    expect(getAICopyBaseUrl("https://preview.example/ratecheck/")).toBe("https://preview.example/ratecheck/");
  });
});
