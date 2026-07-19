// 적응형 배치(CAT). SSOT: placement-adaptive-testing. 최소 문항으로 능력 추정.
import { sigmoid } from "./sim.ts";

export interface CalibratedItem {
  id: string;
  b: number; // 난이도(logit)
  a?: number; // 변별도
}

export interface ResponseObs {
  b: number;
  a: number;
  correct: boolean;
}

/** θ 유효 범위(현실 IRT logit) — 전부 정답/오답 응답의 MLE 발산을 코어에서 클램프(불변식 내장). */
export const THETA_MIN = -3.5;
export const THETA_MAX = 3.5;

/**
 * MLE 능력 추정(Newton-Raphson, 2PL). 소수 반복으로 수렴.
 * 전부 정답/오답이면 MLE θ가 ±∞로 발산 → 코어에서 [-3.5, 3.5] 로 클램프하고, se 도 비현실적으로 크면
 * null(불신뢰)로 정규화한다 — 서버 레이어의 임기응변 클램프에 의존하지 않고 API 자체가 안전.
 */
export function estimateAbility(responses: ResponseObs[], iterations = 30): { theta: number; se: number | null } {
  let theta = 0;
  for (let iter = 0; iter < iterations; iter++) {
    let grad = 0;
    let info = 0;
    for (const r of responses) {
      const p = sigmoid(r.a * (theta - r.b));
      grad += r.a * ((r.correct ? 1 : 0) - p);
      info += r.a * r.a * p * (1 - p);
    }
    if (info < 1e-9) break;
    const step = grad / info;
    theta += Math.max(-1, Math.min(1, step)); // 스텝 클램프(안정)
    if (Math.abs(step) < 1e-4) break;
  }
  // θ가 범위 경계에 닿았다 = MLE 발산(전부 정답/오답 등 분리 가능 패턴) = 검열된 추정 → se 불신뢰(null)
  const censored = theta <= THETA_MIN || theta >= THETA_MAX;
  theta = Math.max(THETA_MIN, Math.min(THETA_MAX, theta)); // θ 범위 클램프(발산 방지)
  let info = 0;
  for (const r of responses) {
    const p = sigmoid(r.a * (theta - r.b));
    info += r.a * r.a * p * (1 - p);
  }
  const seRaw = info > 0 ? 1 / Math.sqrt(info) : Infinity;
  // 검열되었거나 비현실적으로 큰 se 는 null(불신뢰) — 정지규칙이 오작동하지 않도록
  const se = censored || !Number.isFinite(seRaw) || seRaw > 10 ? null : seRaw;
  return { theta, se };
}

/** 최대정보 문항 선택(현 θ에서 b 가 가까운, 변별도 높은). 노출 제외 지원. */
export function pickNextItem(theta: number, bank: CalibratedItem[], used: Set<string>): CalibratedItem | null {
  let best: CalibratedItem | null = null;
  let bestInfo = -Infinity;
  for (const it of bank) {
    if (used.has(it.id)) continue;
    const a = it.a ?? 1;
    const p = sigmoid(a * (theta - it.b));
    const info = a * a * p * (1 - p);
    if (info > bestInfo) {
      bestInfo = info;
      best = it;
    }
  }
  return best;
}

export interface CatResult {
  theta: number;
  se: number | null; // 정보 부족(전부 정답/오답)이면 null(불신뢰)
  used: string[];
}

/**
 * CAT 실행: respond(item)→정답여부 콜백으로 최소 문항 배치.
 * 정지: SE < seTarget 또는 maxItems.
 */
export function runCat(
  bank: CalibratedItem[],
  respond: (item: CalibratedItem) => boolean,
  opts: { seTarget?: number; maxItems?: number; startTheta?: number } = {},
): CatResult {
  const seTarget = opts.seTarget ?? 0.35;
  const maxItems = opts.maxItems ?? 30;
  const used = new Set<string>();
  const obs: ResponseObs[] = [];
  let theta = opts.startTheta ?? 0;

  for (let i = 0; i < maxItems; i++) {
    const item = pickNextItem(theta, bank, used);
    if (!item) break;
    used.add(item.id);
    const correct = respond(item);
    obs.push({ b: item.b, a: item.a ?? 1, correct });
    const est = estimateAbility(obs);
    theta = est.theta;
    if (obs.length >= 4 && est.se !== null && est.se < seTarget) break; // se null(불신뢰)이면 계속
  }

  const final = estimateAbility(obs);
  return { theta: final.theta, se: final.se, used: [...used] };
}
