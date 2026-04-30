import { describe, expect, test } from "bun:test";

import { shouldResetScroll } from "./scrollRestoration";

describe("scroll restoration", () => {
  test("resets scroll when the route pathname changes", () => {
    expect(shouldResetScroll("/rates", "/product/HLDefenceService")).toBe(true);
  });

  test("keeps scroll position when only filters change on the same route", () => {
    expect(shouldResetScroll("/rates", "/rates")).toBe(false);
  });
});
