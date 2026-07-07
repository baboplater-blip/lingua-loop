// 커뮤니티 기여·동료검증·랭킹·모더레이션(언어 무관, 규칙 11). SSOT: community-contribution-workflow.
// 진화의 인간 축: 제출 → 자동 게이트(규칙 4) → 동료 검증 → 승격 → 노출. 기여도 예외 없이 품질 게이트를 통과해야 한다.
// 상태는 append-only 이벤트(contribution.submitted / contribution.review)의 리플레이로 파생(규칙 5).
import type { ContentItem, LearningEvent } from "./types.ts";
import { checkItem } from "./content-gate.ts";
import type { ItemEffect } from "./content-effect.ts";

export type ContributionStatus = "in_review" | "accepted" | "rejected";
export type ReviewVerdict = "approve" | "reject";
export type ReviewFlag = "plagiarism" | "abuse" | "inaccurate" | "spam";

export interface Review {
  reviewerRef: string;
  verdict: ReviewVerdict;
  reason?: string;
  flag?: ReviewFlag;
  ts?: string;
}

export interface ContributionState {
  cid: string;
  item: ContentItem;
  contributorRef: string;
  gatePass: boolean; // 자동 품질 게이트 통과(규칙 4)
  gateReasons: string[];
  reviews: Review[];
  status: ContributionStatus;
  score: number; // 순 승인(승인수 − 반려수)
  submittedTs: string;
}

export interface ReviewPolicy {
  minNetApprovals: number; // 승격에 필요한 순 승인
  blockingFlags: ReviewFlag[]; // 하나라도 있으면 즉시 거부
}

export const DEFAULT_REVIEW_POLICY: ReviewPolicy = { minNetApprovals: 2, blockingFlags: ["plagiarism", "abuse", "spam"] };

/** 자동 모더레이션 사전 스캔 — 스팸/인젝션/링크 등. 제출 시 선제 플래그(사람 검토 전 방어). */
export function moderationFlags(item: ContentItem): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  const text = `${item.prompt ?? ""} ${item.answer?.value ?? ""}`;
  if (/(https?:\/\/|www\.)|\b(viagra|casino|free\s*money|crypto\s*giveaway)\b/i.test(text)) flags.push("spam");
  if (/(ignore\s+(all|previous|above)|시스템\s*프롬프트|무시하고|system\s+prompt)/i.test(text)) flags.push("abuse");
  return flags;
}

/**
 * 기여 상태 결정. 순서가 중요:
 *  ① 자동 게이트 실패 → 거부(규칙 4, 사람 검토로도 뒤집지 못함)
 *  ② 차단 플래그(표절·어뷰즈·스팸) → 거부
 *  ③ 순 승인 ≥ 정책 임계 → 승격(accepted)
 *  ④ 반려 우세(순 승인 ≤ −임계) → 거부
 *  ⑤ 그 외 → 검토중
 */
export function decideStatus(gatePass: boolean, reviews: Review[], policy: ReviewPolicy = DEFAULT_REVIEW_POLICY): ContributionStatus {
  if (!gatePass) return "rejected";
  if (reviews.some((r) => r.flag && policy.blockingFlags.includes(r.flag))) return "rejected";
  const approvals = reviews.filter((r) => r.verdict === "approve").length;
  const rejections = reviews.filter((r) => r.verdict === "reject").length;
  const net = approvals - rejections;
  if (net >= policy.minNetApprovals) return "accepted";
  if (net <= -policy.minNetApprovals) return "rejected";
  return "in_review";
}

const cidOf = (itemId: string): string => "c:" + itemId;

/** 제출 이벤트를 만든다(자동 게이트 결과 포함). 서버가 append-only 로 로깅. */
export function makeSubmission(item: ContentItem, existing: ContentItem[] = []): { cid: string; gatePass: boolean; gateReasons: string[]; autoFlags: ReviewFlag[] } {
  const gate = checkItem(item, existing);
  const autoFlags = moderationFlags(item);
  return { cid: cidOf(item.id), gatePass: gate.pass && autoFlags.length === 0, gateReasons: [...gate.reasons, ...autoFlags.map((f) => "자동 모더레이션: " + f)], autoFlags };
}

/**
 * 커뮤니티 이벤트 로그 → 기여 상태 맵 파생(결정적·멱등, 규칙 5).
 * 검토자는 자기 기여를 승인해도 집계에서 제외(어뷰즈 방어).
 */
export function deriveContributions(events: readonly LearningEvent[], policy: ReviewPolicy = DEFAULT_REVIEW_POLICY): Map<string, ContributionState> {
  const map = new Map<string, ContributionState>();
  for (const ev of events) {
    if (ev.type === "contribution.submitted") {
      const cid = String(ev.payload["cid"]);
      const item = ev.payload["item"] as ContentItem;
      const gatePass = Boolean(ev.payload["gatePass"]);
      map.set(cid, {
        cid,
        item,
        contributorRef: String(ev.payload["contributorRef"] ?? ev.learnerRef), // 커뮤니티 로그는 learnerRef 를 공유하므로 payload 우선
        gatePass,
        gateReasons: (ev.payload["gateReasons"] as string[]) ?? [],
        reviews: [],
        status: gatePass ? "in_review" : "rejected",
        score: 0,
        submittedTs: ev.ts,
      });
    } else if (ev.type === "contribution.review") {
      const cid = String(ev.payload["cid"]);
      const c = map.get(cid);
      if (!c) continue;
      const reviewerRef = String(ev.payload["reviewerRef"] ?? ev.learnerRef);
      if (reviewerRef === c.contributorRef) continue; // 자기 기여 자가검토 무시(어뷰즈 방어)
      c.reviews.push({
        reviewerRef,
        verdict: ev.payload["verdict"] as ReviewVerdict,
        reason: ev.payload["reason"] as string | undefined,
        flag: ev.payload["flag"] as ReviewFlag | undefined,
        ts: ev.ts,
      });
      c.score = c.reviews.filter((r) => r.verdict === "approve").length - c.reviews.filter((r) => r.verdict === "reject").length;
      c.status = decideStatus(c.gatePass, c.reviews, policy);
    }
  }
  return map;
}

/** 승격(accepted)된 기여의 콘텐츠 아이템 — verified 로 표시해 서빙 뱅크에 합류(규칙 4 통과분만). */
export function acceptedItems(states: Iterable<ContributionState>, lang?: string): ContentItem[] {
  const out: ContentItem[] = [];
  for (const c of states) {
    if (c.status !== "accepted") continue;
    if (lang && c.item.lang !== lang) continue;
    out.push({ ...c.item, quality: c.item.quality === "draft" ? "verified" : c.item.quality });
  }
  return out;
}

/**
 * 기여 랭킹(동료검증 순 승인 기준). 사용 데이터가 없을 때의 기본 순서.
 * ⚠️ 최종 진실은 인기가 아니라 학습효과 — 데이터가 쌓이면 rankByEffect 를 쓴다(규칙 1·skill).
 */
export function rankContributions(states: Iterable<ContributionState>, opts: { status?: ContributionStatus; lang?: string } = {}): ContributionState[] {
  const arr = [...states].filter((c) => (!opts.status || c.status === opts.status) && (!opts.lang || c.item.lang === opts.lang));
  arr.sort((a, b) => (b.score - a.score) || a.submittedTs.localeCompare(b.submittedTs));
  return arr;
}

export interface RankedContribution extends ContributionState {
  effect: ItemEffect | null;
}

/**
 * **학습효과 재랭킹**(규칙 1·skill 불변 규칙 3: 인기보다 학습효과가 진실).
 * 충분한 사용 데이터가 있는 기여는 effectScore 로, 없으면 동료검증 점수로 정렬(하이브리드).
 * 데이터가 쌓일수록 인기가 아닌 실효가 순위를 지배한다.
 */
export function rankByEffect(states: Iterable<ContributionState>, effects: Map<string, ItemEffect>, opts: { status?: ContributionStatus; lang?: string } = {}): RankedContribution[] {
  const arr = [...states]
    .filter((c) => (!opts.status || c.status === opts.status) && (!opts.lang || c.item.lang === opts.lang))
    .map((c) => ({ ...c, effect: effects.get(c.item.id) ?? null }));
  const key = (c: RankedContribution): number => (c.effect && c.effect.enoughData ? 1 + c.effect.effectScore : 0.5 + c.score * 0.01);
  arr.sort((a, b) => (key(b) - key(a)) || a.submittedTs.localeCompare(b.submittedTs));
  return arr;
}

/** 학습효과로 강등할 기여(충분한 데이터에서 망가짐/너무 어려움). 서빙에서 제외 대상(skill: 저품질 강등). */
export function isDemoted(effect: ItemEffect | undefined | null): boolean {
  return !!effect && effect.enoughData && (effect.health === "weak" || effect.health === "too_hard");
}

// ── 검토자 신뢰가중(안티어뷰즈, skill: 트러스트·조작 방어) ──────────────────
// 검토자 표를 **이력 기반 신뢰도**로 가중한다. 신뢰는 **객관적 진실**(게이트·학습효과)에 앵커해
// 순환을 끊는다: 게이트 통과+healthy=good, 게이트 실패/weak/too_hard=bad. 검토가 진실과 일치하면 신뢰↑.
// 신규(이력 없음)=중립(하위호환), 검증된 검토자=증폭, 입증된 악성=축소 → 조직적 밀어주기 방어.

export interface WeightedPolicy {
  minWeightedApproval: number; // 승격에 필요한 가중 순 승인
  blockingFlags: ReviewFlag[];
}
export const DEFAULT_WEIGHTED_POLICY: WeightedPolicy = { minWeightedApproval: 2, blockingFlags: ["plagiarism", "abuse", "spam"] };

/** 기여의 객관적 진실. 가능하면 게이트+학습효과로, 없으면 종결 상태(잠정)로. 유보=null. */
export function objectiveOutcome(c: ContributionState, effect?: ItemEffect | null): "good" | "bad" | null {
  if (!c.gatePass) return "bad"; // 자동 게이트 실패 = 객관적 불량
  if (effect && effect.enoughData && (effect.health === "weak" || effect.health === "too_hard")) return "bad";
  if (effect && effect.enoughData && effect.health === "healthy" && c.status === "accepted") return "good";
  if (c.status === "accepted") return "good"; // 잠정(동료 합의)
  if (c.status === "rejected") return "bad";
  return null; // in_review·효과 불충분 → 판정 유보
}

/** 검토자 신뢰도(정확도) — 검토가 객관 진실과 일치한 비율. 신규는 사전분포(0.5)로 수축(과신 금지). */
export function computeTrust(states: Iterable<ContributionState>, effects?: Map<string, ItemEffect>, opts: { prior?: number; pseudo?: number } = {}): Map<string, number> {
  const prior = opts.prior ?? 0.5;
  const pseudo = opts.pseudo ?? 2;
  const tally = new Map<string, { correct: number; total: number }>();
  for (const c of states) {
    const truth = objectiveOutcome(c, effects?.get(c.item.id));
    if (!truth) continue;
    for (const r of c.reviews) {
      const t = tally.get(r.reviewerRef) ?? { correct: 0, total: 0 };
      t.total += 1;
      if ((r.verdict === "approve" && truth === "good") || (r.verdict === "reject" && truth === "bad")) t.correct += 1;
      tally.set(r.reviewerRef, t);
    }
  }
  const trust = new Map<string, number>();
  for (const [ref, t] of tally) trust.set(ref, (t.correct + prior * pseudo) / (t.total + pseudo));
  return trust;
}

/** 검토자 표 가중치 = 0.5 + 정확도. 신규(0.5)=1.0(중립·하위호환), 최고=1.5(증폭), 최악=0.5(축소). */
export function reviewerWeight(trust: Map<string, number>, ref: string, prior = 0.5): number {
  return 0.5 + (trust.get(ref) ?? prior);
}

/** 신뢰가중 승격 판정. 신규만이면 가중=1.0이라 원시 규칙과 동일; 입증된 악성 표는 절반만 계산. */
export function decideStatusWeighted(gatePass: boolean, reviews: Review[], trust: Map<string, number>, policy: WeightedPolicy = DEFAULT_WEIGHTED_POLICY): ContributionStatus {
  if (!gatePass) return "rejected";
  if (reviews.some((r) => r.flag && policy.blockingFlags.includes(r.flag))) return "rejected";
  let net = 0;
  for (const r of reviews) net += reviewerWeight(trust, r.reviewerRef) * (r.verdict === "approve" ? 1 : -1);
  if (net >= policy.minWeightedApproval) return "accepted";
  if (net <= -policy.minWeightedApproval) return "rejected";
  return "in_review";
}

/** 신뢰가중으로 상태를 재판정한다(게이트·검토 이력은 유지). */
export function applyTrustWeighting(states: Map<string, ContributionState>, trust: Map<string, number>, policy?: WeightedPolicy): Map<string, ContributionState> {
  const out = new Map<string, ContributionState>();
  for (const [cid, c] of states) out.set(cid, { ...c, status: decideStatusWeighted(c.gatePass, c.reviews, trust, policy) });
  return out;
}

/** 종합: 이벤트 → 원시 파생 → 신뢰도 산출 → 신뢰가중 재판정. 서버 커뮤니티 뷰의 진입점. */
export function evaluateCommunity(events: readonly LearningEvent[], effects?: Map<string, ItemEffect>, policy?: WeightedPolicy): { states: Map<string, ContributionState>; trust: Map<string, number> } {
  const raw = deriveContributions(events);
  const trust = computeTrust(raw.values(), effects);
  return { states: applyTrustWeighting(raw, trust, policy), trust };
}

/**
 * 실제 서빙할 승격 콘텐츠 — accepted 이면서 학습효과로 강등되지 않은 것만.
 * effects 가 없으면(초기) 동료검증만으로 서빙(acceptedItems 와 동일).
 */
export function servableCommunityItems(states: Iterable<ContributionState>, effects?: Map<string, ItemEffect>, lang?: string): ContentItem[] {
  const out: ContentItem[] = [];
  for (const c of states) {
    if (c.status !== "accepted") continue;
    if (lang && c.item.lang !== lang) continue;
    if (effects && isDemoted(effects.get(c.item.id))) continue; // 학습효과로 강등
    out.push({ ...c.item, quality: c.item.quality === "draft" ? "verified" : c.item.quality });
  }
  return out;
}
