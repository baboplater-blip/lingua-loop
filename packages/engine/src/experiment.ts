// A/B 실험 — 개선안을 시뮬레이션 코호트로 검증. SSOT: ab-experiment-framework.
// 절대 규율: 가드레일 = 학습성과(리텐션). 참여도(복습수)는 판정 근거가 아니다(규칙 1).
import { nextState, dueInDays, DEFAULT_FSRS_PARAMS, mulberry32, trueRecallProb, trueReview } from "../../core/src/index.ts";
import type { FsrsParams, CardState } from "../../core/src/index.ts";

export interface CohortOutcome {
  retention: number; // 지평선에서 평균 회상확률(=학습성과)
  reviews: number; // 평균 복습수(=참여도, 판정 근거 아님)
}

type IntervalFn = (card: CardState) => number;
type UpdateFn = (card: CardState | null, recalled: boolean, elapsed: number) => CardState;

function simulate(nextInterval: IntervalFn, update: UpdateFn, seed: number, horizon: number): CohortOutcome {
  const rng = mulberry32(seed);
  let trueStab = 3.0;
  let card = update(null, true, 0);
  let lastDay = 0;
  let reviews = 0;
  let day = Math.max(0.5, nextInterval(card));
  for (let g = 0; g < 1000 && day < horizon; g++) {
    const elapsed = day - lastDay;
    const recalled = rng() < trueRecallProb(trueStab, elapsed);
    reviews += 1;
    trueStab = trueReview(trueStab, recalled);
    card = update(card, recalled, elapsed);
    lastDay = day;
    day = day + Math.max(0.5, nextInterval(card));
  }
  return { retention: trueRecallProb(trueStab, horizon - lastDay), reviews };
}

function avg(seeds: number[], run: (s: number) => CohortOutcome): CohortOutcome {
  let r = 0;
  let v = 0;
  for (const s of seeds) {
    const o = run(s);
    r += o.retention;
    v += o.reviews;
  }
  return { retention: r / seeds.length, reviews: v / seeds.length };
}

/** FSRS 파라미터 기반 코호트(간격·갱신 모두 params 반영). */
export function simulateCohortParams(params: FsrsParams, seeds: number[], horizon = 60): CohortOutcome {
  return avg(seeds, (s) => simulate((c) => dueInDays(c), (c, rec, el) => nextState(c, rec ? "good" : "again", el, params), s, horizon));
}

/** 임의 간격함수 기반 코호트(다크패턴/과잉복습 실험용). */
export function simulateCohortInterval(nextInterval: IntervalFn, seeds: number[], horizon = 60): CohortOutcome {
  return avg(seeds, (s) => simulate(nextInterval, (c, rec, el) => nextState(c, rec ? "good" : "again", el, DEFAULT_FSRS_PARAMS), s, horizon));
}

export interface AbOutcome {
  control: CohortOutcome;
  treatment: CohortOutcome;
  retentionDelta: number;
  reviewDelta: number;
  accept: boolean;
  reason: string;
}

/**
 * 가드레일 판정(규칙 1). 두 종류의 학습성과 개선만 채택:
 *  (a) 리텐션 개선 — 같은 조건에서 더 잘 기억.
 *  (b) 효율 개선 — 리텐션 비열등(≥ -ε)하며 복습 수 감소 → Time-to-Mastery 단축(북스타).
 * 참여도 부풀리기(복습만 증가, 성과 정체)는 반려. 리텐션 하락도 반려.
 */
function judge(control: CohortOutcome, treatment: CohortOutcome, epsilon: number): AbOutcome {
  const retentionDelta = treatment.retention - control.retention;
  const reviewDelta = treatment.reviews - control.reviews;
  const retentionGain = retentionDelta > epsilon;
  const efficiencyGain = retentionDelta >= -epsilon && reviewDelta < -0.5;
  const accept = retentionGain || efficiencyGain;
  let reason: string;
  if (retentionGain) reason = "학습성과(리텐션) 개선 → 배포";
  else if (efficiencyGain) reason = "동일 성과·복습 절감(효율↑ = TTM 단축) → 배포";
  else if (reviewDelta > 0) reason = "복습만 늘고 성과개선 없음 → 반려(규칙1: 참여는 목표 아님)";
  else reason = "성과개선 없음 → 반려";
  return { control, treatment, retentionDelta, reviewDelta, accept, reason };
}

export function abParams(control: FsrsParams, treatment: FsrsParams, seeds: number[], epsilon = 0.01): AbOutcome {
  return judge(simulateCohortParams(control, seeds), simulateCohortParams(treatment, seeds), epsilon);
}

export function abInterval(control: IntervalFn, treatment: IntervalFn, seeds: number[], epsilon = 0.01): AbOutcome {
  return judge(simulateCohortInterval(control, seeds), simulateCohortInterval(treatment, seeds), epsilon);
}
