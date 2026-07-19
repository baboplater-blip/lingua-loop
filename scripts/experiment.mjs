#!/usr/bin/env node
// 사전등록 통제 실험 결과(운영자 도구) — 등록된 실험의 통제군/실험군 Gain 을 집단 간 비교(규칙 17: 관측 → 인과 증거).
// 실행: node scripts/experiment.mjs <experimentId>   (스토어는 서버와 동일: LL_DB 또는 LL_DATA_DIR)
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openFileStore } from "../packages/server/src/persist.ts";
import { openSqliteStore } from "../packages/server/src/sqlite-store.ts";
import { getRegistration, experimentResult } from "../packages/server/src/handlers.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const experimentId = process.argv[2];
if (!experimentId) {
  console.error("사용법: node scripts/experiment.mjs <experimentId>");
  console.error("먼저 데이터 수집 전에 등록하세요:  POST /experiment { experimentId, hypothesis, treatmentShare, minSamplePerArm }");
  process.exit(1);
}

const dbPath = process.env.LL_DB;
const store = dbPath ? openSqliteStore(dbPath) : openFileStore(process.env.LL_DATA_DIR ?? join(root, "data", "events"));
const reg = getRegistration(store, experimentId);
const r = experimentResult(store, experimentId);
store.close?.();

if (!reg || !r) {
  console.log(`\n⚠️ 실험 '${experimentId}' 이 등록되어 있지 않습니다.`);
  console.log(`   데이터를 보기 전에 사전등록해야 인과 해석이 유효합니다(규칙 17):`);
  console.log(`   curl -X POST localhost:8787/events? ... 가 아니라 POST /experiment { experimentId, hypothesis, treatmentShare, minSamplePerArm }\n`);
  process.exit(0);
}

const one = (x) => (x === null || x === undefined ? "—" : x.toFixed(2));
const arm = (label, c) => `    ${label}  n=${c.n}  평균 Gain=${c.meanGain === null ? "—" : (c.meanGain >= 0 ? "+" : "") + one(c.meanGain)}  SD=${one(c.sdGain)}`;
const VERDICT = {
  treatment_better: "실험군 우세 (95% CI 가 0 초과)",
  control_better: "통제군 우세 (95% CI 가 0 미만)",
  no_difference: "차이 없음 (CI 가 0 포함)",
  underpowered: "무결론 — 사전 확정 표본 미달(검정력 부족)",
};

console.log(`\n── 사전등록 통제 실험: ${experimentId} ──\n`);
console.log(`  가설        ${reg.hypothesis || "—"}`);
console.log(`  1차 결과    Gain Score(사전→사후 θ 상승) · 배정 실험군 ${(reg.treatmentShare * 100).toFixed(0)}% · 최소표본/팔 ${reg.minSamplePerArm}`);
const IV = { practice_order: "연습 순서(실험군=인터리빙 교차연습 · 통제군=블록연습)" };
console.log(`  개입        ${reg.intervention ? (IV[reg.intervention.kind] ?? reg.intervention.kind) : "없음(관측 비교만)"}`);
console.log(`  가드레일    ${reg.guardrail}`);
console.log(`  등록시각    ${reg.registeredTs}${r.retroactive ? "  ⚠️ 데이터보다 늦음(사전등록 무효)" : ""}`);
console.log(`\n  [코호트 Gain]`);
console.log(arm("통제군", r.control));
console.log(arm("실험군", r.treatment));
console.log(`\n  [집단 간 비교]`);
console.log(`    평균차(실험−통제)   ${r.diffInMeanGain === null ? "—" : (r.diffInMeanGain >= 0 ? "+" : "") + one(r.diffInMeanGain)}`);
console.log(`    효과크기 d          ${one(r.effectSize)}`);
console.log(`    95% CI              ${r.ci95 ? `[${one(r.ci95[0])}, ${one(r.ci95[1])}]` : "—"}`);
console.log(`    검정력(표본 충족)    ${r.powered ? "예" : "아니오"}`);
console.log(`\n  판정  ▶  ${VERDICT[r.verdict]}`);
console.log(`\n  ⚠️ ${r.caveat}\n`);
