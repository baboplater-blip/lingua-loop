// 생성/큐레이션 콘텐츠 발행 — 게이트 통과분만 서빙(규칙 4), 학습효과 강등(규칙 1), 영속·보호.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { newStore, ingest, publishContent, publishReading, publishedBank, publishedReadings, deleteLearner, exportLearner, PUBLISHED_REF } from "../src/handlers.ts";
import { openFileStore } from "../src/persist.ts";

const item = (id: string, over = {}) => ({ id, lang: "en", type: "flashcard" as const, kc: ["kc.en.vocab.core"], level: "A1" as const, prompt: id + " 뜻은?", answer: { value: "x" }, distractors: [], difficulty: null, discrimination: null, quality: "draft" as const, source: { kind: "generated" as const, license: "CC-BY-4.0" }, meta: { schemaVersion: 1 }, ...over });
const passage = (id: string) => ({ id, level: "A1" as const, kc: ["kc.en.vocab.core"], title: id, text: "This is a generated graded passage for reading.", glossary: { generated: "생성된" }, questions: [{ q: "?", answer: "a", options: ["a", "b"] }], source: { kind: "generated" as const, license: "CC-BY-4.0" } });

test("발행: 게이트 통과분만 서빙 뱅크에(규칙 4)", () => {
  const store = newStore();
  const ok = publishContent(store, item("pub.ok"));
  assert.ok(ok.published);
  assert.equal(publishedBank(store, "en").length, 1, "발행분 서빙");
  assert.equal(publishedBank(store, "en")[0].quality, "verified", "verified 로 노출");

  const bad = publishContent(store, item("pub.bad", { source: { kind: "generated", license: "" } }));
  assert.ok(!bad.published, "라이선스 누락 → 발행 거부");
  assert.equal(publishedBank(store, "en").length, 1, "불량은 서빙 안 됨");
});

test("발행 콘텐츠도 학습효과로 강등된다(규칙 1)", () => {
  const store = newStore();
  publishContent(store, item("pub.weak"));
  // 역변별 사용 데이터(강한 학습자 오답·약한 학습자 정답) + 앵커로 능력차
  const strong = Array.from({ length: 12 }, (_, i) => "s" + i), weak = Array.from({ length: 12 }, (_, i) => "w" + i);
  const resp = (l: string, it: string, correct: boolean, i: number) => ingest(store, { learnerRef: l, type: "item.response", kc: ["kc.en.vocab.core"], itemId: it, payload: { correct }, ts: `2026-07-05T00:00:0${i % 10}.000Z` });
  for (const a of ["a1", "a2"]) { for (const s of strong) resp(s, a, true, 1); for (const w of weak) resp(w, a, false, 2); }
  for (const s of strong) resp(s, "pub.weak", false, 3); for (const w of weak) resp(w, "pub.weak", true, 4);
  assert.equal(publishedBank(store, "en").length, 0, "역변별(망가진) 발행분은 서빙에서 강등 제외");
});

test("발행 읽기 지문 — 언어 필터", () => {
  const store = newStore();
  assert.ok(publishReading(store, passage("pub.read.en"), "en").published);
  assert.ok(!publishReading(store, { ...passage("pub.read.bad"), text: "짧음" }, "en").published, "검증 실패 지문 거부");
  assert.equal(publishedReadings(store, "en").length, 1, "en 발행 지문");
  assert.equal(publishedReadings(store, "es").length, 0, "다른 언어 제외");
});

const DIR = join(tmpdir(), "lingua-loop-publish-test");
test("발행은 재시작 후에도 유지(규칙 5)", () => {
  rmSync(DIR, { recursive: true, force: true });
  const s1 = openFileStore(DIR);
  publishContent(s1, item("pub.keep"));
  s1.close?.();
  const s2 = openFileStore(DIR);
  assert.equal(publishedBank(s2, "en").length, 1, "재시작 후 발행분 복원");
  s2.close?.();
});

test("발행 로그는 개인 계정 삭제로 지워지지 않는다(보호)", () => {
  const store = newStore();
  publishContent(store, item("pub.prot"));
  assert.equal(deleteLearner(store, PUBLISHED_REF), false);
  assert.ok(exportLearner(store, PUBLISHED_REF).length >= 1, "발행 로그 보존");
});

after(() => rmSync(DIR, { recursive: true, force: true }));
