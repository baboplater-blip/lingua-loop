// 사전등록 통제 실험 핸들러 — 등록 멱등·위조 차단·집단 간 결과(규칙 17·규칙 1·규칙 5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { newStore, ingest, registerExperiment, getRegistration, assignForLearner, experimentResult, allLearnerEvents } from "../src/handlers.ts";
import { assignVariant } from "../../core/src/index.ts";
import type { LearningEvent } from "../../core/src/index.ts";

const reg = (store: ReturnType<typeof newStore>) =>
  registerExperiment(store, { experimentId: "expA", hypothesis: "확장 클로즈가 reading θ 상승을 키운다", treatmentShare: 0.5, minSamplePerArm: 6 }, "2026-01-01T00:00:00.000Z");

test("registerExperiment: 사전등록 append-only·멱등·primaryOutcome=gainScore 고정(규칙 1·17)", () => {
  const store = newStore();
  const a = reg(store);
  assert.equal(a.created, true);
  assert.equal(a.registration.primaryOutcome, "gainScore", "1차 결과는 학습성과로 고정(참여도 실험 금지)");
  // 멱등 — 재등록해도 새 프로토콜을 만들지 않고 기존 반환(등록은 이력)
  const b = reg(store);
  assert.equal(b.created, false, "재등록은 no-op");
  assert.equal(b.registration.registeredTs, a.registration.registeredTs, "기존 등록 보존");
  assert.deepEqual(getRegistration(store, "expA")?.experimentId, "expA");
  assert.equal(getRegistration(store, "없음"), null, "미등록은 null");
});

test("실험 로그는 위조 불가·학습자 집계 제외(규칙 4·17 우회 차단)", () => {
  const store = newStore();
  reg(store);
  // 공개 ingest 로 예약 ref/시스템 타입 위조 시도 → 거부
  assert.throws(() => ingest(store, { learnerRef: "experiment", type: "item.response", kc: ["k"], payload: {}, consent: "learn" }), /reserved learnerRef/);
  assert.throws(() => ingest(store, { learnerRef: "L1", type: "experiment.registered", payload: {}, consent: "learn" }), /system-only event type/);
  // 실험 등록 이벤트는 학습자 효능 집계에서 제외
  ingest(store, { learnerRef: "L1", type: "item.response", kc: ["k"], payload: { correct: true }, consent: "learn" });
  const evs = allLearnerEvents(store);
  assert.ok(evs.every((e) => e.learnerRef !== "experiment" && e.type !== "experiment.registered"), "실험 로그 제외");
});

test("assignForLearner: 등록 있으면 결정적 배정·없으면 null", () => {
  const store = newStore();
  assert.equal(assignForLearner(store, "expA", "L1"), null, "미등록 → null");
  reg(store);
  const v = assignForLearner(store, "expA", "L1");
  assert.ok(v === "control" || v === "treatment");
  assert.equal(v, assignForLearner(store, "expA", "L1"), "결정적(재현)");
  assert.equal(v, assignVariant("expA", "L1", 0.5), "코어 배정과 일치");
});

test("experimentResult: 팔별로 gain 을 심으면 인과 파이프라인이 treatment_better 를 잡는다(E2E)", () => {
  const store = newStore();
  reg(store);
  // 학습자 30명 — 서버와 동일한 결정적 배정으로 팔을 나누고, 실험군엔 큰 gain·통제군엔 ~0 을 심는다.
  const pre = (n: number) => -0.3 + (n % 7) * 0.1; // 팔 무관 사전 분포(약간의 분산)
  for (let i = 0; i < 30; i++) {
    const ref = "L" + i;
    const arm = assignVariant("expA", ref, 0.5);
    const gain = arm === "treatment" ? 1.0 + (i % 3) * 0.1 : 0.02 * ((i % 3) - 1); // 실험군 ~+1.0, 통제군 ~0
    const p = pre(i);
    ingest(store, { learnerRef: ref, type: "assessment.item", kc: [], payload: { skill: "reading", thetaEst: p }, consent: "learn", ts: `2026-03-01T00:0${i % 6}:00.000Z` });
    ingest(store, { learnerRef: ref, type: "assessment.item", kc: [], payload: { skill: "reading", thetaEst: p + gain }, consent: "learn", ts: `2026-03-05T00:0${i % 6}:00.000Z` });
  }
  const r = experimentResult(store, "expA")!;
  assert.ok(r.control.n >= 6 && r.treatment.n >= 6, "두 팔 모두 표본 확보");
  assert.equal(r.control.n + r.treatment.n, 30, "모든 학습자 배정");
  assert.ok(r.diffInMeanGain! > 0.8, "실험군 평균 gain 이 크게 높음");
  assert.equal(r.powered, true);
  assert.equal(r.verdict, "treatment_better", "심은 인과를 파이프라인이 검출");
  // 등록(2026-01) 이 데이터(2026-03) 보다 앞섬 → 사전등록 유효
  assert.equal(r.retroactive, false, "사전등록이 데이터보다 앞섬");
});

test("experimentResult: 미등록 실험은 null", () => {
  const store = newStore();
  assert.equal(experimentResult(store, "없음"), null);
});
