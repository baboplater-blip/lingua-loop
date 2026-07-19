// FSRS 재적합 영속·적용 — 진화 루프가 A/B 가드레일 통과한 스케줄러 파라미터를 append-only로 남기고 stateOf가 적용(규칙 2·5·16).
import { test } from "node:test";
import assert from "node:assert/strict";
import { newStore, ingest, stateOf, recordFsrsParams, tunedFsrsParams, allLearnerEvents } from "../src/handlers.ts";
import { DEFAULT_FSRS_PARAMS } from "../../core/src/index.ts";
import type { FsrsParams } from "../../core/src/index.ts";

const TUNED: FsrsParams = { initS: { again: 0.2, hard: 0.8, good: 2.0, easy: 5.0 }, initScale: 1, lapseFactor: 0.4, gainFactor: 4.0, difficultyStep: 0.1 };

function seedReviews(store: ReturnType<typeof newStore>) {
  ingest(store, { learnerRef: "L1", type: "item.response", kc: ["k"], payload: { correct: true }, consent: "learn", ts: "2026-01-01T00:00:00.000Z" });
  ingest(store, { learnerRef: "L1", type: "item.response", kc: ["k"], payload: { correct: true }, consent: "learn", ts: "2026-01-03T00:00:00.000Z" });
}

test("recordFsrsParams: append-only 영속·멱등(동일 파라미터 재기록 안 함)", () => {
  const store = newStore();
  assert.equal(tunedFsrsParams(store, "en"), undefined, "튜닝 전 undefined(→ 기본값)");
  assert.equal(recordFsrsParams(store, "en", TUNED).recorded, true, "첫 기록");
  assert.deepEqual(tunedFsrsParams(store, "en"), TUNED, "최신 파라미터 조회");
  assert.equal(recordFsrsParams(store, "en", TUNED).recorded, false, "동일 파라미터 → 멱등 스킵");
  // 다른 파라미터는 새로 기록(최신 우선)
  const t2 = { ...TUNED, gainFactor: 3.0 };
  assert.equal(recordFsrsParams(store, "en", t2).recorded, true);
  assert.deepEqual(tunedFsrsParams(store, "en"), t2, "최신이 우선");
  // 언어 분리
  assert.equal(tunedFsrsParams(store, "zh"), undefined, "다른 언어는 영향 없음");
});

test("stateOf: 영속된 튜닝 파라미터가 스케줄링(dueTs)에 적용(미튜닝은 기본값=무회귀)", () => {
  const store = newStore();
  seedReviews(store);
  const before = stateOf(store, "L1", "en"); // 튜닝 전 = 기본값
  recordFsrsParams(store, "en", TUNED); // gainFactor 4.0 → 안정성↑
  const after = stateOf(store, "L1", "en");
  assert.ok(after.kcState["k"].stability > before.kcState["k"].stability, "튜닝이 안정성 상향");
  assert.ok(after.kcState["k"].dueTs! > before.kcState["k"].dueTs!, "→ 다음 복습일 더 멀리(스케줄 반영)");
  // 튜닝 안 한 다른 언어 학습자는 무회귀
  const store2 = newStore();
  seedReviews(store2);
  const base = stateOf(store2, "L1", "en");
  assert.equal(base.kcState["k"].dueTs, before.kcState["k"].dueTs, "미튜닝 = 기본값 동일(무회귀)");
});

test("FSRS 튜닝 로그는 위조 불가·학습자 집계 제외(규칙 2 우회 차단)", () => {
  const store = newStore();
  recordFsrsParams(store, "en", TUNED);
  // 공개 ingest 로 예약 ref/시스템 타입 위조 시도 → 거부(임의 스케줄 파라미터 주입 차단)
  assert.throws(() => ingest(store, { learnerRef: "fsrs", type: "item.response", kc: ["k"], payload: {}, consent: "learn" }), /reserved learnerRef/);
  assert.throws(() => ingest(store, { learnerRef: "L1", type: "fsrs.tuned", payload: {}, consent: "learn" }), /system-only event type/);
  // 튜닝 이벤트는 학습자 집계에서 제외
  seedReviews(store);
  const evs = allLearnerEvents(store);
  assert.ok(evs.every((e) => e.learnerRef !== "fsrs" && e.type !== "fsrs.tuned"), "FSRS 로그 제외");
  assert.ok(evs.length >= 2, "학습자 이벤트는 집계");
});

test("기본 파라미터를 그대로 기록해도 조회는 일관(가드레일 미통과 시 evolve 는 애초에 호출 안 함)", () => {
  const store = newStore();
  recordFsrsParams(store, "en", DEFAULT_FSRS_PARAMS);
  assert.deepEqual(tunedFsrsParams(store, "en"), DEFAULT_FSRS_PARAMS, "기록한 그대로 조회");
});
