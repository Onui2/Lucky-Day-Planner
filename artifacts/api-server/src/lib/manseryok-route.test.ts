import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";

import express from "express";

import { clearKasiCalendarCache } from "./kasi-calendar.js";
import manseryokRouter from "../routes/manseryok.js";

function successXml(items = ""): string {
  return `<response><header><resultCode>00</resultCode><resultMsg>OK</resultMsg></header><body><items>${items}</items></body></response>`;
}

test("manseryok routes expose enriched calendar data and reject invalid dates", async () => {
  const originalFetch = globalThis.fetch;
  const originalDataGoKey = process.env.DATA_GO_KR_SERVICE_KEY;
  const originalKasiKey = process.env.KASI_SERVICE_KEY;
  process.env.DATA_GO_KR_SERVICE_KEY = "test-key";
  delete process.env.KASI_SERVICE_KEY;
  clearKasiCalendarCache();

  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (!url.startsWith("https://apis.data.go.kr/")) {
      return originalFetch(input, init);
    }

    const item = url.includes("getRestDeInfo")
      ? "<item><locdate>20250815</locdate><dateName>광복절</dateName><isHoliday>Y</isHoliday></item>"
      : "<item><locdate>20250807</locdate><dateName>입추</dateName><isHoliday>N</isHoliday></item>";
    return new Response(successXml(item));
  }) as typeof fetch;

  const app = express();
  app.use((req, _res, next) => {
    req.isAuthenticated = function (this: Express.Request): this is Express.Request & { user: Express.User } {
      return false;
    };
    next();
  });
  app.use(manseryokRouter);

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const monthResponse = await globalThis.fetch(`${baseUrl}/manseryok/month?year=2025&month=8`);
    assert.equal(monthResponse.status, 200);
    const month = await monthResponse.json() as {
      calendarDataSource: string;
      calendarDataMessage: string;
      days: Array<{
        solar: string;
        lunarMonth: number;
        lunarDay: number;
        noSonDay: boolean;
        holiday?: string;
        solarTerm?: string;
      }>;
    };
    assert.equal(month.calendarDataSource, "kasi");
    assert.match(month.calendarDataMessage, /한국천문연구원/);
    assert.equal(month.days.find((day) => day.solar === "2025-08-15")?.holiday, "광복절");
    assert.equal(month.days.find((day) => day.solar === "2025-08-07")?.solarTerm, "입추");
    assert.ok(month.days.every((day) => (
      day.lunarMonth >= 1
      && day.lunarDay >= 1
      && day.noSonDay === (day.lunarDay % 10 === 9 || day.lunarDay % 10 === 0)
    )));

    const dateResponse = await globalThis.fetch(`${baseUrl}/manseryok/date?date=2025-08-15`);
    assert.equal(dateResponse.status, 200);
    const date = await dateResponse.json() as {
      calendarDataSource: string;
      day: { holiday?: string; lunarMonth: number; lunarDay: number; noSonDay: boolean };
    };
    assert.equal(date.calendarDataSource, "kasi");
    assert.equal(date.day.holiday, "광복절");
    assert.ok(date.day.lunarMonth >= 1 && date.day.lunarDay >= 1);

    const invalidDate = await globalThis.fetch(`${baseUrl}/manseryok/date?date=2025-02-30`);
    assert.equal(invalidDate.status, 400);
    const invalidMonth = await globalThis.fetch(`${baseUrl}/manseryok/month?year=2025x&month=8`);
    assert.equal(invalidMonth.status, 400);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    globalThis.fetch = originalFetch;
    if (originalDataGoKey === undefined) delete process.env.DATA_GO_KR_SERVICE_KEY;
    else process.env.DATA_GO_KR_SERVICE_KEY = originalDataGoKey;
    if (originalKasiKey === undefined) delete process.env.KASI_SERVICE_KEY;
    else process.env.KASI_SERVICE_KEY = originalKasiKey;
    clearKasiCalendarCache();
  }
});
