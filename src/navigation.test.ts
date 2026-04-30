import { describe, expect, test } from "bun:test";

import { bankPath, productPath, ratesSearchPath } from "./navigation";

describe("navigation helpers", () => {
  test("build stable cross-reference paths", () => {
    expect(bankPath("Example Bank & Co")).toBe("/bank/Example%20Bank%20%26%20Co");
    expect(productPath("home/loan 1")).toBe("/product/home%2Floan%201");
    expect(ratesSearchPath("Example Bank")).toBe("/rates?q=Example+Bank");
  });
});
