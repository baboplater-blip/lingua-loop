// 콘텐츠 학습효과 측정(언어 무관, 규칙 11). SSOT: ab-experiment-framework·community-contribution-workflow.
// "인기(승인 수)가 아니라 학습효과가 랭킹의 최종 진실"(규칙 1). 사용 데이터로 문항의 실효를 판정한다.
// 학습효과 = ① 바람직한 난이도(너무 쉽거나 어렵지 않음) + ② 변별도(능력 높은 학습자가 더 맞힘).
import type { Response } from "./calibration.ts";
import { eloCalibrate } from "./calibration.ts";

export type ItemHealth = "insufficient" | "healthy" | "too_easy" | "too_hard" | "weak";

export interface ItemEffect {
  itemId: string;
  n: number;
  correctRate: number;
  discrimination: number; // 점이연 상관(−1..1): 능력 높은 학습자가 더 맞히면 양수
  effectScore: number; // 0..1 종합(난이도 적합 + 변별)
  enoughData: boolean;
  health: ItemHealth;
}

export interface EffectOptions {
  minN?: number; // 판정에 필요한 최소 응답 수
  targetRate?: number; // 바람직한 정답률(desirable difficulty)
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** 점이연 상관: 학습자 능력(연속) vs 정오(이분). 양수·클수록 변별 좋음. */
function pointBiserial(pairs: { ability: number; correct: boolean }[]): number {
  const n = pairs.length;
  if (n < 2) return 0;
  const abilities = pairs.map((p) => p.ability);
  const mean = abilities.reduce((a, b) => a + b, 0) / n;
  const variance = abilities.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  if (sd === 0) return 0;
  const correct = pairs.filter((p) => p.correct);
  const wrong = pairs.filter((p) => !p.correct);
  if (correct.length === 0 || wrong.length === 0) return 0; // 전부 정답/오답이면 변별 판정 불가
  const m1 = correct.reduce((a, b) => a + b.ability, 0) / correct.length;
  const m0 = wrong.reduce((a, b) => a + b.ability, 0) / wrong.length;
  const p = correct.length / n;
  return ((m1 - m0) / sd) * Math.sqrt(p * (1 - p));
}

/**
 * 응답 로그에서 문항별 학습효과 산출. ELO로 학습자 능력을 추정해 변별도를 계산한다.
 * 표본이 부족하면 enoughData=false(중립) — 데이터로만 판정(규칙 3, 과신 금지).
 */
export function itemEffects(responses: Response[], opts: EffectOptions = {}): Map<string, ItemEffect> {
  const minN = opts.minN ?? 20;
  const target = opts.targetRate ?? 0.75;
  const cal = eloCalibrate(responses);
  const byItem = new Map<string, { ability: number; correct: boolean }[]>();
  for (const r of responses) {
    const arr = byItem.get(r.item) ?? [];
    arr.push({ ability: cal.ability[r.learner] ?? 0, correct: r.correct });
    byItem.set(r.item, arr);
  }
  const out = new Map<string, ItemEffect>();
  for (const [itemId, pairs] of byItem) {
    const n = pairs.length;
    const correctRate = pairs.filter((p) => p.correct).length / n;
    const discrimination = pointBiserial(pairs);
    const enoughData = n >= minN;
    // 난이도 적합: target 에서 멀수록 감점. **방향별 정규화** — target 위(너무 쉬움)는 (1-target), 아래(너무 어려움)는 target
    // 으로 나눠 양 극단(정답률 1.0·0.0)이 동일하게 fit=0 이 되게 한다(비대칭 결함 수정: too_easy 부당 우대 방지).
    const denom = correctRate >= target ? 1 - target : target;
    const difficultyFit = clamp01(1 - ((correctRate - target) / Math.max(denom, 1e-9)) ** 2);
    const discNorm = clamp01((discrimination + 0.4) / 0.8); // −0.4..0.4 → 0..1
    const effectScore = enoughData ? clamp01(0.5 * difficultyFit + 0.5 * discNorm) : 0.5;
    let health: ItemHealth = "insufficient";
    if (enoughData) {
      // 극단 정답률을 먼저 판정 — 이 경우 변별도는 자연히 0이라 weak 로 오판하면 안 됨
      if (correctRate >= 0.95) health = "too_easy";
      else if (correctRate <= 0.35) health = "too_hard";
      else if (discrimination < 0.05) health = "weak"; // 중간 난이도인데 변별 없음/역전 = 망가진 문항
      else health = "healthy";
    }
    out.set(itemId, { itemId, n, correctRate, discrimination, effectScore, enoughData, health });
  }
  return out;
}
