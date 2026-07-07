// 성조어(중국어 zh) — 다국어 범용(CJK·성조) 재실증. 같은 코어·서버가 zh를 데이터만으로 처리(규칙 11).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { promoteVerified } from "../../core/src/index.ts";
import { newStore, placementStep, scorePronunciation } from "../src/handlers.ts";
import { createDefaultPronunciationScorer, createTutorFor } from "../../adapters/src/index.ts";

const read = (f: string) => JSON.parse(readFileSync(new URL(`../../packs/zh/${f}`, import.meta.url), "utf8"));

test("zh 시드 콘텐츠가 코어 게이트를 통과(규칙 4·11)", () => {
  const { verified } = promoteVerified(read("content-seed.json"));
  assert.ok(verified.length >= 3, "zh 콘텐츠 통과");
  assert.ok(verified.every((i: any) => i.lang === "zh"), "zh 언어");
});

test("zh 음운: 성조 최소대립쌍 + 성조 패턴(prosody)", () => {
  const phon = read("phonology.json");
  assert.ok(phon.minimalPairs.every((mp: any) => mp.a.tone && mp.b.tone), "성조 대립쌍");
  assert.ok(phon.prosody.every((p: any) => p.tones && p.tones.length === p.syllables.length), "성조 패턴 음절 일치");
});

test("zh 배치고사: 같은 CAT 엔진(규칙 11)", () => {
  const s = placementStep(read("placement.json"), []);
  assert.ok(s.next && s.next.id.startsWith("plc.zh"), "zh 배치 문항");
});

test("성조 채점: 같은 서버가 zh 성조를 평가(prosody.tone)", async () => {
  const store = newStore();
  const scorer = createDefaultPronunciationScorer();
  const res = await scorePronunciation(store, scorer, { learnerRef: "z1", kc: "kc.zh.tones", targetIPA: ["m", "a"], producedIPA: ["m", "a"], targetTones: [3], producedTones: [1], word: "mǎ" });
  assert.ok(res.prosody && typeof res.prosody.tone === "number", "성조 점수 산출");
  assert.ok(res.intelligibility < 1, "성조 오류 → 명료도 손실");
});

test("zh 튜터: 중국어 전용 교정(성조/병음·是+형용사) + 중국어 후속 질문", async () => {
  const t = createTutorFor("zh");
  const r = await t.respond({ message: "我是高", history: [], targetLang: "zh", level: "A1" });
  assert.ok(r.corrections.some((c: any) => c.errorTag === "shi-adjective"), "是+형용사 교정(→很)");
  assert.ok(/[，。！？你什么]/.test(r.text), "중국어로 대화 유도");
  // 병음(무성조 로마자) → 한자+성조 리캐스트
  const r2 = await t.respond({ message: "wo shi laoshi", history: [], targetLang: "zh", level: "A1" });
  assert.ok(r2.corrections.some((c: any) => c.errorTag === "tone-pinyin"), "성조 교정");
  assert.ok(r2.corrections.length === 0 || r2.text.includes("老师"), "한자+성조 제시");
});
