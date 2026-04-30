import { buildFeedbackIssueBody, buildFeedbackIssueTitle, isLikelySpamFeedback, labelsForFeedbackKind, validateSiteFeedback } from "../src/feedback";

type WorkerEnv = {
  GITHUB_DISPATCH_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_EVENT_TYPE: string;
  ALLOWED_ORIGIN: string;
};

const maxBodyBytes = 12_000;

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowedOrigin = getAllowedOrigin(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      if (!allowedOrigin) return jsonResponse({ ok: false, errors: ["Origin not allowed."] }, 403, null);
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, errors: ["Use POST to send feedback."] }, 405, allowedOrigin);
    }

    if (!allowedOrigin) {
      return jsonResponse({ ok: false, errors: ["This feedback endpoint only accepts RateCheck website submissions."] }, 403, null);
    }

    if (!request.headers.get("Content-Type")?.includes("application/json")) {
      return jsonResponse({ ok: false, errors: ["Send feedback as JSON."] }, 415, allowedOrigin);
    }

    const rawBody = await request.text();
    if (rawBody.length > maxBodyBytes) {
      return jsonResponse({ ok: false, errors: ["Feedback was too long to send."] }, 413, allowedOrigin);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody) as unknown;
    } catch {
      return jsonResponse({ ok: false, errors: ["Feedback was not valid JSON."] }, 400, allowedOrigin);
    }

    if (isLikelySpamFeedback(payload)) {
      return jsonResponse({ ok: true }, 202, allowedOrigin);
    }

    const validation = validateSiteFeedback(payload);
    if (!validation.ok) {
      return jsonResponse({ ok: false, errors: validation.errors }, 400, allowedOrigin);
    }

    const feedback = validation.feedback;
    const githubResponse = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "ratecheck-feedback-worker",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        event_type: env.GITHUB_EVENT_TYPE,
        client_payload: {
          source: "ratecheckau.homes",
          issueTitle: buildFeedbackIssueTitle(feedback),
          issueBody: buildFeedbackIssueBody(feedback),
          labels: labelsForFeedbackKind(feedback.kind),
          feedback,
        },
      }),
    });

    if (!githubResponse.ok) {
      return jsonResponse({ ok: false, errors: ["GitHub could not accept the feedback. Please try again later."] }, 502, allowedOrigin);
    }

    return jsonResponse({ ok: true }, 202, allowedOrigin);
  },
};

function getAllowedOrigin(origin: string, allowedOrigins: string): string | null {
  const allowed = allowedOrigins.split(",").map((value) => value.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(origin ? corsHeaders(origin) : {}),
    },
  });
}
