import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

describe("production database startup", () => {
  it("initializes from the packaged startup script without the Prisma CLI", async () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "case-review-artifact-"));
    const artifactDirectory = path.join(temporaryDirectory, "standalone");
    const databasePath = path.join(artifactDirectory, "data", "cases.db");

    try {
      mkdirSync(artifactDirectory, { recursive: true });
      cpSync("scripts/start-production.mjs", path.join(artifactDirectory, "start-production.mjs"));
      symlinkSync(path.resolve("node_modules"), path.join(artifactDirectory, "node_modules"), "dir");

      const runPackagedStartup = () =>
        spawnSync(process.execPath, ["start-production.mjs"], {
          cwd: artifactDirectory,
          encoding: "utf8",
          env: {
            ...process.env,
            DATABASE_INIT_ONLY: "1",
            DATABASE_URL: "file:./data/cases.db",
            PATH: temporaryDirectory
          }
        });
      const result = runPackagedStartup();

      expect(result.status, result.stderr).toBe(0);
      const repeatedResult = runPackagedStartup();
      expect(repeatedResult.status, repeatedResult.stderr).toBe(0);

      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${databasePath}`
          }
        }
      });
      await expect(prisma.case.count()).resolves.toBe(0);
      await prisma.$disconnect();
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

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

  it("adds conversion lead columns without losing legacy Case rows", async () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "case-review-migration-"));
    const databasePath = path.join(temporaryDirectory, "cases.db");
    const databaseUrl = `file:${databasePath}`;
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    });

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "Case" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "clientName" TEXT NOT NULL,
          "contact" TEXT NOT NULL,
          "scenario" TEXT NOT NULL,
          "amount" INTEGER NOT NULL,
          "purchaseDate" DATETIME NOT NULL,
          "paymentMethod" TEXT NOT NULL,
          "stage" TEXT NOT NULL,
          "goal" TEXT NOT NULL,
          "intake" JSONB NOT NULL,
          "analysis" JSONB,
          "reviewFlag" TEXT,
          "status" TEXT NOT NULL DEFAULT 'new',
          "operatorNotes" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        )
      `);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Case" (
          "id", "clientName", "contact", "scenario", "amount", "purchaseDate",
          "paymentMethod", "stage", "goal", "intake", "createdAt", "updatedAt"
        ) VALUES (
          'legacy-case', 'Legacy Client', 'legacy@example.com', 'refund', 1200,
          '2025-01-02T00:00:00.000Z', 'card', 'intake', 'recover', '{}',
          '2025-01-02T00:00:00.000Z', '2025-01-02T00:00:00.000Z'
        )
      `);
      await prisma.$disconnect();

      const result = spawnSync(process.execPath, ["scripts/start-production.mjs"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          DATABASE_INIT_ONLY: "1",
          DATABASE_URL: databaseUrl
        }
      });

      expect(result.status, result.stderr).toBe(0);

      const migratedPrisma = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl
          }
        }
      });
      const columns = await migratedPrisma.$queryRawUnsafe<Array<{ name: string }>>(
        'PRAGMA table_info("Case")'
      );
      const expectedColumns = [
        "assessmentNo",
        "receiveMethod",
        "wechatId",
        "phone",
        "contactTime",
        "merchantName",
        "merchantPromise",
        "willingToSupplement",
        "leadScore",
        "addedWechat",
        "addedWechatAt"
      ];

      expect(columns.map(({ name }) => name)).toEqual(expect.arrayContaining(expectedColumns));
      await expect(
        migratedPrisma.$queryRawUnsafe<Array<{ id: string; clientName: string }>>(
          'SELECT "id", "clientName" FROM "Case" WHERE "id" = ?',
          "legacy-case"
        )
      ).resolves.toEqual([{ id: "legacy-case", clientName: "Legacy Client" }]);
      await migratedPrisma.$disconnect();
    } finally {
      await prisma.$disconnect();
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
