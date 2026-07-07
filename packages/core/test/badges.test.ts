// 배지(동기 층 — 성취를 커뮤니티까지). 증거 기반·결정적·다크패턴 없음(규칙 1·2·9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveBadges, authoredStats, reviewsMadeBy } from "../src/index.ts";
import type { CertificationReport, ContributionState, ItemEffect } from "../src/index.ts";

// ── 픽스처 헬퍼 ──
function cert(certifiedN: number, levels: string[]): CertificationReport {
  return { certs: [], certified: Array.from({ length: certifiedN }, (_, i) => ({ kc: "kc" + i } as never)), nextUp: [], levelProgress: {}, certifiedLevels: levels };
}
function contrib(cid: string, contributorRef: string, status: ContributionState["status"], reviews: { reviewerRef: string; verdict: "approve" | "reject" }[] = []): ContributionState {
  return { cid, item: { id: cid, lang: "en" } as never, contributorRef, gatePass: true, gateReasons: [], reviews: reviews as never, status, score: 0, submittedTs: "t" };
}
const eff = (health: ItemEffect["health"], enoughData = true): ItemEffect => ({ itemId: "x", n: 30, correctRate: 0.7, discrimination: 0.5, effectScore: 0.8, enoughData, health });

test("숙달·레벨 배지: 인증 수/완주 레벨로 티어", () => {
  const community = { states: new Map<string, ContributionState>(), trust: new Map<string, number>() };
  const b1 = deriveBadges("u", "en", cert(1, ["A1"]), community);
  const mastery = b1.badges.find((b) => b.category === "mastery");
  assert.equal(mastery.tier, "bronze", "인증 1 → bronze");
  assert.equal(mastery.nextNeed, 5, "다음 티어 경로");
  const b2 = deriveBadges("u", "en", cert(15, ["A1", "A2", "B1"]), community);
  assert.equal(b2.badges.find((b) => b.category === "mastery").tier, "gold", "인증 15 → gold");
  assert.equal(b2.badges.find((b) => b.category === "mastery").nextNeed, null, "최고 티어=경로 없음");
  assert.equal(b2.badges.find((b) => b.category === "levels").tier, "gold", "완주 3레벨 → gold");
});

test("기여·학습효과 배지: 저자 수용 수 + healthy 수용", () => {
  const states = new Map<string, ContributionState>();
  states.set("c1", contrib("c1", "u", "accepted"));
  states.set("c2", contrib("c2", "u", "accepted"));
  states.set("c3", contrib("c3", "u", "in_review")); // 수용 아님 → 미집계
  states.set("c4", contrib("c4", "other", "accepted")); // 남의 것 → 미집계
  const effects = new Map<string, ItemEffect>([["c1", eff("healthy")], ["c2", eff("weak")]]);
  const rep = deriveBadges("u", "en", cert(0, []), { states, trust: new Map() }, effects);
  assert.equal(rep.badges.find((b) => b.category === "contribution").count, 2, "저자 수용 2");
  assert.equal(rep.badges.find((b) => b.category === "contribution").tier, "bronze");
  assert.equal(rep.badges.find((b) => b.category === "effect").count, 1, "healthy 수용 1(weak 제외)");
  assert.equal(rep.badges.find((b) => b.category === "effect").tier, "bronze");
});

test("검토 배지: 정확도(신뢰) 자격이 있어야 티어 (양 아닌 실효, 규칙 1)", () => {
  const states = new Map<string, ContributionState>();
  // u 가 4건 검토(자격 임계 3 이상) — 하지만 신뢰가 낮으면 티어 보류
  for (let i = 0; i < 4; i++) states.set("r" + i, contrib("r" + i, "author", "accepted", [{ reviewerRef: "u", verdict: "approve" }]));
  assert.equal(reviewsMadeBy("u", states.values()), 4, "검토 4건");
  const lowTrust = deriveBadges("u", "en", cert(0, []), { states, trust: new Map([["u", 0.4]]) });
  const rlow = lowTrust.badges.find((b) => b.category === "review");
  assert.equal(rlow.tier, null, "저신뢰 → 티어 보류(양만으론 안 됨)");
  assert.equal(rlow.count, 4);
  const highTrust = deriveBadges("u", "en", cert(0, []), { states, trust: new Map([["u", 0.9]]) });
  assert.equal(highTrust.badges.find((b) => b.category === "review").tier, "bronze", "정확 검토 → bronze");
});

test("earned 는 티어 획득분만 + 결정적(멱등)", () => {
  const community = { states: new Map<string, ContributionState>(), trust: new Map<string, number>() };
  const a = deriveBadges("u", "en", cert(5, ["A1"]), community);
  const b = deriveBadges("u", "en", cert(5, ["A1"]), community);
  assert.deepEqual(a, b, "결정적");
  assert.ok(a.earned.every((x) => x.tier !== null), "earned=티어 있는 것만");
  assert.ok(a.earned.some((x) => x.category === "mastery"), "숙달 silver 포함");
});

test("authoredStats/reviewsMadeBy 순수 헬퍼", () => {
  const states = [contrib("c1", "u", "accepted"), contrib("c2", "u", "rejected")];
  assert.deepEqual(authoredStats("u", states), { accepted: 1, healthy: 0 });
});
