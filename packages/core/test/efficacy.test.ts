// 효능 지표(북스타) — TTM·리텐션·커버리지가 이벤트에서 결정적으로 산출되는가(규칙 1·5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeEfficacy, trendSummary } from "../src/index.ts";
import type { LearningEvent, EfficacySnapshot } from "../src/index.ts";

// 최소 이벤트(computeEfficacy 는 type·kc·learnerRef·ts·payload 만 읽음)
const ev = (learner: string, kc: string, correct: boolean, tISO: string): LearningEvent => ({
  eventId: "e", ts: tISO, learnerRef: learner, type: "item.response", kc: [kc], payload: { correct }, consent: "learn", schemaVersion: 1,
});
const T = (min: number) => `2026-07-07T00:${String(min).padStart(2, "0")}:00.000Z`;

test("TTM: 정답 2회로 숙달 도달, 응답 수·경과 시간 산출", () => {
  const events = [
    ev("L1", "kc.a", true, T(0)),
    ev("L1", "kc.a", true, T(10)), // 숙달(2정답) — 응답 2회·경과 10분
    ev("L2", "kc.a", true, T(0)),
    ev("L2", "kc.a", false, T(5)), // 정답 1회뿐 → 미숙달
    ev("L1", "kc.b", true, T(0)),
    ev("L1", "kc.b", true, T(20)), // 숙달 — 응답 2회·경과 20분
  ];
  const r = computeEfficacy(events);
  assert.equal(r.ttm.masteredPairs, 2, "숙달 쌍 = L1/kc.a, L1/kc.b");
  assert.equal(r.ttm.medianResponsesToMastery, 2, "숙달까지 응답 중앙 2");
  assert.equal(r.ttm.medianElapsedMs, 15 * 60000, "경과 중앙 = median(10분,20분)=15분");
});

test("Retention: 전체·복습(간격반복) 정확도 분리", () => {
  const events = [
    ev("L1", "kc.a", true, T(0)),
    ev("L1", "kc.a", true, T(10)),
    ev("L2", "kc.a", true, T(0)),
    ev("L2", "kc.a", false, T(5)),
    ev("L1", "kc.b", true, T(0)),
    ev("L1", "kc.b", true, T(20)),
  ];
  const r = computeEfficacy(events);
  assert.equal(r.retention.responses, 6);
  assert.equal(r.retention.overallAccuracy, 5 / 6, "전체 정확도 5/6");
  // 복습 = 각 (학습자,KC)의 첫 응답 이후 응답: L1a2·L2a2·L1b2 = 3, 그중 정답 2
  assert.equal(r.retention.reviewResponses, 3);
  assert.equal(r.retention.reviewAccuracy, 2 / 3, "복습 정확도 2/3");
});

test("Coverage: 학습자·본 KC·숙달 KC·학습자당 숙달(0 포함 평균)", () => {
  const events = [
    ev("L1", "kc.a", true, T(0)), ev("L1", "kc.a", true, T(10)),
    ev("L2", "kc.a", true, T(0)), ev("L2", "kc.a", false, T(5)),
    ev("L1", "kc.b", true, T(0)), ev("L1", "kc.b", true, T(20)),
  ];
  const r = computeEfficacy(events);
  assert.equal(r.coverage.learners, 2);
  assert.equal(r.coverage.kcsSeen, 2, "kc.a·kc.b");
  assert.equal(r.coverage.kcsMastered, 2, "둘 다 누군가 숙달");
  assert.equal(r.coverage.masteredPerLearner, 1, "L1=2·L2=0 → 평균 1(0 포함)");
});

test("grade 페이로드도 정답 신호로 인식 / graded 아닌 타입은 무시", () => {
  const events: LearningEvent[] = [
    { eventId: "e", ts: T(0), learnerRef: "L1", type: "item.response", kc: ["kc.a"], payload: { grade: "good" }, consent: "learn", schemaVersion: 1 },
    { eventId: "e", ts: T(1), learnerRef: "L1", type: "item.response", kc: ["kc.a"], payload: { grade: "again" }, consent: "learn", schemaVersion: 1 },
    { eventId: "e", ts: T(2), learnerRef: "L1", type: "content.exposure", kc: ["kc.a"], payload: {}, consent: "learn", schemaVersion: 1 }, // 무시
    { eventId: "e", ts: T(3), learnerRef: "L1", type: "assessment.item", kc: ["kc.a"], payload: { correct: true }, consent: "learn", schemaVersion: 1 }, // 무시(능력용)
  ];
  const r = computeEfficacy(events);
  assert.equal(r.throughput.responses, 2, "graded 2개만 집계");
  assert.equal(r.retention.overallAccuracy, 0.5, "good·again → 1/2");
});

test("빈 입력이면 지표는 null·0(크래시 없음)", () => {
  const r = computeEfficacy([]);
  assert.equal(r.ttm.masteredPairs, 0);
  assert.equal(r.ttm.medianResponsesToMastery, null);
  assert.equal(r.retention.overallAccuracy, null);
  assert.equal(r.coverage.learners, 0);
});

const snap = (ts: string, acc: number, ttm: number | null, kcs: number): EfficacySnapshot => ({
  ts, responses: 10, masteredPairs: kcs, medianResponsesToMastery: ttm, overallAccuracy: acc, reviewAccuracy: acc,
  kcsMastered: kcs, learners: 1, calibratedRatio: 0.5, gaps: 0,
});

test("trendSummary: 첫↔최신 델타(정확도↑·TTM↓·숙달KC↑)", () => {
  const t = trendSummary([snap("t0", 0.6, 4, 2), snap("t1", 0.75, 3, 3), snap("t2", 0.9, 2, 5)]);
  assert.equal(t.count, 3);
  assert.ok(Math.abs(t.delta!.overallAccuracy! - 0.3) < 1e-9, "정확도 +0.30(개선)");
  assert.equal(t.delta!.medianResponsesToMastery, -2, "TTM 응답 -2(빨라짐=개선)");
  assert.equal(t.delta!.kcsMastered, 3, "숙달 KC +3");
});

test("trendSummary: 스냅샷 0·1개는 델타 없음/0", () => {
  assert.equal(trendSummary([]).delta, null, "0개 → 델타 null");
  const one = trendSummary([snap("t0", 0.6, 4, 2)]);
  assert.equal(one.count, 1);
  assert.equal(one.delta!.overallAccuracy, 0, "1개 → 첫=최신 → 0");
});
