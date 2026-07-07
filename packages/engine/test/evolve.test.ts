// 진화 사이클 오케스트레이션 무결성 — 분석→제안→실험→판정이 규칙을 지키며 도는가.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runEvolveCycle } from "../src/evolve.ts";
import { synthEvents } from "../src/synthetic.ts";
import { makeGraph, makeEvent } from "../../core/src/index.ts";
import { createDefaultContentGenerator, createDefaultReadingGenerator, createReadingGeneratorFor } from "../../adapters/src/index.ts";
import type { ContentItem, KCNode, LearningEvent } from "../../core/src/index.ts";

const nodes: KCNode[] = [
  { id: "kc.x", skill: "reading", level: "A1", prereq: [] },
  { id: "kc.y", skill: "writing", level: "A1", prereq: [] },
  { id: "kc.z", skill: "listening", level: "A1", prereq: [] }, // 콘텐츠 없음 → 격차
  { id: "kc.en.articles", skill: "writing", level: "A1", prereq: [] }, // 격차 + 생성기 지원
];
const graph = makeGraph(nodes);

function item(id: string, kc: string): ContentItem {
  return { id, lang: "en", type: "cloze", kc: [kc], level: "A1", prompt: id, answer: { value: "x" }, difficulty: null, discrimination: null, quality: "verified", source: { kind: "generated", license: "CC-BY" } };
}
const items: ContentItem[] = [item("itm.kc.x", "kc.x"), item("itm.kc.y", "kc.y")];

test("runEvolveCycle: 신호·제안·FSRS재적합·판정을 산출하고 가드레일을 지킨다", () => {
  const events = synthEvents({ learners: 100, kcs: ["kc.x", "kc.y"], reviewsPerKc: 12, seed: 9 });
  const report = runEvolveCycle({ events, items, graph });

  // 신호·제안
  assert.ok(report.signals, "신호 산출");
  assert.ok(report.proposals.length > 0, "개선 제안 존재");
  assert.ok(report.decisions.length > 0, "결정 로그 존재");

  // 콘텐츠 격차 탐지(kc.z)
  assert.ok(report.signals.contentGaps.some((g) => g.kc === "kc.z"), "콘텐츠 없는 kc.z 격차 탐지");

  // 미캘리브레이션 → 캘리브레이션 실행
  assert.ok(report.calibration, "캘리브레이션 실행됨");

  // FSRS 재적합: 예측오차 비악화
  assert.ok(report.fsrsRefit, "FSRS 재적합 제안");
  assert.ok(report.fsrsRefit.errorAfter <= report.fsrsRefit.errorBefore, "예측오차 비악화");

  // 가드레일(규칙 1): 배포는 리텐션을 훼손하지 않고, 근거는 성과개선 또는 복습절감(TTM)이다.
  if (report.fsrsRefit.deployed) {
    assert.ok(report.fsrsRefit.ab.retentionDelta >= -0.02, "배포는 리텐션을 훼손하지 않는다");
    assert.ok(report.fsrsRefit.ab.retentionDelta > 0.01 || report.fsrsRefit.ab.reviewDelta < 0, "배포 근거=리텐션 개선 또는 복습 절감");
  } else {
    assert.equal(report.loopVelocity.retentionErrorAfter, report.loopVelocity.retentionErrorBefore, "미배포 시 롤백(오차 유지)");
  }
});

test("runEvolveCycle: 생성기 주입 시 격차를 자동 생성으로 메운다(게이트 통과분만, 규칙 4)", () => {
  const events = synthEvents({ learners: 60, kcs: ["kc.x", "kc.y"], reviewsPerKc: 10, seed: 3 });
  const report = runEvolveCycle({ events, items, graph, generator: createDefaultContentGenerator(), lang: "en" });
  assert.ok(report.contentGeneration, "콘텐츠 생성 산출");
  assert.ok(report.contentGeneration.generatedCount > 0, "지원 KC(kc.en.articles) 격차를 실제로 생성");
  assert.ok(report.contentGeneration.items.every((i) => i.quality === "verified"), "편입 후보는 게이트 통과분(규칙 4)");
});

test("runEvolveCycle: 읽기 생성기 주입 시 입력 격차를 지문으로 메운다(규칙 4)", () => {
  const events = synthEvents({ learners: 40, kcs: ["kc.x", "kc.y"], reviewsPerKc: 8, seed: 5 });
  // items 의 KC(kc.x·kc.y)는 생성기 미지원 → present_be 를 다루는 item 을 추가해 지원 격차 유도
  const withBe = [...items, item("itm.be", "kc.en.present_be")];
  const report = runEvolveCycle({ events, items: withBe, graph, readingGenerator: createDefaultReadingGenerator(), readings: [], lang: "en" });
  assert.ok(report.readingGeneration, "읽기 생성 산출");
  assert.ok(report.readingGeneration.generatedCount >= 1, "지원 KC(present_be) 격차를 지문으로 생성");
  assert.ok(report.proposals.some((p) => p.includes("읽기 지문")), "제안에 읽기 지문 생성");
});

test("runEvolveCycle: 등급 읽기 생성기(ja·en·es)는 A1~B2 스펙트럼을 공급 + 멱등(무인 진화)", () => {
  for (const lang of ["ja", "en", "es"]) {
    const kc = `kc.${lang}.vocab.core`;
    const g = makeGraph([{ id: kc, skill: "reading", level: "A1", prereq: [] }]);
    const it: ContentItem = { id: `itm.${lang}.core`, lang, type: "flashcard", kc: [kc], level: "A1", prompt: "x", answer: { value: "y" }, difficulty: null, discrimination: null, quality: "verified", source: { kind: "generated", license: "CC-BY" } };
    const events = synthEvents({ learners: 20, kcs: [kc], reviewsPerKc: 6, seed: 7 });
    const gen = createReadingGeneratorFor(lang);
    const r1 = runEvolveCycle({ events, items: [it], graph: g, readingGenerator: gen, readings: [], lang });
    assert.ok(r1.readingGeneration, `${lang} 등급 읽기 생성 산출`);
    assert.equal(r1.readingGeneration.generatedCount, 4, `${lang} A1~B2 4등급 공급`);
    assert.ok(r1.readingGeneration.items.some((p) => p.level === "B2"), `${lang} 상급(B2) 논설 입력 포함`);
    assert.ok(r1.proposals.some((p) => p.includes("A1~B2")), `${lang} 제안에 스펙트럼 명시`);
    // 멱등: 생성분을 기존 읽기로 되먹이면 재생성 0(사이클 간 안정)
    const r2 = runEvolveCycle({ events, items: [it], graph: g, readingGenerator: gen, readings: r1.readingGeneration.items, lang });
    assert.equal(r2.readingGeneration?.generatedCount ?? 0, 0, `${lang} 이미 공급된 등급은 재생성 안 함(멱등)`);
  }
});

test("runEvolveCycle: communityEvents 주입 시 기여를 학습효과로 재평가(폐루프 통합)", () => {
  // 커뮤니티: g(건강)·k(망가짐) 두 승격 기여
  const cItem = (id: string) => ({ id, lang: "en", type: "flashcard", kc: ["kc.x"], level: "A1", prompt: id, answer: { value: "x" }, distractors: [], difficulty: null, discrimination: null, quality: "draft", source: { kind: "contributed", license: "CC-BY-4.0" }, meta: { schemaVersion: 1 } });
  let t = 0;
  const ts = () => `2026-07-05T00:${String(t++).padStart(2, "0")}:00.000Z`;
  const communityEvents: LearningEvent[] = [];
  for (const id of ["g", "k"]) {
    communityEvents.push(makeEvent({ learnerRef: "community", type: "contribution.submitted", ts: ts(), payload: { cid: "c:" + id, item: cItem(id), gatePass: true, gateReasons: [], contributorRef: "author" } }));
    for (const r of ["r1", "r2"]) communityEvents.push(makeEvent({ learnerRef: "community", type: "contribution.review", ts: ts(), payload: { cid: "c:" + id, verdict: "approve", reviewerRef: r } }));
  }
  // 사용 데이터: 앵커로 능력차 + g(정변별)·k(역변별). minN(기본 20) 충족하도록 코호트 확보.
  const strong = Array.from({ length: 12 }, (_, i) => "s" + i), weak = Array.from({ length: 12 }, (_, i) => "w" + i);
  const usage: LearningEvent[] = [];
  const push = (learner: string, item: string, correct: boolean) => usage.push(makeEvent({ learnerRef: learner, type: "item.response", itemId: item, ts: ts(), payload: { correct } }));
  for (const a of ["a1", "a2"]) { for (const s of strong) push(s, a, true); for (const w of weak) push(w, a, false); }
  for (const s of strong) push(s, "g", true); for (const w of weak) push(w, "g", false);
  for (const s of strong) push(s, "k", false); for (const w of weak) push(w, "k", true);

  const report = runEvolveCycle({ events: usage, items, graph, communityEvents });
  assert.ok(report.community, "커뮤니티 재평가 산출");
  assert.ok(report.community.demoted.includes("k"), "역변별(망가진) 기여 강등");
  assert.ok(report.community.healthy >= 1, "건강한 기여 식별");
  assert.ok(report.proposals.some((p) => p.includes("커뮤니티")), "제안에 커뮤니티 재평가");
});
