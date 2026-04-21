import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const contents = readFileSync(filePath, "utf8");
  const entries = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

const fileEnv = {
  ...parseEnvFile(path.join(workspaceRoot, ".env")),
  ...parseEnvFile(path.join(workspaceRoot, ".env.local")),
};

const env = {
  ...fileEnv,
  ...process.env,
};

env.PORT = env.PORT || "5001";
env.WEB_PORT = env.WEB_PORT || "3000";
env.NODE_ENV = env.NODE_ENV || "development";

const corepackCommand = process.platform === "win32" ? "corepack.cmd" : "corepack";

const child = spawn(
  corepackCommand,
  [
    "pnpm",
    "exec",
    "concurrently",
    "-n",
    "api,web",
    "-c",
    "blue,green",
    "corepack pnpm --filter @workspace/api-server run dev",
    "corepack pnpm --filter @workspace/saju-web run dev",
  ],
  {
    cwd: workspaceRoot,
    env,
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
