import { closeSync, mkdirSync, openSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl?.startsWith("file:")) {
  throw new Error("DATABASE_URL must be a SQLite file URL");
}

const configuredPath = decodeURIComponent(databaseUrl.slice("file:".length));
const databasePath = path.isAbsolute(configuredPath)
  ? configuredPath
  : path.resolve(process.cwd(), configuredPath);

mkdirSync(path.dirname(databasePath), { recursive: true });
closeSync(openSync(databasePath, "a"));
process.env.DATABASE_URL = `file:${databasePath}`;

const prisma = new PrismaClient();

// Production schema changes originate here; keep this migration aligned with prisma/schema.prisma.
try {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Case" (
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
        "assessmentNo" TEXT,
        "receiveMethod" TEXT NOT NULL DEFAULT 'legacy',
        "wechatId" TEXT NOT NULL DEFAULT '',
        "phone" TEXT NOT NULL DEFAULT '',
        "contactTime" TEXT NOT NULL DEFAULT '',
        "merchantName" TEXT NOT NULL DEFAULT '',
        "merchantPromise" TEXT NOT NULL DEFAULT '',
        "willingToSupplement" TEXT NOT NULL DEFAULT 'unknown',
        "leadScore" TEXT NOT NULL DEFAULT 'C',
        "addedWechat" BOOLEAN NOT NULL DEFAULT false,
        "addedWechatAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `);

    const columns = await transaction.$queryRawUnsafe('PRAGMA table_info("Case")');
    const existingColumns = new Set(columns.map(({ name }) => name));
    const leadColumns = [
      ["assessmentNo", 'ALTER TABLE "Case" ADD COLUMN "assessmentNo" TEXT'],
      [
        "receiveMethod",
        `ALTER TABLE "Case" ADD COLUMN "receiveMethod" TEXT NOT NULL DEFAULT 'legacy'`
      ],
      ["wechatId", `ALTER TABLE "Case" ADD COLUMN "wechatId" TEXT NOT NULL DEFAULT ''`],
      ["phone", `ALTER TABLE "Case" ADD COLUMN "phone" TEXT NOT NULL DEFAULT ''`],
      ["contactTime", `ALTER TABLE "Case" ADD COLUMN "contactTime" TEXT NOT NULL DEFAULT ''`],
      ["merchantName", `ALTER TABLE "Case" ADD COLUMN "merchantName" TEXT NOT NULL DEFAULT ''`],
      [
        "merchantPromise",
        `ALTER TABLE "Case" ADD COLUMN "merchantPromise" TEXT NOT NULL DEFAULT ''`
      ],
      [
        "willingToSupplement",
        `ALTER TABLE "Case" ADD COLUMN "willingToSupplement" TEXT NOT NULL DEFAULT 'unknown'`
      ],
      ["leadScore", `ALTER TABLE "Case" ADD COLUMN "leadScore" TEXT NOT NULL DEFAULT 'C'`],
      [
        "addedWechat",
        'ALTER TABLE "Case" ADD COLUMN "addedWechat" BOOLEAN NOT NULL DEFAULT false'
      ],
      ["addedWechatAt", 'ALTER TABLE "Case" ADD COLUMN "addedWechatAt" DATETIME']
    ];

    for (const [columnName, statement] of leadColumns) {
      if (!existingColumns.has(columnName)) {
        await transaction.$executeRawUnsafe(statement);
      }
    }

    await transaction.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Case_assessmentNo_key" ON "Case"("assessmentNo")
    `);
  });
} finally {
  await prisma.$disconnect();
}

if (process.env.DATABASE_INIT_ONLY !== "1") {
  await import(new URL("./server.js", import.meta.url));
}
