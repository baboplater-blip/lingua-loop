#!/usr/bin/env node
// 무인 캘리브레이션 잡 — 수집 이벤트로 문항 난이도/변별도를 데이터 기반으로 추정(IRT/ELO, 규칙 3)하고,
// verified→calibrated 승격을 **append-only 로 영속**해 서빙·효능 대시보드(Content Health)에 반영한다.
// 안전판: 이상 문항은 승격 제외(flagAnomalousItems), SE 임계 미달만 승격. cron/운영자가 주기 실행.
// 실행: node scripts/calibrate.mjs   (스토어는 서버와 동일: LL_DB 또는 LL_DATA_DIR)
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promoteVerified } from "../packages/core/src/index.ts";
import { runCalibration } from "../packages/engine/src/index.ts";
import { openFileStore } from "../packages/server/src/persist.ts";
import { openSqliteStore } from "../packages/server/src/sqlite-store.ts";
import { allLearnerEvents, communityBank, publishedBank, calibrationOverlay, applyCalibrationOverlay, recordCalibration } from "../packages/server/src/handlers.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lang = process.env.LANG_PACK ?? "en";
const readJSON = (rel, fb) => { try { return JSON.parse(readFileSync(join(root, rel), "utf8")); } catch { return fb; } };

const { verified } = promoteVerified(readJSON(`packages/packs/${lang}/content-seed.json`, []));

const dbPath = process.env.LL_DB;
const store = dbPath ? openSqliteStore(dbPath) : openFileStore(process.env.LL_DATA_DIR ?? join(root, "data", "events"));

// 서빙 뱅크(시드+커뮤니티+발행)에 기존 캘리브레이션 오버레이를 얹은 상태를 입력으로 → 재계산 멱등.
const rawBank = [...verified, ...communityBank(store, lang), ...publishedBank(store, lang)];
const bank = applyCalibrationOverlay(rawBank, calibrationOverlay(store, lang));
const events = allLearnerEvents(store);

const report = runCalibration(events, bank);
const persist = recordCalibration(store, lang, report.items); // 갱신분만 append-only 기록(멱등)
store.close?.();

console.log(`\n── 무인 캘리브레이션 잡 (IRT/ELO · 규칙 3) — 언어 ${lang} ──\n`);
console.log(`  분석 응답(관측)        ${report.nResponses}`);
console.log(`  서빙 문항             ${bank.length}`);
console.log(`  이번에 캘리브레이션      ${report.calibratedCount}개 (verified→calibrated 승격)`);
console.log(`  이상 문항(승격 제외)    ${report.anomalous.length}개${report.anomalous.length ? " · " + report.anomalous.slice(0, 5).join(", ") : ""}`);
console.log(`  영속(append-only)     기록 ${persist.recorded} · 멱등 스킵 ${persist.skipped}`);
if (report.nResponses === 0) {
  console.log(`\n⏳ 응답이 없어 캘리브레이션할 데이터가 없습니다(정상 — 학습 사용이 쌓이면 채워집니다).\n`);
} else {
  console.log(`\n✅ 난이도는 임의값이 아니라 반응 데이터로 추정됩니다(규칙 3). 서빙·효능 대시보드(Content Health)에 반영됩니다.\n`);
}
