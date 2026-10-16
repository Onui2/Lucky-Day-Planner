import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, copyFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { build } from "esbuild";

test("the deployed CommonJS function includes Korean fonts and renders a PDF without source files", async () => {
  const serverRoot = fileURLToPath(new URL("../../", import.meta.url));
  const repoRoot = path.resolve(serverRoot, "../..");
  const config = JSON.parse(await readFile(path.join(repoRoot, "vercel.json"), "utf8"));
  const sandbox = await mkdtemp(path.join(os.tmpdir(), "saju-pdf-deploy-"));
  try {
    await build({
      entryPoints: [path.join(serverRoot, "src/lib/report-generator.ts")],
      outfile: path.join(sandbox, "report.cjs"),
      platform: "node", bundle: true, format: "cjs", minify: true,
      loader: { ".otf": "file", ".ttf": "file" },
      external: ["pdfkit"], logLevel: "silent",
    });
    // Vercel's tracer cannot infer the dynamic font lookup. Only explicitly
    // included build assets are copied; no development source tree is available.
    const include = config.functions?.["api/index.js"]?.includeFiles;
    if (include === "artifacts/api-server/dist/fonts/*.otf") {
      const destination = path.join(sandbox, path.dirname(include));
      await mkdir(destination, { recursive: true });
      const source = path.join(serverRoot, "assets/fonts");
      for (const name of await readdir(source)) {
        if (name.endsWith(".otf")) await copyFile(path.join(source, name), path.join(destination, name));
      }
    }
    await writeFile(path.join(sandbox, "check.cjs"), `
      const { generateSajuReportPdf } = require('./report.cjs');
      generateSajuReportPdf('배포 검증', {
        birthInfo: { year: 1990, month: 12, day: 31, gender: 'male', calendarType: 'solar' },
        reportFocus: 'money', dayPillar: { heavenlyStem: '갑', earthlyBranch: '자' }
      }, 'basic').then(report => {
        const pdf = Buffer.from(report.fileDataBase64, 'base64');
        if (pdf.subarray(0, 5).toString() !== '%PDF-' || pdf.length < 10000) process.exit(1);
        console.log('PDF_OK ' + pdf.length);
      }).catch(error => { console.error(error.message); process.exit(1); });
    `);
    const output = execFileSync(process.execPath, [path.join(sandbox, "check.cjs")], {
      cwd: sandbox, encoding: "utf8", timeout: 30_000,
      env: { ...process.env, NODE_PATH: path.join(serverRoot, "node_modules") },
    });
    assert.match(output, /PDF_OK \d+/);
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});
