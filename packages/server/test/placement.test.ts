// 적응형 배치고사(CAT) — 서버 채점(정답 미유출)·능력추정·정지규칙·다국어. 규칙 3(데이터로만).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { placementStep } from "../src/handlers.ts";

function bank(lang: string) {
  return JSON.parse(readFileSync(new URL(`../../packs/${lang}/placement.json`, import.meta.url), "utf8"));
}

// responder 로 CAT 을 끝까지 구동
function drive(b: any[], responder: (next: any) => string) {
  const responses: { itemId: string; choice: string }[] = [];
  for (let i = 0; i < 20; i++) {
    const step = placementStep(b, responses);
    if (step.done || !step.next) return { ...step, responses };
    responses.push({ itemId: step.next.id, choice: responder(step.next) });
  }
  return placementStep(b, responses);
}

const correctFor = (b: any[], id: string) => b.find((x) => x.id === id).answer.value;
const wrongFor = (b: any[], id: string) => b.find((x) => x.id === id).options.find((o: string) => o !== correctFor(b, id));

test("첫 스텝: 문항 제시·done=false·정답 미유출", () => {
  const b = bank("en");
  const s = placementStep(b, []);
  assert.ok(s.next && s.next.id, "첫 문항 제시");
  assert.equal(s.done, false);
  assert.equal(s.count, 0);
  assert.ok(!("answer" in (s.next as Record<string, unknown>)), "다음 문항에 정답 없음(치팅 방지)");
});

test("전부 정답인 학습자는 능력이 높게, 전부 오답은 낮게 추정된다(적응형)", () => {
  const b = bank("en");
  const strong = drive(b, (n) => correctFor(b, n.id));
  const weak = drive(b, (n) => wrongFor(b, n.id));
  assert.ok(strong.done, "정지규칙 도달");
  assert.ok(strong.theta > weak.theta, "강함 > 약함");
  assert.ok(strong.theta > 0.3, "강한 학습자 θ 높음");
  assert.ok(weak.theta < 0, "약한 학습자 θ 낮음");
  assert.notEqual(strong.level, "A1", "강한 학습자는 A1 위 레벨로 배치");
});

test("중간 능력 학습자는 유한한 표준오차로 수렴한다(추정 안정)", () => {
  const b = bank("en");
  // 쉬운 문항(b<=0.1)은 맞고 어려운 문항은 틀리는 ~A2 학습자
  const mid = drive(b, (n) => { const it = b.find((x: any) => x.id === n.id); return it.b <= 0.1 ? correctFor(b, n.id) : wrongFor(b, n.id); });
  assert.ok(mid.count <= b.length, "뱅크 이내 최소 문항");
  assert.ok(mid.se !== null && mid.se < 1.5, "혼합 응답은 유한 SE 로 수렴");
  assert.ok(mid.theta > -1 && mid.theta < 1.2, "중간 능력으로 추정");
});

test("다국어: es 뱅크도 같은 엔진으로 동작(규칙 11)", () => {
  const b = bank("es");
  const s = placementStep(b, []);
  assert.ok(s.next && s.next.id.startsWith("plc.es"), "es 배치 문항");
});

test("zh·ar·sw·ja·hi 뱅크가 B1·B2 문항을 보유(중급 천장 확장)", () => {
  for (const lang of ["zh", "ar", "sw", "ja", "hi"]) {
    const b = bank(lang);
    const levels = new Set(b.map((x: any) => x.level));
    assert.ok(levels.has("B1"), `${lang} B1 문항 보유`);
    assert.ok(levels.has("B2"), `${lang} B2 문항 보유`);
    // B2 문항은 A1 문항보다 확실히 어려움(난이도 정렬)
    const maxB = Math.max(...b.map((x: any) => x.b));
    assert.ok(maxB >= 1.8, `${lang} 최고 난이도 B2 수준(b≥1.8)`);
    // B1 대역이 2개 이상(b≈1.2·1.4)이어야 중급 능력 추정 정밀도가 붙음
    const b1Items = b.filter((x: any) => x.level === "B1");
    assert.ok(b1Items.length >= 2, `${lang} B1 문항 ≥2 (CAT 정밀도)`);
    // B2 대역도 2개 이상(신설 B2 문법 KC 편입 — 상급 능력 추정)
    const b2Items = b.filter((x: any) => x.level === "B2");
    assert.ok(b2Items.length >= 2, `${lang} B2 문항 ≥2 (상급 CAT)`);
  }
});

test("중급 학습자가 zh 배치에서 A2 위(B1↑)로 배치된다(천장 확장 효과)", () => {
  const b = bank("zh");
  // 모든 문항 정답 → 강한 학습자. 확장된 B1/B2 문항 덕에 A2 상한을 넘어야.
  const strong = drive(b, (n) => correctFor(b, n.id));
  assert.ok(strong.done, "정지규칙 도달");
  assert.ok(["B1", "B2", "C1"].includes(strong.level as string), `강한 학습자는 중급↑ 배치(실제: ${strong.level})`);
});
