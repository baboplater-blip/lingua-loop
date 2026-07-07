import { test } from "node:test";
import assert from "node:assert/strict";
import { makeGraph, assertDAG, topoOrder, isUnlocked, nextKCs, type KCNode } from "../src/kc-graph.ts";
import type { LearnerState } from "../src/types.ts";

const nodes: KCNode[] = [
  { id: "a", skill: "reading", level: "A1", prereq: [] },
  { id: "b", skill: "reading", level: "A1", prereq: ["a"] },
  { id: "c", skill: "reading", level: "A2", prereq: ["b"] },
];

function stateWith(kc: LearnerState["kcState"]): LearnerState {
  return { learnerRef: "l1", lang: "en", kcState: kc, ability: {}, fromEventCount: 0 };
}

test("정상 DAG는 통과하고 위상정렬은 전제를 먼저 둔다", () => {
  const g = makeGraph(nodes);
  assert.doesNotThrow(() => assertDAG(g));
  const order = topoOrder(g);
  assert.ok(order.indexOf("a") < order.indexOf("b"));
  assert.ok(order.indexOf("b") < order.indexOf("c"));
});

test("순환·미정의 전제는 throw (음성 단언)", () => {
  const cyclic = makeGraph([
    { id: "x", skill: "reading", level: "A1", prereq: ["y"] },
    { id: "y", skill: "reading", level: "A1", prereq: ["x"] },
  ]);
  assert.throws(() => assertDAG(cyclic), /순환/);

  const missing = makeGraph([{ id: "x", skill: "reading", level: "A1", prereq: ["ghost"] }]);
  assert.throws(() => assertDAG(missing), /미정의 전제/);
});

test("잠금해제는 전제 mastery 임계에 따른다", () => {
  const g = makeGraph(nodes);
  const s = stateWith({ a: { mastery: 0.7, stability: 5, difficulty: 5, lastReviewTs: 0, dueTs: null, reps: 1 } });
  assert.equal(isUnlocked("b", s, g), true); // a≥0.6
  assert.equal(isUnlocked("c", s, g), false); // b 미숙달
});

test("nextKCs: 잠금해제·미숙달만 포함, 잠긴 KC 제외 (양방향)", () => {
  const g = makeGraph(nodes);
  const s = stateWith({
    a: { mastery: 0.95, stability: 5, difficulty: 5, lastReviewTs: 0, dueTs: null, reps: 3 },
    b: { mastery: 0.3, stability: 2, difficulty: 5, lastReviewTs: 0, dueTs: null, reps: 1 },
  });
  const next = nextKCs(s, g, { now: 1000 });
  assert.ok(next.includes("b"), "미숙달·잠금해제 b 포함");
  assert.ok(!next.includes("c"), "잠긴 c 제외");
  assert.ok(!next.includes("a"), "숙달된 a 제외");
});

test("nextKCs: 복습 만기 KC가 우선된다", () => {
  const g = makeGraph(nodes);
  const now = 100000;
  const s = stateWith({
    a: { mastery: 0.95, stability: 5, difficulty: 5, lastReviewTs: 0, dueTs: now - 1, reps: 3 }, // 만기
    b: { mastery: 0.3, stability: 2, difficulty: 5, lastReviewTs: 0, dueTs: null, reps: 1 },
  });
  const next = nextKCs(s, g, { now });
  assert.equal(next[0], "a", "만기 a가 맨 앞");
});
