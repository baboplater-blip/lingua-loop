// RTL·아랍 문자(아랍어 ar) — 다국어 범용(표기 방향까지 데이터가 결정) 재실증. 같은 코어·서버가 ar를 데이터만으로 처리(규칙 11).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { promoteVerified } from "../../core/src/index.ts";
import { newStore, placementStep, scorePronunciation } from "../src/handlers.ts";
import { createDefaultPronunciationScorer, createTutorFor } from "../../adapters/src/index.ts";

const read = (f: string) => JSON.parse(readFileSync(new URL(`../../packs/ar/${f}`, import.meta.url), "utf8"));
const hasArabic = (s: string) => /[؀-ۿ]/.test(s); // 아랍 문자 블록

test("ar 팩 메타: 표기 방향이 rtl (방향까지 데이터가 결정, 규칙 11)", () => {
  const meta = read("pack.json");
  assert.equal(meta.lang, "ar");
  assert.equal(meta.direction, "rtl", "아랍어=RTL");
  assert.equal(meta.script, "arabic");
});

test("ar 시드 콘텐츠가 코어 게이트를 통과 + 아랍 문자 보존(규칙 4·11)", () => {
  const seed = read("content-seed.json");
  const { verified, rejected } = promoteVerified(seed);
  assert.equal(rejected.length, 0, "반려: " + rejected.map((r: any) => r.item.id).join(","));
  assert.ok(verified.length >= 3, "ar 콘텐츠 통과");
  assert.ok(verified.every((i: any) => i.lang === "ar"), "ar 언어");
  assert.ok(verified.some((i: any) => hasArabic(i.answer.value)), "정답에 아랍 문자 보존");
});

test("ar 음운: 자음 최소대립쌍(q/k, ص/س) + 강세(운율)", () => {
  const phon = read("phonology.json");
  assert.ok(phon.minimalPairs.length >= 2, "최소대립쌍 2쌍 이상");
  assert.ok(phon.minimalPairs.every((mp: any) => Array.isArray(mp.a.ipa) && Array.isArray(mp.b.ipa)), "IPA 배열");
  assert.ok(phon.minimalPairs.some((mp: any) => hasArabic(mp.a.word)), "아랍 문자 단어");
  // 성조어가 아니므로 tone 없음 — 산출은 강세(stress)로 채점
  assert.ok(phon.prosody.every((p: any) => p.stress && p.stress.length === p.syllables.length), "강세 음절 일치");
  assert.ok(phon.minimalPairs.every((mp: any) => !mp.a.tone && !mp.b.tone), "성조 없음(강세 언어)");
});

test("ar 배치고사: 같은 CAT 엔진(규칙 11)", () => {
  const s = placementStep(read("placement.json"), []);
  assert.ok(s.next && s.next.id.startsWith("plc.ar"), "ar 배치 문항");
});

test("발음 채점: 같은 서버가 ar 강세를 평가(q/k 자음 대비)", async () => {
  const store = newStore();
  const scorer = createDefaultPronunciationScorer();
  // qalb(심장) 목표를 kalb(개)로 산출 → 다른 단어라 명료도 손실
  const res = await scorePronunciation(store, scorer, { learnerRef: "a1", kc: "kc.ar.sounds", targetIPA: ["q", "a", "l", "b"], producedIPA: ["k", "a", "l", "b"], word: "قلب" });
  assert.ok(typeof res.score === "number", "점수 산출");
  assert.ok(res.intelligibility < 1, "자음 오류 → 명료도 손실");
});

test("ar 튜터: 전용 교정(성 일치) + 아랍어 후속 질문", async () => {
  const t = createTutorFor("ar");
  // 여성명사 مدينة(도시) + 남성형 형용사 كبير → 여성형 كبيرة
  const r = await t.respond({ message: "مدينة كبير", history: [], targetLang: "ar", level: "A1" });
  assert.ok(r.corrections.some((c: any) => c.errorTag === "gender-agreement"), "성 일치 교정(형용사 여성형)");
  assert.ok(/؟|ما|أين|ماذا/.test(r.text), "아랍어로 대화 유도");
});
