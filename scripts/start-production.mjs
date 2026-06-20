import { mkdirSync } from "node:fs";
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
process.env.DATABASE_URL = `file:${databasePath}`;

const prisma = new PrismaClient();

await prisma.$executeRawUnsafe(`
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )
`);

await prisma.$disconnect();

if (process.env.DATABASE_INIT_ONLY !== "1") {
  await import(new URL("./server.js", import.meta.url));
}
