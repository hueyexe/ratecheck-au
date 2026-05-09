import { parseJsonStringArray } from "./everydayRates";

export type ProductFactKey = "offset" | "redraw" | "extra_repayments" | "first_home_buyer";

export interface ProductFactInput {
  product_tags?: string | null;
  feature_types?: string | null;
  audience_tags?: string | null;
  eligibility_types?: string | null;
}

export interface ProductFactRow {
  key: ProductFactKey;
  label: string;
  status: "Listed" | "Not listed";
  listed: boolean;
  description: string;
}

const facts: Array<{
  key: ProductFactKey;
  label: string;
  productTags: string[];
  featureTypes: string[];
  description: string;
}> = [
  {
    key: "offset",
    label: "Offset account",
    productTags: ["offset"],
    featureTypes: ["OFFSET"],
    description: "Reduces interest while money stays in the linked account.",
  },
  {
    key: "redraw",
    label: "Redraw",
    productTags: ["redraw"],
    featureTypes: ["REDRAW"],
    description: "May let you access extra repayments. Check lender conditions.",
  },
  {
    key: "extra_repayments",
    label: "Extra repayments",
    productTags: ["extra_repayments"],
    featureTypes: ["EXTRA_REPAYMENTS"],
    description: "Lets you pay more than the scheduled repayment where the lender allows it.",
  },
  {
    key: "first_home_buyer",
    label: "First-home buyer",
    productTags: ["first_home_buyer"],
    featureTypes: [],
    description: "This product appears to be aimed at first-home buyers or first-home-buyer scenarios.",
  },
];

export const locationSpecificRatesCopy =
  "RateCheck does not currently have reliable state, rural, regional, or metro fields. Confirm location eligibility with the lender.";

export function productFactStatus(listed: boolean): "Listed" | "Not listed" {
  return listed ? "Listed" : "Not listed";
}

export function getProductFactRows(input: ProductFactInput): ProductFactRow[] {
  const productTags = new Set(parseJsonStringArray(input.product_tags));
  const featureTypes = new Set(parseJsonStringArray(input.feature_types));

  return facts.map((fact) => {
    const listed =
      fact.productTags.some((tag) => productTags.has(tag)) || fact.featureTypes.some((type) => featureTypes.has(type));
    return {
      key: fact.key,
      label: fact.label,
      status: productFactStatus(listed),
      listed,
      description: fact.description,
    };
  });
}
