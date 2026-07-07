// 다국어 콘텐츠 생성기 — 진화 폐루프의 자동생성을 en·es 외 언어(zh·ar·sw·ja·hi)까지(규칙 11·4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MultilingualVocabGenerator, createContentGeneratorFor } from "../src/index.ts";
import { checkItem } from "../../core/src/index.ts";

const seed = (lang: string) => JSON.parse(readFileSync(new URL(`../../packs/${lang}/content-seed.json`, import.meta.url), "utf8"));

test("레지스트리: zh·ar·sw·ja·hi → 다국어 콘텐츠 생성기(vocab·numbers·greetings·B1 문법)", () => {
  const B1 = { zh: "kc.zh.aspect_le", ar: "kc.ar.past_tense", sw: "kc.sw.tense_li", ja: "kc.ja.te_form", hi: "kc.hi.postpositions" } as Record<string, string>;
  for (const lang of ["zh", "ar", "sw", "ja", "hi"]) {
    const g = createContentGeneratorFor(lang);
    assert.equal(g.id, `${lang}-vocab-template`, `${lang} 생성기 라우팅`);
    assert.ok(g.supports(`kc.${lang}.vocab.core`), `${lang} vocab.core 지원`);
    assert.ok(g.supports(`kc.${lang}.numbers`), `${lang} numbers 지원(확장)`);
    assert.ok(g.supports(`kc.${lang}.greetings`), `${lang} greetings 지원(확장)`);
    assert.ok(g.supports(B1[lang]), `${lang} B1 문법 KC 지원(확장)`);
    assert.ok(!g.supports(`kc.${lang}.nonexistent`), `${lang} 미지원 KC는 skip`);
  }
});

test("생성물이 코어 게이트를 통과 + 시드와 중복 없음(규칙 4)", () => {
  for (const lang of ["zh", "ar", "sw", "ja", "hi"]) {
    const g = new MultilingualVocabGenerator(lang);
    const items = g.generate({ lang, kc: `kc.${lang}.vocab.core`, count: 6 });
    assert.ok(items.length >= 4, `${lang} 생성 수`);
    const existing = seed(lang);
    for (const it of items) {
      assert.equal(it.lang, lang, `${lang} 언어 태그`);
      assert.equal(it.quality, "draft", "생성물은 draft");
      const res = checkItem(it, existing);
      assert.ok(res.pass, `${lang} 게이트 통과 ${it.id}: ${(res.reasons || []).join(",")}`);
    }
    // 시드 답과 겹치지 않는 새 어휘
    const seedAnswers = new Set(existing.map((s: any) => s.answer.value));
    assert.ok(items.every((it) => !seedAnswers.has(it.answer.value)), `${lang} 새 어휘(시드 중복 없음)`);
  }
});

test("결정적: 같은 요청은 같은 결과(규칙 5 파생 재현성)", () => {
  const g = new MultilingualVocabGenerator("ja");
  const a = g.generate({ lang: "ja", kc: "kc.ja.vocab.core", count: 6 });
  const b = g.generate({ lang: "ja", kc: "kc.ja.vocab.core", count: 6 });
  assert.deepEqual(a.map((x) => x.id), b.map((x) => x.id), "결정적 id 순서");
});

test("확장 KC 생성(numbers·greetings·B1 문법)이 게이트 통과 + 시드 중복 없음", () => {
  const B1 = { zh: "kc.zh.aspect_le", ar: "kc.ar.past_tense", sw: "kc.sw.tense_li", ja: "kc.ja.te_form", hi: "kc.hi.postpositions" } as Record<string, string>;
  for (const lang of ["zh", "ar", "sw", "ja", "hi"]) {
    const g = new MultilingualVocabGenerator(lang);
    const existing = seed(lang);
    for (const kc of [`kc.${lang}.numbers`, `kc.${lang}.greetings`, B1[lang]]) {
      const items = g.generate({ lang, kc, count: 5 });
      assert.ok(items.length >= 2, `${lang} ${kc} 생성 수`);
      for (const it of items) {
        assert.deepEqual(it.kc, [kc], `${lang} ${kc} KC 태그`);
        const res = checkItem(it, existing);
        assert.ok(res.pass, `${lang} ${kc} 게이트 통과 ${it.id}: ${(res.reasons || []).join(",")}`);
      }
    }
    // B1 문법 생성물은 mcq(오답 보기 보유) + B1 레벨
    const gram = g.generate({ lang, kc: B1[lang], count: 5 });
    assert.ok(gram.every((it) => it.type === "mcq" && (it.distractors?.length ?? 0) >= 1), `${lang} 문법 mcq`);
    assert.ok(gram.every((it) => it.level === "B1"), `${lang} 문법 B1 레벨`);
  }
});
