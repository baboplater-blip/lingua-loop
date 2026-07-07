#!/usr/bin/env node
// LinguaLoop 릴리스 준비도 체크(oss-release-standards SSOT). /release 커맨드의 실행체.
// 절대 push/공개하지 않는다 — 준비 상태만 판정(규칙 18: 배포는 사용자 명시 승인 시).
// 제로 의존성. 실행: npm run release [-- <version>] [--datasets]
import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const version = process.argv.find((a) => /^\d+\.\d+\.\d+/.test(a)) ?? "(미지정)";
const withDatasets = process.argv.includes("--datasets");

const rows = [];
let blocking = 0;
const ok = (label, note = "") => { rows.push(["✅", label, note]); };
const warn = (label, note = "") => { rows.push(["⏳", label, note]); };
const bad = (label, note = "") => { rows.push(["❌", label, note]); blocking++; };

console.log(`\n── LinguaLoop 릴리스 준비도  ${version} ──\n`);

// 1) 게이트 그린 (규칙 15) — /gate 통과가 릴리스의 전제
const gate = spawnSync("node", [join(root, "scripts", "gate.mjs")], { encoding: "utf8" });
if (gate.status === 0) ok("게이트 그린", "문서·다크패턴·전체 테스트");
else bad("게이트 레드", "먼저 npm run gate 통과 필요");

// 2) 문서·카드 세트
const required = {
  "README.md": "README(한/영)",
  "CHANGELOG.md": "CHANGELOG",
  "CONTRIBUTING.md": "CONTRIBUTING",
  "CODE_OF_CONDUCT.md": "행동 강령",
  "SECURITY.md": "보안 정책",
  "docs/DATA_CARD.md": "데이터 카드",
  "docs/MODEL_CARD.md": "모델 카드",
  "docs/SELF_HOSTING.md": "self-host 가이드",
};
const missing = Object.keys(required).filter((f) => !existsSync(join(root, f)));
if (missing.length === 0) ok("문서·투명성 카드", `${Object.keys(required).length}종 완비`);
else bad("문서 누락", missing.join(", "));

// 3) 라이선스 (규칙 14·19 — 사용자 확정 필요, 임의 확정 금지)
if (existsSync(join(root, "LICENSE")) || existsSync(join(root, "LICENSE.md"))) ok("라이선스", "확정됨");
else warn("라이선스", "미확정 — 코어/콘텐츠/데이터/모델 분리, 사용자 합의 대기");

// 4) 시크릿 스캔 (규칙 19) — 고신뢰 패턴만, 소스/설정 파일 대상
const secretPats = [
  { re: /AKIA[0-9A-Z]{16}/, name: "AWS 액세스 키" },
  { re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, name: "개인키 블록" },
  { re: /\bsk-[A-Za-z0-9]{20,}\b/, name: "sk- 토큰" },
  { re: /xox[baprs]-[A-Za-z0-9-]{10,}/, name: "Slack 토큰" },
  { re: /gh[pousr]_[A-Za-z0-9]{20,}/, name: "GitHub 토큰" },
];
const SKIP_DIRS = new Set(["node_modules", ".git", "data", "coverage", "dist", "build", ".next"]);
const SCAN_EXT = new Set([".ts", ".mjs", ".js", ".json", ".env", ".yml", ".yaml"]);
const hits = [];
function scan(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) { if (!SKIP_DIRS.has(e)) scan(p); continue; }
    if (p.endsWith("release.mjs")) continue; // 스캐너 자신(패턴 문자열)은 제외
    const dot = e.lastIndexOf(".");
    const ext = dot >= 0 ? e.slice(dot) : "";
    if (!SCAN_EXT.has(ext) && !e.startsWith(".env")) continue;
    const text = readFileSync(p, "utf8");
    for (const { re, name } of secretPats) if (re.test(text)) hits.push(`${name} @ ${p.slice(root.length + 1)}`);
  }
}
scan(root);
if (hits.length === 0) ok("시크릿 스캔", "노출 없음");
else bad("시크릿 의심", hits.join("; "));

// 5) 개방 데이터셋 프라이버시 게이트 (--datasets 일 때만) — 실제 재식별 레드팀 실행
if (withDatasets) {
  try {
    const { buildOpenDataset } = await import(new URL("../packages/core/src/index.ts", import.meta.url).href);
    const { openFileStore } = await import(new URL("../packages/server/src/persist.ts", import.meta.url).href);
    const store = openFileStore(process.env.LL_DATA_DIR ?? join(root, "data", "events"));
    const events = [];
    for (const log of store.logs.values()) for (const e of log.all()) events.push(e);
    const { report } = buildOpenDataset(events, { excludeRefs: ["community", "published"], kTarget: 3 });
    if (report.consentedEvents === 0) warn("개방 데이터셋", "개방 동의 이벤트 없음(옵트인 0 — 배포할 데이터셋 없음)");
    else if (report.redteamPassed) ok("개방 데이터셋", `재식별 레드팀 통과(k=${report.kTarget}, 억제 ${report.suppressedLearners}명, 릴리스 ${report.releasedEvents}건)`);
    else bad("개방 데이터셋", `재식별 레드팀 실패(최소 그룹 ${report.minGroupSize} < k=${report.kTarget})`);
  } catch (e) {
    bad("개방 데이터셋", String(e.message || e));
  }
}

// 6) self-host 스모크 (규칙 13) — 외부 서비스 없이 원커맨드 부팅+서빙
const smokeDir = join(tmpdir(), "ll-release-smoke");
try {
  rmSync(smokeDir, { recursive: true, force: true });
  mkdirSync(smokeDir, { recursive: true });
  process.env.LL_DATA_DIR = smokeDir; // 서버 임포트 전에 설정(모듈 로드 시 읽음)
  const { app } = await import(new URL("../packages/server/src/server.ts", import.meta.url).href);
  await new Promise((res) => app.listen(0, res));
  const port = app.address().port;
  const r = await fetch(`http://localhost:${port}/next?learner=release-smoke&lang=en`);
  const body = await r.json();
  app.close();
  if (Array.isArray(body.items)) ok("self-host 스모크", `부팅·서빙 OK (verified ${body.items.length}문항)`);
  else bad("self-host 스모크", "예상 응답 아님");
} catch (e) {
  bad("self-host 스모크", String(e.message || e));
} finally {
  rmSync(smokeDir, { recursive: true, force: true });
}

// ── 출력 ──
for (const [icon, label, note] of rows) console.log(`  ${icon} ${label}${note ? "  ·  " + note : ""}`);
console.log("");
const licensePending = rows.some((r) => r[1] === "라이선스" && r[0] === "⏳");
if (blocking > 0) {
  console.log(`❌ 릴리스 불가 — 차단 ${blocking}건 해결 필요\n`);
  process.exit(1);
}
if (licensePending) {
  console.log(`⏳ dry-run: 준비 완료(차단 없음). **공개는 보류** — 라이선스 확정 + '배포해' 명시 승인 필요(규칙 14·18·19).\n`);
  process.exit(0);
}
console.log(`✅ dry-run: 릴리스 준비 완료. 태그·push·공개는 사용자 '배포해' 승인 시에만 진행(규칙 18).\n`);
process.exit(0);
