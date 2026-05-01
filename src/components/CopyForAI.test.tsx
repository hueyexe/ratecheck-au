import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import CopyForAI from "./CopyForAI";

describe("CopyForAI", () => {
  test("renders a plain-English context card and copy button", () => {
    const html = renderToStaticMarkup(
      <CopyForAI
        pageName="Rates"
        pageDescription="Use this when comparing advertised rates and lender options."
        sourcePath="rates.md"
        generatedAt="2026-04-30T03:14:32Z"
      />,
    );

    expect(html).toContain("Ask your AI about these rates");
    expect(html).toContain("Copies a prompt with this page");
    expect(html).toContain("Copy for my AI");
    expect(html).toContain("paste it into your AI chat");
  });
});
