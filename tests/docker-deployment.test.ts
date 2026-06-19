import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Docker deployment", () => {
  it("generates the Prisma client before building Next.js", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");
    const generateIndex = dockerfile.indexOf("RUN npx prisma generate");
    const buildIndex = dockerfile.indexOf("RUN npm run build");

    expect(generateIndex).toBeGreaterThan(-1);
    expect(generateIndex).toBeLessThan(buildIndex);
  });

  it("does not require an optional public directory in the runner image", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");

    expect(dockerfile).not.toContain("COPY --from=builder /app/public ./public");
  });
});
