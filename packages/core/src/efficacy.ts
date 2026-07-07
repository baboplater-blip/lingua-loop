// 효능 지표 — 북스타(goal.md §3)를 이벤트에서 결정적으로 산출(규칙 1 성과가 진실·규칙 5 파생 재현성).
// 참여도(세션수·스트릭)가 아니라 실측 학습 성과: TTM(숙달 도달)·Retention(회상)·Coverage(진척). 순수·부작용 없음.
import type { LearningEvent } from "./types.ts";

/** 숙달 정의 — 한 KC에서 정답 N회 누적(기본 2 = BKT 해금 임계 0.6과 정렬). 투명·모델 상수 비의존. */
const MASTERY_CORRECTS = 2;

export interface EfficacyReport {
  // TTM(Time-to-Mastery) — 한 능력요소를 숙달까지 걸린 노력/시간. 코호트 대비 단축이 지향(goal.md).
  ttm: {
    masteredPairs: number; // 숙달에 도달한 (학습자,KC) 쌍 수
    medianResponsesToMastery: number | null; // 숙달까지 응답 수(노력) 중앙값
    meanResponsesToMastery: number | null;
    medianElapsedMs: number | null; // 첫 응답→숙달 경과(달력시간) 중앙값
  };
  // Retention — 회상 정확도. reviewAccuracy = 이미 학습한 KC를 다시 만났을 때(간격반복) 정확도.
  retention: {
    overallAccuracy: number | null;
    reviewAccuracy: number | null;
    responses: number;
    reviewResponses: number;
  };
  // Coverage — 진척. 학습자·본 KC·숙달 KC.
  coverage: {
    learners: number;
    kcsSeen: number; // 응답이 있은 서로 다른 KC
    kcsMastered: number; // 누군가 숙달한 서로 다른 KC
    masteredPerLearner: number | null; // 학습자당 평균 숙달 KC
  };
  throughput: { responses: number; correct: number; masteryEvents: number };
}

function correctOf(ev: LearningEvent): boolean | null {
  const g = ev.payload["grade"];
  if (g === "again") return false;
  if (g === "hard" || g === "good" || g === "easy") return true;
  const c = ev.payload["correct"];
  if (typeof c === "boolean") return c;
  return null;
}

const GRADED = new Set(["item.response", "review.done"]);

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

interface Track { firstTs: number; responses: number; corrects: number; masteredAt: number | null; masteredResponses: number | null; }

/**
 * 효능 리포트 산출 — 학습 이벤트(item.response/review.done)만 집계. 결정적.
 * (학습자,KC)별로 첫 응답·정답 누적을 추적해 숙달 도달 시점(정답 N회)에서 TTM을 확정한다.
 */
export function computeEfficacy(events: readonly LearningEvent[]): EfficacyReport {
  const track = new Map<string, Track>(); // key = learner|kc
  const learners = new Set<string>();
  const kcsSeen = new Set<string>();
  const kcsMastered = new Set<string>();
  const masteredByLearner = new Map<string, Set<string>>();
  let responses = 0, correct = 0, reviewResponses = 0, reviewCorrect = 0;

  for (const ev of events) {
    if (!GRADED.has(ev.type) || !ev.kc || ev.kc.length === 0) continue;
    const c = correctOf(ev);
    if (c === null) continue;
    const ts = Date.parse(ev.ts);
    learners.add(ev.learnerRef);
    responses += 1;
    if (c) correct += 1;
    for (const kc of ev.kc) {
      kcsSeen.add(kc);
      const key = ev.learnerRef + "|" + kc;
      let t = track.get(key);
      if (!t) { t = { firstTs: ts, responses: 0, corrects: 0, masteredAt: null, masteredResponses: null }; track.set(key, t); }
      else { reviewResponses += 1; if (c) reviewCorrect += 1; } // 이미 본 KC = 간격반복 회상
      t.responses += 1;
      if (c) t.corrects += 1;
      if (t.masteredAt === null && t.corrects >= MASTERY_CORRECTS) {
        t.masteredAt = ts;
        t.masteredResponses = t.responses;
        kcsMastered.add(kc);
        const set = masteredByLearner.get(ev.learnerRef) ?? new Set<string>();
        set.add(kc); masteredByLearner.set(ev.learnerRef, set);
      }
    }
  }

  const respToMastery: number[] = [];
  const elapsed: number[] = [];
  for (const t of track.values()) {
    if (t.masteredAt !== null && t.masteredResponses !== null) {
      respToMastery.push(t.masteredResponses);
      elapsed.push(Math.max(0, t.masteredAt - t.firstTs));
    }
  }
  // 학습자당 숙달 KC — 숙달 0인 학습자까지 포함해 평균(진척의 정직한 분모, 규칙 1)
  const masteredCounts = [...learners].map((l) => masteredByLearner.get(l)?.size ?? 0);

  return {
    ttm: {
      masteredPairs: respToMastery.length,
      medianResponsesToMastery: median(respToMastery),
      meanResponsesToMastery: mean(respToMastery),
      medianElapsedMs: median(elapsed),
    },
    retention: {
      overallAccuracy: responses ? correct / responses : null,
      reviewAccuracy: reviewResponses ? reviewCorrect / reviewResponses : null,
      responses,
      reviewResponses,
    },
    coverage: {
      learners: learners.size,
      kcsSeen: kcsSeen.size,
      kcsMastered: kcsMastered.size,
      masteredPerLearner: mean(masteredCounts),
    },
    throughput: { responses, correct, masteryEvents: respToMastery.length },
  };
}

// ── 시계열 추이 — 진화 사이클마다 스냅샷을 누적해 개선 추세를 본다(goal.md Loop Velocity·자기개선 증명) ──

/** 한 시점의 효능 요약(스냅샷). append-only로 쌓아 추세를 계산. ts는 기록 시 주입(파생 재현성, 규칙 5). */
export interface EfficacySnapshot {
  ts: string;
  responses: number;
  masteredPairs: number;
  medianResponsesToMastery: number | null;
  overallAccuracy: number | null;
  reviewAccuracy: number | null;
  kcsMastered: number;
  learners: number;
  calibratedRatio: number | null;
  gaps: number;
}

export interface TrendSummary {
  count: number;
  first: EfficacySnapshot | null;
  latest: EfficacySnapshot | null;
  // delta = latest − first. 정확도·숙달은 양수가 개선, TTM(응답 수)은 음수가 개선(빨라짐).
  delta: { overallAccuracy: number | null; reviewAccuracy: number | null; medianResponsesToMastery: number | null; kcsMastered: number } | null;
}

/** 스냅샷 시퀀스에서 첫↔최신 추세(개선 여부). 순서는 기록순(append-only). */
export function trendSummary(snaps: readonly EfficacySnapshot[]): TrendSummary {
  if (snaps.length === 0) return { count: 0, first: null, latest: null, delta: null };
  const first = snaps[0];
  const latest = snaps[snaps.length - 1];
  const d = (a: number | null, b: number | null): number | null => (a === null || b === null ? null : b - a);
  return {
    count: snaps.length,
    first,
    latest,
    delta: {
      overallAccuracy: d(first.overallAccuracy, latest.overallAccuracy),
      reviewAccuracy: d(first.reviewAccuracy, latest.reviewAccuracy),
      medianResponsesToMastery: d(first.medianResponsesToMastery, latest.medianResponsesToMastery),
      kcsMastered: latest.kcsMastered - first.kcsMastered,
    },
  };
}
