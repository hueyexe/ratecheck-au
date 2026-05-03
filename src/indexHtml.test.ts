import { describe, expect, test } from "bun:test";

describe("index.html assets", () => {
  test("uses root-relative icon and manifest URLs for deep SPA routes", async () => {
    const html = await Bun.file("index.html").text();

    expect(html).toContain('href="/favicon.svg"');
    expect(html).toContain('href="/favicon-32x32.png"');
    expect(html).toContain('href="/apple-touch-icon.png"');
    expect(html).toContain('href="/site.webmanifest"');
    expect(html).not.toContain('href="./favicon.svg"');
    expect(html).not.toContain('href="./apple-touch-icon.png"');
  });

  test("avoids stale static bank-count claims", async () => {
    const files = await Promise.all([
      Bun.file("index.html").text(),
      Bun.file("README.md").text(),
      Bun.file("social-preview.html").text(),
      Bun.file("src/components/LoadingSkeleton.tsx").text(),
      Bun.file("src/components/BanksView.tsx").text(),
    ]);

    for (const content of files) {
      expect(content).not.toContain("65+ banks");
      expect(content).not.toContain("65+ Australian banks");
      expect(content).not.toContain("63+ banks");
    }
  });
});
