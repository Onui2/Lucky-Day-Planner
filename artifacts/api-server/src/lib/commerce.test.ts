import assert from "node:assert/strict";
import test from "node:test";

import { db, hasDatabaseConfig, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

import {
  finalizeQuestionAnswer,
  releaseQuestionSlot,
  reserveQuestionSlot,
} from "./commerce.js";

// reserveQuestionSlot is the fix for a TOCTOU race in the AI monthly quota:
// previously the route did "SELECT count(*) then, after a multi-second
// Gemini call, INSERT" with no locking in between, so concurrent requests
// could all read the same pre-insert count and all pass the quota check.
// This exercises the real Postgres advisory-lock + transaction path, so it
// needs a live database — skip (rather than fail CI) when none is configured.
test(
  "reserveQuestionSlot serializes concurrent reservations against the monthly limit",
  { skip: !hasDatabaseConfig() && "requires DATABASE_URL (no database configured)" },
  async () => {
    const [user] = await db.insert(usersTable).values({}).returning();
    const monthlyBucket = "2099-01";
    const limit = 3;

    try {
      const attempts = 10;
      const results = await Promise.all(
        Array.from({ length: attempts }, (_, i) =>
          reserveQuestionSlot(user.id, monthlyBucket, limit, {
            userId: user.id,
            monthlyBucket,
            question: `concurrent question ${i}`,
            answer: "",
            blockedByGuard: false,
            riskLevel: "none",
          }),
        ),
      );

      const reserved = results.filter((row) => row !== null);
      const rejected = results.filter((row) => row === null);

      assert.equal(reserved.length, limit, "exactly `limit` reservations should succeed under concurrency");
      assert.equal(rejected.length, attempts - limit);

      const finalized = await finalizeQuestionAnswer(reserved[0]!.id, "real answer", {});
      assert.equal(finalized.answer, "real answer");

      await releaseQuestionSlot(reserved[1]!.id);
      const afterRelease = await reserveQuestionSlot(user.id, monthlyBucket, limit, {
        userId: user.id,
        monthlyBucket,
        question: "refill after release",
        answer: "",
        blockedByGuard: false,
        riskLevel: "none",
      });
      assert.ok(afterRelease, "releasing a slot must free up quota for a new reservation");
    } finally {
      await db.delete(usersTable).where(eq(usersTable.id, user.id));
    }
  },
);
