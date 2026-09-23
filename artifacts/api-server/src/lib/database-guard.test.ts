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

test("database outage response hides connection details in production", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;
  const privateError = "self-signed certificate in certificate chain at private-db.example";
  const dependencies: Record<string, unknown> = {
    "@workspace/db": {
      ensureDatabaseReady: async () => false,
      getDatabaseStatusMessage: () => privateError,
      hasDatabaseConfig: () => true,
      isDatabaseReady: () => false,
    },
  };
  const source = readFileSync(new URL("./database-guard.ts", import.meta.url), "utf8");
  const compiled = transformSync(source, { loader: "ts", format: "cjs" }).code;
  const guardModule = { exports: {} };
  new Function("require", "module", "exports", compiled)(
    (specifier: string) => {
      if (!(specifier in dependencies)) throw new Error(`Unexpected dependency: ${specifier}`);
      return dependencies[specifier];
    },
    guardModule,
    guardModule.exports,
  );
  const { requireDatabase } = guardModule.exports as {
    requireDatabase: (response: ResponseStub) => Promise<boolean>;
  };

  async function response(): Promise<ResponseStub> {
    const res: ResponseStub = {
      statusCode: 200,
      body: undefined,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    assert.equal(await requireDatabase(res), false);
    return res;
  }

  try {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    const nodeProduction = await response();
    assert.equal(nodeProduction.statusCode, 503);
    assert.deepEqual(nodeProduction.body, {
      error: "DB_UNAVAILABLE",
      message: "Database is currently unavailable. Check that Postgres is running and reachable.",
    });

    process.env.NODE_ENV = "test";
    process.env.VERCEL_ENV = "production";
    assert.deepEqual((await response()).body, nodeProduction.body);

    process.env.VERCEL_ENV = "preview";
    const development = await response();
    assert.equal(development.statusCode, 503);
    assert.equal((development.body as { detail?: string }).detail, privateError);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;
  }
});
