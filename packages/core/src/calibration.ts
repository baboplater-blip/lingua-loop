// IRT/ELO 문항 캘리브레이션. SSOT: irt-calibration. 난이도·능력은 데이터로만(규칙 3).
import type { ContentItem } from "./types.ts";
import { sigmoid } from "./sim.ts";

export interface Response {
  learner: string;
  item: string;
  correct: boolean;
}

export interface CalibrationResult {
  itemDifficulty: Record<string, number>; // logit 스케일 b
  ability: Record<string, number>; // θ
  itemSE: Record<string, number>; // 표준오차 근사(노출수 기반)
  nResponses: number;
}

export interface EloOptions {
  k?: number; // 학습률
  passes?: number; // 반복 통과
}

/**
 * ELO 온라인 캘리브레이션(로짓 스케일). 표본 부족 시에도 안정.
 * 정답 → 능력↑·문항난이도↓. 여러 통과로 수렴.
 */
export function eloCalibrate(responses: Response[], opts: EloOptions = {}): CalibrationResult {
  const k = opts.k ?? 0.4;
  const passes = opts.passes ?? 8;
  const ability: Record<string, number> = {};
  const itemDifficulty: Record<string, number> = {};
  const exposure: Record<string, number> = {};

  for (const r of responses) {
    ability[r.learner] ??= 0;
    itemDifficulty[r.item] ??= 0;
    exposure[r.item] = (exposure[r.item] ?? 0) + 1;
  }

  for (let pass = 0; pass < passes; pass++) {
    const decay = k / (1 + pass * 0.3); // 점진 축소로 안정화
    for (const r of responses) {
      const p = sigmoid(ability[r.learner] - itemDifficulty[r.item]);
      const y = r.correct ? 1 : 0;
      ability[r.learner] += decay * (y - p);
      itemDifficulty[r.item] += decay * (p - y); // 맞히면 쉬워짐
    }
  }

  const itemSE: Record<string, number> = {};
  for (const item of Object.keys(itemDifficulty)) {
    itemSE[item] = 1 / Math.sqrt(1 + (exposure[item] ?? 0)); // 노출 많을수록 SE↓(근사)
  }

  return { itemDifficulty, ability, itemSE, nResponses: responses.length };
}

/**
 * 캘리브레이션 결과를 문항에 반영: difficulty 갱신, quality → calibrated.
 * SE 가 큰(표본 부족) 문항은 승격하지 않음(과신 금지).
 */
export function applyCalibration(items: ContentItem[], result: CalibrationResult, seThreshold = 0.5): ContentItem[] {
  return items.map((it) => {
    const b = result.itemDifficulty[it.id];
    if (b === undefined) return it;
    const se = result.itemSE[it.id] ?? 1;
    const calibrated = se <= seThreshold;
    return {
      ...it,
      difficulty: b,
      discrimination: it.discrimination ?? 1,
      quality: calibrated && it.quality !== "retired" ? "calibrated" : it.quality,
    };
  });
}

/** 이상 문항: 정답률 극단(≈0/≈1) → 리뷰 큐. */
export function flagAnomalousItems(responses: Response[], loBound = 0.03, hiBound = 0.97, minN = 20): string[] {
  const stat: Record<string, { n: number; correct: number }> = {};
  for (const r of responses) {
    stat[r.item] ??= { n: 0, correct: 0 };
    stat[r.item].n += 1;
    if (r.correct) stat[r.item].correct += 1;
  }
  const flagged: string[] = [];
  for (const [item, s] of Object.entries(stat)) {
    if (s.n < minN) continue;
    const rate = s.correct / s.n;
    if (rate <= loBound || rate >= hiBound) flagged.push(item);
  }
  return flagged;
}
