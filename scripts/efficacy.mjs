#!/usr/bin/env node
// 효능 대시보드(운영자 도구) — 북스타 지표를 스토어 이벤트에서 산출해 출력(goal.md §3, 규칙 1 성과가 진실).
// 참여도(세션수·스트릭)가 아니라 학습 성과: TTM·리텐션·커버리지·콘텐츠 건강. 실행: node scripts/efficacy.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promoteVerified } from "../packages/core/src/index.ts";
import { openFileStore } from "../packages/server/src/persist.ts";
import { openSqliteStore } from "../packages/server/src/sqlite-store.ts";
import { loadGraph, efficacyReport, efficacyHistory, communityBank, publishedBank } from "../packages/server/src/handlers.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lang = process.env.LANG_PACK ?? "en";
const readJSON = (rel, fb) => { try { return JSON.parse(readFileSync(join(root, rel), "utf8")); } catch { return fb; } };

const graph = loadGraph(readJSON(`packages/packs/${lang}/kc-seed.json`, []));
const { verified } = promoteVerified(readJSON(`packages/packs/${lang}/content-seed.json`, []));

const dbPath = process.env.LL_DB;
const store = dbPath ? openSqliteStore(dbPath) : openFileStore(process.env.LL_DATA_DIR ?? join(root, "data", "events"));
const bank = [...verified, ...communityBank(store, lang), ...publishedBank(store, lang)];
const r = efficacyReport(store, lang, graph, bank);
const hist = efficacyHistory(store, lang);
store.close?.();

const pct = (x) => (x === null || x === undefined ? "—" : (x * 100).toFixed(1) + "%");
const num = (x) => (x === null || x === undefined ? "—" : String(x));
const dur = (ms) => {
  if (ms === null || ms === undefined) return "—";
  const m = ms / 60000;
  if (m < 60) return m.toFixed(1) + "분";
  const h = m / 60;
  if (h < 48) return h.toFixed(1) + "시간";
  return (h / 24).toFixed(1) + "일";
};

const e = r.efficacy;
console.log(`\n── 효능 대시보드 (북스타 지표) — 언어 ${lang} ──\n`);
console.log(`  [TTM] 숙달 도달 (Time-to-Mastery)`);
console.log(`    숙달 쌍(학습자×KC)     ${num(e.ttm.masteredPairs)}`);
console.log(`    숙달까지 응답(중앙)     ${num(e.ttm.medianResponsesToMastery)} (평균 ${e.ttm.meanResponsesToMastery === null ? "—" : e.ttm.meanResponsesToMastery.toFixed(1)})`);
console.log(`    숙달까지 경과(중앙)     ${dur(e.ttm.medianElapsedMs)}`);
console.log(`  [Retention] 회상 정확도`);
console.log(`    전체 정확도            ${pct(e.retention.overallAccuracy)} (응답 ${e.retention.responses})`);
console.log(`    복습(간격반복) 정확도   ${pct(e.retention.reviewAccuracy)} (복습 응답 ${e.retention.reviewResponses})`);
console.log(`  [Coverage] 진척`);
console.log(`    학습자                ${num(e.coverage.learners)}`);
console.log(`    본 KC / 숙달 KC        ${num(e.coverage.kcsSeen)} / ${num(e.coverage.kcsMastered)}`);
console.log(`    학습자당 숙달 KC(평균)  ${e.coverage.masteredPerLearner === null ? "—" : e.coverage.masteredPerLearner.toFixed(1)}`);
console.log(`  [Content Health] 콘텐츠 건강`);
console.log(`    서빙 문항             ${r.contentHealth.servableItems} · 캘리브레이션 ${pct(r.contentHealth.calibratedRatio)}`);
console.log(`    콘텐츠 보유 KC / 전체   ${r.contentHealth.kcsWithContent} / ${r.contentHealth.totalKCs} · 격차 ${r.gaps.length}KC`);
console.log(`  [추이] 진화 사이클 스냅샷 (Loop Velocity)`);
if (hist.trend.count < 2) {
  console.log(`    스냅샷 ${hist.trend.count}개 — 추세는 2개 이상부터(진화 사이클마다 evolve:publish 가 기록)`);
} else {
  const d = hist.trend.delta;
  const dp = (x) => (x === null ? "—" : `${(x * 100).toFixed(1)}%p`);
  const dn = (x) => (x === null ? "—" : `${x > 0 ? "+" : ""}${x}`);
  console.log(`    스냅샷 ${hist.trend.count}개 · 첫→최신 Δ`);
  console.log(`      전체/복습 정확도      ${dp(d.overallAccuracy)} / ${dp(d.reviewAccuracy)} (양수=개선)`);
  console.log(`      숙달까지 응답 / 숙달KC  ${dn(d.medianResponsesToMastery)} (음수=개선) / ${dn(d.kcsMastered)}`);
}

if (e.throughput.responses === 0) {
  console.log(`\n⏳ 아직 학습 이벤트가 없습니다 — 서버 사용이 쌓이면 지표가 채워집니다(정상).\n`);
} else {
  console.log(`\n✅ 지표는 참여도가 아니라 학습 성과입니다(규칙 1). 진화 사이클 전후로 비교해 개선을 확인하세요.\n`);
}
