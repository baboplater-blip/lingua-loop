#!/usr/bin/env node
// /evolve 라이브 데모 — 합성 학습 데이터로 진화 루프 1사이클을 돌려 보여준다.
// 실행: node packages/engine/scripts/evolve-demo.mjs
import { synthEvents, runEvolveCycle } from "../src/index.ts";
import { makeGraph, makeEvent } from "../../core/src/index.ts";
import { createDefaultContentGenerator, createDefaultReadingGenerator } from "../../adapters/src/index.ts";

const nodes = [
  { id: "kc.en.present_be", skill: "writing", level: "A1", prereq: [] },
  { id: "kc.en.present_simple", skill: "writing", level: "A1", prereq: ["kc.en.present_be"] },
  { id: "kc.en.articles", skill: "writing", level: "A1", prereq: [] }, // 콘텐츠 없음 → 격차
];
const graph = makeGraph(nodes);

const mk = (id, kc) => ({ id, lang: "en", type: "cloze", kc: [kc], level: "A1", prompt: id, answer: { value: "x" }, difficulty: null, discrimination: null, quality: "verified", source: { kind: "contributed", license: "CC-BY-SA-4.0" } });
const items = [mk("itm.kc.en.present_be", "kc.en.present_be"), mk("itm.kc.en.present_simple", "kc.en.present_simple")];

const events = synthEvents({ learners: 200, kcs: ["kc.en.present_be", "kc.en.present_simple"], reviewsPerKc: 13, seed: 7 });

// 커뮤니티 기여 2건(good=건강·broken=망가짐) + 그에 대한 사용 데이터(강/약 코호트) — 인간 축을 데이터로 재평가
const TS = "2026-07-05T00:00:00.000Z";
const cItem = (id) => ({ id, lang: "en", type: "flashcard", kc: ["kc.en.present_be"], level: "A1", prompt: id + " (기여 문항)", answer: { value: "x" }, distractors: [], difficulty: null, discrimination: null, quality: "draft", source: { kind: "contributed", license: "CC-BY-4.0" }, meta: { schemaVersion: 1 } });
const communityEvents = [];
for (const id of ["com.good", "com.broken"]) {
  communityEvents.push(makeEvent({ learnerRef: "community", type: "contribution.submitted", ts: TS, payload: { cid: "c:" + id, item: cItem(id), gatePass: true, gateReasons: [], contributorRef: "author" } }));
  for (const rv of ["rev1", "rev2"]) communityEvents.push(makeEvent({ learnerRef: "community", type: "contribution.review", ts: TS, payload: { cid: "c:" + id, verdict: "approve", reviewerRef: rv } }));
}
const strong = Array.from({ length: 12 }, (_, i) => "cs" + i), weak = Array.from({ length: 12 }, (_, i) => "cw" + i);
const usage = [];
const push = (l, it, c) => usage.push(makeEvent({ learnerRef: l, type: "item.response", itemId: it, ts: TS, payload: { correct: c } }));
for (const a of ["anc1", "anc2"]) { for (const s of strong) push(s, a, true); for (const w of weak) push(w, a, false); }
for (const s of strong) push(s, "com.good", true); for (const w of weak) push(w, "com.good", false); // 정변별=건강
for (const s of strong) push(s, "com.broken", false); for (const w of weak) push(w, "com.broken", true); // 역변별=망가짐
const allEvents = [...events, ...usage];

console.log(`\n═══ /evolve 데모 — 진화 루프 1사이클 ═══`);
console.log(`입력: 학습 이벤트 ${allEvents.length}건 · 문항 ${items.length} · KC ${nodes.length} · 커뮤니티 기여 2건\n`);

const r = runEvolveCycle({ events: allEvents, items, graph, generator: createDefaultContentGenerator(), readingGenerator: createDefaultReadingGenerator(), readings: [], lang: "en", communityEvents });

console.log("① 분석 신호");
console.log(`   · 예측 리텐션오차(현): ${r.signals.retentionPredictionError.toFixed(3)}`);
console.log(`   · 콘텐츠 격차: ${r.signals.contentGaps.map((g) => g.kc).join(", ") || "없음"}`);
console.log(`   · 미캘리브레이션 문항: ${r.signals.uncalibratedItems.length}`);
console.log(`   · 이상 문항: ${r.signals.anomalousItems.length}`);
console.log("\n② 제안");
r.proposals.forEach((p) => console.log("   · " + p));
console.log("\n③ 실험·검증·결정 (가드레일 = 학습성과)");
r.decisions.forEach((d) => console.log("   · " + d));
if (r.fsrsRefit) {
  console.log(`\n④ FSRS 재적합 판정: ${r.fsrsRefit.deployed ? "✅ 배포" : "⏸ 롤백"} — ${r.fsrsRefit.ab.reason}`);
  console.log(`   control 리텐션 ${(r.fsrsRefit.ab.control.retention * 100).toFixed(1)}% (복습 ${r.fsrsRefit.ab.control.reviews.toFixed(1)}) → treatment ${(r.fsrsRefit.ab.treatment.retention * 100).toFixed(1)}% (복습 ${r.fsrsRefit.ab.treatment.reviews.toFixed(1)})`);
}
if (r.contentGeneration) {
  console.log(`\n⑤ 콘텐츠 자동생성: ${r.contentGeneration.generatedCount}문항 생성·게이트 통과 (byKc ${JSON.stringify(r.contentGeneration.byKc)})`);
  const sample = r.contentGeneration.items[0];
  if (sample) console.log(`   예: "${sample.prompt}" → ${sample.answer?.value}  [draft→verified]`);
}
if (r.readingGeneration) {
  console.log(`\n⑥ 등급 읽기 지문 자동생성(입력 층): ${r.readingGeneration.generatedCount}편 생성·검증 통과`);
  const rp = r.readingGeneration.items[0];
  if (rp) console.log(`   예: "${rp.title}" (${rp.level}) — "${rp.text.slice(0, 48)}…" [사전 ${Object.keys(rp.glossary).length}단어]`);
}
if (r.community) {
  console.log(`\n⑦ 커뮤니티 기여 재평가(인간 축 → 데이터 축): 승격 재검토 · 건강 ${r.community.healthy} · 강등 ${r.community.demoted.length}${r.community.demoted.length ? " (" + r.community.demoted.join(", ") + ")" : ""}`);
  console.log(`   최상위(학습효과) 기여: ${r.community.topItem ?? "없음"}  ← 인기 아닌 실효로 순위`);
}
console.log(`\n⑧ Loop Velocity: 예측오차 ${r.loopVelocity.retentionErrorBefore.toFixed(3)} → ${r.loopVelocity.retentionErrorAfter.toFixed(3)}`);
console.log(`\n다음 사이클 입력으로 환류. (실사용 데이터가 쌓일수록 정밀해짐)\n`);
