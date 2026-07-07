import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, toResponses } from "../src/analyze.ts";
import { makeGraph, makeEvent } from "../../core/src/index.ts";
import type { ContentItem, KCNode, LearningEvent } from "../../core/src/index.ts";

const nodes: KCNode[] = [
  { id: "A", skill: "reading", level: "A1", prereq: [] },
  { id: "B", skill: "reading", level: "A1", prereq: [] },
  { id: "C", skill: "reading", level: "A1", prereq: [] },
];
const graph = makeGraph(nodes);

function item(id: string, kc: string, quality: ContentItem["quality"], difficulty: number | null): ContentItem {
  return { id, lang: "en", type: "cloze", kc: [kc], level: "A1", prompt: id, answer: { value: "x" }, difficulty, discrimination: null, quality, source: { kind: "generated", license: "CC-BY" } };
}

// A: 2 verified, B: 0 verified(격차), C: 1 verified. A의 verified 문항은 difficulty null(미캘리브레이션)
const items: ContentItem[] = [
  item("a1", "A", "verified", null),
  item("a2", "A", "calibrated", 0.5),
  item("c1", "C", "verified", 0.1),
];

function ev(learner: string, kc: string, item: string, correct: boolean): LearningEvent {
  return makeEvent({ learnerRef: learner, type: "item.response", kc: [kc], itemId: item, payload: { correct } });
}

test("analyze: 콘텐츠 격차·저성과 KC·미캘리브레이션 탐지 (양방향)", () => {
  const events: LearningEvent[] = [];
  // A: 저성과(정답률 낮게), C: 정상
  for (let i = 0; i < 20; i++) events.push(ev("l" + i, "A", "a1", i % 5 === 0));
  for (let i = 0; i < 20; i++) events.push(ev("l" + i, "C", "c1", i % 5 !== 0));

  const s = analyze(events, items, graph);
  const gapKCs = s.contentGaps.map((g) => g.kc);
  assert.ok(gapKCs.includes("B"), "verified 0인 B는 격차");
  assert.ok(!gapKCs.includes("A"), "verified 2인 A는 격차 아님");
  assert.ok(s.lowMasteryKCs.some((k) => k.kc === "A"), "A는 저성과 KC");
  assert.ok(!s.lowMasteryKCs.some((k) => k.kc === "C"), "C는 저성과 아님");
  assert.ok(s.uncalibratedItems.includes("a1"), "verified·difficulty null은 미캘리브레이션");
});

test("toResponses: item.response 이벤트를 문항 반응으로 변환", () => {
  const r = toResponses([ev("l1", "A", "a1", true), ev("l2", "A", "a1", false)]);
  assert.equal(r.length, 2);
  assert.equal(r[0].item, "a1");
});
