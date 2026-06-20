import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

describe("production database startup", () => {
  it("creates the database directory and Case table before serving requests", async () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "case-review-db-"));
    const databasePath = path.join(temporaryDirectory, "data", "cases.db");
    const configuredDatabaseUrl = `file:${path.relative(process.cwd(), databasePath)}`;
    const absoluteDatabaseUrl = `file:${databasePath}`;

    try {
      const result = spawnSync(process.execPath, ["scripts/start-production.mjs"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          DATABASE_INIT_ONLY: "1",
          DATABASE_URL: configuredDatabaseUrl
        }
      });

      expect(result.status, result.stderr).toBe(0);

      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: absoluteDatabaseUrl
          }
        }
      });

      await expect(prisma.case.count()).resolves.toBe(0);
      await prisma.$disconnect();
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
