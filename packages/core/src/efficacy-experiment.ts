// 사전등록 통제 실험 — 관측 Gain Score(단일 코호트)를 **인과 증거**로 끌어올리는 도구.
// SSOT: ab-experiment-framework. 규칙 17(인과는 사전등록·통제군 필요)·규칙 1(성과가 진실, 참여도 금지)·규칙 5(결정적 파생).
//
// 왜 필요한가: computeGainScore 는 사전→사후 *관측* 상승일 뿐(성숙·평균회귀·자기선택이 섞임).
// "도구가 가르쳤다"를 주장하려면 (a) 데이터를 보기 전에 가설·1차 결과·표본을 고정(사전등록)하고,
// (b) 학습자를 통제군/실험군에 무작위·재현 가능하게 배정한 뒤, (c) 두 집단의 Gain 을 비교해야 한다.
// 이 모듈은 그 측정 기구다. 실제 개입(실험군에 다른 콘텐츠/스케줄 제공)의 배선은 실험 설계자 몫.
import type { LearningEvent } from "./types.ts";
import { gainPairs } from "./efficacy.ts";

/**
 * 사전등록 프로토콜 — **데이터 수집 전에** 확정한다(p-해킹·사후 결과 취사선택 방지, 규칙 17).
 * primaryOutcome 은 학습성과(gainScore)만 허용 — 참여도(세션·스트릭)를 1차 결과로 두는 실험은 규칙 1 위반이라 등록 자체를 거부한다.
 */
/**
 * 실험 개입 — 실험군/통제군이 실제로 무엇이 다른지 선언한다. 선택 사항(없으면 순수 관측 비교).
 * `practice_order`: 연습 순서(실험군=인터리빙 교차연습, 통제군=블록연습). SLA 근거 레버·분량 불변(규칙 1).
 * 서빙 계층(serveItems)이 학습자 배정 팔에 따라 이 개입을 적용한다.
 */
export type Intervention = { kind: "practice_order" };

export interface PreRegistration {
  experimentId: string;
  hypothesis: string; // 검증할 가설(예: "교차연습이 reading θ 상승을 키운다")
  primaryOutcome: "gainScore"; // 1차 결과 = 학습성과. 다른 값은 허용 안 함(규칙 1)
  treatmentShare: number; // 실험군 배정 비율 0..1
  minSamplePerArm: number; // 사전 확정 표본. 두 팔 중 하나라도 미달이면 무결론(underpowered)
  guardrail: string; // 학습성과 가드레일 서술(예: "통제군 대비 리텐션 비열등")
  registeredTs: string; // 등록 시각(ISO). 학습 데이터보다 앞서야 사전등록으로 유효
  intervention?: Intervention; // 실험군에 실제로 배선할 개입(없으면 관측 비교만)
}

/** 등록 유효성 — 1차 결과가 학습성과이고 배정/표본이 온전한지(규칙 1·17). */
export function validatePreRegistration(p: Partial<PreRegistration>): { ok: boolean; reason?: string } {
  if (!p.experimentId || typeof p.experimentId !== "string") return { ok: false, reason: "experimentId 필요" };
  if (p.primaryOutcome !== "gainScore") return { ok: false, reason: "1차 결과는 학습성과(gainScore)만 — 참여도 금지(규칙 1)" };
  if (typeof p.treatmentShare !== "number" || p.treatmentShare <= 0 || p.treatmentShare >= 1) return { ok: false, reason: "treatmentShare 는 0<share<1" };
  if (typeof p.minSamplePerArm !== "number" || p.minSamplePerArm < 1) return { ok: false, reason: "minSamplePerArm ≥ 1" };
  return { ok: true };
}

// ── 결정적 배정 — 상태 없이 (실험, 학습자)만으로 재현(규칙 5). FNV-1a + 최종 믹싱. ──
// FNV-1a 만으로는 순차 키("L0","L1",…)에서 상위 비트 분포가 편향돼 배정이 한쪽으로 쏠린다(코호트 불균형).
// murmur3 스타일 avalanche 로 비트를 섞어 ~50/50 균일 배정을 보장한다.
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * 무작위·결정적 배정. 같은 (실험,학습자)는 언제 돌려도 같은 팔 — 저장 없이 재현(규칙 5).
 * experimentId 를 해시에 섞어 실험마다 배정이 독립(한 학습자가 늘 실험군이 되는 편향 방지).
 */
export function assignVariant(experimentId: string, learnerRef: string, treatmentShare = 0.5): "control" | "treatment" {
  const u = hash32(experimentId + "|" + learnerRef) / 0x100000000; // [0,1)
  return u < treatmentShare ? "treatment" : "control";
}

/** 한 코호트의 Gain 분포(사후−사전 per (학습자,스킬)). */
export interface CohortGain {
  n: number;
  meanGain: number | null;
  sdGain: number | null; // 표본 표준편차(n-1). n<2면 null
  gains: number[];
}

function cohortGain(events: readonly LearningEvent[]): CohortGain {
  const gains = gainPairs(events).map((p) => p.post - p.pre);
  const n = gains.length;
  if (n === 0) return { n: 0, meanGain: null, sdGain: null, gains };
  const mean = gains.reduce((a, b) => a + b, 0) / n;
  const sd = n >= 2 ? Math.sqrt(gains.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : null;
  return { n, meanGain: mean, sdGain: sd, gains };
}

export type Verdict = "treatment_better" | "control_better" | "no_difference" | "underpowered";

export interface ExperimentResult {
  experimentId: string;
  control: CohortGain;
  treatment: CohortGain;
  diffInMeanGain: number | null; // treatment − control (양수 = 실험군이 더 상승)
  effectSize: number | null; // 집단 간 Cohen's d(pooled SD). 표본 부족/분산 0이면 null
  ci95: [number, number] | null; // 평균차 95% 신뢰구간(정규 근사 — 소표본은 근사임에 주의)
  powered: boolean; // 두 팔 모두 minSamplePerArm 충족
  retroactive: boolean; // 등록이 데이터보다 늦음 → 사전등록 무효(사후 분석)
  verdict: Verdict;
  caveat: string; // 인과 주의(규칙 17)
}

/**
 * 두 코호트의 Gain 을 비교해 집단 간 효과크기·평균차 신뢰구간·판정을 낸다. 결정적·순수.
 * 판정 규율: **사전 확정 표본을 채웠고(powered)** 평균차 95% CI 가 0을 배제할 때만 방향을 주장한다.
 * 그 외에는 no_difference(또는 underpowered) — 소표본에서 섣부른 인과 주장을 막는다(규칙 17).
 */
export function compareCohorts(
  prereg: PreRegistration,
  controlEvents: readonly LearningEvent[],
  treatmentEvents: readonly LearningEvent[],
  opts: { earliestDataTs?: number } = {},
): ExperimentResult {
  const control = cohortGain(controlEvents);
  const treatment = cohortGain(treatmentEvents);
  const powered = control.n >= prereg.minSamplePerArm && treatment.n >= prereg.minSamplePerArm;

  let diff: number | null = null;
  let effectSize: number | null = null;
  let ci95: [number, number] | null = null;
  if (control.meanGain !== null && treatment.meanGain !== null) {
    diff = treatment.meanGain - control.meanGain;
    if (control.n >= 2 && treatment.n >= 2 && control.sdGain !== null && treatment.sdGain !== null) {
      const nC = control.n, nT = treatment.n;
      const varC = control.sdGain ** 2, varT = treatment.sdGain ** 2;
      const pooledSd = Math.sqrt(((nC - 1) * varC + (nT - 1) * varT) / (nC + nT - 2));
      if (pooledSd > 0) effectSize = diff / pooledSd;
      const se = Math.sqrt(varC / nC + varT / nT); // Welch 표준오차
      ci95 = [diff - 1.96 * se, diff + 1.96 * se];
    }
  }

  let verdict: Verdict;
  if (!powered) verdict = "underpowered";
  else if (ci95 && ci95[0] > 0) verdict = "treatment_better";
  else if (ci95 && ci95[1] < 0) verdict = "control_better";
  else verdict = "no_difference";

  const retroactive = opts.earliestDataTs !== undefined && Date.parse(prereg.registeredTs) > opts.earliestDataTs;
  const caveat =
    "관측 비교값 — 인과 결론은 무작위 배정·사전등록·가드레일 충족 시에만(규칙 17). 95% CI 는 정규 근사(소표본 주의)." +
    (retroactive ? " ⚠️ 등록이 데이터보다 늦음 — 사전등록 무효(사후 분석일 뿐)." : "");

  return { experimentId: prereg.experimentId, control, treatment, diffInMeanGain: diff, effectSize, ci95, powered, retroactive, verdict, caveat };
}
