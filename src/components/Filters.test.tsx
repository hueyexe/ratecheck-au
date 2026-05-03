import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { FilterState } from "../types";
import { DEFAULT_FILTERS } from "../types";
import Filters from "./Filters";

const filters: FilterState = { ...DEFAULT_FILTERS };

describe("Filters", () => {
  test("does not apply sticky positioning by default", () => {
    const html = renderToStaticMarkup(<Filters filters={filters} onChange={() => undefined} total={100} filtered={80} />);

    expect(html).toContain("Search banks or products");
    expect(html).toContain("min-w-0 max-w-full");
    expect(html).not.toContain("lg:sticky");
  });

  test("uses plain-English labels for important rate filters", () => {
    const html = renderToStaticMarkup(<Filters filters={filters} onChange={() => undefined} total={100} filtered={80} />);

    for (const label of ["Rate type", "Purpose", "Repayments", "Deposit / LVR", "Features"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("Big 4 banks");
    expect(html).toContain("Big 4 means ANZ, CommBank, NAB and Westpac only.");
    expect(html).toContain("Show rate filters");
  });
});
