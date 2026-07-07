#!/usr/bin/env node
// LinguaLoop 검증 게이트(verification-gate SSOT). test.md 완료 정의의 단일 판정자.
// 제로 의존성. 실행: npm run gate  또는  node scripts/gate.mjs
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const pass = (m) => console.log("  ✅ " + m);
const fail = (cat, m) => { console.log("  ❌ " + m); failures.push(cat + ": " + m); };

console.log("\n── LinguaLoop 게이트 ──\n");

// 1) 문서 체계 자기검증 (verify-docs) — 규칙 22
console.log("[1] 문서 체계");
const docs = ["goal.md", "plan.md", "status.md", "rules.md", "test.md"];
let docsOk = true;
for (const d of docs) if (!existsSync(join(root, d))) { fail("docs", "누락: " + d); docsOk = false; }
const read = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), "utf8") : "");
const rules = read("rules.md");
for (const k of ["성과가 진실", "다크패턴", "append-only", "학습자 소유"]) if (!rules.includes(k)) { fail("docs", "rules.md 키워드 누락: " + k); docsOk = false; }
const status = read("status.md");
if (!/게이트/.test(status) || !/Phase/.test(status)) { fail("docs", "status.md 현황 라인 누락"); docsOk = false; }
const goal = read("goal.md");
if (!/북스타|TTM/.test(goal)) { fail("docs", "goal.md 북스타 지표 누락"); docsOk = false; }
if (docsOk) pass("5문서 존재·필수 섹션·정합");

// 2) 다크패턴 안티스캔 (규칙 9) — 사용자 대면 카피만
console.log("[2] 다크패턴 안티테스트");
const banned = [/잃(어|게)|사라(져|집)|놓치면|박탈|끊기/, /지금\s*안\s*하면/, /스트릭.*(위험|끊)/];
const uiTexts = [];
const packsDir = join(root, "packages", "packs");
function collectI18n(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) collectI18n(p);
    else if (e === "i18n.json") uiTexts.push(readFileSync(p, "utf8"));
  }
}
collectI18n(packsDir);
// 웹 UI 사용자 대면 카피(html·js)
const webPublic = join(root, "packages", "web", "public");
if (existsSync(webPublic)) {
  for (const e of readdirSync(webPublic)) {
    if (e.endsWith(".html") || e.endsWith(".js")) uiTexts.push(readFileSync(join(webPublic, e), "utf8"));
  }
}
let darkOk = true;
for (const t of uiTexts) for (const re of banned) if (re.test(t)) { fail("dark", "다크패턴 의심 카피: " + re); darkOk = false; }
if (darkOk) pass(`사용자 대면 카피 청정 (검사 대상 ${uiTexts.length}건${existsSync(webPublic) ? "" : ", 웹 UI 미구현"})`);

// 3) 검증 스위트 (코어·서버·팩) — test.md §3
console.log("[3] 검증 스위트");
const testFiles = [];
const pkgs = join(root, "packages");
if (existsSync(pkgs)) for (const pkg of readdirSync(pkgs)) {
  const td = join(pkgs, pkg, "test");
  if (existsSync(td)) for (const f of readdirSync(td)) if (f.endsWith(".test.ts")) testFiles.push(join(td, f));
}
if (testFiles.length === 0) { fail("tests", "테스트 파일 없음"); }
else {
  const r = spawnSync("node", ["--test", ...testFiles], { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || "");
  const m = out.match(/# pass (\d+)[\s\S]*?# fail (\d+)/) || out.match(/pass (\d+)[\s\S]*?fail (\d+)/);
  const passN = m ? m[1] : "?";
  const failN = m ? m[2] : "?";
  if (r.status === 0) pass(`${testFiles.length}개 파일 · ${passN} pass / ${failN} fail`);
  else { fail("tests", `검증 스위트 실패 (${passN} pass / ${failN} fail)`); process.stdout.write(out.split("\n").filter((l) => l.includes("✖") || l.toLowerCase().includes("fail")).slice(0, 20).join("\n") + "\n"); }
}

// 판정
console.log("");
if (failures.length === 0) {
  console.log("✅ 게이트 통과\n");
  process.exit(0);
} else {
  console.log("❌ 미통과 — " + failures.length + "건\n" + failures.map((f) => "   - " + f).join("\n") + "\n");
  process.exit(1);
}
