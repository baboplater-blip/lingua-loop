// 음성학 채점 엔진(언어 무관). 자질거리·정렬채점·명료도 우선(규칙 1) 검증.
import { test } from "node:test";
import assert from "node:assert/strict";
import { featureDistance, scorePronunciation, articulationHint, stressScore, toneScore } from "../src/phonetics.ts";

test("자질거리: 동일=0, 가까운 대립<먼 대립, C↔V=최대", () => {
  assert.equal(featureDistance("s", "s"), 0);
  // θ vs s (치/치경 마찰 무성) 은 가까움; θ vs a (자음 vs 모음) 은 최대
  const thS = featureDistance("θ", "s");
  assert.ok(thS > 0 && thS < 0.2, "θ~s 는 작은 거리");
  assert.equal(featureDistance("θ", "a"), 1, "자음-모음 최대 거리");
  // 유성만 다른 s/z
  assert.ok(Math.abs(featureDistance("s", "z") - 0.2) < 1e-9, "유성 차이 0.2");
  // r(탄설) vs rr(전동) 은 혼동 가능 — 작은 거리
  assert.ok(featureDistance("r", "rr") < featureDistance("r", "l"), "r~rr < r~l");
  assert.equal(featureDistance("q", "z"), 1, "모르는 기호는 최대 거리");
});

test("발음 점수: 완벽=1, 사소한 오류는 명료도 유지(θ→s), 누락은 크게 감점", () => {
  const target = ["θ", "ɪ", "ŋ", "k"]; // think
  const perfect = scorePronunciation(target, target);
  assert.equal(perfect.score, 1);
  assert.equal(perfect.intelligibility, 1);
  assert.equal(perfect.errors.length, 0);

  const minor = scorePronunciation(target, ["s", "ɪ", "ŋ", "k"]); // sink
  assert.ok(minor.score > 0.9, "사소한 대립은 점수 높게");
  assert.equal(minor.intelligibility, 1, "θ→s 혼동은 여전히 알아들을 만 — 명료도 우선");
  assert.equal(minor.errors.length, 1);

  const dropped = scorePronunciation(target, ["ɪ", "ŋ", "k"]); // 음소 누락
  assert.ok(dropped.score < minor.score, "누락은 사소한 대치보다 낮은 점수");
  assert.ok(dropped.intelligibility < 1, "누락은 명료도 감소");

  const gross = scorePronunciation(["θ"], ["ɑ"]); // 완전히 다른 소리
  assert.equal(gross.score, 0);
  assert.equal(gross.intelligibility, 0);
});

test("운율(강세): 주강세 위치 일치가 점수를 좌우한다", () => {
  assert.equal(stressScore([0, 1, 0], [0, 1, 0]).score, 1, "동일 강세 = 만점");
  const wrong = stressScore([1, 0, 0], [0, 1, 0]); // PHOto→phoTO
  assert.ok(!wrong.primaryMatch, "주강세 불일치 감지");
  assert.ok(wrong.score < 0.5, "주강세 틀리면 크게 감점");
  assert.ok(wrong.note && wrong.note.includes("강세"), "강세 위치 힌트");
  assert.equal(stressScore([], []).score, 1, "강세 정보 없으면 무영향");
  assert.doesNotThrow(() => stressScore([1, 0, 0], undefined as never), "산출 누락(undefined) 크래시 방지");
  assert.equal(stressScore([1, 0, 0], undefined as never).primaryMatch, false, "산출 없으면 미일치 처리");
});

test("성조(성조어): 음절별 성조 범주 일치", () => {
  assert.equal(toneScore([1, 2], [1, 2]).score, 1, "성조 일치 = 만점");
  const wrong = toneScore([3, 3], [1, 3]); // nǐhǎo → nīhǎo (1음절 성조 틀림)
  assert.equal(wrong.score, 0.5, "절반 일치");
  assert.ok(wrong.note && wrong.note.includes("1"), "틀린 음절 지목");
  assert.equal(toneScore([], []).score, 1, "성조 정보 없으면 무영향");
});

test("조음 힌트: 오류 유형에 맞는 구체 지시", () => {
  assert.ok(articulationHint("rr", "r").includes("전동") || articulationHint("rr", "r").includes("떨"), "rr 목표면 전동음 힌트");
  assert.ok(typeof articulationHint("θ", "s") === "string" && articulationHint("θ", "s").length > 0, "θ↔s 힌트 존재");
  // 유성/무성
  assert.ok(articulationHint("b", "p").includes("유성"), "b 목표면 유성음 힌트");
});
