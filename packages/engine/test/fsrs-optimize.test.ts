// 효능 스모크(핵심 차별점): 진화 루프가 데이터로 스케줄러를 "실제로" 개선하는가.
// held-out 예측오차가 감소해야 자기개선이 진짜다(과적합 아님).
import { test } from "node:test";
import assert from "node:assert/strict";
import { synthEvents } from "../src/synthetic.ts";
import { extractSequences } from "../src/sequences.ts";
import { evaluateParams, optimizeFsrsParams } from "../src/fsrs-optimize.ts";
import { DEFAULT_FSRS_PARAMS } from "../../core/src/index.ts";

test("FSRS 재적합은 held-out 예측오차를 낮춘다 (자기개선 실증)", () => {
  const events = synthEvents({ learners: 400, kcs: ["k"], reviewsPerKc: 14, seed: 5 });
  const seqs = extractSequences(events);
  const train = seqs.slice(0, 260);
  const held = seqs.slice(260);

  const heldBefore = evaluateParams(held, DEFAULT_FSRS_PARAMS);
  const opt = optimizeFsrsParams(train);
  const heldAfter = evaluateParams(held, opt.params);

  assert.ok(opt.errorAfter < opt.errorBefore, `train 오차 감소 ${opt.errorBefore.toFixed(3)}→${opt.errorAfter.toFixed(3)}`);
  assert.ok(heldAfter < heldBefore, `held-out 오차 감소 ${heldBefore.toFixed(3)}→${heldAfter.toFixed(3)} (과적합 아님)`);
  assert.notEqual(JSON.stringify(opt.params), JSON.stringify(DEFAULT_FSRS_PARAMS), "파라미터가 데이터로 갱신됨");
});

test("evaluateParams: 더 나은 파라미터가 더 낮은 손실 (양방향 정합)", () => {
  const events = synthEvents({ learners: 120, kcs: ["k"], reviewsPerKc: 12, seed: 11 });
  const seqs = extractSequences(events);
  const opt = optimizeFsrsParams(seqs);
  assert.ok(evaluateParams(seqs, opt.params) <= evaluateParams(seqs, DEFAULT_FSRS_PARAMS));
});
