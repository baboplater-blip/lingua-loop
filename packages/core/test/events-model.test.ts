import { test } from "node:test";
import assert from "node:assert/strict";
import { EventLog, makeEvent } from "../src/events.ts";
import { deriveState } from "../src/learner-model.ts";

test("이벤트는 append-only: 반환 이벤트 변경 시 throw, update/delete 메서드 없음 (규칙 5)", () => {
  const log = new EventLog();
  const e = log.append(makeEvent({ learnerRef: "l1", type: "item.response", kc: ["k1"], payload: { correct: true }, ts: "2026-01-01T00:00:00Z" }));
  assert.throws(() => {
    // @ts-expect-error 동결된 이벤트 변경 시도
    e.ts = "changed";
  });
  const anyLog = log as unknown as Record<string, unknown>;
  assert.equal(typeof anyLog["delete"], "undefined");
  assert.equal(typeof anyLog["update"], "undefined");
  assert.equal(log.count(), 1);
});

function sampleEvents() {
  return [
    makeEvent({ learnerRef: "l1", type: "item.response", kc: ["k1"], payload: { correct: true }, ts: "2026-01-01T00:00:00Z" }),
    makeEvent({ learnerRef: "l1", type: "review.done", kc: ["k1"], payload: { grade: "good" }, ts: "2026-01-03T00:00:00Z" }),
    makeEvent({ learnerRef: "l1", type: "item.response", kc: ["k1"], payload: { correct: false }, ts: "2026-01-10T00:00:00Z" }),
    makeEvent({ learnerRef: "l2", type: "item.response", kc: ["k1"], payload: { correct: true }, ts: "2026-01-01T00:00:00Z" }),
  ];
}

test("deriveState는 결정적·멱등 (같은 이벤트 → 같은 상태)", () => {
  const evs = sampleEvents();
  const s1 = deriveState(evs, "l1", "en");
  const s2 = deriveState(evs, "l1", "en");
  assert.deepEqual(s1, s2);
});

test("deriveState 리플레이: 학습자별 격리·KC 상태 파생 (양방향)", () => {
  const evs = sampleEvents();
  const s = deriveState(evs, "l1", "en");
  assert.ok(s.kcState["k1"], "본 KC는 상태 존재");
  assert.equal(s.kcState["k1"].reps, 3);
  assert.ok(s.kcState["k1"].dueTs !== null, "다음 복습일 계산됨");
  assert.equal(s.kcState["k2"], undefined, "안 본 KC는 상태 없음");
  assert.equal(s.fromEventCount, 3, "l2 이벤트는 l1 상태에 안 섞임");
});

test("EventLog JSONL 왕복 보존", () => {
  const log = new EventLog();
  for (const e of sampleEvents()) log.append(e);
  const round = EventLog.fromJSONL(log.toJSONL());
  assert.equal(round.count(), log.count());
});
