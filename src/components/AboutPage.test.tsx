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
});
