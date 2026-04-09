import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const webRoot = path.join(workspaceRoot, "artifacts", "saju-web");
const distRoot = path.join(webRoot, "dist", "public");
const rootPublic = path.join(workspaceRoot, "public");
const webPublic = path.join(webRoot, "public");

async function copyDirectoryContents(fromDir, toDir) {
  await mkdir(toDir, { recursive: true });
  await cp(fromDir, toDir, { recursive: true, force: true });
}

async function syncForVercel() {
  await rm(rootPublic, { recursive: true, force: true });
  await mkdir(rootPublic, { recursive: true });
  await copyDirectoryContents(distRoot, rootPublic);

  await rm(path.join(webPublic, "assets"), { recursive: true, force: true });
  await rm(path.join(webPublic, "index.html"), { force: true });
  await copyDirectoryContents(distRoot, webPublic);
}

await syncForVercel();
