export const feedbackKinds = ["bug", "feature", "data", "other"] as const;

export type FeedbackKind = (typeof feedbackKinds)[number];

export type SiteFeedback = {
  kind: FeedbackKind;
  title: string;
  details: string;
  contact: string;
  pageUrl: string;
  userAgent: string;
  snapshotGeneratedAt: string;
  submittedAt: string;
};

export type FeedbackValidationResult =
  | { ok: true; feedback: SiteFeedback }
  | { ok: false; errors: string[] };

const kindLabels: Record<FeedbackKind, string> = {
  bug: "Bug",
  feature: "Feature request",
  data: "Data quality",
  other: "Other feedback",
};

const kindTitlePrefixes: Record<FeedbackKind, string> = {
  bug: "Site bug",
  feature: "Site feature request",
  data: "Site data issue",
  other: "Site feedback",
};

const kindIssueLabels: Record<FeedbackKind, string[]> = {
  bug: ["from-site", "bug"],
  feature: ["from-site", "feature-request"],
  data: ["from-site", "data-quality"],
  other: ["from-site", "feedback"],
};

export function validateSiteFeedback(input: unknown): FeedbackValidationResult {
  const value = asRecord(input);
  const kind = trimString(value.kind);
  const title = trimString(value.title);
  const details = trimString(value.details);
  const contact = trimString(value.contact);
  const pageUrl = trimString(value.pageUrl);
  const userAgent = trimString(value.userAgent);
  const snapshotGeneratedAt = trimString(value.snapshotGeneratedAt);
  const submittedAt = trimString(value.submittedAt) || new Date().toISOString();
  const errors: string[] = [];

  if (!isFeedbackKind(kind)) errors.push("Choose bug, feature request, data issue, or other.");
  if (!title) errors.push("Add a short title.");
  if (title.length > 120) errors.push("Keep the title under 120 characters.");
  if (!details) errors.push("Tell us what happened or what you want to see.");
  if (details.length > 4000) errors.push("Keep the details under 4,000 characters.");
  if (contact.length > 200) errors.push("Keep contact details under 200 characters.");
  if (!isSafeHttpUrl(pageUrl)) errors.push("The page URL was not recognised.");
  if (userAgent.length > 500) errors.push("The browser details were too long.");
  if (snapshotGeneratedAt.length > 80) errors.push("The snapshot timestamp was too long.");

  if (errors.length > 0 || !isFeedbackKind(kind)) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    feedback: {
      kind,
      title,
      details,
      contact,
      pageUrl,
      userAgent,
      snapshotGeneratedAt,
      submittedAt,
    },
  };
}

export function isLikelySpamFeedback(input: unknown): boolean {
  const value = asRecord(input);
  return trimString(value.website).length > 0;
}

export function labelsForFeedbackKind(kind: FeedbackKind): string[] {
  return [...kindIssueLabels[kind]];
}

export function buildFeedbackIssueTitle(feedback: SiteFeedback): string {
  return `[${kindTitlePrefixes[feedback.kind]}] ${feedback.title}`;
}

export function buildFeedbackIssueBody(feedback: SiteFeedback): string {
  const contact = feedback.contact || "Not provided";
  const snapshot = feedback.snapshotGeneratedAt || "Not available";
  const userAgent = feedback.userAgent || "Not available";

  return [
    "Submitted from the RateCheck website.",
    "",
    "## Summary",
    `- Type: ${kindLabels[feedback.kind]}`,
    `- Page: ${feedback.pageUrl}`,
    `- Snapshot: ${snapshot}`,
    `- Submitted at: ${feedback.submittedAt}`,
    `- Contact: ${contact}`,
    "",
    "## User report",
    feedback.details,
    "",
    "## Technical context",
    `- User agent: ${userAgent}`,
    "- Source: ratecheckau.homes feedback form",
    "",
    "Please do not include private financial details in this public issue.",
  ].join("\n");
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isFeedbackKind(value: string): value is FeedbackKind {
  return feedbackKinds.includes(value as FeedbackKind);
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return url.hostname === "ratecheckau.homes" || url.hostname === "localhost";
  } catch {
    return false;
  }
}
