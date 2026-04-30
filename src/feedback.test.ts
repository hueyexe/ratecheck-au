import { describe, expect, test } from "bun:test";

import { buildFeedbackIssueBody, buildFeedbackIssueTitle, isLikelySpamFeedback, labelsForFeedbackKind, validateSiteFeedback } from "./feedback";

const validFeedback = {
  kind: "bug",
  title: "Calculator result looks off",
  details: "I entered my loan details and the repayment looked too high.",
  contact: "casey@example.com",
  pageUrl: "https://ratecheckau.homes/calculator?loan=600000",
  userAgent: "Mozilla/5.0 Test Browser",
  snapshotGeneratedAt: "2026-04-30T00:01:53Z",
  submittedAt: "2026-04-30T01:10:00Z",
};

describe("site feedback helpers", () => {
  test("validates a complete site feedback payload", () => {
    const result = validateSiteFeedback(validFeedback);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.errors.join(", "));
    expect(result.feedback.kind).toBe("bug");
    expect(result.feedback.title).toBe("Calculator result looks off");
    expect(result.feedback.pageUrl).toBe("https://ratecheckau.homes/calculator?loan=600000");
  });

  test("rejects missing and overlong user fields", () => {
    const result = validateSiteFeedback({ ...validFeedback, title: "", details: "x".repeat(5001) });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected invalid feedback");
    expect(result.errors).toContain("Add a short title.");
    expect(result.errors).toContain("Keep the details under 4,000 characters.");
  });

  test("rejects page URLs that are not RateCheck pages", () => {
    const result = validateSiteFeedback({ ...validFeedback, pageUrl: "https://example.com/phishing" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected invalid feedback");
    expect(result.errors).toContain("The page URL was not recognised.");
  });

  test("detects honeypot spam without treating it as user validation", () => {
    expect(isLikelySpamFeedback({ ...validFeedback, website: "https://spam.example" })).toBe(true);
    expect(isLikelySpamFeedback(validFeedback)).toBe(false);
  });

  test("maps feedback kinds to GitHub labels", () => {
    expect(labelsForFeedbackKind("bug")).toEqual(["from-site", "bug"]);
    expect(labelsForFeedbackKind("feature")).toEqual(["from-site", "feature-request"]);
    expect(labelsForFeedbackKind("data")).toEqual(["from-site", "data-quality"]);
    expect(labelsForFeedbackKind("other")).toEqual(["from-site", "feedback"]);
  });

  test("builds a GitHub issue title and body that identify the site source", () => {
    const result = validateSiteFeedback(validFeedback);
    if (!result.ok) throw new Error(result.errors.join(", "));

    expect(buildFeedbackIssueTitle(result.feedback)).toBe("[Site bug] Calculator result looks off");
    expect(buildFeedbackIssueBody(result.feedback)).toContain("Submitted from the RateCheck website.");
    expect(buildFeedbackIssueBody(result.feedback)).toContain("Page: https://ratecheckau.homes/calculator?loan=600000");
    expect(buildFeedbackIssueBody(result.feedback)).toContain("Snapshot: 2026-04-30T00:01:53Z");
    expect(buildFeedbackIssueBody(result.feedback)).toContain("casey@example.com");
  });
});
