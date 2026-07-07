// 효능 스모크(test.md §6, 규칙 17): FSRS 스케줄이 고정 간격보다 "실제로" 낫다.
// 지상진리 기억 모델(sim.ts)에 대해 FSRS vs 고정간격을 비교 — 시드 평균으로 결정적.
import { test } from "node:test";
import assert from "node:assert/strict";
import { initCard, nextState, dueInDays, type CardState } from "../src/fsrs.ts";
import { mulberry32, trueRecallProb, trueReview } from "../src/sim.ts";

type NextInterval = (card: CardState) => number;

function runSchedule(nextInterval: NextInterval, horizon: number, seed: number) {
  const rng = mulberry32(seed);
  let trueStab = 3.0;
  let card = initCard("good");
  let lastReviewDay = 0;
  let reviews = 0;
  let day = Math.max(0.5, nextInterval(card));

  for (let guard = 0; guard < 1000 && day < horizon; guard++) {
    const elapsed = day - lastReviewDay;
    const recalled = rng() < trueRecallProb(trueStab, elapsed);
    reviews += 1;
    trueStab = trueReview(trueStab, recalled);
    card = nextState(card, recalled ? "good" : "again", elapsed);
    lastReviewDay = day;
    day = day + Math.max(0.5, nextInterval(card));
  }

  const finalRetention = trueRecallProb(trueStab, horizon - lastReviewDay);
  return { reviews, finalRetention };
}

function avg(seeds: number[], run: (seed: number) => { reviews: number; finalRetention: number }) {
  let reviews = 0;
  let ret = 0;
  for (const s of seeds) {
    const r = run(s);
    reviews += r.reviews;
    ret += r.finalRetention;
  }
  return { reviews: reviews / seeds.length, finalRetention: ret / seeds.length };
}

test("FSRS는 고정간격 대비 효율(리텐션/복습수)·유지력이 우수하다", () => {
  const seeds = Array.from({ length: 30 }, (_, i) => 1000 + i * 7);
  const horizon = 60;

  const fsrs = avg(seeds, (s) => runSchedule((c) => dueInDays(c, 0.9), horizon, s));
  const fixed1 = avg(seeds, (s) => runSchedule(() => 1, horizon, s));
  const fixed30 = avg(seeds, (s) => runSchedule(() => 30, horizon, s));

  // 1) FSRS는 매일복습보다 복습 수가 훨씬 적다
  assert.ok(fsrs.reviews < fixed1.reviews * 0.6, `FSRS 복습 ${fsrs.reviews.toFixed(1)} < fixed1 ${fixed1.reviews.toFixed(1)}`);

  // 2) 효율(리텐션/복습수): FSRS > 매일복습(과잉복습은 낭비)
  const effFsrs = fsrs.finalRetention / fsrs.reviews;
  const effFixed1 = fixed1.finalRetention / fixed1.reviews;
  assert.ok(effFsrs > effFixed1, `효율 FSRS ${effFsrs.toFixed(4)} > fixed1 ${effFixed1.toFixed(4)}`);

  // 3) 유지력: FSRS > 과소복습(30일 고정)
  assert.ok(fsrs.finalRetention > fixed30.finalRetention + 0.2, `유지력 FSRS ${fsrs.finalRetention.toFixed(2)} > fixed30 ${fixed30.finalRetention.toFixed(2)}`);

  // 4) FSRS는 리텐션을 실제로 유지한다(무행동이 아님)
  assert.ok(fsrs.finalRetention > 0.6, `FSRS 유지 리텐션 ${fsrs.finalRetention.toFixed(2)} > 0.6`);
});
