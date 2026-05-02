import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import AboutPage from "./AboutPage";

describe("AboutPage", () => {
  test("uses cautious CDR coverage wording", () => {
    const html = renderToStaticMarkup(<AboutPage meta={null} />);

    expect(html).toContain("official Consumer Data Right product data");
    expect(html).toContain("not guaranteed to include every home loan");
    expect(html).toContain("broker-only");
    expect(html).toContain("historical trends are built by RateCheck");
  });

  test("renders the site feedback entry point on About", () => {
    const html = renderToStaticMarkup(<AboutPage meta={{ generatedAt: "2026-04-30T00:00:00Z", bankCount: 60, rateCount: 2173, dbSizeBytes: 1234 }} />);

    expect(html).toContain("Send feedback");
    expect(html).toContain("public GitHub issue");
    expect(html).not.toContain("fixed left-4");
  });
});
