import { describe, expect, test } from "bun:test";

import { downloadTextFile } from "./download";

describe("downloadTextFile", () => {
  test("clicks a temporary link and revokes the blob URL after the click has started", () => {
    const clicked: string[] = [];
    const revoked: string[] = [];
    const appended: unknown[] = [];
    let scheduledCallback: (() => void) | null = null;
    const anchor = {
      href: "",
      download: "",
      click: () => clicked.push(anchor.href),
      remove: () => appended.pop(),
    };

    downloadTextFile({ filename: "rates.csv", text: "bank,rate\nWestpac,5.99", mimeType: "text/csv;charset=utf-8;" }, {
      createObjectURL: () => "blob:rates",
      revokeObjectURL: (url) => revoked.push(url),
      createAnchor: () => anchor,
      appendAnchor: (node) => appended.push(node),
      scheduleRevoke: (callback) => {
        scheduledCallback = callback;
      },
    });

    expect(anchor.download).toBe("rates.csv");
    expect(clicked).toEqual(["blob:rates"]);
    expect(appended).toEqual([]);
    expect(revoked).toEqual([]);

    scheduledCallback?.();
    expect(revoked).toEqual(["blob:rates"]);
  });
});
