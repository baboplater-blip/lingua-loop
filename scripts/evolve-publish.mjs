#!/usr/bin/env node
// 무인 진화 잡 — /evolve 1사이클(분석·생성) → 게이트 통과 산출을 자동 발행(서빙 편입).
// 안전판: 코어 품질 게이트(규칙 4)가 발행을 막고, 학습효과 강등(규칙 1)이 서빙을 정리한다.
// cron/운영자가 주기 실행. 실행: node scripts/evolve-publish.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runEvolveCycle } from "../packages/engine/src/index.ts";
import { promoteVerified } from "../packages/core/src/index.ts";
import { openFileStore } from "../packages/server/src/persist.ts";
import { openSqliteStore } from "../packages/server/src/sqlite-store.ts";
import { loadGraph, publishFromEvolve, communityBank, publishedBank, publishedReadings, recordEfficacy } from "../packages/server/src/handlers.ts";
import { createContentGeneratorFor, createReadingGeneratorFor } from "../packages/adapters/src/index.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lang = process.env.LANG_PACK ?? "en";
const readJSON = (rel, fb) => { try { return JSON.parse(readFileSync(join(root, rel), "utf8")); } catch { return fb; } };

// 언어팩 로드
const kcNodes = readJSON(`packages/packs/${lang}/kc-seed.json`, []);
const seed = readJSON(`packages/packs/${lang}/content-seed.json`, []);
const { verified } = promoteVerified(seed);
const readings = readJSON(`packages/packs/${lang}/reading.json`, { passages: [] }).passages;
const graph = loadGraph(kcNodes);

// 스토어에서 이벤트 수집
const dbPath = process.env.LL_DB;
const store = dbPath ? openSqliteStore(dbPath) : openFileStore(process.env.LL_DATA_DIR ?? join(root, "data", "events"));
const events = [];
const communityEvents = [];
for (const [ref, log] of store.logs) {
  if (ref === "community") communityEvents.push(...log.all());
  else if (ref === "published") continue;
  else events.push(...log.all());
}

// 격차 탐지·중복 배제에 발행분까지 포함 → 이미 채운 격차는 재생성하지 않음(멱등)
const existing = [...verified, ...communityBank(store, lang), ...publishedBank(store, lang)];
const report = runEvolveCycle({
  events, items: existing, graph,
  generator: createContentGeneratorFor(lang),
  readingGenerator: createReadingGeneratorFor(lang),
  readings: [...readings, ...publishedReadings(store, lang)],
  lang, communityEvents,
});
const pub = publishFromEvolve(store, report, lang, existing);
// 진화 사이클마다 효능 스냅샷 기록 → 개선 추세(Loop Velocity·자기개선 증명)를 데이터로 축적
const bankNow = [...verified, ...communityBank(store, lang), ...publishedBank(store, lang)];
const snap = recordEfficacy(store, lang, graph, bankNow);
store.close?.();

console.log("\n── 무인 진화 잡 (evolve → publish) ──\n");
console.log(`  언어                 ${lang}`);
console.log(`  분석 이벤트           ${events.length}`);
console.log(`  콘텐츠 격차           ${report.signals.contentGaps.length}KC`);
console.log(`  생성                 문항 ${report.contentGeneration?.generatedCount ?? 0} · 지문 ${report.readingGeneration?.generatedCount ?? 0}`);
console.log(`  자동 발행             문항 ${pub.publishedItems} · 지문 ${pub.publishedReadings} · 배제(중복) ${pub.skipped}`);
if (report.community) console.log(`  커뮤니티 재평가        승격 재검토 · 강등 ${report.community.demoted.length}`);
console.log(`  효능 스냅샷 기록        정확도 ${snap.overallAccuracy === null ? "—" : (snap.overallAccuracy * 100).toFixed(1) + "%"} · 숙달KC ${snap.kcsMastered} (추이 축적)`);
console.log(`\n${pub.publishedItems + pub.publishedReadings > 0 ? "✅ 새 콘텐츠가 자동으로 서빙에 편입됐습니다." : "⏳ 이번 사이클엔 새로 발행할 격차가 없습니다(정상)."}\n`);
