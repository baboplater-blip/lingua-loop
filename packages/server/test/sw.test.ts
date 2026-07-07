// 저자원 언어 파일럿(스와힐리어 sw) — 범용 엔진을 반투어(명사 부류·라틴·성조 없음)로 재실증. 코드 변경 0(규칙 11).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { promoteVerified } from "../../core/src/index.ts";
import { placementStep } from "../src/handlers.ts";
import { createTutorFor } from "../../adapters/src/index.ts";

const read = (f: string) => JSON.parse(readFileSync(new URL(`../../packs/sw/${f}`, import.meta.url), "utf8"));

test("sw 팩 메타: 라틴·성조 없음(저자원 파일럿)", () => {
  const meta = read("pack.json");
  assert.equal(meta.lang, "sw");
  assert.equal(meta.script, "latin");
  assert.equal(meta.direction, "ltr");
});

test("sw 시드 콘텐츠가 코어 게이트를 통과(규칙 4·11)", () => {
  const { verified, rejected } = promoteVerified(read("content-seed.json"));
  assert.equal(rejected.length, 0, "반려: " + rejected.map((r: any) => r.item.id).join(","));
  assert.ok(verified.length >= 3, "sw 콘텐츠 통과");
  assert.ok(verified.every((i: any) => i.lang === "sw"), "sw 언어");
});

test("sw 음운: 자음 대립쌍(b/p·l/r) + 규칙적 페널티메이트 강세", () => {
  const phon = read("phonology.json");
  assert.ok(phon.minimalPairs.length >= 2, "대립쌍 2쌍 이상");
  assert.ok(phon.minimalPairs.every((mp: any) => Array.isArray(mp.a.ipa) && Array.isArray(mp.b.ipa)), "IPA 배열");
  // 성조어 아님 — 강세(뒤에서 둘째 음절)로 산출 채점
  assert.ok(phon.prosody.every((p: any) => p.stress && p.stress.length === p.syllables.length), "강세 음절 일치");
  assert.ok(phon.prosody.every((p: any) => !p.tones), "성조 없음");
});

test("sw 배치고사: 같은 CAT 엔진(규칙 11)", () => {
  const s = placementStep(read("placement.json"), []);
  assert.ok(s.next && s.next.id.startsWith("plc.sw"), "sw 배치 문항");
});

test("sw 전용 튜터: 명사 부류 복수 교정 + 스와힐리어 후속 질문", async () => {
  const t = createTutorFor("sw");
  // mtu(사람 단수) + wawili(둘) → watu(사람 복수)
  const r = await t.respond({ message: "mtu wawili", history: [], targetLang: "sw", level: "A1" });
  assert.ok(r.corrections.some((c: any) => c.errorTag === "noun-class-plural"), "명사 부류 복수 교정");
  assert.ok(/\?|nini|wapi|jina/i.test(r.text), "스와힐리어로 대화 유도");
});
