import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");

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

const dataDirectory = path.join(standaloneRoot, "data");
mkdirSync(dataDirectory, { recursive: true });
