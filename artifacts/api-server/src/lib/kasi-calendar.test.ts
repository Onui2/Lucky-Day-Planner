import assert from "node:assert/strict";
import test from "node:test";

import {
  clearKasiCalendarCache,
  enrichCalendarDay,
  getKasiCalendarMonth,
  parseKasiItems,
} from "./kasi-calendar.js";

function successXml(items = ""): string {
  return `<response><header><resultCode>00</resultCode><resultMsg>OK</resultMsg></header><body><items>${items}</items></body></response>`;
}

async function withMockKasi(
  mockFetch: typeof fetch,
  run: () => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;
  const originalDataGoKey = process.env.DATA_GO_KR_SERVICE_KEY;
  const originalKasiKey = process.env.KASI_SERVICE_KEY;
  process.env.DATA_GO_KR_SERVICE_KEY = "test-key";
  delete process.env.KASI_SERVICE_KEY;
  clearKasiCalendarCache();
  globalThis.fetch = mockFetch;

  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalDataGoKey === undefined) delete process.env.DATA_GO_KR_SERVICE_KEY;
    else process.env.DATA_GO_KR_SERVICE_KEY = originalDataGoKey;
    if (originalKasiKey === undefined) delete process.env.KASI_SERVICE_KEY;
    else process.env.KASI_SERVICE_KEY = originalKasiKey;
    clearKasiCalendarCache();
  }
}

test("parseKasiItems parses KASI XML items and entities", () => {
  const items = parseKasiItems(`
    <response>
      <header><resultCode>00</resultCode><resultMsg>OK</resultMsg></header>
      <body><items>
        <item><locdate>20260923</locdate><dateName>추분 &amp; 절기</dateName><isHoliday>N</isHoliday></item>
      </items></body>
    </response>
  `);

  assert.deepEqual(items, [{
    locdate: "20260923",
    dateName: "추분 & 절기",
    isHoliday: "N",
  }]);
});

test("parseKasiItems rejects HTTP 200 gateway error envelopes", () => {
  assert.throws(
    () => parseKasiItems(`
      <OpenAPI_ServiceResponse><cmmMsgHeader>
        <returnReasonCode>30</returnReasonCode>
        <returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg>
      </cmmMsgHeader></OpenAPI_ServiceResponse>
    `),
    /30: SERVICE_KEY_IS_NOT_REGISTERED_ERROR/,
  );

  assert.throws(
    () => parseKasiItems("<html>gateway failure</html>"),
    /응답 코드 누락/,
  );
});

test("getKasiCalendarMonth merges public holidays and solar terms", async () => {
  await withMockKasi(async (input) => {
    const url = String(input);
    const item = url.includes("getRestDeInfo")
      ? "<item><locdate>20260925</locdate><dateName>한가위</dateName><isHoliday>Y</isHoliday></item>"
      : "<item><locdate>20260923</locdate><dateName>추분</dateName><isHoliday>N</isHoliday></item>";
    return new Response(successXml(item));
  }, async () => {
    const month = await getKasiCalendarMonth(2026, 9);
    assert.equal(month.source, "kasi");
    assert.equal(month.holidaysAuthoritative, true);
    assert.equal(month.solarTermsAuthoritative, true);
    assert.equal(month.days["2026-09-25"].holiday, "한가위");
    assert.equal(month.days["2026-09-23"].solarTerm, "추분");
  });
});

test("getKasiCalendarMonth reports partial data and preserves local fallback", async () => {
  await withMockKasi(async (input) => {
    if (String(input).includes("getRestDeInfo")) {
      return new Response(successXml(
        "<item><locdate>20260925</locdate><dateName>한가위</dateName><isHoliday>Y</isHoliday></item>",
      ));
    }
    return new Response("temporarily unavailable", { status: 503 });
  }, async () => {
    const month = await getKasiCalendarMonth(2026, 9);
    assert.equal(month.source, "partial");
    assert.equal(month.holidaysAuthoritative, true);
    assert.equal(month.solarTermsAuthoritative, false);
    assert.equal(month.days["2026-09-25"].holiday, "한가위");

    const enriched = enrichCalendarDay(
      { solar: "2026-09-23", solarTerm: "추분" },
      month,
    );
    assert.equal(enriched.solarTerm, "추분");
  });
});

test("getKasiCalendarMonth falls back locally when both datasets fail", async () => {
  await withMockKasi(
    async () => new Response("temporarily unavailable", { status: 503 }),
    async () => {
      const month = await getKasiCalendarMonth(2026, 9);
      assert.equal(month.source, "local");
      assert.equal(month.holidaysAuthoritative, false);
      assert.equal(month.solarTermsAuthoritative, false);
      assert.deepEqual(month.days, {});
    },
  );
});

test("getKasiCalendarMonth identifies missing holiday data in a terms-only response", async () => {
  await withMockKasi(async (input) => {
    if (String(input).includes("getRestDeInfo")) {
      return new Response("temporarily unavailable", { status: 503 });
    }
    return new Response(successXml(
      "<item><locdate>20260923</locdate><dateName>추분</dateName><isHoliday>N</isHoliday></item>",
    ));
  }, async () => {
    const month = await getKasiCalendarMonth(2026, 9);
    assert.equal(month.source, "partial");
    assert.equal(month.holidaysAuthoritative, false);
    assert.equal(month.solarTermsAuthoritative, true);
    assert.match(month.message, /공휴일: 일시 미제공/);
  });
});

test("getKasiCalendarMonth coalesces concurrent requests for one month", async () => {
  let fetchCount = 0;
  await withMockKasi(async () => {
    fetchCount += 1;
    await Promise.resolve();
    return new Response(successXml());
  }, async () => {
    const [first, second] = await Promise.all([
      getKasiCalendarMonth(2026, 9),
      getKasiCalendarMonth(2026, 9),
    ]);
    assert.equal(fetchCount, 2);
    assert.equal(first.source, "kasi");
    assert.deepEqual(second, first);
  });
});

test("enrichCalendarDay treats successful KASI datasets as authoritative", () => {
  const calendar = {
    source: "kasi" as const,
    message: "test",
    holidaysAuthoritative: true,
    solarTermsAuthoritative: true,
    days: {
      "2026-09-23": { solarTerm: "추분" },
    },
  };

  assert.deepEqual(
    enrichCalendarDay({ solar: "2026-09-22", solarTerm: "잘못된 절기" }, calendar),
    { solar: "2026-09-22", solarTerm: undefined, holiday: undefined },
  );
  assert.equal(
    enrichCalendarDay<{ solar: string; solarTerm?: string }>(
      { solar: "2026-09-23" },
      calendar,
    ).solarTerm,
    "추분",
  );
});

test("getKasiCalendarMonth keeps local calendar available without API key", async () => {
  const originalDataGoKey = process.env.DATA_GO_KR_SERVICE_KEY;
  const originalKasiKey = process.env.KASI_SERVICE_KEY;
  delete process.env.DATA_GO_KR_SERVICE_KEY;
  delete process.env.KASI_SERVICE_KEY;
  clearKasiCalendarCache();

  try {
    const month = await getKasiCalendarMonth(2026, 9);
    assert.equal(month.source, "local");
    assert.equal(month.holidaysAuthoritative, false);
    assert.equal(month.solarTermsAuthoritative, false);
    assert.deepEqual(month.days, {});
  } finally {
    if (originalDataGoKey === undefined) delete process.env.DATA_GO_KR_SERVICE_KEY;
    else process.env.DATA_GO_KR_SERVICE_KEY = originalDataGoKey;
    if (originalKasiKey === undefined) delete process.env.KASI_SERVICE_KEY;
    else process.env.KASI_SERVICE_KEY = originalKasiKey;
    clearKasiCalendarCache();
  }
});
