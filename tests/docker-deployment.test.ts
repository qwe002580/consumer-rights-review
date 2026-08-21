import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Docker deployment", () => {
  it("documents the WeCom customer service link used by consultation buttons", () => {
    const expectedUrl = "https://work.weixin.qq.com/kfid/kfc51e178c1b051d57e";
    const envExample = readFileSync(".env.example", "utf8");
    const productionEnvExample = readFileSync(".env.production.example", "utf8");

    expect(envExample).toContain(`NEXT_PUBLIC_CONSULTATION_URL="${expectedUrl}"`);
    expect(productionEnvExample).toContain(`NEXT_PUBLIC_CONSULTATION_URL="${expectedUrl}"`);
  });

  it("generates the Prisma client before building Next.js", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");
    const generateIndex = dockerfile.indexOf("RUN npx prisma generate");
    const buildIndex = dockerfile.indexOf("RUN npm run build");

    expect(generateIndex).toBeGreaterThan(-1);
    expect(generateIndex).toBeLessThan(buildIndex);
  });

  it("copies public assets into the runner image for site verification files", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");

    expect(dockerfile).toContain("COPY --from=builder /app/public ./public");
  });

  it("initializes the database before starting the production server", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");
    const standalonePreparation = readFileSync("scripts/prepare-standalone.mjs", "utf8");

    expect(standalonePreparation).toContain('copyIntoStandalone("scripts/start-production.mjs"');
    expect(dockerfile).toContain('CMD ["node", "start-production.mjs"]');
  });
});
