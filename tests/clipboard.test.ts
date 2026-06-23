import { describe, expect, it, vi } from "vitest";
import { copyTextWithFallback } from "../lib/clipboard";

describe("clipboard fallback", () => {
  it("uses legacy copy when the modern clipboard api rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
    const legacyCopy = vi.fn().mockReturnValue(true);

    await expect(
      copyTextWithFallback("案件摘要", { writeText, legacyCopy })
    ).resolves.toBeUndefined();
    expect(writeText).toHaveBeenCalledWith("案件摘要");
    expect(legacyCopy).toHaveBeenCalledWith("案件摘要");
  });

  it("throws when both clipboard strategies fail", async () => {
    await expect(
      copyTextWithFallback("案件摘要", {
        writeText: vi.fn().mockRejectedValue(new Error("permission denied")),
        legacyCopy: vi.fn().mockReturnValue(false)
      })
    ).rejects.toThrow("Clipboard unavailable");
  });
});
