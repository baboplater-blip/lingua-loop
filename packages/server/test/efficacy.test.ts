// 효능 대시보드 핸들러 — 이벤트 집계(TTM·리텐션·커버리지) + 콘텐츠 건강·격차, 공용 로그 제외(규칙 1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { newStore, ingest, loadGraph, efficacyReport, allLearnerEvents, publishReading, recordEfficacy, efficacyHistory } from "../src/handlers.ts";
import type { ContentItem, ReadingPassage } from "../../core/src/index.ts";

function item(id: string, kc: string, calibrated = false): ContentItem {
  return { id, lang: "en", type: "flashcard", kc: [kc], level: "A1", prompt: id, answer: { value: "x" }, difficulty: calibrated ? 0.2 : null, discrimination: calibrated ? 1 : null, quality: "verified", source: { kind: "generated", license: "CC-BY" } };
}
const graph = loadGraph([
  { id: "kc.a", skill: "reading", level: "A1", prereq: [] },
  { id: "kc.b", skill: "writing", level: "A1", prereq: [] },
]);

test("efficacyReport: TTM·커버리지 집계 + 콘텐츠 격차·캘리브레이션 비율", () => {
  const store = newStore();
  // L1 이 kc.a 를 정답 2회 → 숙달
  ingest(store, { learnerRef: "L1", type: "item.response", kc: ["kc.a"], payload: { correct: true }, consent: "learn" });
  ingest(store, { learnerRef: "L1", type: "item.response", kc: ["kc.a"], payload: { correct: true }, consent: "learn" });
  const bank = [item("i1", "kc.a", true), item("i2", "kc.a")]; // kc.a 2문항(1 캘리브), kc.b 0문항 → 격차
  const r = efficacyReport(store, "en", graph, bank);
  assert.equal(r.efficacy.ttm.masteredPairs, 1, "L1/kc.a 숙달");
  assert.equal(r.efficacy.coverage.kcsMastered, 1);
  assert.equal(r.efficacy.coverage.learners, 1);
  assert.equal(r.contentHealth.totalKCs, 2);
  assert.equal(r.contentHealth.servableItems, 2);
  assert.equal(r.contentHealth.calibratedRatio, 0.5, "2문항 중 1개 캘리브레이션");
  assert.ok(r.gaps.some((g) => g.kc === "kc.b"), "kc.b 격차(문항<2)");
  assert.ok(!r.gaps.some((g) => g.kc === "kc.a"), "kc.a는 2문항 → 격차 아님");
});

test("공용 로그(발행·기여)는 효능 집계에서 제외(참여자=학습자만)", () => {
  const store = newStore();
  ingest(store, { learnerRef: "L1", type: "item.response", kc: ["kc.a"], payload: { correct: true }, consent: "learn" });
  const passage: ReadingPassage = { id: "p1", level: "A1", kc: ["kc.a"], title: "t", text: "hello world reading", glossary: { hello: "x" }, questions: [], source: { kind: "generated", license: "CC-BY-4.0" } };
  publishReading(store, passage, "en"); // published 로그에 기록
  const evs = allLearnerEvents(store);
  assert.ok(evs.length >= 1, "학습자 이벤트 존재");
  assert.ok(evs.every((e) => e.learnerRef !== "published" && e.learnerRef !== "community"), "공용 로그 제외");
  const r = efficacyReport(store, "en", graph, [item("i1", "kc.a")]);
  assert.equal(r.efficacy.coverage.learners, 1, "학습자만 집계(발행 ref 제외)");
});

test("이벤트 없으면 지표 null·0 (빈 스토어 안전)", () => {
  const store = newStore();
  const r = efficacyReport(store, "en", graph, []);
  assert.equal(r.efficacy.throughput.responses, 0);
  assert.equal(r.efficacy.retention.overallAccuracy, null);
  assert.equal(r.contentHealth.calibratedRatio, null, "문항 0이면 비율 null");
});

test("recordEfficacy·efficacyHistory: 스냅샷 누적·추세, 스냅샷은 학습자 집계 제외", () => {
  const store = newStore();
  const bank = [item("i1", "kc.a", true), item("i2", "kc.a")];
  // 1차 스냅샷(응답 없음)
  const s0 = recordEfficacy(store, "en", graph, bank, "2026-07-07T00:00:00.000Z");
  assert.equal(s0.overallAccuracy, null, "1차엔 응답 없음");
  // 학습 후 2차 스냅샷 — kc.a 정답 2회
  ingest(store, { learnerRef: "L1", type: "item.response", kc: ["kc.a"], payload: { correct: true }, consent: "learn" });
  ingest(store, { learnerRef: "L1", type: "item.response", kc: ["kc.a"], payload: { correct: true }, consent: "learn" });
  const s1 = recordEfficacy(store, "en", graph, bank, "2026-07-07T01:00:00.000Z");
  assert.equal(s1.overallAccuracy, 1, "2차 정확도 100%");
  assert.equal(s1.kcsMastered, 1, "숙달 KC 1");
  // 이력·추세
  const h = efficacyHistory(store, "en");
  assert.equal(h.snapshots.length, 2, "스냅샷 2개 누적");
  assert.equal(h.trend.count, 2);
  assert.equal(h.trend.delta.kcsMastered, 1, "숙달 KC 첫→최신 +1(개선)");
  // 다른 언어 이력은 비어 있음
  assert.equal(efficacyHistory(store, "zh").snapshots.length, 0, "언어별 분리");
  // 효능 스냅샷 이벤트는 학습자 집계에서 제외(참여자=실 학습자만)
  const evs = allLearnerEvents(store);
  assert.ok(evs.every((e) => e.type !== "efficacy.snapshot"), "efficacy.snapshot 제외");
  assert.equal(efficacyReport(store, "en", graph, bank).efficacy.coverage.learners, 1, "학습자만(스냅샷 ref 제외)");
});
