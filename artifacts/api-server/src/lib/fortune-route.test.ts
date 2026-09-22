import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import express from "express";

import fortuneRouter from "../routes/fortune.js";
import calendarRouter from "../routes/calendar.js";

interface CalendarResponse {
  year: number;
  month: number;
  days: unknown[];
}

const app = express();
app.use((req, _res, next) => {
  if (req.headers["x-test-role"]) {
    req.user = { role: String(req.headers["x-test-role"]) } as Express.User;
  }
  next();
});
app.use(fortuneRouter, calendarRouter);
const server = app.listen(0, "127.0.0.1");
let baseUrl: string;

before(async () => {
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

for (const query of [
  "date=2025-02-30",
  "date=2023-02-29",
  "date=2025-04-31",
  "date=2025-01-01junk",
  "date=2025-1-1",
  "date=0000-01-01",
  "date=1899-01-01",
  "date=",
  "date=2024-01-01&date=2024-02-01",
]) {
  test(`daily fortune rejects invalid date query: ${query}`, async () => {
    const response = await fetch(`${baseUrl}/fortune/daily?${query}`);
    assert.equal(response.status, 400);
    const body = await response.json() as { error: string };
    assert.equal(typeof body.error, "string");
  });
}

test("daily fortune accepts leap day and preserves future-date access rules", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-22T00:00:00Z") });
  assert.equal((await fetch(`${baseUrl}/fortune/daily?date=2024-02-29`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/fortune/daily?date=2050-01-01`)).status, 403);
  assert.equal((await fetch(`${baseUrl}/fortune/daily?date=2050-01-01`, {
    headers: { "x-test-role": "admin" },
  })).status, 200);
});

test("omitted daily and calendar dates default to Seoul across a year boundary", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2025-12-31T16:00:00Z") });
  const daily = await fetch(`${baseUrl}/fortune/daily`);
  assert.equal(daily.status, 200);
  const dailyBody = await daily.json() as { date: string };
  assert.equal(dailyBody.date, "2026-01-01");
  const calendar = await fetch(`${baseUrl}/fortune/calendar`);
  assert.equal(calendar.status, 200);
  const body = await calendar.json() as CalendarResponse;
  assert.equal(body.year, 2026);
  assert.equal(body.month, 1);
  assert.equal(body.days.length, 31);
});

test("calendar accepts leap February and defaults each missing parameter independently", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2025-12-31T16:00:00Z") });
  const leap = await fetch(`${baseUrl}/fortune/calendar?year=2024&month=2`);
  assert.equal(leap.status, 200);
  const leapBody = await leap.json() as CalendarResponse;
  assert.equal(leapBody.days.length, 29);
  for (const [query, year, month] of [["year=2024", 2024, 1], ["month=2", 2026, 2]] as const) {
    const response = await fetch(`${baseUrl}/fortune/calendar?${query}`);
    assert.equal(response.status, 200);
    const body = await response.json() as CalendarResponse;
    assert.equal(body.year, year);
    assert.equal(body.month, month);
  }
});

for (const query of [
  "year=2024junk&month=2",
  "year=2024&month=2junk",
  "year=2024.5&month=2",
  "year=2024&month=2.5",
  "year=2024&year=2025&month=2",
  "year=2024&month=2&month=3",
  "year=&month=2",
  "year=2024&month=",
  "year=1899&month=2",
  "year=2024&month=13",
]) {
  test(`calendar rejects invalid month query: ${query}`, async () => {
    assert.equal((await fetch(`${baseUrl}/fortune/calendar?${query}`)).status, 400);
  });
}
