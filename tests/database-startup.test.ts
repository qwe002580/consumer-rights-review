import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

describe("production database startup", () => {
  it("initializes from the isolated standalone artifact without the Prisma CLI", async () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "case-review-artifact-"));
    const artifactDirectory = path.join(temporaryDirectory, "standalone");
    const databasePath = path.join(artifactDirectory, "data", "cases.db");

    try {
      const buildResult = spawnSync("npm", ["run", "build"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: process.env
      });
      expect(buildResult.status, buildResult.stderr).toBe(0);
      cpSync(".next/standalone", artifactDirectory, { recursive: true });

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
  }, 30_000);

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

      const repeatedResult = spawnSync(process.execPath, ["scripts/start-production.mjs"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          DATABASE_INIT_ONLY: "1",
          DATABASE_URL: databaseUrl
        }
      });

      expect(repeatedResult.status, repeatedResult.stderr).toBe(0);

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
      await expect(migratedPrisma.case.count()).resolves.toBe(1);
      await expect(
        migratedPrisma.case.findUnique({
          where: { id: "legacy-case" },
          select: {
            id: true,
            clientName: true,
            assessmentNo: true,
            receiveMethod: true,
            wechatId: true,
            phone: true,
            contactTime: true,
            merchantName: true,
            merchantPromise: true,
            willingToSupplement: true,
            leadScore: true,
            addedWechat: true,
            addedWechatAt: true
          }
        })
      ).resolves.toEqual({
        id: "legacy-case",
        clientName: "Legacy Client",
        assessmentNo: null,
        receiveMethod: "legacy",
        wechatId: "",
        phone: "",
        contactTime: "",
        merchantName: "",
        merchantPromise: "",
        willingToSupplement: "unknown",
        leadScore: "C",
        addedWechat: false,
        addedWechatAt: null
      });

      await migratedPrisma.case.update({
        where: { id: "legacy-case" },
        data: { assessmentNo: "ASSESSMENT-001" }
      });
      await expect(
        migratedPrisma.$executeRawUnsafe(`
          INSERT INTO "Case" (
            "id", "clientName", "contact", "scenario", "amount", "purchaseDate",
            "paymentMethod", "stage", "goal", "intake", "assessmentNo", "createdAt", "updatedAt"
          ) VALUES (
            'duplicate-case', 'Duplicate Client', 'duplicate@example.com', 'refund', 1200,
            '2025-01-02T00:00:00.000Z', 'card', 'intake', 'recover', '{}', 'ASSESSMENT-001',
            '2025-01-02T00:00:00.000Z', '2025-01-02T00:00:00.000Z'
          )
        `)
      ).rejects.toThrow();
      await expect(migratedPrisma.case.count()).resolves.toBe(1);
      await migratedPrisma.$disconnect();
    } finally {
      await prisma.$disconnect();
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
