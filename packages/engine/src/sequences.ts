// 이벤트 로그 → (학습자×KC) 복습 시퀀스. 진화 분석·FSRS 재적합의 입력.
import type { LearningEvent } from "../../core/src/index.ts";

const DAY_MS = 86400000;

export interface ReviewObs {
  elapsedDays: number; // 직전 복습 이후 경과(첫 학습=0)
  recalled: boolean;
}
export type Sequence = ReviewObs[];

function recalledOf(ev: LearningEvent): boolean | null {
  const g = ev.payload["grade"];
  if (g === "again") return false;
  if (g === "hard" || g === "good" || g === "easy") return true;
  const c = ev.payload["correct"];
  if (typeof c === "boolean") return c;
  return null;
}

/** item.response·review.done 이벤트를 (학습자|KC)별 시간순 복습 시퀀스로. 길이 ≥2 만. */
export function extractSequences(events: readonly LearningEvent[]): Sequence[] {
  const map = new Map<string, { ts: number; recalled: boolean }[]>();
  for (const ev of events) {
    if (ev.type !== "item.response" && ev.type !== "review.done") continue;
    if (!ev.kc) continue;
    const recalled = recalledOf(ev);
    if (recalled === null) continue;
    const ts = Date.parse(ev.ts);
    for (const kc of ev.kc) {
      const key = ev.learnerRef + "|" + kc;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ ts, recalled });
    }
  }
  const seqs: Sequence[] = [];
  for (const arr of map.values()) {
    arr.sort((a, b) => a.ts - b.ts);
    const seq: Sequence = [];
    let last: number | null = null;
    for (const o of arr) {
      const elapsed = last === null ? 0 : Math.max(0, (o.ts - last) / DAY_MS);
      seq.push({ elapsedDays: elapsed, recalled: o.recalled });
      last = o.ts;
    }
    if (seq.length >= 2) seqs.push(seq);
  }
  return seqs;
}
