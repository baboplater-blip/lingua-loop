// 진화 루프 ↔ 커뮤니티 연결: 사용 데이터로 승격 기여를 재평가한다(강등/승격). SSOT: community-contribution-workflow 규칙 3.
// "인기(동료 승인)가 아니라 학습효과가 최종 진실"(규칙 1). 데이터가 쌓이면 실효가 순위·노출을 지배.
import { itemEffects, rankByEffect, isDemoted, evaluateCommunity } from "../../core/src/index.ts";
import type { Response, LearningEvent, ItemEffect, RankedContribution } from "../../core/src/index.ts";

/** 이벤트 로그에서 문항 응답(정오)을 추출 — 학습효과 측정 입력. */
export function usageResponses(events: readonly LearningEvent[]): Response[] {
  const out: Response[] = [];
  for (const ev of events) {
    if (ev.type !== "item.response" && ev.type !== "review.done") continue;
    const c = ev.payload["correct"];
    const g = ev.payload["grade"];
    const correct = typeof c === "boolean" ? c : g ? g !== "again" : null;
    if (ev.itemId && typeof correct === "boolean") out.push({ learner: ev.learnerRef, item: ev.itemId, correct });
  }
  return out;
}

export interface CommunityReevalReport {
  effects: Map<string, ItemEffect>;
  ranked: RankedContribution[]; // 승격 기여를 학습효과 순으로
  demoted: string[]; // 강등 대상(망가짐/너무 어려움) item.id
  healthy: string[]; // 건강한 문항 item.id
  reviewed: number; // 충분한 데이터로 판정된 승격 기여 수
}

/**
 * 승격된 커뮤니티 기여를 사용 데이터로 재평가한다.
 * - 학습효과 순 재랭킹(인기 아닌 실효)
 * - 망가진/너무 어려운 문항은 강등 대상으로 표시(서빙에서 제외됨)
 */
export function reevaluateCommunity(communityEvents: readonly LearningEvent[], usageEvents: readonly LearningEvent[], opts: { minN?: number } = {}): CommunityReevalReport {
  const responses = usageResponses(usageEvents);
  const effects = itemEffects(responses, opts);
  const { states } = evaluateCommunity(communityEvents, effects); // 신뢰가중 승격 + 학습효과
  const ranked = rankByEffect(states.values(), effects, { status: "accepted" });
  const demoted = ranked.filter((r) => isDemoted(r.effect)).map((r) => r.item.id);
  const healthy = ranked.filter((r) => r.effect && r.effect.health === "healthy").map((r) => r.item.id);
  const reviewed = ranked.filter((r) => r.effect && r.effect.enoughData).length;
  return { effects, ranked, demoted, healthy, reviewed };
}
