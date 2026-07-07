import { test } from "node:test";
import assert from "node:assert/strict";
import { EnglishTemplateGenerator } from "../src/content-gen.ts";

const gen = new EnglishTemplateGenerator();

test("supports: 알려진 KC만 생성 (양방향)", () => {
  assert.equal(gen.supports("kc.en.articles"), true);
  assert.equal(gen.supports("kc.en.unknown"), false);
});

test("관사 생성: 모음 명사 앞 an, 자음 명사 앞 a", () => {
  const items = gen.generate({ lang: "en", kc: "kc.en.articles", count: 12 });
  const apple = items.find((i) => i.prompt.includes("apple"));
  const dog = items.find((i) => i.prompt.includes("dog"));
  assert.equal(apple?.answer?.value, "an");
  assert.equal(dog?.answer?.value, "a");
  // 오답보기는 정답 제외
  assert.ok(apple?.distractors?.every((d) => d.value !== "an"));
});

test("3인칭 단수 생성: 정답은 -(e)s형, 오답보기에 base/ing/past", () => {
  const items = gen.generate({ lang: "en", kc: "kc.en.present_simple", count: 6 });
  const it = items[0];
  assert.ok(it.answer && /s$/.test(it.answer.value), "정답 3인칭형");
  assert.ok((it.distractors || []).length >= 2);
});

test("생성물은 draft·라이선스·KC 태그 보유 (게이트 전제)", () => {
  const items = gen.generate({ lang: "en", kc: "kc.en.vocab.core", count: 6 });
  for (const it of items) {
    assert.equal(it.quality, "draft");
    assert.ok(it.source.license);
    assert.ok(it.kc.length >= 1);
    assert.ok(it.answer && it.answer.value);
  }
});

test("결정적: 같은 요청 → 같은 산출", () => {
  const a = gen.generate({ lang: "en", kc: "kc.en.articles", count: 5 });
  const b = gen.generate({ lang: "en", kc: "kc.en.articles", count: 5 });
  assert.deepEqual(a.map((x) => x.id), b.map((x) => x.id));
});
