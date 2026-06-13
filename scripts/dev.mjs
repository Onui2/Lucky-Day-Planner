import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
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

function parsePort(name) {
  const rawValue = env[name];
  const port = Number(rawValue);

  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`${name} must be a valid TCP port. Received "${rawValue}".`);
  }

  return port;
}

function isPortListening(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(500);

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false);
    });
  });
}

async function assertPortAvailable(name, port, host = "127.0.0.1") {
  if (await isPortListening(port, host)) {
    throw new Error(
      `${name}=${port} is already in use. Stop the existing dev server or set a different ${name}.`,
    );
  }

  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      const code = error && typeof error === "object" && "code" in error ? error.code : "UNKNOWN";
      if (code === "EADDRINUSE") {
        reject(
          new Error(
            `${name}=${port} is already in use. Stop the existing dev server or set a different ${name}.`,
          ),
        );
        return;
      }

      reject(error);
    });

    server.listen({ host, port }, () => {
      server.close(() => resolve());
    });
  });
}

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
    env.WATCHDOG_NODE_PATH,
    env.WORKSPACE_NODE_PATH,
    env.NODE_BINARY,
    env.HOME
      ? path.join(
          env.HOME,
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
      env,
    });

    if (result.status === 0 && isCompatibleNodeVersion(result.stdout)) {
      return candidate;
    }
  }

  return process.execPath;
}

const nodeExecutable = resolveNodeExecutable();

function spawnChildProcess(name, cwd, args) {
  const child = spawn(nodeExecutable, args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  prefixStream(child.stdout, process.stdout, name);
  prefixStream(child.stderr, process.stderr, name);

  return child;
}

function spawnApiServer() {
  return spawnChildProcess("api", path.join(workspaceRoot, "artifacts", "api-server"), [
    "--import",
    "tsx",
    "./src/index.ts",
  ]);
}

function spawnWebApp() {
  return spawnChildProcess("web", path.join(workspaceRoot, "artifacts", "saju-web"), [
    "./node_modules/vite/bin/vite.js",
    "--config",
    "vite.config.ts",
    "--host",
    "127.0.0.1",
    "--strictPort",
  ]);
}

const apiPort = parsePort("PORT");
const webPort = parsePort("WEB_PORT");
await assertPortAvailable("PORT", apiPort);
await assertPortAvailable("WEB_PORT", webPort);

const children = [
  spawnApiServer(),
  spawnWebApp(),
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
