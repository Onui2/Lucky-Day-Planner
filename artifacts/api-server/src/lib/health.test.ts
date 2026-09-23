import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { transformSync } from "esbuild";

type ResponseStub = {
  statusCode: number;
  body: unknown;
  status(code: number): ResponseStub;
  json(body: unknown): ResponseStub;
};

test("detailed health reports live database failure without exposing its cause", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;
  const handlers = new Map<string, (_req: unknown, res: ResponseStub) => Promise<void> | void>();
  let databaseAvailable = false;
  let queryFailure: Error | null = null;
  let queryCount = 0;

  const dependencies: Record<string, unknown> = {
    express: {
      Router: () => ({
        get(path: string, handler: (_req: unknown, res: ResponseStub) => Promise<void> | void) {
          handlers.set(path, handler);
        },
      }),
    },
    "@workspace/api-zod": { HealthCheckResponse: { parse: (body: unknown) => body } },
    "@workspace/db": {
      pool: {
        async query(config: { text: string; query_timeout: number }) {
          assert.equal(config.text, "SELECT 1");
          assert.ok(config.query_timeout > 0 && config.query_timeout <= 3_000);
          queryCount += 1;
          if (queryFailure) throw queryFailure;
          return { rows: [{ "?column?": 1 }] };
        },
      },
    },
    "../lib/database-guard.js": { isDatabaseAvailable: async () => databaseAvailable },
    "../lib/auth.js": { isOidcEnabled: () => false },
    "../lib/commerce.js": { getCheckoutMode: () => "disabled" },
  };
  const source = readFileSync(new URL("../routes/health.ts", import.meta.url), "utf8");
  const compiled = transformSync(source, { loader: "ts", format: "cjs" }).code;
  const routeModule = { exports: {} };
  new Function("require", "module", "exports", compiled)(
    (specifier: string) => {
      if (!(specifier in dependencies)) throw new Error(`Unexpected dependency: ${specifier}`);
      return dependencies[specifier];
    },
    routeModule,
    routeModule.exports,
  );

  async function request(path: string): Promise<ResponseStub> {
    const handler = handlers.get(path);
    assert.ok(handler, `Missing route: ${path}`);
    const response: ResponseStub = {
      statusCode: 200,
      body: undefined,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await handler({}, response);
    return response;
  }

  try {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";

    const noDatabase = await request("/healthz/details");
    assert.equal(noDatabase.statusCode, 503);
    assert.deepEqual(noDatabase.body, { status: "degraded" });
    assert.equal(queryCount, 0);

    databaseAvailable = true;
    queryFailure = new Error("private database host and certificate failure");
    const disconnected = await request("/healthz/details");
    assert.equal(disconnected.statusCode, 503);
    assert.deepEqual(disconnected.body, { status: "degraded" });
    assert.equal(queryCount, 1);

    const liveness = await request("/healthz");
    assert.equal(liveness.statusCode, 200);
    assert.deepEqual(liveness.body, { status: "ok" });

    queryFailure = null;
    const recovered = await request("/healthz/details");
    assert.equal(recovered.statusCode, 200);
    assert.deepEqual(recovered.body, { status: "ok" });

    process.env.NODE_ENV = "test";
    process.env.VERCEL_ENV = "preview";
    databaseAvailable = false;
    const development = await request("/healthz/details");
    assert.equal(development.statusCode, 503);
    assert.equal((development.body as { status: string }).status, "degraded");
    assert.equal((development.body as { databaseConfigured: boolean }).databaseConfigured, false);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;
  }
});
