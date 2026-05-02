import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { FilterState } from "../types";
import Filters from "./Filters";

const filters: FilterState = { rateType: "", loanPurpose: "", repaymentType: "", maxLvr: 0, everydayOnly: true, search: "", sortKey: "rate", sortAsc: true, features: [], audience: [], fixedTerm: "" };

describe("Filters", () => {
  test("does not apply sticky positioning by default", () => {
    const html = renderToStaticMarkup(<Filters filters={filters} onChange={() => undefined} total={100} filtered={80} />);

    expect(html).toContain("Search banks or products");
    expect(html).not.toContain("lg:sticky");
  });
});
