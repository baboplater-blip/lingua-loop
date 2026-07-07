// 시뮬레이션 학습자(효능 검증용 지상진리 모델). SSOT: test.md §6.
// 코어 FSRS/캘리브레이션과 독립된 "진짜" 기억·응답 모델 — 결정적(시드).

/** 결정적 PRNG (mulberry32) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** 지상진리 기억: 경과 t일 뒤 실제 회상확률 (지수 망각) */
export function trueRecallProb(stability: number, elapsedDays: number): number {
  if (stability <= 0) return 0;
  return Math.exp(-elapsedDays / stability);
}

/** 복습 결과로 지상진리 안정성 갱신: 성공 회상은 강화, 실패는 낮게 리셋 */
export function trueReview(stability: number, recalled: boolean): number {
  if (recalled) return stability * 1.9 + 0.5;
  return Math.max(0.5, stability * 0.3);
}

/** IRT 응답: 능력 θ, 문항난이도 b → 정답 여부(2PL, a=1) */
export function abilityResponse(theta: number, b: number, rng: () => number, a = 1): boolean {
  return rng() < sigmoid(a * (theta - b));
}

/** 표준정규 근사(Box-Muller) */
export function gaussian(rng: () => number, mean = 0, sd = 1): number {
  const u1 = Math.max(1e-9, rng());
  const u2 = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
