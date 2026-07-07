// 합성 학습 데이터 생성(테스트·데모용). 지상진리 기억(sim)으로 이벤트 로그를 만든다.
// 실사용 데이터가 없을 때 진화 루프의 자기개선을 결정적으로 검증하기 위한 것.
import { makeEvent, mulberry32, gaussian, trueRecallProb, trueReview } from "../../core/src/index.ts";
import type { LearningEvent } from "../../core/src/index.ts";

const DAY = 86400000;

export interface SynthOptions {
  learners: number;
  kcs: string[];
  reviewsPerKc: number;
  seed: number;
  itemPrefix?: string;
}

/** 학습자들이 각 KC를 랜덤 간격(1~8일)으로 복습한 이벤트 로그. */
export function synthEvents(opts: SynthOptions): LearningEvent[] {
  const rng = mulberry32(opts.seed);
  const events: LearningEvent[] = [];
  const start = Date.parse("2026-01-01T00:00:00Z");
  const prefix = opts.itemPrefix ?? "itm";

  for (let l = 0; l < opts.learners; l++) {
    const learner = "l" + l;
    for (const kc of opts.kcs) {
      const itemId = prefix + "." + kc;
      let trueStab = Math.max(0.8, gaussian(rng, 3, 0.8));
      let t = start + Math.floor(rng() * 3) * DAY;
      events.push(makeEvent({ learnerRef: learner, type: "item.response", kc: [kc], itemId, payload: { correct: true }, ts: new Date(t).toISOString() }));
      for (let r = 0; r < opts.reviewsPerKc; r++) {
        const gap = 1 + Math.floor(rng() * 8);
        t += gap * DAY;
        const recalled = rng() < trueRecallProb(trueStab, gap);
        trueStab = trueReview(trueStab, recalled);
        events.push(makeEvent({ learnerRef: learner, type: "review.done", kc: [kc], itemId, payload: { grade: recalled ? "good" : "again" }, ts: new Date(t).toISOString() }));
      }
    }
  }
  return events;
}
