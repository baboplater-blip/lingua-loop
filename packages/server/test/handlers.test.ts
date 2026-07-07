import { test } from "node:test";
import assert from "node:assert/strict";
import { newStore, ingest, stateOf, reviewQueue, serveItems, exportLearner, deleteLearner, loadGraph } from "../src/handlers.ts";
import type { ContentItem, KCNode } from "../../core/src/index.ts";

const nodes: KCNode[] = [
  { id: "vocab", skill: "reading", level: "A1", prereq: [] },
  { id: "be", skill: "writing", level: "A1", prereq: [] },
];
const graph = loadGraph(nodes);

const bank: ContentItem[] = [
  { id: "A", lang: "en", type: "flashcard", kc: ["vocab"], level: "A1", prompt: "고양이", answer: { value: "cat" }, difficulty: null, discrimination: null, quality: "verified", source: { kind: "contributed", license: "CC-BY" } },
  { id: "B", lang: "en", type: "cloze", kc: ["be"], level: "A1", prompt: "I ___ ok.", answer: { value: "am" }, difficulty: null, discrimination: null, quality: "draft", source: { kind: "generated", license: "CC-BY" } },
];

test("serveItems는 verified만 서빙, draft는 절대 노출 안 함 (규칙 4, 양방향)", () => {
  const store = newStore();
  const items = serveItems(store, "l1", "en", graph, bank);
  const ids = items.map((i) => i.id);
  assert.ok(ids.includes("A"), "verified 아이템 서빙");
  assert.ok(!ids.includes("B"), "draft 아이템은 잠금해제 KC라도 서빙 금지");
});

test("이벤트 수집→상태 파생, append-only 반영", () => {
  const store = newStore();
  ingest(store, { learnerRef: "l1", type: "item.response", kc: ["vocab"], payload: { correct: true }, ts: "2026-02-01T00:00:00Z" });
  ingest(store, { learnerRef: "l1", type: "review.done", kc: ["vocab"], payload: { grade: "good" }, ts: "2026-02-03T00:00:00Z" });
  const s = stateOf(store, "l1", "en");
  assert.equal(s.kcState["vocab"].reps, 2);
  assert.ok(s.kcState["vocab"].dueTs !== null);
});

test("reviewQueue는 잠금해제 KC를 돌려준다", () => {
  const store = newStore();
  const q = reviewQueue(store, "l1", "en", graph);
  assert.ok(q.includes("vocab"));
});

test("데이터 소유권: 내보내기·삭제 (규칙 6)", () => {
  const store = newStore();
  ingest(store, { learnerRef: "l1", type: "item.response", kc: ["vocab"], payload: { correct: true } });
  assert.equal(exportLearner(store, "l1").length, 1);
  assert.equal(deleteLearner(store, "l1"), true);
  assert.equal(exportLearner(store, "l1").length, 0);
});
