import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");

function findBuiltAppRoot(directory) {
  if (
    existsSync(path.join(directory, "server.js")) &&
    existsSync(path.join(directory, "package.json"))
  ) {
    return directory;
  }

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === ".next" || entry.name === "node_modules") {
      continue;
    }

    const appRoot = findBuiltAppRoot(path.join(directory, entry.name));
    if (appRoot) {
      return appRoot;
    }
  }
}

const builtAppRoot = findBuiltAppRoot(standaloneRoot);
if (builtAppRoot && builtAppRoot !== standaloneRoot) {
  cpSync(builtAppRoot, standaloneRoot, { recursive: true });
}

function copyIntoStandalone(sourceRelativePath, destinationRelativePath = sourceRelativePath) {
  const sourcePath = path.join(projectRoot, sourceRelativePath);
  const destinationPath = path.join(standaloneRoot, destinationRelativePath);

  if (!existsSync(sourcePath)) {
    return;
  }

  mkdirSync(path.dirname(destinationPath), { recursive: true });
  cpSync(sourcePath, destinationPath, { recursive: true });
}

copyIntoStandalone("public");
copyIntoStandalone(path.join(".next", "static"), path.join(".next", "static"));
copyIntoStandalone("prisma");
copyIntoStandalone("scripts/start-production.mjs", "start-production.mjs");

const dataDirectory = path.join(standaloneRoot, "data");
mkdirSync(dataDirectory, { recursive: true });
