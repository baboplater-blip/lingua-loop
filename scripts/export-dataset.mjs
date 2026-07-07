#!/usr/bin/env node
// 개방 데이터셋 내보내기(운영자 도구) — privacy-consent-open-data SSOT.
// 동의 필터 → 학습신호 선별 → 재식별 레드팀(k-익명성, singleton 억제) → 익명화 → JSONL.
// 재식별 레드팀 실패 시 파일을 쓰지 않는다(프라이버시 우선). 실행: node scripts/export-dataset.mjs [출력경로] [k]
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOpenDataset, datasetCard } from "../packages/core/src/index.ts";
import { openFileStore } from "../packages/server/src/persist.ts";
import { openSqliteStore } from "../packages/server/src/sqlite-store.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] ?? join(root, "datasets", "open-dataset.jsonl");
const kTarget = Number(process.argv[3] ?? 3); // 소규모 코호트 보호 위해 기본 k=3

const dbPath = process.env.LL_DB;
const dataDir = process.env.LL_DATA_DIR ?? join(root, "data", "events");
const store = dbPath ? openSqliteStore(dbPath) : openFileStore(dataDir);

const events = [];
for (const log of store.logs.values()) for (const e of log.all()) events.push(e);
store.close?.();

const { dataset, report } = buildOpenDataset(events, { excludeRefs: ["community", "published"], kTarget });

console.log("\n── 개방 데이터셋 내보내기 ──\n");
console.log(`  원본 이벤트           ${report.sourceEvents}`);
console.log(`  개방 동의·학습신호     ${report.consentedEvents} (학습자 ${report.consentedLearners})`);
console.log(`  재식별 억제(singleton) ${report.suppressedLearners}명 제외`);
console.log(`  릴리스               학습자 ${report.releasedLearners} · 이벤트 ${report.releasedEvents}`);
console.log(`  k-익명성             최소 그룹 ${report.minGroupSize} / 목표 k=${report.kTarget} → ${report.redteamPassed ? "✅ 통과" : "❌ 실패"}`);
console.log(`  라이선스             ${report.license}`);

if (!report.redteamPassed) {
  console.log(`\n❌ 재식별 레드팀 실패 — 파일을 쓰지 않습니다(프라이버시 우선). k 를 낮추거나 코호트를 키우세요.\n`);
  process.exit(1);
}
if (report.releasedEvents === 0) {
  console.log(`\n⏳ 개방 동의 이벤트가 없어 데이터셋이 비었습니다(정상 — 아무도 옵트인 안 함).\n`);
  process.exit(0);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, dataset.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
// 데이터 카드 자동 동봉 — 카드 없이 데이터 공개 금지(oss-release-standards)
const cardPath = out.replace(/\.jsonl$/, "") + "-card.md";
writeFileSync(cardPath, datasetCard(report), "utf8");
console.log(`\n✅ ${out} (${report.releasedEvents} 이벤트) + ${cardPath} (데이터 카드) 기록. 항상 함께 배포하세요.\n`);
