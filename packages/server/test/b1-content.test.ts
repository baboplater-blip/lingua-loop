// B1 문법 KC 학습 콘텐츠 — 배치고사에만 있던 신설 B1 KC(了·과거·-li-·て형·후치사)를
// /next 로 실제 학습 가능하게(규칙 4·11). 각 KC ≥2 문항·게이트 통과·목표어 문자 보존.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { promoteVerified } from "../../core/src/index.ts";

const seed = (lang: string) => JSON.parse(readFileSync(new URL(`../../packs/${lang}/content-seed.json`, import.meta.url), "utf8"));

// 언어 → 신설 B1 문법 KC
const B1_KC: Record<string, string> = {
  zh: "kc.zh.aspect_le",
  ar: "kc.ar.past_tense",
  sw: "kc.sw.tense_li",
  ja: "kc.ja.te_form",
  hi: "kc.hi.postpositions",
};

test("신설 B1 문법 KC마다 학습 콘텐츠 ≥2 (평가 가능→학습 가능, 진화 격차 아님)", () => {
  for (const [lang, kc] of Object.entries(B1_KC)) {
    const { verified, rejected } = promoteVerified(seed(lang));
    assert.equal(rejected.length, 0, `${lang} 시드 반려 0: ${rejected.map((r: any) => r.item.id).join(",")}`);
    const forKc = verified.filter((i: any) => i.kc.includes(kc));
    // minItems=2 이상이라야 진화 폐루프가 콘텐츠 격차로 보지 않음(스스로 채워질 필요 없음)
    assert.ok(forKc.length >= 2, `${lang} ${kc} 학습 문항 ≥2 (실제: ${forKc.length})`);
    assert.ok(forKc.every((i: any) => i.level === "B1"), `${lang} ${kc} 문항 B1 등급`);
    // flashcard·mcq 두 유형 모두 — 인지+생산 균형
    const types = new Set(forKc.map((i: any) => i.type));
    assert.ok(types.has("flashcard") && types.has("mcq"), `${lang} ${kc} flashcard+mcq 균형`);
  }
});

// 언어 → 신설 B2 문법 KC(得·가능형·능격·أن·연관)
const B2_KC: Record<string, string> = {
  zh: "kc.zh.de_complement",
  ja: "kc.ja.potential",
  hi: "kc.hi.ergative_ne",
  ar: "kc.ar.subjunctive_an",
  sw: "kc.sw.association_cha",
};

test("신설 B2 문법 KC마다 학습 콘텐츠 ≥2 + B2 등급(상급 경로도 학습 가능)", () => {
  for (const [lang, kc] of Object.entries(B2_KC)) {
    const { verified, rejected } = promoteVerified(seed(lang));
    assert.equal(rejected.length, 0, `${lang} 시드 반려 0`);
    const forKc = verified.filter((i: any) => i.kc.includes(kc));
    assert.ok(forKc.length >= 2, `${lang} ${kc} 학습 문항 ≥2 (실제: ${forKc.length})`);
    assert.ok(forKc.every((i: any) => i.level === "B2"), `${lang} ${kc} 문항 B2 등급`);
    const types = new Set(forKc.map((i: any) => i.type));
    assert.ok(types.has("flashcard") && types.has("mcq"), `${lang} ${kc} flashcard+mcq 균형`);
  }
});

// en·es B1/B2 문법 KC(배치가 참조하던 것) — 이제 학습 콘텐츠까지 대칭
const EN_ES_GRAMMAR: Record<string, string[]> = {
  en: ["kc.en.present_perfect", "kc.en.conditional", "kc.en.relative"],
  es: ["kc.es.preterite", "kc.es.subjunctive"],
};

test("en·es B1/B2 문법 KC마다 학습 콘텐츠 ≥2 (수요 큰 두 언어 대칭)", () => {
  for (const [lang, kcs] of Object.entries(EN_ES_GRAMMAR)) {
    const { verified, rejected } = promoteVerified(seed(lang));
    assert.equal(rejected.length, 0, `${lang} 시드 반려 0`);
    for (const kc of kcs) {
      const forKc = verified.filter((i: any) => i.kc.includes(kc));
      assert.ok(forKc.length >= 2, `${lang} ${kc} 학습 문항 ≥2 (실제: ${forKc.length})`);
      const types = new Set(forKc.map((i: any) => i.type));
      assert.ok(types.has("flashcard") && types.has("mcq"), `${lang} ${kc} flashcard+mcq 균형`);
    }
  }
});

test("B1 문법 문항이 목표어 문자를 보존(문자 무관 규칙 11)", () => {
  const hasScript: Record<string, RegExp> = {
    zh: /[一-鿿]/, // 한자
    ar: /[؀-ۿ]/, // 아랍
    sw: /[a-z]/i, // 라틴
    ja: /[ぁ-ヿ一-鿿]/, // 가나·한자
    hi: /[ऀ-ॿ]/, // 데바나가리
  };
  for (const [lang, kc] of Object.entries(B1_KC)) {
    const { verified } = promoteVerified(seed(lang));
    const forKc = verified.filter((i: any) => i.kc.includes(kc));
    assert.ok(forKc.some((i: any) => hasScript[lang].test(i.answer.value)), `${lang} ${kc} 정답에 목표어 문자`);
  }
});
