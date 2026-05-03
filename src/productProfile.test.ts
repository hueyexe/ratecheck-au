import { describe, expect, test } from "bun:test";

import { getProductProfileKey } from "./productProfile";

describe("product profile identity", () => {
  test("scopes product profile cache keys by bank", () => {
    const shared = {
      product_id: "shared-id",
      product_name: "Shared Loan",
      description: "Shared product ID",
      rate_type: "VARIABLE",
      repayment_type: "PRINCIPAL_AND_INTEREST",
      loan_purpose: "OWNER_OCCUPIED",
    };

    expect(getProductProfileKey({ ...shared, bank_name: "Bank A" })).not.toBe(
      getProductProfileKey({ ...shared, bank_name: "Bank B" }),
    );
  });
});
