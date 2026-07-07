// 콘텐츠 학습효과(난이도 적합 + 변별도). 인기 아닌 실효로 판정(규칙 1·3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { itemEffects } from "../src/content-effect.ts";
import type { Response } from "../src/calibration.ts";

const strong = ["s1", "s2", "s3", "s4", "s5"];
const weak = ["w1", "w2", "w3", "w4", "w5"];

function dataset(): Response[] {
  const R: Response[] = [];
  // 앵커 문항: 능력 격차 형성(강한 학습자 정답, 약한 학습자 오답)
  for (const a of ["a1", "a2", "a3"]) {
    for (const s of strong) R.push({ learner: s, item: a, correct: true });
    for (const w of weak) R.push({ learner: w, item: a, correct: false });
  }
  // g: 변별 좋은 문항(강함 정답·약함 오답)
  for (const s of strong) R.push({ learner: s, item: "g", correct: true });
  for (const w of weak) R.push({ learner: w, item: "g", correct: false });
  // e: 너무 쉬움(모두 정답)
  for (const l of [...strong, ...weak]) R.push({ learner: l, item: "e", correct: true });
  // k: 망가짐(강함 오답·약함 정답 → 역변별)
  for (const s of strong) R.push({ learner: s, item: "k", correct: false });
  for (const w of weak) R.push({ learner: w, item: "k", correct: true });
  // rare: 표본 부족
  R.push({ learner: "s1", item: "rare", correct: true });
  R.push({ learner: "w1", item: "rare", correct: false });
  return R;
}

test("변별 좋은 문항 = healthy(양의 변별), 너무 쉬움 = too_easy, 역변별 = weak", () => {
  const eff = itemEffects(dataset(), { minN: 10 });
  const g = eff.get("g");
  const e = eff.get("e");
  const k = eff.get("k");
  assert.ok(g && g.enoughData && g.health === "healthy", "g healthy");
  assert.ok(g.discrimination > 0, "g 양의 변별");
  assert.equal(e?.health, "too_easy", "e too_easy");
  assert.equal(k?.health, "weak", "k weak(역변별)");
  assert.ok(k && k.discrimination < g.discrimination, "역변별 < 정변별");
  assert.ok(g.effectScore > (k?.effectScore ?? 1), "실효: g > k");
});

test("표본 부족은 판정 보류(중립 0.5) — 데이터로만(규칙 3)", () => {
  const eff = itemEffects(dataset(), { minN: 10 });
  const rare = eff.get("rare");
  assert.ok(rare && !rare.enoughData, "표본 부족");
  assert.equal(rare.health, "insufficient");
  assert.equal(rare.effectScore, 0.5, "중립");
});
