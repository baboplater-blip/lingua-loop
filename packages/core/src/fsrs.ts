// 적응형 간격반복(FSRS 간이 구현). SSOT: fsrs-spaced-repetition.
// 목표: 최소 복습으로 목표 리텐션 유지(규칙 1·2). 결정적.
// 파라미터화 — 진화 루프가 데이터로 재적합(fsrs-optimize). 기본값은 합리적 시작점.
import type { Grade } from "./types.ts";

const S_MIN = 0.1;
const INIT_D: Record<Grade, number> = { again: 7, hard: 6, good: 5, easy: 4 };
const GRADE_SCORE: Record<Grade, number> = { again: 0, hard: 1, good: 2, easy: 3 };
const GRADE_GAIN: Record<Grade, number> = { again: 0, hard: 0.4, good: 1.0, easy: 1.6 };

export interface FsrsParams {
  initS: Record<Grade, number>; // 첫 복습 초기 안정성(일)
  initScale: number; // 초기 안정성 전역 배율
  lapseFactor: number; // 오답 시 안정성 감쇠
  gainFactor: number; // 정답 시 안정성 증가 스케일
  difficultyStep: number; // 난이도 조정 폭
}

export const DEFAULT_FSRS_PARAMS: FsrsParams = {
  initS: { again: 0.2, hard: 0.8, good: 2.0, easy: 5.0 },
  initScale: 1.0,
  lapseFactor: 0.4,
  gainFactor: 2.0,
  difficultyStep: 0.1,
};

export interface CardState {
  stability: number; // 일
  difficulty: number; // 1..10
}

/** 경과 t일 뒤 회상 성공확률 R = (1 + t/(9S))^-1 */
export function retrievability(stability: number, elapsedDays: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

/** R 이 target 으로 떨어지는 시점(일) = 9S(1/target - 1) */
export function intervalForRetention(stability: number, target = 0.9): number {
  return 9 * stability * (1 / target - 1);
}

export function initCard(grade: Grade, params: FsrsParams = DEFAULT_FSRS_PARAMS): CardState {
  return { stability: params.initS[grade] * params.initScale, difficulty: INIT_D[grade] };
}

/**
 * 복습 결과로 다음 카드 상태 계산.
 * - 오답(again): 안정성 급감(lapse), 난이도 상승.
 * - 정답: 안정성 증가 — 난이도 낮을수록·회상이 아슬아슬할수록(R 낮음) 크게(바람직한 어려움).
 */
export function nextState(state: CardState | null, grade: Grade, elapsedDays: number, params: FsrsParams = DEFAULT_FSRS_PARAMS): CardState {
  if (!state) return initCard(grade, params);
  const R = retrievability(state.stability, elapsedDays);
  let D = state.difficulty + params.difficultyStep * (2 - GRADE_SCORE[grade]); // 오답일수록 어려워짐
  D = Math.min(10, Math.max(1, D));

  let S: number;
  if (grade === "again") {
    S = Math.max(S_MIN, state.stability * params.lapseFactor);
  } else {
    const easiness = (11 - D) / 10; // 0.1..1
    const surprise = 1 - R; // 거의 잊었을 때 복습하면 이득 큼
    const inc = 1 + params.gainFactor * easiness * surprise * GRADE_GAIN[grade];
    S = state.stability * Math.max(1.05, inc);
  }
  return { stability: S, difficulty: D };
}

/** 다음 복습까지 일수(목표 리텐션 기준) */
export function dueInDays(state: CardState, target = 0.9): number {
  return intervalForRetention(state.stability, target);
}
