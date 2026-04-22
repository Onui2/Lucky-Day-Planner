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

function prefixStream(stream, target, name) {
  if (!stream) return;

  let buffer = "";
  stream.setEncoding("utf8");

  stream.on("data", (chunk) => {
    buffer += chunk;
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? "";

    for (const line of parts) {
      target.write(`[${name}] ${line}\n`);
    }
  });

  stream.on("end", () => {
    if (buffer) {
      target.write(`[${name}] ${buffer}\n`);
    }
  });
}

function spawnWorkspaceScript(name, filter) {
  const options = {
    cwd: workspaceRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  };

  const child =
    process.platform === "win32"
      ? spawn(
          "cmd.exe",
          ["/d", "/s", "/c", `corepack pnpm --filter ${filter} run dev`],
          options,
        )
      : spawn(
          "corepack",
          ["pnpm", "--filter", filter, "run", "dev"],
          options,
        );

  prefixStream(child.stdout, process.stdout, name);
  prefixStream(child.stderr, process.stderr, name);

  return child;
}

const children = [
  spawnWorkspaceScript("api", "@workspace/api-server"),
  spawnWorkspaceScript("web", "@workspace/saju-web"),
];

let shuttingDown = false;
let remaining = children.length;

function shutdown(code = 0, signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal ?? "SIGTERM");
    }
  }

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code);
}

for (const child of children) {
  child.on("exit", (code, signal) => {
    remaining -= 1;

    if (signal) {
      shutdown(1, signal);
      return;
    }

    if ((code ?? 0) !== 0) {
      shutdown(code ?? 1);
      return;
    }

    if (remaining === 0) {
      shutdown(0);
      return;
    }

    shutdown(0);
  });
}

process.on("SIGINT", () => shutdown(0, "SIGINT"));
process.on("SIGTERM", () => shutdown(0, "SIGTERM"));
