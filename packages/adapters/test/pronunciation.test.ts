// 발음 어댑터(pluggable). 오프라인 로컬 스코어러: 전사=객관채점 / 자가평가=습관화. 규칙 12·13.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDefaultPronunciationScorer, LocalPhoneticScorer } from "../src/index.ts";

test("전사가 있으면 객관 채점(mode=asr) + 음소별 피드백", async () => {
  const s = createDefaultPronunciationScorer();
  const r = await s.score({ targetIPA: ["θ", "ɪ", "ŋ", "k"], producedIPA: ["s", "ɪ", "ŋ", "k"], word: "think" });
  assert.equal(r.mode, "asr");
  assert.ok(r.score > 0.9, "사소한 오류 고득점");
  assert.equal(r.intelligibility, 1, "명료도 유지");
  assert.equal(r.errors.length, 1, "θ→s 오류 1건");
  assert.ok(r.hints.length >= 1, "교정 힌트 제공");
});

test("운율 통합: 강세가 틀리면 종합 점수·명료도가 떨어진다", async () => {
  const s = createDefaultPronunciationScorer();
  const target = ["b", "ə", "n", "æ", "n", "ə"]; // banana
  const good = await s.score({ targetIPA: target, producedIPA: target, targetStress: [0, 1, 0], producedStress: [0, 1, 0] });
  const badStress = await s.score({ targetIPA: target, producedIPA: target, targetStress: [0, 1, 0], producedStress: [1, 0, 0] });
  assert.ok(good.prosody && good.prosody.stress === 1, "올바른 강세 만점");
  assert.ok(badStress.prosody && badStress.prosody.stress < 0.5, "틀린 강세 감점");
  assert.ok(badStress.score < good.score, "강세 오류가 종합 점수 낮춤");
  assert.ok(badStress.intelligibility <= 0.75, "주강세 오류는 명료도 손실");
  assert.ok(badStress.hints.some((h) => h.includes("강세")), "강세 힌트 제공");
});

test("성조어: 성조가 틀리면 명료도가 크게 떨어진다(다른 단어)", async () => {
  const s = createDefaultPronunciationScorer();
  const target = ["m", "a"]; // ma
  const good = await s.score({ targetIPA: target, producedIPA: target, targetTones: [3], producedTones: [3] });
  const badTone = await s.score({ targetIPA: target, producedIPA: target, targetTones: [3], producedTones: [1] }); // mǎ→mā
  assert.ok(good.prosody && good.prosody.tone === 1, "올바른 성조 만점");
  assert.ok(badTone.prosody && badTone.prosody.tone === 0, "틀린 성조 0점");
  assert.ok(badTone.intelligibility < good.intelligibility, "성조 오류가 명료도 크게 낮춤");
  assert.ok(badTone.hints.some((h) => h.includes("성조")), "성조 힌트");
});

test("전사가 없으면 섀도잉 자가평가(mode=self)로 환산", async () => {
  const s = new LocalPhoneticScorer();
  const easy = await s.score({ targetIPA: ["p", "e", "rr", "o"], selfGrade: "easy", word: "perro" });
  const again = await s.score({ targetIPA: ["p", "e", "rr", "o"], selfGrade: "again", word: "perro" });
  assert.equal(easy.mode, "self");
  assert.ok(easy.score > again.score, "자가평가가 점수에 반영");
  assert.ok(easy.note && easy.note.includes("자가평가"), "자가평가임을 투명히 안내");
});

test("스코어러는 원음성(오디오)을 받지 않는다 — 인터페이스가 전사/자가평가만 노출(규칙 6·8)", async () => {
  const s = createDefaultPronunciationScorer();
  const r = await s.score({ targetIPA: ["a"], selfGrade: "good" });
  // 요청/응답 어디에도 audio 필드가 없다(전사·점수만)
  assert.ok(!("audio" in (r as Record<string, unknown>)), "결과에 오디오 없음");
});
