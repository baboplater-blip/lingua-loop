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

/** MLE 능력 추정(Newton-Raphson, 2PL). 소수 반복으로 수렴. */
export function estimateAbility(responses: ResponseObs[], iterations = 30): { theta: number; se: number } {
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
  let info = 0;
  for (const r of responses) {
    const p = sigmoid(r.a * (theta - r.b));
    info += r.a * r.a * p * (1 - p);
  }
  const se = info > 0 ? 1 / Math.sqrt(info) : Infinity;
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
  se: number;
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
    if (obs.length >= 4 && est.se < seTarget) break;
  }

  const final = estimateAbility(obs);
  return { theta: final.theta, se: final.se, used: [...used] };
}
