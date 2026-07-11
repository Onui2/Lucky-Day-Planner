import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("monthly summary clamps the text inside the padded card", async () => {
  const source = await readFile(
    new URL("../src/pages/home.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /<div className="rounded-2xl border border-foreground\/10 bg-foreground\/5 px-3 py-2\.5">\s*<p className="line-clamp-2 text-sm leading-relaxed text-foreground\/80">\s*\{monthlyFortune\.summary\}/,
  );
  assert.doesNotMatch(
    source,
    /<p className="[^"]*px-3[^"]*line-clamp-2[^"]*">\s*\{monthlyFortune\.summary\}/,
  );
});
