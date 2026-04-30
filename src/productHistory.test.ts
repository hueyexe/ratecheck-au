import { describe, expect, test } from "bun:test";

import { productHistoryKey } from "./productHistory";

describe("productHistoryKey", () => {
  test("matches the aggregator product history key format", () => {
    expect(productHistoryKey("Example Bank", "home loan / 123")).toBe("example-bank-home-loan-123-eb04597f");
    expect(productHistoryKey("Other Bank", "home loan / 123")).not.toBe(productHistoryKey("Example Bank", "home loan / 123"));
  });
});
