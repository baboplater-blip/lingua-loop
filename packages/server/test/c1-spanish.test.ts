// C1 스페인어 티어 — C1 패턴이 en에 국한되지 않고 일반화됨을 증명(규칙 4·11). 코어는 이미 C1 처리, 데이터만 추가.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { placementStep } from "../src/handlers.ts";
import { promoteVerified, validateReading, selectGradedReading } from "../../core/src/index.ts";
import type { ReadingPassage, ContentItem } from "../../core/src/index.ts";

const packReading = (lang: string) => JSON.parse(readFileSync(new URL(`../../packs/${lang}/reading.json`, import.meta.url), "utf8")).passages as ReadingPassage[];
const packContent = (lang: string) => JSON.parse(readFileSync(new URL(`../../packs/${lang}/content-seed.json`, import.meta.url), "utf8")) as ContentItem[];
const packPlacement = (lang: string) => JSON.parse(readFileSync(new URL(`../../packs/${lang}/placement.json`, import.meta.url), "utf8"));

test("es C1 지문 보유 + 검증 통과 + 상위 문법 정직 태깅(본문에 실제 접속법 과거·분열문)", () => {
  const c1 = packReading("es").filter((p) => p.level === "C1");
  assert.ok(c1.length >= 1, "es C1 지문 포함");
  const p = c1[0];
  assert.ok(validateReading(p), `C1 지문 검증: ${p.id}`);
  assert.ok(p.text.length >= 200, `C1 지문은 충분히 길고 복잡(${p.text.length}자)`);
  // 태깅된 상위 문법이 본문에 실제로 존재(규칙 4)
  assert.ok(p.kc.includes("kc.es.subjunctive_imperfect") && /Si cada persona llenara|tuviera|pudiera/i.test(p.text), "접속법 과거 태깅=본문에 존재(llenara)");
  assert.ok(p.kc.includes("kc.es.cleft") && /Lo que muchos pensadores|Es precisamente cuando|Fue esa capacidad .* la que/i.test(p.text), "분열문 태깅=본문에 존재");
  assert.ok(p.kc.filter((k) => !k.includes("vocab")).length >= 1, "문법 KC 보유");
});

test("es C1 학습자는 C1 지문을 현 수준으로 받고, B2 학습자는 무회귀", () => {
  const passages = packReading("es");
  const c1State = { learnerRef: "rc1", lang: "es", kcState: {}, ability: { reading: 3.3 }, fromEventCount: 0 };
  const served = selectGradedReading(c1State, passages, { limit: 3 });
  assert.ok(served.length >= 1, "C1 학습자 지문 서빙");
  assert.equal(served[0].level, "C1", "C1 학습자는 C1이 현 수준");
  const b2State = { learnerRef: "rb2", lang: "es", kcState: {}, ability: { reading: 2.5 }, fromEventCount: 0 };
  assert.equal(selectGradedReading(b2State, passages, { limit: 3 })[0].level, "B2", "B2 학습자 무회귀(C1은 i+1)");
});

test("es C1 문법 KC 학습 가능 — 각 KC에 게이트 통과 문항 2개 이상(flashcard+mcq)", () => {
  const { verified } = promoteVerified(packContent("es"));
  for (const kc of ["kc.es.subjunctive_imperfect", "kc.es.cleft"]) {
    const items = verified.filter((i) => i.kc.includes(kc));
    assert.ok(items.length >= 2, `${kc} 학습 문항 ≥2 (실제 ${items.length})`);
    assert.ok(items.every((i) => i.level === "C1"), `${kc} 문항은 C1 등급`);
    assert.ok(items.some((i) => i.type === "flashcard") && items.some((i) => i.type === "mcq"), `${kc} flashcard+mcq 균형`);
  }
});

test("es 배치고사가 C1 문항 보유 — CAT 천장 B2→C1", () => {
  const b = packPlacement("es");
  const c1 = b.filter((x: { level: string }) => x.level === "C1");
  assert.ok(c1.length >= 2, `es C1 배치 문항 ≥2 (실제 ${c1.length})`);
  assert.ok(Math.max(...b.map((x: { b: number }) => x.b)) >= 2.5, "최고 난이도 C1 수준(b≥2.5)");
  const responses: { itemId: string; choice: string }[] = [];
  let step = placementStep(b, responses);
  for (let i = 0; i < 20 && !step.done && step.next; i++) {
    const item = b.find((x: { id: string }) => x.id === step.next!.id);
    responses.push({ itemId: step.next.id, choice: item.answer.value });
    step = placementStep(b, responses);
  }
  assert.ok(["B2", "C1"].includes(step.level as string), `전부 정답 → 상급 배치(실제 ${step.level})`);
});
