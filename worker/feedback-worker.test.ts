import { afterEach, describe, expect, test } from "bun:test";

import worker from "./feedback-worker";

const env = {
  GITHUB_DISPATCH_TOKEN: "test-token",
  GITHUB_OWNER: "hueyexe",
  GITHUB_REPO: "ratecheck-au",
  GITHUB_EVENT_TYPE: "site_feedback",
  ALLOWED_ORIGIN: "https://ratecheckau.homes,http://localhost:5173",
};

const validPayload = {
  kind: "feature",
  title: "Add a saved comparison",
  details: "It would help if I could save three banks and come back later.",
  contact: "",
  pageUrl: "https://ratecheckau.homes/rates",
  userAgent: "Bun test browser",
  snapshotGeneratedAt: "2026-04-30T00:01:53Z",
  submittedAt: "2026-04-30T02:00:00Z",
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("feedback Worker", () => {
  test("answers CORS preflight for allowed origins", async () => {
    const response = await worker.fetch(new Request("https://ratecheckau.homes/api/feedback", { method: "OPTIONS", headers: { Origin: "https://ratecheckau.homes" } }), env);

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://ratecheckau.homes");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  test("rejects POST requests from other origins", async () => {
    const response = await worker.fetch(buildPost(validPayload, "https://example.com"), env);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, errors: ["This feedback endpoint only accepts RateCheck website submissions."] });
  });

  test("returns validation errors for incomplete feedback", async () => {
    const response = await worker.fetch(buildPost({ ...validPayload, title: "", details: "" }), env);

    expect(response.status).toBe(400);
    const json = (await response.json()) as { ok: boolean; errors: string[] };
    expect(json.ok).toBe(false);
    expect(json.errors).toContain("Add a short title.");
  });

  test("accepts honeypot spam without dispatching to GitHub", async () => {
    let dispatched = false;
    globalThis.fetch = async () => {
      dispatched = true;
      return new Response(null, { status: 204 });
    };

    const response = await worker.fetch(buildPost({ ...validPayload, website: "https://spam.example" }), env);

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true });
    expect(dispatched).toBe(false);
  });

  test("dispatches valid feedback to GitHub Actions", async () => {
    let dispatchUrl = "";
    let dispatchBody = "";
    let authHeader = "";
    globalThis.fetch = async (input, init) => {
      dispatchUrl = String(input);
      dispatchBody = String(init?.body);
      authHeader = String(new Headers(init?.headers).get("Authorization"));
      return new Response(null, { status: 204 });
    };

    const response = await worker.fetch(buildPost(validPayload), env);
    const body = JSON.parse(dispatchBody) as { event_type: string; client_payload: { issueTitle: string; issueBody: string; labels: string[] } };

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true });
    expect(dispatchUrl).toBe("https://api.github.com/repos/hueyexe/ratecheck-au/dispatches");
    expect(authHeader).toBe("Bearer test-token");
    expect(body.event_type).toBe("site_feedback");
    expect(body.client_payload.issueTitle).toBe("[Site feature request] Add a saved comparison");
    expect(body.client_payload.issueBody).toContain("Submitted from the RateCheck website.");
    expect(body.client_payload.labels).toEqual(["from-site", "feature-request"]);
  });
});

function buildPost(body: unknown, origin = "https://ratecheckau.homes"): Request {
  return new Request("https://ratecheckau.homes/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}
