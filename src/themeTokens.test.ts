import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

type Oklch = { l: number; c: number; h: number };

const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`Missing --color-${name}`);
  return match[1].trim();
}

function parseOklch(value: string): Oklch {
  const match = value.match(/^oklch\((\d*\.?\d+)\s+(\d*\.?\d+)\s+(\d*\.?\d+)\)$/);
  if (!match) throw new Error(`Unsupported colour value: ${value}`);
  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

function oklchToLinearRgb({ l, c, h }: Oklch): [number, number, number] {
  const hue = (h * Math.PI) / 180;
  const a = Math.cos(hue) * c;
  const b = Math.sin(hue) * c;

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const lCone = lPrime ** 3;
  const mCone = mPrime ** 3;
  const sCone = sPrime ** 3;

  return [
    4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone,
    -1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone,
    -0.0041960863 * lCone - 0.7034186147 * mCone + 1.707614701 * sCone,
  ];
}

function relativeLuminance(oklch: Oklch): number {
  const [r, g, b] = oklchToLinearRgb(oklch).map((channel) => Math.min(1, Math.max(0, channel)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: Oklch, background: Oklch): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("theme tokens", () => {
  test("define the dark accent shade used by dark surfaces", () => {
    expect(token("accent-950")).toMatch(/^oklch\(/);
  });

  test("filled accent controls keep white text readable", () => {
    const contrast = contrastRatio(parseOklch(token("sand-50")), parseOklch(token("accent-500")));

    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });

  test("global focus ring uses the accent token", () => {
    expect(css).toContain("outline: 2px solid var(--color-accent-500);");
  });

  test("slide-down animation does not clip expanded filter panels", () => {
    const animationRule = css.match(/\.animate-slide-down \{([^}]+)\}/)?.[1] ?? "";

    expect(animationRule).not.toContain("overflow: hidden");
    expect(css).not.toContain("max-height: 200px");
  });
});
