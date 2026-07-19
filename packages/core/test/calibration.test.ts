// 효능 스모크(test.md §6): 합성 데이터로 캘리브레이션이 참 난이도를 회수하는가.
import { test } from "node:test";
import assert from "node:assert/strict";
import { eloCalibrate, applyCalibration, flagAnomalousItems, type Response } from "../src/calibration.ts";
import { mulberry32, gaussian, abilityResponse } from "../src/sim.ts";
import type { ContentItem } from "../src/types.ts";

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}

test("ELO 캘리브레이션은 참 문항 난이도를 회수한다 (상관 > 0.9)", () => {
  const rng = mulberry32(42);
  const nItems = 50;
  const nLearners = 250;
  const trueB: Record<string, number> = {};
  for (let i = 0; i < nItems; i++) trueB["i" + i] = -2.5 + (5 * i) / (nItems - 1);
  const theta: Record<string, number> = {};
  for (let j = 0; j < nLearners; j++) theta["l" + j] = gaussian(rng, 0, 1.2);

  const responses: Response[] = [];
  for (let j = 0; j < nLearners; j++) {
    for (let i = 0; i < nItems; i++) {
      const correct = abilityResponse(theta["l" + j], trueB["i" + i], rng);
      responses.push({ learner: "l" + j, item: "i" + i, correct });
    }
  }

  const result = eloCalibrate(responses);
  const ids = Object.keys(trueB);
  const est = ids.map((id) => result.itemDifficulty[id]);
  const tru = ids.map((id) => trueB[id]);
  const r = pearson(est, tru);
  assert.ok(r > 0.9, `추정 난이도 ↔ 참 난이도 상관 ${r.toFixed(3)} > 0.9`);

  // 양방향: 추정 최난이도 문항의 참값 > 추정 최저난이도 문항의 참값
  const sorted = ids.slice().sort((a, b) => result.itemDifficulty[a] - result.itemDifficulty[b]);
  assert.ok(trueB[sorted[sorted.length - 1]] > trueB[sorted[0]]);
});

test("applyCalibration은 난이도 반영·verified→calibrated 승격(표본 충분 시)", () => {
  const items: ContentItem[] = [
    { id: "i0", lang: "en", type: "cloze", kc: ["k"], level: "A1", prompt: "p", answer: { value: "x" }, difficulty: null, discrimination: null, quality: "verified", source: { kind: "generated", license: "CC-BY" } },
  ];
  const responses: Response[] = [];
  for (let j = 0; j < 60; j++) responses.push({ learner: "l" + j, item: "i0", correct: j % 2 === 0 });
  const result = eloCalibrate(responses);
  const out = applyCalibration(items, result);
  assert.notEqual(out[0].difficulty, null);
  assert.equal(out[0].quality, "calibrated");
});

test("이상 문항 탐지: 전원 정답 문항이 리뷰 큐로 (양방향)", () => {
  const responses: Response[] = [];
  for (let j = 0; j < 40; j++) {
    responses.push({ learner: "l" + j, item: "easy", correct: true }); // 정답률 1.0
    responses.push({ learner: "l" + j, item: "normal", correct: j % 2 === 0 }); // 0.5
  }
  const flagged = flagAnomalousItems(responses);
  assert.ok(flagged.includes("easy"), "정답률 극단 문항 플래그");
  assert.ok(!flagged.includes("normal"), "정상 문항은 미플래그");
});

test("applyCalibration: 이상 문항(전원 정답)은 SE 낮아도 승격 제외 (flagAnomalous 통합)", () => {
  const items: ContentItem[] = [
    { id: "easy", lang: "en", type: "cloze", kc: ["k"], level: "A1", prompt: "p", answer: { value: "x" }, difficulty: null, discrimination: null, quality: "verified", source: { kind: "generated", license: "CC-BY" } },
  ];
  const responses: Response[] = [];
  for (let j = 0; j < 40; j++) responses.push({ learner: "l" + j, item: "easy", correct: true }); // 정답률 1.0(이상)
  const result = eloCalibrate(responses);
  const anomalous = flagAnomalousItems(responses);
  const without = applyCalibration(items, result); // 이상 목록 미전달 → 이전 결함 재현(승격됨)
  assert.equal(without[0].quality, "calibrated", "이상 목록 없으면 SE 만으로 승격(과거 동작)");
  const withAnom = applyCalibration(items, result, 0.5, anomalous); // 통합
  assert.equal(withAnom[0].quality, "verified", "이상 문항은 승격 제외(calibrated 아님)");
});
