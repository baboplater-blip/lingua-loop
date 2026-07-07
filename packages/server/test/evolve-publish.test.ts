// 진화 산출 자동 발행 — 게이트 통과·중복 배제만 발행(규칙 4). 무인 진화 루프의 마지막 단계.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newStore, publishFromEvolve, publishedBank, publishedReadings } from "../src/handlers.ts";

const item = (id: string, prompt: string, answer: string) => ({ id, lang: "en", type: "flashcard" as const, kc: ["kc.en.vocab.core"], level: "A1" as const, prompt, answer: { value: answer }, distractors: [], difficulty: null, discrimination: null, quality: "draft" as const, source: { kind: "generated" as const, license: "CC-BY-4.0" }, meta: { schemaVersion: 1 } });
const passage = (id: string) => ({ id, level: "A1" as const, kc: ["kc.en.vocab.core"], title: id, text: "This is a generated graded reading passage.", glossary: { generated: "생성" }, questions: [{ q: "?", answer: "a", options: ["a", "b"] }], source: { kind: "generated" as const, license: "CC-BY-4.0" } });

test("진화 산출을 자동 발행 — 문항·지문 게이트 통과분 서빙 편입", () => {
  const store = newStore();
  const report = { contentGeneration: { items: [item("g1", "cat 뜻은?", "고양이"), item("g2", "dog 뜻은?", "개")] }, readingGeneration: { items: [passage("r1")] } };
  const res = publishFromEvolve(store, report, "en", []);
  assert.equal(res.publishedItems, 2);
  assert.equal(res.publishedReadings, 1);
  assert.equal(res.skipped, 0);
  assert.equal(publishedBank(store, "en").length, 2, "발행 문항 서빙 편입");
  assert.equal(publishedReadings(store, "en").length, 1, "발행 지문 서빙 편입");
});

test("기존과 중복되는 생성물은 자동 발행에서 배제(규칙 4)", () => {
  const store = newStore();
  const existing = [item("seed1", "apple 뜻은?", "사과")];
  // 다른 id·같은 내용 → 중복
  const report = { contentGeneration: { items: [item("dup", "apple 뜻은?", "사과"), item("fresh", "sun 뜻은?", "해")] } };
  const res = publishFromEvolve(store, report, "en", existing);
  assert.equal(res.publishedItems, 1, "새 것만 발행");
  assert.equal(res.skipped, 1, "중복 배제");
  assert.ok(publishedBank(store, "en").some((i) => i.id === "fresh"));
  assert.ok(!publishedBank(store, "en").some((i) => i.id === "dup"));
});
