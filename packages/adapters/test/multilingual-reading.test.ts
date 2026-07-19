// 다국어 읽기 지문 생성기 — 진화 폐루프의 등급 지문 자동생성을 en·es 외 언어(zh·ar·sw·ja·hi)까지(규칙 11·4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MultilingualReadingGenerator, createReadingGeneratorFor, multilingualReadingLevels, withProductionQuestion, upperGrammarKcs } from "../src/index.ts";
import { validateReading, scoreComprehension } from "../../core/src/index.ts";

const seedReadings = (lang: string) => JSON.parse(readFileSync(new URL(`../../packs/${lang}/reading.json`, import.meta.url), "utf8")).passages;

test("withProductionQuestion: 복수 문항이면 마지막을 주관식(산출)으로, 1문항이면 그대로", () => {
  const two = withProductionQuestion([
    { q: "Q1", answer: "a", options: ["a", "b"] },
    { q: "Q2", answer: "sweet", options: ["sweet", "sour"] },
  ]);
  assert.ok(two[0].options, "첫 문항 객관식 유지");
  assert.equal(two[1].options, undefined, "마지막은 주관식(보기 없음)");
  assert.deepEqual(two[1].accept, ["sweet"], "정답을 accept 로");
  const one = withProductionQuestion([{ q: "Q1", answer: "a", options: ["a", "b"] }]);
  assert.ok(one[0].options, "1문항은 객관식 유지");
});

test("생성 지문의 주관식(산출) 문항이 서버 채점기로 정오 판정된다(복수 문항 등급)", () => {
  const g = new MultilingualReadingGenerator("zh");
  const p = g.generate({ lang: "zh", kc: "kc.zh.vocab.core", level: "A2" })!; // A2=2문항 → 마지막 주관식
  const free = (p.questions ?? []).find((q) => !q.options);
  assert.ok(free, "산출(주관식) 문항 포함");
  const idx = p.questions!.indexOf(free!);
  assert.equal(scoreComprehension(p, idx, free!.answer as string)!.correct, true, "정답 채점");
  assert.equal(scoreComprehension(p, idx, "___오답___")!.correct, false, "오답 채점");
  // CJK 붙여쓰기(공백 없는 자연 표기)도 정답으로 인정 — 공백은 클릭사전용 인위 삽입(오답 처리 결함 수정)
  if (typeof free!.answer === "string" && /\s/.test(free!.answer)) {
    assert.equal(scoreComprehension(p, idx, free!.answer.replace(/\s+/g, ""))!.correct, true, "공백 제거한 자연 표기도 정답");
  }
});

test("B1/B2 생성 지문이 본문 근거 있는 상위 문법 KC를 태깅 — 없는 문법은 안 붙임(규칙 4)", () => {
  // 기대: 본문에 실제 마커가 있는 상위 문법만. (근거는 아래 마커 존재로 검증)
  const expected: Record<string, Record<string, string[]>> = {
    zh: { B1: [], B2: ["kc.zh.aspect_le"] },              // B2 "改变 了" / B1 了 없음
    ja: { B1: ["kc.ja.te_form"], B2: ["kc.ja.te_form", "kc.ja.potential"] }, // 行って / 見て·でき
    ar: { B1: [], B2: ["kc.ar.past_tense"] },             // B2 "غيّرت"
    sw: { B1: [], B2: [] },                                // -li- 과거 없음 → 정직하게 미태깅
    hi: { B1: ["kc.hi.postpositions"], B2: ["kc.hi.postpositions"] }, // में/से/के
  };
  const evidence: Record<string, RegExp> = {
    "kc.zh.aspect_le": /了/, "kc.ja.te_form": /て[\s、。]/, "kc.ja.potential": /でき|られ/,
    "kc.ar.past_tense": /غيّر/, "kc.hi.postpositions": /(^|\s)(में|से|को|के|पर)(\s|$)/,
  };
  for (const lang of Object.keys(expected)) {
    const g = new MultilingualReadingGenerator(lang);
    for (const level of ["B1", "B2"]) {
      const p = g.generate({ lang, kc: `kc.${lang}.vocab.core`, level })!;
      const exp = expected[lang][level];
      // 함수 계약: upperGrammarKcs 가 기대와 일치
      assert.deepEqual([...upperGrammarKcs(lang, p.text, level)].sort(), [...exp].sort(), `${lang} ${level} 상위 문법`);
      // 생성 지문 kc 에 편입
      for (const kc of exp) assert.ok(p.kc.includes(kc), `${lang} ${level} 지문 kc에 ${kc}`);
      // 근거(rule 4): 태깅된 KC의 마커가 본문에 실제 존재
      for (const kc of exp) assert.ok(evidence[kc].test(p.text), `${lang} ${level} 본문에 ${kc} 근거 존재`);
    }
  }
  // A1/A2 는 상위 문법 미적용(스코프)
  assert.deepEqual(upperGrammarKcs("zh", "买 了 苹果", "A2"), [], "A2 는 상위 문법 미태깅(了 있어도)");
});

test("생성 지문이 어휘 + 기초 문법 KC를 함께 태깅 — 읽기가 문법 숙달에도 기여(규칙 4·11)", () => {
  const grammarOf: Record<string, string> = {
    zh: "kc.zh.basic_sentence", ar: "kc.ar.present_tense", sw: "kc.sw.present_tense", ja: "kc.ja.masu_form", hi: "kc.hi.present_habitual",
  };
  for (const lang of ["zh", "ar", "sw", "ja", "hi"]) {
    const g = new MultilingualReadingGenerator(lang);
    for (const level of multilingualReadingLevels(lang)) {
      const p = g.generate({ lang, kc: `kc.${lang}.vocab.core`, level })!;
      assert.ok(p.kc.includes(`kc.${lang}.vocab.core`), `${lang} ${level} 어휘 KC`);
      assert.ok(p.kc.includes(grammarOf[lang]), `${lang} ${level} 기초 문법 KC(${grammarOf[lang]})`);
    }
  }
});

test("레지스트리: zh·ar·sw·ja·hi → 다국어 읽기 생성기", () => {
  for (const lang of ["zh", "ar", "sw", "ja", "hi"]) {
    const g = createReadingGeneratorFor(lang);
    assert.equal(g.id, `${lang}-reading-template`, `${lang} 읽기 생성기 라우팅`);
    assert.ok(g.supports(`kc.${lang}.vocab.core`), `${lang} vocab.core 지원`);
    assert.ok(!g.supports(`kc.${lang}.numbers`), `${lang} 미지원 KC skip`);
  }
});

test("생성 지문이 코어 validateReading 통과 + 시드와 중복 없음(규칙 4)", () => {
  for (const lang of ["zh", "ar", "sw", "ja", "hi"]) {
    const g = new MultilingualReadingGenerator(lang);
    const p = g.generate({ lang, kc: `kc.${lang}.vocab.core` });
    assert.ok(p, `${lang} 지문 생성`);
    assert.ok(validateReading(p!), `${lang} validateReading 통과`);
    assert.equal(p!.source.license, "CC-BY-4.0", `${lang} 라이선스`);
    assert.ok(Object.keys(p!.glossary).length > 0, `${lang} 클릭 사전`);
    // 객관식은 정답이 보기 안에 · 주관식(산출)은 보기 없이 정답만
    for (const q of p!.questions ?? []) {
      if (q.options) assert.ok(q.options.includes(q.answer!), `${lang} 객관식 정답 보기 내`);
      else assert.ok(typeof q.answer === "string" && q.answer.length > 0, `${lang} 주관식 정답 존재`);
    }
    // 시드 지문과 본문·id 겹치지 않음(새 주제=시장)
    const seed = seedReadings(lang);
    assert.ok(!seed.some((s: any) => s.id === p!.id || s.text.trim() === p!.text.trim()), `${lang} 새 지문(시드 중복 없음)`);
  }
});

test("결정적: 같은 요청은 같은 지문(규칙 5 파생 재현성)", () => {
  const g = new MultilingualReadingGenerator("hi");
  const a = g.generate({ lang: "hi", kc: "kc.hi.vocab.core" });
  const b = g.generate({ lang: "hi", kc: "kc.hi.vocab.core" });
  assert.deepEqual(a, b, "결정적");
});

const GRADES = ["A1", "A2", "B1", "B2"];

test("등급 다양화: A1·A2·B1·B2 요청 시 각 등급 지문(초급~상급 입력 스펙트럼)", () => {
  for (const lang of ["zh", "ar", "sw", "ja", "hi"]) {
    const g = new MultilingualReadingGenerator(lang);
    const levels = multilingualReadingLevels(lang);
    assert.deepEqual([...levels].sort(), ["A1", "A2", "B1", "B2"], `${lang} 4등급 제공`);
    const passages = GRADES.map((lv) => g.generate({ lang, kc: `kc.${lang}.vocab.core`, level: lv }));
    for (let i = 0; i < GRADES.length; i++) {
      const lv = GRADES[i];
      assert.ok(passages[i] && passages[i]!.level === lv, `${lang} ${lv} 등급 지문`);
      assert.ok(validateReading(passages[i]!), `${lang} ${lv} 검증 통과`);
    }
    // 등급마다 다른 id·본문(중복 아님)
    const ids = new Set(passages.map((p) => p!.id));
    const texts = new Set(passages.map((p) => p!.text));
    assert.equal(ids.size, GRADES.length, `${lang} 등급별 고유 id`);
    assert.equal(texts.size, GRADES.length, `${lang} 등급별 고유 본문`);
    // 진짜 미제공 등급(C1)만 A2로 폴백(널 아님) — B2는 이제 실제 생성됨
    const c1 = g.generate({ lang, kc: `kc.${lang}.vocab.core`, level: "C1" });
    assert.ok(c1 && c1.level === "A2", `${lang} 미제공 등급(C1)은 A2 폴백`);
  }
});

test("B2 지문은 논설체 상급 입력 + 시드 B2(도시생활)와 겹치지 않는 새 주제(과학기술)", () => {
  for (const lang of ["zh", "ar", "sw", "ja", "hi"]) {
    const g = new MultilingualReadingGenerator(lang);
    const b2 = g.generate({ lang, kc: `kc.${lang}.vocab.core`, level: "B2" });
    assert.ok(b2 && b2.level === "B2", `${lang} B2 실제 생성(폴백 아님)`);
    assert.ok(validateReading(b2!), `${lang} B2 검증 통과`);
    // 시드 B2 지문과 본문·id 겹치지 않음
    const seed = seedReadings(lang);
    assert.ok(!seed.some((s: any) => s.id === b2!.id || s.text.trim() === b2!.text.trim()), `${lang} B2 새 주제(시드 중복 없음)`);
    // 상급 논설 — 본문이 A1보다 충분히 길다
    const a1 = g.generate({ lang, kc: `kc.${lang}.vocab.core`, level: "A1" });
    assert.ok(b2!.text.length > a1!.text.length * 2, `${lang} B2 본문이 A1보다 길다(상급)`);
  }
});

test("levels(kc): 지원 KC는 4등급, 미지원 KC는 빈 목록(등급 생성기 식별)", () => {
  const g = new MultilingualReadingGenerator("zh");
  assert.deepEqual([...g.levels("kc.zh.vocab.core")].sort(), ["A1", "A2", "B1", "B2"], "지원 KC 4등급");
  assert.deepEqual(g.levels("kc.zh.numbers"), [], "미지원 KC 빈 목록");
});
