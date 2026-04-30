import { useState } from "react";
import type { FormEvent } from "react";
import { validateSiteFeedback } from "../feedback";
import type { FeedbackKind } from "../feedback";
import type { MetaFile } from "../types";

interface SiteFeedbackProps {
  meta: MetaFile | null;
  initialOpen?: boolean;
}

const feedbackOptions: Array<{ kind: FeedbackKind; label: string; description: string }> = [
  { kind: "bug", label: "Bug", description: "Something is broken or confusing." },
  { kind: "feature", label: "Feature request", description: "Something that would make RateCheck more useful." },
  { kind: "data", label: "Wrong rate or data", description: "A lender, rate, or product looks wrong." },
  { kind: "other", label: "Other", description: "Anything else you want to tell us." },
];

export default function SiteFeedback({ meta, initialOpen = false }: SiteFeedbackProps) {
  const [open, setOpen] = useState(initialOpen);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors([]);
    setSent(false);

    const payload = {
      kind,
      title,
      details,
      contact,
      website,
      pageUrl: typeof window === "undefined" ? "https://ratecheckau.homes" : window.location.href,
      userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
      snapshotGeneratedAt: meta?.generatedAt ?? "",
      submittedAt: new Date().toISOString(),
    };
    const validation = validateSiteFeedback(payload);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = import.meta.env.VITE_FEEDBACK_ENDPOINT || "/api/feedback";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null) as { errors?: string[] } | null;

      if (!response.ok) {
        setErrors(body?.errors?.length ? body.errors : ["Feedback could not be sent. Please try again later."]);
        return;
      }

      setSent(true);
      setTitle("");
      setDetails("");
      setContact("");
      setWebsite("");
    } catch {
      setErrors(["Feedback could not be sent. Check your connection and try again."]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed left-4 z-30 md:left-6" style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-sand-200 bg-sand-50 px-4 py-3 text-sm font-semibold text-sand-700 shadow-sm transition-colors hover:border-accent-400 hover:text-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 dark:border-sand-700 dark:bg-sand-900 dark:text-sand-200 dark:hover:text-accent-300"
        aria-expanded={open}
        aria-controls="site-feedback-panel"
      >
        <span className="h-2 w-2 rounded-full bg-accent-500" aria-hidden="true" />
        Send feedback
      </button>

      {open && (
        <section id="site-feedback-panel" role="dialog" aria-labelledby="site-feedback-heading" className="mt-3 max-h-[calc(100vh-7rem)] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-[1.5rem] border border-sand-200 bg-sand-50 p-4 shadow-xl dark:border-sand-800 dark:bg-sand-900 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-700 dark:text-accent-300">RateCheck feedback</p>
              <h2 id="site-feedback-heading" className="mt-1 text-xl font-semibold tracking-tight text-sand-950 dark:text-sand-50">Tell us what needs fixing.</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-sand-500 transition-colors hover:bg-sand-100 hover:text-sand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 dark:text-sand-400 dark:hover:bg-sand-800 dark:hover:text-sand-100" aria-label="Close feedback form">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="h-5 w-5">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <p className="mt-2 text-sm leading-6 text-sand-600 dark:text-sand-300">This becomes a public GitHub issue raised by the RateCheck site bot. Please do not include private financial details.</p>

          {sent && (
            <div className="mt-4 rounded-2xl bg-accent-100 p-3 text-sm font-medium text-accent-800 dark:bg-accent-950/40 dark:text-accent-200" role="status">
              Thanks, your feedback was sent to GitHub for tracking.
            </div>
          )}

          {errors.length > 0 && (
            <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" role="alert">
              <p className="font-semibold">Please check this:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {errors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )}

          <form className="mt-4 space-y-4" onSubmit={submitFeedback}>
            <fieldset>
              <legend className="text-sm font-semibold text-sand-900 dark:text-sand-100">What are you sending?</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {feedbackOptions.map((option) => {
                  const active = option.kind === kind;
                  return (
                    <button key={option.kind} type="button" onClick={() => setKind(option.kind)} className={`rounded-2xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${active ? "border-accent-500 bg-accent-50 text-sand-950 dark:bg-accent-950/30 dark:text-sand-50" : "border-sand-200 text-sand-700 hover:border-accent-300 dark:border-sand-700 dark:text-sand-200"}`} aria-pressed={active}>
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-sand-500 dark:text-sand-400">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="block text-sm font-semibold text-sand-900 dark:text-sand-100">
              Short title
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className="mt-1 block min-h-[44px] w-full rounded-2xl border border-sand-200 bg-white px-3 py-2 text-sm font-normal text-sand-900 outline-none transition-colors placeholder:text-sand-400 focus:border-accent-500 dark:border-sand-700 dark:bg-sand-950 dark:text-sand-100" placeholder="Example: Calculator repayment looks wrong" />
            </label>

            <label className="block text-sm font-semibold text-sand-900 dark:text-sand-100">
              Details
              <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={4000} rows={5} className="mt-1 block w-full resize-y rounded-2xl border border-sand-200 bg-white px-3 py-2 text-sm font-normal leading-6 text-sand-900 outline-none transition-colors placeholder:text-sand-400 focus:border-accent-500 dark:border-sand-700 dark:bg-sand-950 dark:text-sand-100" placeholder="Tell us what happened, what you expected, or what would help." />
            </label>

            <label className="block text-sm font-semibold text-sand-900 dark:text-sand-100">
              Contact details <span className="font-normal text-sand-500 dark:text-sand-400">optional, public</span>
              <input value={contact} onChange={(event) => setContact(event.target.value)} maxLength={200} className="mt-1 block min-h-[44px] w-full rounded-2xl border border-sand-200 bg-white px-3 py-2 text-sm font-normal text-sand-900 outline-none transition-colors placeholder:text-sand-400 focus:border-accent-500 dark:border-sand-700 dark:bg-sand-950 dark:text-sand-100" placeholder="Only if you want a reply" />
            </label>

            <div className="sr-only" aria-hidden="true">
              <label htmlFor="feedback-website">Website</label>
              <input id="feedback-website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
            </div>

            <button type="submit" disabled={submitting} className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-accent-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:bg-sand-300 disabled:text-sand-600 dark:disabled:bg-sand-700 dark:disabled:text-sand-400">
              {submitting ? "Sending..." : "Send feedback"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
