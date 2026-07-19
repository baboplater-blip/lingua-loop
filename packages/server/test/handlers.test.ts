import { test } from "node:test";
import assert from "node:assert/strict";
import { newStore, ingest, stateOf, reviewQueue, serveItems, exportLearner, deleteLearner, loadGraph, publishedBank, listContributions } from "../src/handlers.ts";
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

test("보안: 공개 ingest 는 예약 시스템 로그 위조 쓰기를 거부한다 (규칙 4 게이트 우회 차단)", () => {
  const store = newStore();
  const evil: ContentItem = { id: "evil", lang: "en", type: "flashcard", kc: ["vocab"], level: "A1", prompt: "wrong", answer: { value: "5" }, difficulty: null, discrimination: null, quality: "verified", source: { kind: "generated", license: "x" } };
  // published 로그에 미검증 아이템 직접 주입 시도 → 거부되어야(안 그러면 checkItem 우회 후 전 학습자 서빙)
  assert.throws(() => ingest(store, { learnerRef: "published", type: "content.published", itemId: "evil", payload: { item: evil } }), /reserved learnerRef/);
  assert.equal(publishedBank(store, "en").find((i) => i.id === "evil"), undefined, "주입 아이템은 서빙 뱅크에 없다");
  // community 로그에 gatePass 위조 제출 시도 → 거부
  assert.throws(() => ingest(store, { learnerRef: "community", type: "contribution.submitted", payload: { cid: "c", item: evil, gatePass: true } }), /reserved learnerRef/);
  assert.equal(listContributions(store, {}).length, 0, "위조 기여는 검토 큐에 없다");
  // efficacy 스냅샷 위조 시도 → 거부
  assert.throws(() => ingest(store, { learnerRef: "efficacy", type: "efficacy.snapshot", payload: {} }), /reserved learnerRef/);
});

test("보안: 시스템 전용 이벤트 타입은 정상 learnerRef 로도 위조 불가", () => {
  const store = newStore();
  // 예약 ref 를 피해도(정상 learner) 시스템 타입 자체를 막는다 — 이중 방어
  assert.throws(() => ingest(store, { learnerRef: "l1", type: "content.published", payload: {} }), /system-only event type/);
  assert.throws(() => ingest(store, { learnerRef: "l1", type: "contribution.review", payload: {} }), /system-only event type/);
});

test("이벤트 수집→상태 파생, append-only 반영", () => {
  const store = newStore();
  ingest(store, { learnerRef: "l1", type: "item.response", kc: ["vocab"], payload: { correct: true }, ts: "2026-02-01T00:00:00Z" });
  ingest(store, { learnerRef: "l1", type: "review.done", kc: ["vocab"], payload: { grade: "good" }, ts: "2026-02-03T00:00:00Z" });
  const s = stateOf(store, "l1", "en");
  assert.equal(s.kcState["vocab"].reps, 2);
  assert.ok(s.kcState["vocab"].dueTs !== null);
});

test("보안: 비배열 kc 는 저장 전 거부된다 (append-only 영구 오염·DoS 방지)", () => {
  const store = newStore();
  // kc 가 문자열이면 deriveState `for...of`가 글자 단위 순회로 상태를 영구 오염 → 진입점에서 차단
  assert.throws(() => ingest(store, { learnerRef: "l1", type: "item.response", kc: "vocab" as never, payload: { correct: true } }), /kc must be an array/);
  assert.throws(() => ingest(store, { learnerRef: "l1", type: "item.response", kc: 42 as never, payload: { correct: true } }), /kc must be an array/);
  // 정상 상태는 오염 이벤트 없이 온전
  assert.equal(exportLearner(store, "l1").length, 0, "거부된 이벤트는 저장 안 됨");
});

test("보안: 한 이벤트의 중복 KC 는 1회만 반영된다 (이중 카운트 방지)", () => {
  const store = newStore();
  ingest(store, { learnerRef: "l1", type: "item.response", kc: ["vocab", "vocab"], payload: { correct: true }, ts: "2026-02-01T00:00:00Z" });
  assert.equal(stateOf(store, "l1", "en").kcState["vocab"].reps, 1, "중복 kc 여도 reps=1");
});

test("보안: efficacy 공용 로그는 개인 삭제로 지워지지 않는다 (Loop Velocity 보호)", () => {
  const store = newStore();
  assert.equal(deleteLearner(store, "efficacy"), false, "efficacy 삭제 거부");
  assert.equal(deleteLearner(store, "community"), false, "community 삭제 거부");
  assert.equal(deleteLearner(store, "published"), false, "published 삭제 거부");
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
