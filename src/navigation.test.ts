import { describe, expect, test } from "bun:test";

import { bankPath, comparePathFromKeys, productPath, ratesSearchPath } from "./navigation";

describe("navigation helpers", () => {
  test("build stable cross-reference paths", () => {
    expect(bankPath("Example Bank & Co")).toBe("/bank/Example%20Bank%20%26%20Co");
    expect(productPath("home/loan 1")).toBe("/product/home%2Floan%201");
    expect(ratesSearchPath("Example Bank")).toBe("/rates?q=Example+Bank");
  });

  test("builds shareable compare paths from row keys", () => {
    expect(comparePathFromKeys(["1|a|b|0.055|0.056|c|d|0|0.8|", "2|x|y|0.057|0.059|z|q|0|0.7|P2Y"])).toBe(
      "/compare?products=1%7Ca%7Cb%7C0.055%7C0.056%7Cc%7Cd%7C0%7C0.8%7C,2%7Cx%7Cy%7C0.057%7C0.059%7Cz%7Cq%7C0%7C0.7%7CP2Y",
    );
  });
});
