import { closeSync, mkdirSync, openSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

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

execFileSync("npx", ["--no-install", "prisma", "db", "push", "--skip-generate"], {
  stdio: "inherit"
});

if (process.env.DATABASE_INIT_ONLY !== "1") {
  await import(new URL("./server.js", import.meta.url));
}
