// 다국어 범용(규칙 11): 코어 코드를 한 줄도 안 바꾸고 언어팩(데이터)만으로 새 언어를 지원하는가.
// en·es 두 팩에 대해 동일 코어 경로가 동일하게 동작함을 검증.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeGraph, assertDAG, promoteVerified } from "../../core/src/index.ts";
import { newStore, ingest, stateOf, serveItems, loadGraph } from "../src/handlers.ts";
import type { ContentItem, KCNode } from "../../core/src/index.ts";

const LANGS = ["en", "es", "ar", "sw", "ja", "hi"]; // ar=RTL·아랍, sw=반투어, ja=가나·한자·조사, hi=데바나가리 abugida·성 — 전부 코드 변경 없이 데이터만으로(규칙 11)

function load(lang: string): { kc: KCNode[]; seed: ContentItem[] } {
  const kc = JSON.parse(readFileSync(new URL(`../../packs/${lang}/kc-seed.json`, import.meta.url), "utf8")) as KCNode[];
  const seed = JSON.parse(readFileSync(new URL(`../../packs/${lang}/content-seed.json`, import.meta.url), "utf8")) as ContentItem[];
  return { kc, seed };
}

for (const lang of LANGS) {
  test(`[${lang}] 언어팩 무결성: DAG·KC정합·게이트 청정(규칙 4·14)`, () => {
    const { kc, seed } = load(lang);
    assert.doesNotThrow(() => assertDAG(makeGraph(kc)));
    const known = new Set(kc.map((n) => n.id));
    for (const it of seed) for (const k of it.kc) assert.ok(known.has(k), `${lang}: 미정의 KC ${k}`);
    const { verified, rejected } = promoteVerified(seed);
    assert.equal(rejected.length, 0, `${lang} 반려: ${rejected.map((r) => r.item.id).join(",")}`);
    assert.equal(verified.length, seed.length);
    assert.ok(verified.every((v) => v.source.license), `${lang}: 라이선스 보유`);
  });
}

test("범용성(규칙 11): 동일 코어 코드 경로가 en·es 학습을 동일하게 처리", () => {
  for (const lang of LANGS) {
    const { kc, seed } = load(lang);
    const graph = loadGraph(kc);
    const { verified } = promoteVerified(seed);
    const store = newStore();
    const item = verified[0];
    ingest(store, { learnerRef: "u", type: "item.response", kc: item.kc, itemId: item.id, payload: { correct: true, grade: "good" } });
    const state = stateOf(store, "u", lang);
    assert.equal(state.kcState[item.kc[0]].reps, 1, `${lang} 상태 파생 동일`);
    assert.ok(serveItems(store, "u", lang, graph, verified).every((i) => i.quality !== "draft"), `${lang} verified만 서빙`);
  }
});
