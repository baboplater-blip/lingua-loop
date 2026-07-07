// 운영자 효능 대시보드(ops) — 정적 검증. 북스타 지표 노출·참여도 미노출(규칙 1·9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/ops.html", import.meta.url), "utf8");
const js = readFileSync(new URL("../public/ops.js", import.meta.url), "utf8");

test("ops.html: 자산 링크·언어 선택·북스타 4지표 카드", () => {
  assert.ok(html.includes("/style.css") && html.includes("/ops.js"), "자산 링크");
  assert.ok(html.includes('id="lang"') && ["en", "es", "zh", "ar", "sw", "ja", "hi"].every((l) => html.includes(`value="${l}"`)), "언어 선택기(7종)");
  for (const label of ["TTM", "Retention", "Coverage", "Content Health"]) {
    assert.ok(html.includes(label), "북스타 지표 카드: " + label);
  }
  assert.ok(html.includes("id=\"refresh\""), "새로고침");
});

test("ops.js: GET /efficacy 를 읽어 지표를 렌더", () => {
  assert.ok(js.includes("/efficacy"), "효능 엔드포인트 사용");
  for (const field of ["ttm", "retention", "coverage", "contentHealth", "gaps"]) {
    assert.ok(js.includes(field), "지표 필드 사용: " + field);
  }
  assert.ok(/masteredPairs|medianResponsesToMastery/.test(js), "TTM 필드 렌더");
  assert.ok(/overallAccuracy|reviewAccuracy/.test(js), "리텐션 필드 렌더");
});

test("ops: 추이(Loop Velocity) — 진화 사이클 스냅샷 델타 렌더", () => {
  assert.ok(html.includes("추이") && html.includes("Loop Velocity"), "추이 카드");
  assert.ok(js.includes("/efficacy/history"), "이력 엔드포인트 사용");
  assert.ok(/trend\.delta|trend\.count/.test(js), "추세 델타 렌더");
});

test("ops: 참여도(세션·스트릭) 미노출 + 다크패턴 없음(규칙 1·9)", () => {
  const copy = html + "\n" + js;
  // 북스타는 성과 — 세션수/스트릭 지표를 대시보드에 두지 않는다
  assert.ok(!/세션수\s*[:=]|스트릭\s*(수|일)/.test(copy), "세션수·스트릭 지표 미노출");
  const banned = [/잃(어|게)|사라(져|집)|놓치면|박탈|끊기/, /지금\s*안\s*하면/, /스트릭.*(위험|끊)/, /서둘러|급해|마감 임박/];
  for (const re of banned) assert.ok(!re.test(copy), "다크패턴 의심 카피: " + re);
});
