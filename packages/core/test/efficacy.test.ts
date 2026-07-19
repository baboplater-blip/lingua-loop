// 효능 지표(북스타) — TTM·리텐션·커버리지가 이벤트에서 결정적으로 산출되는가(규칙 1·5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeEfficacy, trendSummary, efficacyByKc } from "../src/index.ts";
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

test("efficacyByKc: KC별 숙달도달률·노력·정확도, 막히는 KC 먼저(어디서 안 가르쳐지는가)", () => {
  const events = [
    // 쉬운 KC — 3명 모두 정답 2회로 숙달(도달률 1.0)
    ev("L1", "kc.easy", true, T(0)), ev("L1", "kc.easy", true, T(1)),
    ev("L2", "kc.easy", true, T(0)), ev("L2", "kc.easy", true, T(1)),
    ev("L3", "kc.easy", true, T(0)), ev("L3", "kc.easy", true, T(1)),
    // 막히는 KC — 3명 중 1명만 숙달(도달률 1/3)
    ev("H1", "kc.hard", true, T(0)), ev("H1", "kc.hard", true, T(1)), // 숙달(2응답)
    ev("H2", "kc.hard", false, T(0)), ev("H2", "kc.hard", false, T(1)), ev("H2", "kc.hard", true, T(2)), // 미숙달(1정답)
    ev("H3", "kc.hard", false, T(0)), ev("H3", "kc.hard", true, T(1)), // 미숙달(1정답)
  ];
  const by = efficacyByKc(events);
  assert.equal(by.length, 2, "두 KC");
  assert.equal(by[0].kc, "kc.hard", "막히는 KC(낮은 도달률) 먼저");
  const hard = by[0], easy = by[1];
  assert.equal(easy.kc, "kc.easy");
  assert.equal(easy.masteryReachRate, 1, "쉬운 KC 도달률 1.0");
  assert.equal(easy.mastered, 3);
  assert.equal(easy.medianResponsesToMastery, 2, "쉬운 KC 숙달까지 2응답");
  assert.ok(Math.abs(hard.masteryReachRate! - 1 / 3) < 1e-9, "막히는 KC 도달률 1/3");
  assert.equal(hard.mastered, 1);
  assert.equal(hard.learners, 3);
  assert.ok(Math.abs(hard.accuracy! - 4 / 7) < 1e-9, "막히는 KC 정확도 4/7");
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
  assert.equal(r.gain.n, 0, "Gain Score 표본 0");
  assert.equal(r.gain.effectSize, null);
});

// ── Gain Score(효능 핵심 증거) — 사전→사후 능력 상승·효과크기. 인과 아님(규칙 17), 합성 코호트로 파이프라인 검증 ──
const assess = (learner: string, theta: number, day: number): LearningEvent => ({
  eventId: "e", ts: `2026-03-${String(day).padStart(2, "0")}T00:00:00.000Z`, learnerRef: learner, type: "assessment.item",
  kc: [], payload: { skill: "reading", thetaEst: theta }, consent: "learn", schemaVersion: 1,
});

test("Gain Score: 학습 코호트는 유의미한 효과크기(d≥0.4), 통제 코호트는 ~0 (효능 검증, 규칙 17)", () => {
  // 결정적 합성: 사전 θ 분포는 동일, 학습군만 사후 θ 상승. (인과 아님 — 관측 효과크기 파이프라인 검증)
  const pre = [-0.3, -0.1, 0.1, 0.3, -0.2, 0.0, 0.2, -0.1];
  const postLearn = [0.8, 1.1, 0.9, 1.2, 1.0, 1.3, 0.7, 1.1]; // 상승
  const learnEvents: LearningEvent[] = [];
  const ctrlEvents: LearningEvent[] = [];
  pre.forEach((p, i) => {
    learnEvents.push(assess("L" + i, p, 1), assess("L" + i, postLearn[i], 5)); // 사전→사후 재평가
    ctrlEvents.push(assess("C" + i, p, 1), assess("C" + i, p + 0.02, 5)); // 사실상 변화 없음
  });
  const gl = computeEfficacy(learnEvents).gain;
  const gc = computeEfficacy(ctrlEvents).gain;
  assert.equal(gl.n, 8, "학습군 사전·사후 쌍 8");
  assert.ok(gl.meanGain! > 0.8, "학습군 평균 상승 큰 양수");
  assert.ok(gl.effectSize! >= 0.4, "학습군 효과크기 d≥0.4 (유의미)");
  assert.ok(Math.abs(gc.effectSize!) < 0.4, "통제군 효과크기 ~0 (개선 없음)");
  assert.ok(gl.effectSize! > gc.effectSize!, "학습군 > 통제군 (측정 가능성 입증)");
  assert.ok(gl.bySkill["reading"] && gl.bySkill["reading"].n === 8, "스킬별 분해");
});

test("Gain Score: 재평가(2회 이상)가 없으면 gain 미산출 — 관측만으로 단정 금지(규칙 17)", () => {
  // 배치 1회만 본 학습자는 사후가 없어 gain 표본에 안 들어간다(가짜 개선 방지)
  const g = computeEfficacy([assess("only", 0.5, 1), assess("only2", 1.0, 1)]).gain;
  assert.equal(g.n, 0, "재평가 없으면 표본 0");
  assert.equal(g.effectSize, null, "효과크기 추정 불가");
});

const snap = (ts: string, acc: number, ttm: number | null, kcs: number): EfficacySnapshot => ({
  ts, responses: 10, masteredPairs: kcs, medianResponsesToMastery: ttm, overallAccuracy: acc, reviewAccuracy: acc,
  kcsMastered: kcs, learners: 1, calibratedRatio: 0.5, gaps: 0, gainEffectSize: null, gainN: 0,
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
