// 무인 캘리브레이션 영속 — 데이터 기반 난이도(규칙 3)를 append-only 로 남겨 서빙·대시보드에 반영(멱등·위조 차단).
import { test } from "node:test";
import assert from "node:assert/strict";
import { newStore, ingest, loadGraph, recordCalibration, calibrationOverlay, applyCalibrationOverlay, efficacyReport, allLearnerEvents } from "../src/handlers.ts";
import type { ContentItem } from "../../core/src/index.ts";

const graph = loadGraph([{ id: "kc.a", skill: "reading", level: "A1", prereq: [] }]);
const item = (id: string, quality: ContentItem["quality"], difficulty: number | null): ContentItem => ({
  id, lang: "en", type: "flashcard", kc: ["kc.a"], level: "A1", prompt: id, answer: { value: "x" },
  difficulty, discrimination: difficulty === null ? null : 1, quality, source: { kind: "generated", license: "CC-BY" },
});

test("recordCalibration: 캘리브레이션된 아이템만 영속·멱등 재기록 방지(규칙 3·5)", () => {
  const store = newStore();
  const items = [item("i1", "calibrated", 0.3), item("i2", "verified", null)]; // i2 는 미캘리브레이션
  const a = recordCalibration(store, "en", items);
  assert.equal(a.recorded, 1, "캘리브레이션된 i1 만 기록");
  assert.equal(a.skipped, 0);
  // 같은 값 재기록 → 멱등 스킵(로그 무한 성장 방지)
  const b = recordCalibration(store, "en", items);
  assert.equal(b.recorded, 0);
  assert.equal(b.skipped, 1, "i1 변화 없음 → 스킵");
  // 난이도가 바뀌면 새로 기록(최신 반영)
  const c = recordCalibration(store, "en", [item("i1", "calibrated", 0.9)]);
  assert.equal(c.recorded, 1, "난이도 갱신 → 재기록");
});

test("calibrationOverlay·applyCalibrationOverlay: 최신 난이도/변별도/품질을 뱅크에 오버레이", () => {
  const store = newStore();
  recordCalibration(store, "en", [item("i1", "calibrated", 0.3)]);
  recordCalibration(store, "en", [item("i1", "calibrated", 0.7)]); // 갱신
  const overlay = calibrationOverlay(store, "en");
  assert.equal(overlay.get("i1").difficulty, 0.7, "최신 난이도");
  // 원본 뱅크(난이도 null·verified)에 오버레이 → 캘리브레이션 반영
  const bank = [item("i1", "verified", null), item("i9", "verified", null)];
  const out = applyCalibrationOverlay(bank, overlay);
  assert.equal(out[0].difficulty, 0.7, "i1 난이도 오버레이");
  assert.equal(out[0].quality, "calibrated", "i1 품질 승격 반영");
  assert.equal(out[1].difficulty, null, "매칭 없는 i9 는 원본 유지");
  // 언어 분리
  assert.equal(calibrationOverlay(store, "zh").size, 0, "다른 언어는 빈 오버레이");
  // 빈 오버레이면 무변경(동일 참조 반환)
  assert.equal(applyCalibrationOverlay(bank, new Map()), bank);
});

test("efficacyReport: 영속된 캘리브레이션이 Content Health(캘리브레이션 비율)에 반영", () => {
  const store = newStore();
  const seed = [item("i1", "verified", null)]; // 서빙 뱅크(미캘리브레이션)
  // 캘리브레이션 전: 비율 0
  assert.equal(efficacyReport(store, "en", graph, seed).contentHealth.calibratedRatio, 0, "캘리브 전 0");
  // 무인 잡이 i1 을 캘리브레이션했다고 영속
  recordCalibration(store, "en", [item("i1", "calibrated", 0.3)]);
  const r = efficacyReport(store, "en", graph, seed);
  assert.equal(r.contentHealth.calibratedItems, 1, "오버레이로 캘리브레이션된 문항 1");
  assert.equal(r.contentHealth.calibratedRatio, 1, "캘리브레이션 비율 1.0(반영)");
});

test("캘리브레이션 로그는 위조 불가·학습자 집계 제외(규칙 3 우회 차단)", () => {
  const store = newStore();
  recordCalibration(store, "en", [item("i1", "calibrated", 0.3)]);
  // 공개 ingest 로 예약 ref/시스템 타입 위조 시도 → 거부(임의 난이도 주입 차단)
  assert.throws(() => ingest(store, { learnerRef: "calibration", type: "item.response", kc: ["kc.a"], payload: {}, consent: "learn" }), /reserved learnerRef/);
  assert.throws(() => ingest(store, { learnerRef: "L1", type: "content.calibrated", payload: {}, consent: "learn" }), /system-only event type/);
  // 캘리브레이션 이벤트는 학습자 효능 집계에서 제외
  ingest(store, { learnerRef: "L1", type: "item.response", kc: ["kc.a"], payload: { correct: true }, consent: "learn" });
  const evs = allLearnerEvents(store);
  assert.ok(evs.every((e) => e.learnerRef !== "calibration" && e.type !== "content.calibrated"), "캘리브레이션 로그 제외");
  assert.equal(efficacyReport(store, "en", graph, [item("i1", "verified", null)]).efficacy.coverage.learners, 1, "학습자만 집계");
});
