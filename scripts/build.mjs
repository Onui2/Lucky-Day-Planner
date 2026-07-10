import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

function parseNodeVersion(rawVersion) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(rawVersion.trim());
  if (!match) return null;
  return match.slice(1).map((part) => Number(part));
}

function isCompatibleNodeVersion(rawVersion) {
  const parsed = parseNodeVersion(rawVersion);
  if (!parsed) return false;

  const [major, minor] = parsed;
  if (major > 22) return true;
  if (major === 22) return minor >= 12;
  if (major === 20) return minor >= 19;
  return false;
}

function resolveNodeExecutable() {
  const candidates = [
    process.env.WATCHDOG_NODE_PATH,
    process.env.WORKSPACE_NODE_PATH,
    process.env.NODE_BINARY,
    process.env.HOME
      ? path.join(
          process.env.HOME,
          ".cache",
          "codex-runtimes",
          "codex-primary-runtime",
          "dependencies",
          "node",
          "bin",
          "node",
        )
      : null,
    process.execPath,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;

    const result = spawnSync(candidate, ["--version"], {
      encoding: "utf8",
      env: process.env,
    });

    if (result.status === 0 && isCompatibleNodeVersion(result.stdout)) {
      return candidate;
    }
  }

  return null;
}

const nodeExecutable = resolveNodeExecutable();

if (!nodeExecutable) {
  console.error(
    "Build requires Node 20.19+, 22.12+, or 24.x. Set NODE_BINARY, WORKSPACE_NODE_PATH, or use Node 24.",
  );
  process.exit(1);
}

const nodeBinDir = path.dirname(nodeExecutable);
const env = {
  ...process.env,
  PATH: `${nodeBinDir}${path.delimiter}${process.env.PATH ?? ""}`,
};

const buildCommand = process.platform === "win32"
  ? {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "corepack", "pnpm", "run", "build:workspace"],
    }
  : {
      command: "corepack",
      args: ["pnpm", "run", "build:workspace"],
    };

const result = spawnSync(buildCommand.command, buildCommand.args, {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
