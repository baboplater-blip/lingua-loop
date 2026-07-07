// 효능 스모크(test.md §6): CAT 배치가 참 능력으로 수렴하는가.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runCat, estimateAbility, type CalibratedItem } from "../src/placement.ts";
import { mulberry32, abilityResponse } from "../src/sim.ts";

function bank(n: number): CalibratedItem[] {
  const items: CalibratedItem[] = [];
  for (let i = 0; i < n; i++) items.push({ id: "i" + i, b: -3 + (6 * i) / (n - 1), a: 1 });
  return items;
}

test("CAT는 참 능력 θ로 수렴한다 (시드 평균 오차 < 0.5)", () => {
  const trueTheta = 1.0;
  const seeds = Array.from({ length: 20 }, (_, i) => 7 + i * 11);
  let errSum = 0;
  let usedSum = 0;
  for (const seed of seeds) {
    const rng = mulberry32(seed);
    const res = runCat(bank(40), (item) => abilityResponse(trueTheta, item.b, rng), { seTarget: 0.3, maxItems: 30 });
    errSum += Math.abs(res.theta - trueTheta);
    usedSum += res.used.length;
  }
  const meanErr = errSum / seeds.length;
  assert.ok(meanErr < 0.5, `평균 |θ̂-θ| ${meanErr.toFixed(3)} < 0.5`);
  assert.ok(usedSum / seeds.length <= 30, "최대 문항 이내로 배치");
});

test("estimateAbility: 정답 많으면 θ↑, 오답 많으면 θ↓ (양방향)", () => {
  const hi = estimateAbility([
    { b: -1, a: 1, correct: true },
    { b: 0, a: 1, correct: true },
    { b: 1, a: 1, correct: true },
  ]);
  const lo = estimateAbility([
    { b: -1, a: 1, correct: false },
    { b: 0, a: 1, correct: false },
    { b: 1, a: 1, correct: false },
  ]);
  assert.ok(hi.theta > lo.theta);
});
