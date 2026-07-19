// 학습자 상태 파생(이벤트 리플레이). SSOT: learner-model-spec.
// 상태는 이벤트에서 재현 가능(규칙 5) — deriveState 는 결정적·멱등.
import type { LearningEvent, LearnerState, KCMemory, Grade, Skill } from "./types.ts";
import { nextState, dueInDays, type CardState } from "./fsrs.ts";

const DAY_MS = 86400000;

function emptyMemory(): KCMemory {
  return { mastery: 0, stability: 0, difficulty: 5, lastReviewTs: null, dueTs: null, reps: 0 };
}

// 간이 BKT 갱신(정답이면 상향, 오답이면 하향). stability/difficulty 는 FSRS 가 관리.
function updateMastery(prev: number, correct: boolean): number {
  const slip = 0.1;
  const guess = 0.2;
  const learn = 0.25;
  const pLearned = prev;
  // 관측(정오답) 기반 사후확률
  const pObs = correct
    ? (pLearned * (1 - slip)) / (pLearned * (1 - slip) + (1 - pLearned) * guess)
    : (pLearned * slip) / (pLearned * slip + (1 - pLearned) * (1 - guess));
  // 학습 전이
  return pObs + (1 - pObs) * learn;
}

function gradeOf(ev: LearningEvent): Grade | null {
  const g = ev.payload["grade"];
  if (g === "again" || g === "hard" || g === "good" || g === "easy") return g;
  const correct = ev.payload["correct"];
  if (typeof correct === "boolean") return correct ? "good" : "again";
  return null;
}

/**
 * 이벤트 로그를 리플레이해 학습자 상태 파생.
 * item.response / review.done → KC 기억·숙달 갱신.
 * assessment.item → 스킬 능력(θ) 갱신.
 */
export function deriveState(events: readonly LearningEvent[], learnerRef: string, lang: string): LearnerState {
  const state: LearnerState = { learnerRef, lang, kcState: {}, ability: {}, fromEventCount: 0 };

  for (const ev of events) {
    if (ev.learnerRef !== learnerRef) continue;
    state.fromEventCount += 1;

    if (ev.type === "item.response" || ev.type === "review.done") {
      const grade = gradeOf(ev);
      if (!grade || !Array.isArray(ev.kc)) continue; // 비배열 kc 방어(심층) — 크래시 대신 무시
      const tsMs = Date.parse(ev.ts);
      if (Number.isNaN(tsMs)) continue; // 파싱 불가 ts 는 FSRS stability/dueTs 를 영구 NaN 오염시킨다 — 무시(규칙 5 재현성)
      for (const kc of new Set(ev.kc)) { // 한 이벤트 내 중복 KC 는 1회만 반영(이중 카운트 방지)
        const mem = state.kcState[kc] ?? emptyMemory();
        const elapsedDays = mem.lastReviewTs === null ? 0 : Math.max(0, (tsMs - mem.lastReviewTs) / DAY_MS);
        const prevCard: CardState | null = mem.reps === 0 ? null : { stability: mem.stability, difficulty: mem.difficulty };
        const card = nextState(prevCard, grade, elapsedDays);
        const correct = grade !== "again";
        state.kcState[kc] = {
          mastery: updateMastery(mem.mastery, correct),
          stability: card.stability,
          difficulty: card.difficulty,
          lastReviewTs: tsMs,
          dueTs: tsMs + dueInDays(card) * DAY_MS,
          reps: mem.reps + 1,
        };
      }
    } else if (ev.type === "assessment.item") {
      const skill = ev.payload["skill"] as Skill | undefined;
      const theta = ev.payload["thetaEst"];
      if (skill && typeof theta === "number") state.ability[skill] = theta;
    }
  }

  return state;
}
