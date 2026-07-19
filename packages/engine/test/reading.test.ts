// 읽기 지문 자동생성 오케스트레이션 — 검증 통과분만·중복 제거·미지원 스킵(규칙 4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateReadings, generateGradedReadings } from "../src/reading.ts";
import { makeGraph, validateReading } from "../../core/src/index.ts";
import { createDefaultReadingGenerator, MultilingualReadingGenerator, createReadingGeneratorFor } from "../../adapters/src/index.ts";
import type { KCNode } from "../../core/src/index.ts";

const nodes: KCNode[] = [
  { id: "kc.en.present_be", skill: "writing", level: "A1", prereq: [] },
  { id: "kc.en.vocab.core", skill: "reading", level: "A1", prereq: [] },
  { id: "kc.en.unknown", skill: "reading", level: "A1", prereq: [] },
];
const graph = makeGraph(nodes);

test("격차 KC를 읽기 지문으로 메운다(검증 통과분만)", () => {
  const gen = createDefaultReadingGenerator();
  const res = generateReadings(gen, ["kc.en.present_be", "kc.en.vocab.core", "kc.en.unknown"], graph, [], "en");
  assert.equal(res.generated.length, 2, "지원 2 KC 생성");
  assert.ok(res.skipped.includes("kc.en.unknown"), "미지원 KC 스킵");
  assert.ok(res.generated.every((p) => p.questions && p.text.length > 10), "완결된 지문");
});

test("기존 지문과 중복은 생성하지 않는다", () => {
  const gen = createDefaultReadingGenerator();
  const first = generateReadings(gen, ["kc.en.vocab.core"], graph, [], "en").generated;
  const again = generateReadings(gen, ["kc.en.vocab.core"], graph, first, "en");
  assert.equal(again.generated.length, 0, "이미 있는 지문은 재생성 안 함");
});

test("generateGradedReadings: 7개 언어 전부 vocab.core에서 A1~B2 스펙트럼 생성(en·es 포함)", () => {
  for (const lang of ["en", "es", "zh", "ar", "sw", "ja", "hi"]) {
    const gen = createReadingGeneratorFor(lang); // en→영어·es→스페인어·그 외→다국어
    const res = generateGradedReadings(gen, [`kc.${lang}.vocab.core`], [], lang);
    assert.equal(res.generated.length, 4, `${lang} 4등급 생성(A1~B2)`);
    assert.deepEqual(res.generated.map((p) => p.level).sort(), ["A1", "A2", "B1", "B2"], `${lang} 전 등급 포함`);
    assert.ok(res.generated.every((p) => validateReading(p)), `${lang} 전부 검증 통과(규칙 4)`);
    assert.equal(res.rejected.length, 0, `${lang} 반려 0`);
    // 등급별 고유 id·본문
    assert.equal(new Set(res.generated.map((p) => p.id)).size, 4, `${lang} 등급별 고유 id`);
  }
});

test("generateGradedReadings: includeTopics 옵트인 시 대체 주제까지 공급, 기본은 불변(#3)", () => {
  const gen = createReadingGeneratorFor("zh");
  const base = generateGradedReadings(gen, ["kc.zh.vocab.core"], [], "zh");
  assert.equal(base.generated.length, 4, "기본(topics off) 4등급 불변");
  const diverse = generateGradedReadings(gen, ["kc.zh.vocab.core"], [], "zh", ["A1", "A2", "B1", "B2"], { includeTopics: true });
  assert.equal(diverse.generated.length, 6, "다양화 시 zh 6편(기본 4 + A2·B1 대체 주제 2)");
  assert.equal(new Set(diverse.generated.map((p) => p.id)).size, 6, "전부 고유 id(공존)");
  assert.ok(diverse.generated.every((p) => validateReading(p)), "전부 검증 통과(규칙 4)");
  // 멱등: 이미 공급분 재요청 → 0
  const again = generateGradedReadings(gen, ["kc.zh.vocab.core"], diverse.generated, "zh", ["A1", "A2", "B1", "B2"], { includeTopics: true });
  assert.equal(again.generated.length, 0, "다양화도 멱등(중복 재생성 0)");
});

test("generateGradedReadings: 이미 생성된 등급은 재생성 안 함(사이클 간 멱등) — en·ja", () => {
  for (const lang of ["en", "ja"]) {
    const gen = createReadingGeneratorFor(lang);
    const round1 = generateGradedReadings(gen, [`kc.${lang}.vocab.core`], [], lang).generated;
    assert.equal(round1.length, 4, `${lang} 1라운드 4등급`);
    const round2 = generateGradedReadings(gen, [`kc.${lang}.vocab.core`], round1, lang);
    assert.equal(round2.generated.length, 0, `${lang} 2라운드 전부 중복 → 0(멱등)`);
  }
});
