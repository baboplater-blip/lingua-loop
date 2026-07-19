// C1 영어 티어 — 난이도 스펙트럼을 B2 상한 위(원어민 경로)로 확장(규칙 4·11, CEFR 마스터리 맵).
// C1은 생성기가 만들지 않으므로 시드로만 추가(생성 C1은 여전히 null). 정직 태깅(규칙 4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { placementStep } from "../src/handlers.ts";
import { promoteVerified, validateReading, selectGradedReading } from "../../core/src/index.ts";
import type { ReadingPassage, ContentItem } from "../../core/src/index.ts";

const packReading = (lang: string) => JSON.parse(readFileSync(new URL(`../../packs/${lang}/reading.json`, import.meta.url), "utf8")).passages as ReadingPassage[];
const packContent = (lang: string) => JSON.parse(readFileSync(new URL(`../../packs/${lang}/content-seed.json`, import.meta.url), "utf8")) as ContentItem[];
const packPlacement = (lang: string) => JSON.parse(readFileSync(new URL(`../../packs/${lang}/placement.json`, import.meta.url), "utf8"));

test("en C1 지문 보유 + 검증 통과 + 상위 문법 정직 태깅(본문에 실제 도치·분열문)", () => {
  const c1 = packReading("en").filter((p) => p.level === "C1");
  assert.ok(c1.length >= 1, "en C1 지문 포함");
  const p = c1[0];
  assert.ok(validateReading(p), `C1 지문 검증: ${p.id}`);
  assert.ok(p.text.length >= 200, `C1 지문은 충분히 길고 복잡(${p.text.length}자)`);
  // 태깅된 상위 문법 KC 가 본문에 실제로 존재해야(규칙 4 — 없는 문법 크레딧 금지)
  assert.ok(p.kc.includes("kc.en.inversion") && /Never before have|rarely do we|Only then can/i.test(p.text), "도치 태깅=본문에 도치 존재");
  assert.ok(p.kc.includes("kc.en.cleft") && /It is precisely .* that|What many great thinkers/i.test(p.text), "분열문 태깅=본문에 분열문 존재");
  // 문법 KC(비어휘) 보유(reading.test 대칭 규칙)
  assert.ok(p.kc.filter((k) => !k.includes("vocab")).length >= 1, "문법 KC 보유");
});

test("C1 학습자는 C1 지문을 현 수준으로 받고, B2 학습자는 무회귀(C1은 i+1 자극)", () => {
  const passages = packReading("en");
  // 능력 3.3 → cefrFromAbility=C1
  const c1State = { learnerRef: "rc1", lang: "en", kcState: {}, ability: { reading: 3.3 }, fromEventCount: 0 };
  const served = selectGradedReading(c1State, passages, { limit: 3 });
  assert.ok(served.length >= 1, "C1 학습자 지문 서빙");
  assert.equal(served[0].level, "C1", "C1 학습자는 C1이 현 수준");
  // B2 학습자(2.5)는 여전히 B2 가 현 수준 — C1 추가가 무회귀
  const b2State = { learnerRef: "rb2", lang: "en", kcState: {}, ability: { reading: 2.5 }, fromEventCount: 0 };
  assert.equal(selectGradedReading(b2State, passages, { limit: 3 })[0].level, "B2", "B2 학습자 무회귀(C1은 i+1)");
});

test("C1 문법 KC 학습 가능 — 각 KC에 게이트 통과 문항 2개 이상(flashcard+mcq)", () => {
  const { verified } = promoteVerified(packContent("en"));
  for (const kc of ["kc.en.inversion", "kc.en.cleft"]) {
    const items = verified.filter((i) => i.kc.includes(kc));
    assert.ok(items.length >= 2, `${kc} 학습 문항 ≥2 (실제 ${items.length})`);
    assert.ok(items.every((i) => i.level === "C1"), `${kc} 문항은 C1 등급`);
    assert.ok(items.some((i) => i.type === "flashcard") && items.some((i) => i.type === "mcq"), `${kc} flashcard+mcq 균형`);
  }
});

test("en 배치고사가 C1 문항 보유 — CAT 천장 B2→C1(상급 능력 추정)", () => {
  const b = packPlacement("en");
  const c1 = b.filter((x: { level: string }) => x.level === "C1");
  assert.ok(c1.length >= 2, `en C1 배치 문항 ≥2 (실제 ${c1.length})`);
  const maxB = Math.max(...b.map((x: { b: number }) => x.b));
  assert.ok(maxB >= 2.5, `최고 난이도 C1 수준(b≥2.5, 실제 ${maxB})`);
  // 강한 학습자(전부 정답)는 중급 이상으로 배치되고, C1 문항이 능력 추정 상한을 넓힌다
  const responses: { itemId: string; choice: string }[] = [];
  let step = placementStep(b, responses);
  for (let i = 0; i < 20 && !step.done && step.next; i++) {
    const item = b.find((x: { id: string }) => x.id === step.next!.id);
    responses.push({ itemId: step.next.id, choice: item.answer.value });
    step = placementStep(b, responses);
  }
  assert.ok(["B2", "C1"].includes(step.level as string), `전부 정답 → 상급 배치(실제 ${step.level})`);
});
