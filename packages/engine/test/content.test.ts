// 효능 스모크(규칙 4): 자동 생성 콘텐츠가 품질 게이트를 통과해야만 편입되는가.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runNewContent, generateForGaps } from "../src/content.ts";
import { makeGraph } from "../../core/src/index.ts";
import { EnglishTemplateGenerator } from "../../adapters/src/index.ts";
import type { ContentItem } from "../../core/src/index.ts";

const gen = new EnglishTemplateGenerator();

test("runNewContent: 생성물이 게이트를 통과해 verified 로 편입", () => {
  const { verified, rejected } = runNewContent({ generator: gen, lang: "en", kc: "kc.en.present_simple", count: 4, existing: [] });
  assert.ok(verified.length > 0);
  assert.equal(rejected.length, 0, "템플릿 생성물은 게이트 청정");
  assert.ok(verified.every((v) => v.quality === "verified"));
  assert.ok(verified.every((v) => v.source.license), "라이선스 보유(규칙 14)");
});

test("중복 차단(규칙 4): 기존과 동일한 생성물은 반려", () => {
  const existing: ContentItem[] = [
    { id: "seed.apple", lang: "en", type: "mcq", kc: ["kc.en.articles"], level: "A1", prompt: "I saw ___ apple.", answer: { value: "an" }, distractors: [{ value: "a" }, { value: "the" }], difficulty: null, discrimination: null, quality: "verified", source: { kind: "contributed", license: "CC-BY" } },
  ];
  const { verified, rejected } = runNewContent({ generator: gen, lang: "en", kc: "kc.en.articles", count: 12, existing });
  assert.ok(rejected.some((r) => r.reasons.some((x) => x.includes("중복"))), "기존 apple 문항과 중복은 반려");
  assert.ok(!verified.some((v) => v.prompt.includes("apple")), "중복은 편입 안 됨");
});

test("generateForGaps: 지원 KC는 메우고 미지원은 스킵", () => {
  const graph = makeGraph([
    { id: "kc.en.articles", skill: "writing", level: "A1", prereq: [] },
    { id: "kc.en.present_be", skill: "writing", level: "A1", prereq: [] },
    { id: "kc.mystery", skill: "reading", level: "A1", prereq: [] },
  ]);
  const fill = generateForGaps(gen, [{ kc: "kc.en.articles" }, { kc: "kc.en.present_be" }, { kc: "kc.mystery" }], graph, [], "en", 3);
  assert.ok(fill.generated.length >= 4, "지원 KC 2종에서 생성");
  assert.ok(fill.skipped.includes("kc.mystery"), "미지원 KC 스킵");
  assert.ok(fill.generated.every((i) => i.quality === "verified"));
});
