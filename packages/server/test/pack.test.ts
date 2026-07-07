// 언어팩 무결성(다국어·콘텐츠 카테고리). en 시드 팩이 게이트 청정한지 검증.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { makeGraph, assertDAG, promoteVerified } from "../../core/src/index.ts";
import type { ContentItem, KCNode } from "../../core/src/index.ts";

const kcSeed = JSON.parse(readFileSync(new URL("../../packs/en/kc-seed.json", import.meta.url), "utf8")) as KCNode[];
const contentSeed = JSON.parse(readFileSync(new URL("../../packs/en/content-seed.json", import.meta.url), "utf8")) as ContentItem[];
const koI18n = JSON.parse(readFileSync(new URL("../../packs/ko/i18n.json", import.meta.url), "utf8")) as { strings: Record<string, string> };

test("en KC 그래프는 유효한 DAG", () => {
  assert.doesNotThrow(() => assertDAG(makeGraph(kcSeed)));
});

test("모든 콘텐츠의 KC가 kc-seed에 존재 (그래프 정합)", () => {
  const known = new Set(kcSeed.map((n) => n.id));
  for (const item of contentSeed) {
    for (const kc of item.kc) assert.ok(known.has(kc), `미정의 KC 참조: ${kc} (item ${item.id})`);
  }
});

test("en 시드 콘텐츠는 전부 품질 게이트 통과(규칙 4·14)", () => {
  const { verified, rejected } = promoteVerified(contentSeed);
  assert.equal(rejected.length, 0, "반려된 시드 항목: " + rejected.map((r) => r.item.id + "(" + r.reasons.join(";") + ")").join(", "));
  assert.equal(verified.length, contentSeed.length);
  assert.ok(verified.every((v) => v.source.license), "모든 항목 라이선스 보유");
});

test("ko UI 문자열에 다크패턴(손실공포·협박) 문구 없음 (규칙 9)", () => {
  const banned = [/잃|사라|놓치면|지금.?안|끊기|박탈/];
  for (const [key, val] of Object.entries(koI18n.strings)) {
    for (const re of banned) assert.ok(!re.test(val), `다크패턴 의심 문구 (${key}): ${val}`);
  }
});

test("다중 모국어 UI 로케일: 모든 로케일 키가 ko와 동일 + 다크패턴 없음 (규칙 9·11)", () => {
  const kk = Object.keys(koI18n.strings).sort();
  const bannedEn = [/\blose\b|don't miss|miss out|\bhurry\b|expire|streak.*(break|lost)|last chance/i]; // 영문 로케일 손실공포·재촉 금지
  let checked = 0;
  for (const dir of readdirSync(new URL("../../packs/", import.meta.url))) {
    let pack: { strings?: Record<string, string> };
    try { pack = JSON.parse(readFileSync(new URL(`../../packs/${dir}/i18n.json`, import.meta.url), "utf8")); } catch { continue; }
    if (!pack.strings) continue;
    assert.deepEqual(Object.keys(pack.strings).sort(), kk, `${dir} 로케일 키 집합이 ko와 동일(번역 누락/여분 없음)`);
    for (const [key, val] of Object.entries(pack.strings)) for (const re of bannedEn) assert.ok(!re.test(val), `${dir} 다크패턴 의심 (${key}): ${val}`);
    checked++;
  }
  assert.ok(checked >= 4, `UI 로케일 4개 이상 검증(ko·en·es·zh), 실제 ${checked}`);
});
