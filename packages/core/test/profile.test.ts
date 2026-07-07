// 학습자 프로필 카드 — 인증·배지·누적 학습량 결합. 결정적·포터블·다크패턴 없음(규칙 2·6·9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProfile } from "../src/index.ts";
import type { CertificationReport, BadgeReport } from "../src/index.ts";

const cert = (n: number, levels: string[]): CertificationReport =>
  ({ certs: [], certified: Array.from({ length: n }, (_, i) => ({ kc: "kc" + i } as never)), nextUp: [], levelProgress: {}, certifiedLevels: levels });
const badges = (earned: { id: string; category: string; tier: string }[]): BadgeReport =>
  ({ learnerRef: "u", lang: "en", badges: [], earned: earned as never });

test("프로필: 누적 정확도 = 정답/응답", () => {
  const p = buildProfile("u", "en", cert(2, ["A1"]), badges([]), { responses: 10, correct: 8, distinctKCs: 3, tutorTurns: 2, contributions: 1 });
  assert.equal(p.accuracy, 0.8, "정확도 0.8");
  assert.equal(p.certified, 2);
  assert.deepEqual(p.certifiedLevels, ["A1"]);
  assert.equal(p.totals.responses, 10);
});

test("프로필: 응답 없으면 정확도 null(과신 금지)", () => {
  const p = buildProfile("u", "en", cert(0, []), badges([]), { responses: 0, correct: 0, distinctKCs: 0, tutorTurns: 0, contributions: 0 });
  assert.equal(p.accuracy, null, "응답 0 → null");
});

test("프로필: 획득 배지 매핑 + 결정적", () => {
  const eb = [{ id: "mastery", category: "mastery", tier: "bronze" }, { id: "review", category: "review", tier: "silver" }];
  const a = buildProfile("u", "en", cert(1, []), badges(eb), { responses: 5, correct: 3, distinctKCs: 2, tutorTurns: 1, contributions: 0 });
  const b = buildProfile("u", "en", cert(1, []), badges(eb), { responses: 5, correct: 3, distinctKCs: 2, tutorTurns: 1, contributions: 0 });
  assert.equal(a.earnedBadges.length, 2, "배지 2개");
  assert.deepEqual(a, b, "결정적(같은 입력 → 같은 출력)");
});

test("프로필: 요약은 결정적·타임스탬프 없음(포터블)", () => {
  const p = buildProfile("u", "en", cert(3, ["A1", "A2"]), badges([{ id: "x", category: "mastery", tier: "gold" }]), { responses: 20, correct: 18, distinctKCs: 5, tutorTurns: 4, contributions: 2 });
  assert.ok(p.summary.includes("certified=3") && p.summary.includes("badges=1") && p.summary.includes("answered=20"), "요약 필드");
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(JSON.stringify(p)), "타임스탬프 없음(포터블)");
});
