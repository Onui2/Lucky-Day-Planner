import assert from "node:assert/strict";
import test from "node:test";

import { searchDream } from "./dream.js";

test("'꿈'을 붙여 쓴 검색어도 키워드를 정확히 매칭한다", () => {
  // 이전에는 토큰("돼지꿈")이 키워드("돼지")보다 길어 kw.includes(t)가 항상
  // false였고, 반대 방향(t.includes(kw)) 체크가 없어 매칭이 0건이었다.
  const attached = searchDream("돼지꿈");
  assert.ok(attached.matched.some(d => d.keyword === "돼지"));

  const spaced = searchDream("돼지 꿈");
  assert.ok(spaced.matched.some(d => d.keyword === "돼지"));
});

test("'꿈'이라는 단어만으로는 전체 DB가 부분 매칭되지 않는다", () => {
  // 이전에는 "꿈" 토큰이 거의 모든 항목의 detail/meaning에 등장해
  // partialMatched가 DB 전체에 가깝게 쏟아졌다.
  const result = searchDream("돼지 꿈");
  assert.ok(
    result.partialMatched.length < 5,
    `"꿈" 토큰이 불용어 처리되어야 하는데 partialMatched가 ${result.partialMatched.length}건 나옴`,
  );
});

test("일반 부분 연관 검색은 여전히 동작한다", () => {
  const result = searchDream("재물");
  assert.ok(result.partialMatched.length > 0);
  assert.ok(result.partialMatched.length < 20, "부분 매칭이 여전히 의미 있게 좁혀져야 함");
});
