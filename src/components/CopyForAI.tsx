import { useEffect, useState } from "react";
import { buildAICopyPrompt } from "../aiCopy";

interface CopyForAIProps {
  pageName: string;
  pageDescription: string;
  sourcePath: string;
  generatedAt: string | null | undefined;
}

export default function CopyForAI({ pageName, pageDescription, sourcePath, generatedAt }: CopyForAIProps) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const copyPrompt = () => {
    const prompt = buildAICopyPrompt({
      pageName,
      pageDescription,
      sourcePath,
      generatedAt,
      baseUrl: import.meta.env.BASE_URL,
    });

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(prompt).then(
        () => setMessage("Copied. Paste it into your AI chat."),
        () => setMessage(prompt),
      );
      return;
    }

    setMessage(prompt);
  };

  return (
    <section className="rounded-[1.5rem] border border-accent-200 bg-accent-50 p-4 dark:border-accent-800 dark:bg-accent-950/30" aria-labelledby={`copy-ai-${sourcePath.replace(/[^a-z0-9]/gi, "-")}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <h2 id={`copy-ai-${sourcePath.replace(/[^a-z0-9]/gi, "-")}`} className="text-base font-semibold text-sand-950 dark:text-sand-50">
            Ask your AI about these rates
          </h2>
          <p className="mt-1 text-sm leading-6 text-sand-700 dark:text-sand-300">
            Copies a prompt with this page&apos;s RateCheck context, freshness, caveats and source links so you can paste it into your AI chat.
          </p>
        </div>
        <button type="button" onClick={copyPrompt} className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500">
          Copy for my AI
        </button>
      </div>
      {message && <p className="mt-3 whitespace-pre-wrap text-sm font-medium text-accent-800 dark:text-accent-200" role="status">{message}</p>}
    </section>
  );
}
