import { describe, expect, it } from "vitest";

describe("admin pages", () => {
  it("exposes a cases list page module", async () => {
    const page = await import("../app/(admin)/cases/page");
    expect(typeof page.default).toBe("function");
  });

  it("exposes a case detail page module", async () => {
    const page = await import("../app/(admin)/cases/[id]/page");
    expect(typeof page.default).toBe("function");
  });
});
