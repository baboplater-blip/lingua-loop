// 효능 스모크(test.md §6, 규칙 4): 품질 게이트가 불량 문항을 실제로 차단하는가.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkItem, promoteVerified } from "../src/content-gate.ts";
import type { ContentItem } from "../src/types.ts";

function base(overrides: Partial<ContentItem>): ContentItem {
  return {
    id: "i1",
    lang: "en",
    type: "mcq",
    kc: ["k1"],
    level: "A1",
    prompt: "The cat ___ on the mat.",
    answer: { value: "sat" },
    distractors: [{ value: "sit" }, { value: "sitting" }],
    difficulty: null,
    discrimination: null,
    quality: "draft",
    source: { kind: "generated", license: "CC-BY" },
    ...overrides,
  };
}

test("정상 문항은 게이트 통과", () => {
  assert.equal(checkItem(base({})).pass, true);
});

test("라이선스 누락은 차단 (규칙 14)", () => {
  const r = checkItem(base({ source: { kind: "generated", license: "" } }));
  assert.equal(r.pass, false);
  assert.ok(r.reasons.some((x) => x.includes("라이선스")));
});

test("정답 누락은 차단", () => {
  const r = checkItem(base({ type: "flashcard", answer: null, distractors: [] }));
  assert.equal(r.pass, false);
  assert.ok(r.reasons.some((x) => x.includes("정답")));
});

test("오답보기가 정답과 동일하면 차단", () => {
  const r = checkItem(base({ distractors: [{ value: "sat" }, { value: "sit" }] }));
  assert.equal(r.pass, false);
  assert.ok(r.reasons.some((x) => x.includes("정답과 동일")));
});

test("KC 태그 누락은 차단", () => {
  const r = checkItem(base({ kc: [] }));
  assert.equal(r.pass, false);
  assert.ok(r.reasons.some((x) => x.includes("KC")));
});

test("중복 문항은 차단", () => {
  const dup = base({ id: "i2" });
  const r = checkItem(base({ id: "i1" }), [dup]);
  assert.equal(r.pass, false);
  assert.ok(r.reasons.some((x) => x.includes("중복")));
});

test("promoteVerified: 통과분만 verified 승격, 불량은 사유와 함께 반려", () => {
  const items = [
    base({ id: "ok1" }),
    base({ id: "bad1", prompt: "They ___ football.", answer: { value: "play" }, distractors: [{ value: "plays" }, { value: "playing" }], source: { kind: "generated", license: "" } }),
    base({ id: "ok2", prompt: "She ___ to school.", answer: { value: "goes" }, distractors: [{ value: "go" }, { value: "going" }] }),
  ];
  const { verified, rejected } = promoteVerified(items);
  const vids = verified.map((v) => v.id);
  assert.ok(vids.includes("ok1") && vids.includes("ok2"));
  assert.ok(!vids.includes("bad1"), "불량은 노출 안 됨(규칙 4)");
  assert.equal(rejected.length, 1);
  assert.ok(verified.every((v) => v.quality === "verified"));
});
