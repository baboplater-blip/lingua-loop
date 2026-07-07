#!/usr/bin/env node
// 다국어 무인 진화 잡 — 배포된 모든 타깃 언어팩에 evolve:publish 를 순차 실행(운영 편의).
// 언어 발견: packages/packs/<lang>/kc-seed.json 이 있는 팩 = 학습 언어(ko 같은 UI 전용 로케일 제외).
// 스토어 환경변수(LL_DB / LL_DATA_DIR)는 그대로 물려줘 서버와 같은 이벤트를 본다. cron 한 줄로 전 언어 진화.
// 실행: node scripts/evolve-all.mjs   (특정 언어만: node scripts/evolve-all.mjs en es zh)
import { existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packsDir = join(root, "packages", "packs");

// 인자로 언어를 주면 그 언어만, 아니면 kc-seed.json 보유 팩 전부(발견)
const argLangs = process.argv.slice(2);
const discovered = existsSync(packsDir)
  ? readdirSync(packsDir).filter((d) => statSync(join(packsDir, d)).isDirectory() && existsSync(join(packsDir, d, "kc-seed.json")))
  : [];
const langs = argLangs.length > 0 ? argLangs : discovered;

console.log(`\n══ 다국어 진화 잡 (evolve:all) — ${langs.length}개 언어: ${langs.join(", ")} ══`);

let published = 0;
let failed = 0;
for (const lang of langs) {
  const r = spawnSync("node", [join(root, "scripts", "evolve-publish.mjs")], {
    stdio: "inherit",
    env: { ...process.env, LANG_PACK: lang }, // 스토어 변수(LL_DB/LL_DATA_DIR)는 그대로 상속
  });
  if (r.status !== 0) {
    failed++;
    console.error(`  ❌ ${lang} 진화 실패 (exit ${r.status})`);
  } else {
    published++;
  }
}

console.log(`\n══ 완료 — 성공 ${published}/${langs.length}${failed ? ` · 실패 ${failed}` : ""} ══\n`);
process.exit(failed ? 1 : 0);
