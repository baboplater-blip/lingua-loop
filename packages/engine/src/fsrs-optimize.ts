// FSRS 파라미터 재적합 — 데이터로 스케줄러를 개선(규칙 2·17). SSOT: fsrs-spaced-repetition.
// 복습 로그의 회상 예측 로그손실을 최소화하는 파라미터를 좌표하강으로 탐색.
import { retrievability, nextState, DEFAULT_FSRS_PARAMS } from "../../core/src/index.ts";
import type { FsrsParams, CardState, Grade } from "../../core/src/index.ts";
import type { Sequence } from "./sequences.ts";

function logloss(p: number, y: number): number {
  const e = 1e-6;
  const pp = Math.min(1 - e, Math.max(e, p));
  return -(y ? Math.log(pp) : Math.log(1 - pp));
}

/** 파라미터의 회상 예측 정확도(평균 로그손실, 낮을수록 좋음). */
export function evaluateParams(seqs: Sequence[], params: FsrsParams = DEFAULT_FSRS_PARAMS): number {
  let sum = 0;
  let n = 0;
  for (const seq of seqs) {
    let card: CardState | null = null;
    for (let i = 0; i < seq.length; i++) {
      const obs = seq[i];
      const grade: Grade = obs.recalled ? "good" : "again";
      if (i > 0 && card) {
        const p = retrievability(card.stability, obs.elapsedDays);
        sum += logloss(p, obs.recalled ? 1 : 0);
        n += 1;
      }
      card = nextState(card, grade, obs.elapsedDays, params);
    }
  }
  return n ? sum / n : 0;
}

const GRID: Record<string, number[]> = {
  gainFactor: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
  lapseFactor: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
  initScale: [0.5, 0.75, 1, 1.25, 1.5, 2, 3],
  difficultyStep: [0, 0.05, 0.1, 0.15, 0.2],
};

export interface OptResult {
  params: FsrsParams;
  errorBefore: number;
  errorAfter: number;
}

/** 좌표하강 3패스로 예측손실 최소 파라미터 탐색. */
export function optimizeFsrsParams(train: Sequence[], init: FsrsParams = DEFAULT_FSRS_PARAMS): OptResult {
  let best: FsrsParams = { ...init, initS: { ...init.initS } };
  const errorBefore = evaluateParams(train, best);
  let bestErr = errorBefore;
  for (let pass = 0; pass < 3; pass++) {
    for (const key of Object.keys(GRID)) {
      for (const v of GRID[key]) {
        const cand = { ...best, initS: { ...best.initS }, [key]: v } as FsrsParams;
        const err = evaluateParams(train, cand);
        if (err < bestErr - 1e-9) {
          bestErr = err;
          best = cand;
        }
      }
    }
  }
  return { params: best, errorBefore, errorAfter: bestErr };
}
