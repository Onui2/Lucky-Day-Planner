import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer, loadConfigFromFile } from "vite";

const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url));

function request(port, host) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: "127.0.0.1", port, path: "/@vite/client", agent: false, headers: { Host: host } }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
  });
}

for (const project of ["saju-web", "mockup-sandbox"]) {
  test(`${project} limits dev and preview to loopback and rejects unknown Host headers`, async () => {
    const configFile = path.join(workspaceRoot, "artifacts", project, "vite.config.ts");
    const loaded = await loadConfigFromFile({ command: "serve", mode: "test" }, configFile);
    assert.ok(loaded);
    assert.equal(loaded.config.server.host, "127.0.0.1");
    assert.equal(loaded.config.preview.host, "127.0.0.1");
    assert.notEqual(loaded.config.server.allowedHosts, true);
    assert.notEqual(loaded.config.preview.allowedHosts, true);
    const manifest = JSON.parse(await readFile(path.join(path.dirname(configFile), "package.json"), "utf8"));
    for (const name of ["dev", "serve", "preview"]) {
      assert.ok(!/--host(?:\s+|=)(?:0\.0\.0\.0|::)/.test(manifest.scripts[name] ?? ""));
    }

    // No app plugins, env files, database, or public assets are loaded by this server.
    const server = await createServer({
      configFile: false,
      envFile: false,
      logLevel: "silent",
      publicDir: false,
      optimizeDeps: { noDiscovery: true, include: [] },
      server: { ...loaded.config.server, port: 0, proxy: undefined, hmr: false, watch: null },
    });
    try {
      await server.listen();
      const address = server.httpServer.address();
      assert.equal(typeof address, "object");
      assert.equal(await request(address.port, "attacker.invalid"), 403);
      assert.equal(await request(address.port, "localhost"), 200);
      assert.ok(server.config.server.fs.deny.some((pattern) => pattern.includes("pem")));
      assert.ok(server.config.server.fs.deny.includes(".env.*"));
    } finally {
      await server.close();
    }
  });
}

test("Vite remote-host opt-in admits only the explicitly named host", async () => {
  const previous = process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS;
  process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS = "preview.example.com";
  let server;
  try {
    server = await createServer({
      configFile: false,
      envFile: false,
      logLevel: "silent",
      publicDir: false,
      optimizeDeps: { noDiscovery: true, include: [] },
      server: { host: "127.0.0.1", port: 0, hmr: false, watch: null },
    });
    await server.listen();
    const address = server.httpServer.address();
    assert.equal(await request(address.port, "preview.example.com"), 200);
    assert.equal(await request(address.port, "attacker.invalid"), 403);
    assert.notEqual(server.config.preview.allowedHosts, true);
  } finally {
    await server?.close();
    if (previous === undefined) delete process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS;
    else process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS = previous;
  }
});
