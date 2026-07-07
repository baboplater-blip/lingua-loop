// 발음 채점 핸들러 + 언어팩 음운 데이터. 원음성 미수신·특징만 로깅(규칙 6·8), 다국어(규칙 11).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newStore, scorePronunciation, exportLearner } from "../src/handlers.ts";
import { createDefaultPronunciationScorer } from "../../adapters/src/index.ts";

test("발음 채점 → speak.attempt 로 append-only 로깅(특징만, 오디오 없음)", async () => {
  const store = newStore();
  const scorer = createDefaultPronunciationScorer();
  const res = await scorePronunciation(store, scorer, {
    learnerRef: "p1", kc: "kc.en.phon.th", itemId: "think",
    targetIPA: ["θ", "ɪ", "ŋ", "k"], producedIPA: ["s", "ɪ", "ŋ", "k"], word: "think",
  });
  assert.ok(res.score > 0.9);
  const evs = exportLearner(store, "p1");
  assert.equal(evs.length, 1, "이벤트 1건 로깅");
  assert.equal(evs[0].type, "speak.attempt");
  assert.equal(evs[0].payload.mode, "asr");
  assert.ok(Array.isArray(evs[0].payload.errorTags), "오류 태그(특징) 로깅");
  assert.ok(!("audio" in evs[0].payload), "원음성(오디오)은 저장하지 않음");
});

test("오프라인 섀도잉 자가평가도 이벤트로 남는다", async () => {
  const store = newStore();
  const scorer = createDefaultPronunciationScorer();
  const res = await scorePronunciation(store, scorer, {
    learnerRef: "p2", kc: "kc.es.phon.rr", targetIPA: ["p", "e", "rr", "o"], selfGrade: "good", word: "perro",
  });
  assert.equal(res.mode, "self");
  assert.equal(exportLearner(store, "p2").length, 1);
});

test("신설 B1 문법 KC가 발음 데이터로 연계된다(발음 축도 B1까지, 규칙 11)", () => {
  // 了·과거·-li-·て형·후치사의 발음 형태가 shadow/prosody/minimalPairs 중 하나에 있어야.
  const B1 = { zh: "kc.zh.aspect_le", ar: "kc.ar.past_tense", sw: "kc.sw.tense_li", ja: "kc.ja.te_form", hi: "kc.hi.postpositions" } as Record<string, string>;
  for (const [lang, kc] of Object.entries(B1)) {
    const phon = JSON.parse(readFileSync(new URL(`../../packs/${lang}/phonology.json`, import.meta.url), "utf8"));
    const inSection = (arr: any[]) => (arr ?? []).some((e) => e.kc === kc);
    assert.ok(inSection(phon.shadow) || inSection(phon.prosody) || inSection(phon.minimalPairs), `${lang} B1 KC(${kc}) 발음 연계`);
    // 연계 항목도 스키마 준수: prosody는 음절·(성조/강세) 길이 일치
    for (const p of (phon.prosody ?? []).filter((x: any) => x.kc === kc)) {
      const arr = lang === "zh" ? p.tones : p.stress;
      assert.ok(p.syllables && arr && p.syllables.length === arr.length, `${lang} B1 운율 길이 일치: ${p.word}`);
    }
  }
});

test("언어팩 음운 데이터가 채점 가능한 IPA 목표열을 담는다(5개 언어, 규칙 11)", () => {
  // 라틴(en·es·sw)·CJK/성조(zh)·RTL/아랍(ar) 전부 채점 가능한 밀도 — 운율은 성조(zh) 또는 강세(그 외)로 분기
  for (const lang of ["en", "es", "zh", "ar", "sw"]) {
    const phon = JSON.parse(readFileSync(new URL(`../../packs/${lang}/phonology.json`, import.meta.url), "utf8"));
    assert.ok(phon.minimalPairs.length >= 3, `${lang} 최소대립쌍 3쌍 이상`);
    assert.ok(phon.shadow.length >= 3, `${lang} 섀도잉 타깃 3개 이상`);
    for (const mp of phon.minimalPairs) {
      assert.ok(Array.isArray(mp.a.ipa) && mp.a.ipa.length > 0, `${lang} 최소대립쌍 IPA(a)`);
      assert.ok(Array.isArray(mp.b.ipa) && mp.b.ipa.length > 0, `${lang} 최소대립쌍 IPA(b)`);
    }
    for (const sh of phon.shadow) assert.ok(Array.isArray(sh.ipa) && sh.word && sh.gloss, `${lang} 섀도잉 항목 완결`);
    assert.ok(phon.prosody && phon.prosody.length >= 3, `${lang} 운율 항목 3개 이상`);
    for (const p of phon.prosody) {
      const prosArr = lang === "zh" ? p.tones : p.stress; // 성조어는 tones, 강세어는 stress
      assert.ok(p.syllables && prosArr && p.syllables.length === prosArr.length, `${lang} 운율 음절·(성조/강세) 길이 일치: ${p.word}`);
      if (lang !== "zh") assert.ok(p.stress.some((s: number) => s >= 1), `${lang} 주강세 존재: ${p.word}`);
    }
  }
});
