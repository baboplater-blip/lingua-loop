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

test("이벤트 깊은 동결: kc 배열·payload 도 변경 시 throw (얕은 freeze 결함 수정, 규칙 5)", () => {
  const e = makeEvent({ learnerRef: "l1", type: "item.response", kc: ["k1"], payload: { correct: true }, ts: "2026-01-01T00:00:00Z" });
  assert.throws(() => { (e.kc as string[]).push("k2"); }, "kc 배열 변조 차단");
  assert.throws(() => { (e.payload as Record<string, unknown>)["correct"] = false; }, "payload 변조 차단");
  // 복원 경로(완성 이벤트 append)도 깊게 동결되어야
  const log = new EventLog();
  const restored = log.append({ ...e });
  assert.throws(() => { (restored.payload as Record<string, unknown>)["x"] = 1; }, "복원 이벤트 payload 도 동결");
});

test("makeEvent 는 호출자 kc 배열을 복사·격리한다(원본 변조 무영향)", () => {
  const kc = ["k1"];
  const e = makeEvent({ learnerRef: "l1", type: "item.response", kc, payload: {}, ts: "2026-01-01T00:00:00Z" });
  kc.push("k2"); // 호출자가 원본을 바꿔도
  assert.deepEqual([...e.kc!], ["k1"], "이벤트 kc 는 영향받지 않음");
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

test("BKT 최초 관측: 첫 오답은 숙달을 올리지 않는다(퇴화 보정), 첫 정답·2정답 궤적 불변", () => {
  const wrong1 = deriveState([makeEvent({ learnerRef: "l", type: "item.response", kc: ["k"], payload: { correct: false }, ts: "2026-01-01T00:00:00Z" })], "l", "en");
  assert.equal(wrong1.kcState["k"].mastery, 0, "첫 오답 → mastery 0 (0.25 로 잘못 오르지 않음)");
  const right1 = deriveState([makeEvent({ learnerRef: "l", type: "item.response", kc: ["k"], payload: { correct: true }, ts: "2026-01-01T00:00:00Z" })], "l", "en");
  assert.ok(Math.abs(right1.kcState["k"].mastery - 0.25) < 1e-9, "첫 정답 → 0.25 (불변)");
  const right2 = deriveState([
    makeEvent({ learnerRef: "l", type: "item.response", kc: ["k"], payload: { correct: true }, ts: "2026-01-01T00:00:00Z" }),
    makeEvent({ learnerRef: "l", type: "item.response", kc: ["k"], payload: { correct: true }, ts: "2026-01-02T00:00:00Z" }),
  ], "l", "en");
  assert.ok(Math.abs(right2.kcState["k"].mastery - 0.7) < 1e-9, "2정답 → 0.70 (숙달 임계 정렬, 불변)");
});

test("EventLog JSONL 왕복 보존", () => {
  const log = new EventLog();
  for (const e of sampleEvents()) log.append(e);
  const round = EventLog.fromJSONL(log.toJSONL());
  assert.equal(round.count(), log.count());
});
