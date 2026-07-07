// 배지(동기 층 — 성취를 커뮤니티까지) — 언어 무관(규칙 11). 증거 기반·결정적(규칙 1·5).
// ⚠️ 다크패턴 없음(규칙 2·9): 성취를 인정하고 다음 티어 경로만 보여줄 뿐 — 손실공포·마감·스트릭·강제 없음.
// 배지는 인기가 아니라 **성과·실효**에 앵커한다: 검토 배지는 정확도(신뢰)로 자격을 얻고, 저자 배지엔 학습효과(healthy) 축이 별도.
import type { ItemEffect } from "./content-effect.ts";
import type { ContributionState } from "./community.ts";
import type { CertificationReport } from "./certifications.ts";

export type BadgeTier = "bronze" | "silver" | "gold";
export type BadgeCategory = "mastery" | "levels" | "contribution" | "effect" | "review";

export interface Badge {
  id: string;
  category: BadgeCategory;
  count: number; // 증거 수량
  tier: BadgeTier | null; // 획득 티어(null=아직 없음)
  nextNeed: number | null; // 다음 티어까지 필요한 수(경로 안내, 압박 아님). null=최고 티어
  trust?: number; // 검토 배지 한정 — 검토 정확도(신뢰)
}

export interface BadgeReport {
  learnerRef: string;
  lang: string;
  badges: Badge[]; // 전 카테고리(획득/진행 중 모두)
  earned: Badge[]; // tier != null
}

/** 티어 판정 — 임계 [bronze, silver, gold]. eligible=false면 자격 미달(검토 정확도 등)로 티어 보류. */
function tierFor(count: number, thr: readonly [number, number, number], eligible = true): { tier: BadgeTier | null; nextNeed: number | null } {
  if (eligible) {
    if (count >= thr[2]) return { tier: "gold", nextNeed: null };
    if (count >= thr[1]) return { tier: "silver", nextNeed: thr[2] };
    if (count >= thr[0]) return { tier: "bronze", nextNeed: thr[1] };
  }
  return { tier: null, nextNeed: thr[0] };
}

/** 학습자가 저자인 승격 기여 통계 — 총 수용 + 학습효과 healthy 수용(규칙 1: 인기 아닌 실효). */
export function authoredStats(learnerRef: string, states: Iterable<ContributionState>, effects?: Map<string, ItemEffect>): { accepted: number; healthy: number } {
  let accepted = 0;
  let healthy = 0;
  for (const c of states) {
    if (c.contributorRef !== learnerRef || c.status !== "accepted") continue;
    accepted += 1;
    const e = effects?.get(c.item.id);
    if (e && e.enoughData && e.health === "healthy") healthy += 1;
  }
  return { accepted, healthy };
}

/** 학습자가 남의 기여에 한 검토 수(자기검토는 파생 단계에서 이미 제외됨). */
export function reviewsMadeBy(learnerRef: string, states: Iterable<ContributionState>): number {
  let n = 0;
  for (const c of states) for (const r of c.reviews) if (r.reviewerRef === learnerRef) n += 1;
  return n;
}

const REVIEW_TRUST_FLOOR = 0.6; // 검토 배지 자격 — 정확한 검토라야 인정(양이 아닌 실효, 규칙 1)

/**
 * 배지 파생 — 증거 기반·결정적. 카테고리: 숙달(인증 KC)·레벨 완주·기여(수용)·**잘 가르침(학습효과 healthy)**·검토(신뢰 자격).
 * 학습 인증(cert)과 커뮤니티(states·trust)·학습효과(effects)를 한데 모아 성취를 인정한다. 다크패턴 없음.
 */
export function deriveBadges(
  learnerRef: string,
  lang: string,
  cert: CertificationReport,
  community: { states: Map<string, ContributionState>; trust: Map<string, number> },
  effects?: Map<string, ItemEffect>,
): BadgeReport {
  const authored = authoredStats(learnerRef, community.states.values(), effects);
  const reviews = reviewsMadeBy(learnerRef, community.states.values());
  const trust = community.trust.get(learnerRef);
  const reviewEligible = typeof trust === "number" && trust >= REVIEW_TRUST_FLOOR;

  const defs: { id: string; category: BadgeCategory; count: number; thr: readonly [number, number, number]; eligible?: boolean; trust?: number }[] = [
    { id: "mastery", category: "mastery", count: cert.certified.length, thr: [1, 5, 15] },
    { id: "levels", category: "levels", count: cert.certifiedLevels.length, thr: [1, 2, 3] },
    { id: "contribution", category: "contribution", count: authored.accepted, thr: [1, 3, 10] },
    { id: "effect", category: "effect", count: authored.healthy, thr: [1, 2, 5] },
    { id: "review", category: "review", count: reviews, thr: [3, 10, 25], eligible: reviewEligible, trust: typeof trust === "number" ? trust : undefined },
  ];

  const badges: Badge[] = defs.map((d) => {
    const { tier, nextNeed } = tierFor(d.count, d.thr, d.eligible ?? true);
    const b: Badge = { id: d.id, category: d.category, count: d.count, tier, nextNeed };
    if (d.trust !== undefined) b.trust = Math.round(d.trust * 100) / 100;
    return b;
  });

  return { learnerRef, lang, badges, earned: badges.filter((b) => b.tier !== null) };
}
