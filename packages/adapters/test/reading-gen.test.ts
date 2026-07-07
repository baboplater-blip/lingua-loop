// 읽기 지문 생성기(pluggable, 오프라인). 생성물은 코어 validateReading 통과분(규칙 4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDefaultReadingGenerator, EnglishReadingGenerator } from "../src/index.ts";
import { validateReading, scoreComprehension } from "../../core/src/index.ts";

const seedReadings = (lang: string) => JSON.parse(readFileSync(new URL(`../../packs/${lang}/reading.json`, import.meta.url), "utf8")).passages;
const EN_GRADES = ["A1", "A2", "B1", "B2"];

test("지원 KC → 검증 통과하는 이해가능한 입력 지문 생성", () => {
  const gen = createDefaultReadingGenerator();
  for (const kc of ["kc.en.present_be", "kc.en.present_simple", "kc.en.vocab.core", "kc.en.articles"]) {
    assert.ok(gen.supports(kc), "지원: " + kc);
    const p = gen.generate({ lang: "en", kc });
    assert.ok(p, "생성됨: " + kc);
    assert.ok(validateReading(p), "validateReading 통과(규칙 4): " + kc);
    assert.ok(Object.keys(p.glossary).length >= 3, "클릭 사전 어휘: " + kc);
    assert.ok(p.questions && p.questions.length >= 1, "이해 문항: " + kc);
    assert.deepEqual(p.kc, [kc], "KC 태깅");
  }
});

test("미지원 KC → null(억지 생성 금지)", () => {
  const gen = new EnglishReadingGenerator();
  assert.equal(gen.supports("kc.en.subjunctive"), false);
  assert.equal(gen.generate({ lang: "en", kc: "kc.en.subjunctive" }), null);
});

test("결정적 id — 같은 KC는 같은 지문 id(중복 제거 가능)", () => {
  const gen = createDefaultReadingGenerator();
  const a = gen.generate({ lang: "en", kc: "kc.en.vocab.core" });
  const b = gen.generate({ lang: "en", kc: "kc.en.vocab.core" });
  assert.equal(a?.id, b?.id);
});

test("등급 다양화: vocab.core는 A1~B2 4등급, 미제공 등급(C1)만 폴백 없이 null", () => {
  const gen = new EnglishReadingGenerator();
  assert.deepEqual([...gen.levels("kc.en.vocab.core")].sort(), ["A1", "A2", "B1", "B2"], "vocab.core 4등급");
  assert.deepEqual(gen.levels("kc.en.present_be"), [], "단일 KC는 등급 목록 빈값");
  const passages = EN_GRADES.map((lv) => gen.generate({ lang: "en", kc: "kc.en.vocab.core", level: lv }));
  for (let i = 0; i < EN_GRADES.length; i++) {
    assert.ok(passages[i] && passages[i]!.level === EN_GRADES[i], `en ${EN_GRADES[i]} 등급 지문`);
    assert.ok(validateReading(passages[i]!), `en ${EN_GRADES[i]} 검증 통과`);
  }
  assert.equal(new Set(passages.map((p) => p!.id)).size, 4, "등급별 고유 id");
  assert.equal(new Set(passages.map((p) => p!.text)).size, 4, "등급별 고유 본문");
  assert.equal(gen.generate({ lang: "en", kc: "kc.en.vocab.core", level: "C1" }), null, "미제공 등급 C1은 null(억지 생성 금지)");
});

test("B2 논설 = 상급 입력 + 시드 B2와 겹치지 않는 새 주제(책/독서)", () => {
  const gen = new EnglishReadingGenerator();
  const b2 = gen.generate({ lang: "en", kc: "kc.en.vocab.core", level: "B2" })!;
  assert.equal(b2.level, "B2", "B2 실제 생성(폴백 아님)");
  assert.ok(validateReading(b2), "B2 검증 통과");
  const seed = seedReadings("en");
  assert.ok(!seed.some((s: any) => s.id === b2.id || s.text.trim() === b2.text.trim()), "시드 B2 중복 없음");
  const a1 = gen.generate({ lang: "en", kc: "kc.en.vocab.core", level: "A1" })!;
  assert.ok(b2.text.length > a1.text.length * 1.8, "B2 본문이 A1보다 충분히 김(상급)");
});

test("단일 등급 KC는 자기 등급에서만 생성(등급 불일치 시 null — 등급 루프 오생성 방지)", () => {
  const gen = new EnglishReadingGenerator();
  assert.ok(gen.generate({ lang: "en", kc: "kc.en.present_be", level: "A1" }), "present_be는 A1에서 생성");
  assert.equal(gen.generate({ lang: "en", kc: "kc.en.present_be", level: "B2" }), null, "present_be를 B2로 요구하면 null");
  assert.ok(gen.generate({ lang: "en", kc: "kc.en.present_be" }), "등급 미지정은 자기 등급으로 생성");
});

test("등급 생성 지문은 산출(주관식) 문항을 포함하고 서버 채점된다", () => {
  const gen = new EnglishReadingGenerator();
  const p = gen.generate({ lang: "en", kc: "kc.en.vocab.core", level: "B1" })!; // 2문항 → 마지막 주관식
  assert.ok(validateReading(p), "검증 통과");
  const free = (p.questions ?? []).find((q) => !q.options);
  assert.ok(free, "주관식(산출) 문항 포함");
  const idx = p.questions!.indexOf(free!);
  assert.equal(scoreComprehension(p, idx, free!.answer as string)!.correct, true, "정답 채점");
});
