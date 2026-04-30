import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import SiteFeedback from "./SiteFeedback";

describe("SiteFeedback", () => {
  test("renders a plain-English feedback form for non-technical users", () => {
    const html = renderToStaticMarkup(<SiteFeedback meta={{ generatedAt: "2026-04-30T00:01:53Z", bankCount: 60, rateCount: 2173, dbSizeBytes: 5365760 }} initialOpen />);

    expect(html).toContain("Send feedback");
    expect(html).toContain("Bug");
    expect(html).toContain("Feature request");
    expect(html).toContain("Wrong rate or data");
    expect(html).toContain("public GitHub issue");
    expect(html).toContain("private financial details");
  });
});
