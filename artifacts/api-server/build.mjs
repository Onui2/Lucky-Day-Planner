import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm, readFile, copyFile, mkdir, readdir } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "dist");
const vercelApiBundle = path.resolve(__dirname, "..", "saju-web", "api", "_app.mjs");

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times without risking some
// packages that are not bundle compatible
const allowlist = [
  "@google/generative-ai",
  "axios",
  "bcryptjs",
  "connect-pg-simple",
  "cookie-parser",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "openid-client",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm(distDir, { recursive: true, force: true });
  await rm(vercelApiBundle, { force: true });

  console.log("building server...");
  const pkgPath = path.resolve(__dirname, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter(
    (dep) =>
      !allowlist.includes(dep) &&
      !(pkg.dependencies?.[dep]?.startsWith("workspace:")),
  );

  const sharedOptions = {
    platform: "node",
    bundle: true,
    format: "cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
    loader: { ".ttf": "base64", ".otf": "base64" },
  };

  await esbuild({
    ...sharedOptions,
    entryPoints: [path.resolve(__dirname, "src/index.ts")],
    outfile: path.resolve(distDir, "index.cjs"),
  });

  await esbuild({
    ...sharedOptions,
    entryPoints: [path.resolve(__dirname, "src/vercel.ts")],
    outfile: path.resolve(distDir, "vercel-app.cjs"),
  });

  console.log("building vercel api bundle...");
  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/app.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: vercelApiBundle,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
    loader: { ".ttf": "base64", ".otf": "base64" },
  });

  // 한글 폰트를 서버 번들/베르셀 번들 옆에 복사
  const fontSrcDir = path.resolve(__dirname, "assets", "fonts");
  const distFontDir = path.resolve(distDir, "fonts");
  const fontDestDir = path.resolve(__dirname, "..", "saju-web", "api", "fonts");
  await mkdir(distFontDir, { recursive: true });
  await mkdir(fontDestDir, { recursive: true });
  const fontFiles = (await readdir(fontSrcDir)).filter(
    (name) => name.endsWith(".ttf") || name.endsWith(".otf"),
  );
  for (const name of fontFiles) {
    await copyFile(path.join(fontSrcDir, name), path.join(distFontDir, name));
    await copyFile(path.join(fontSrcDir, name), path.join(fontDestDir, name));
  }
  console.log(`fonts copied to dist/fonts/ and vercel api/fonts/: ${fontFiles.join(", ")}`);
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
