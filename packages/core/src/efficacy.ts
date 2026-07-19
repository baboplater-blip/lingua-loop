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
  // Gain — 사전(첫 배치)→사후(최근 재평가) 능력 상승(θ)과 효과크기. 효능의 핵심 증거(goal.md Gain Score).
  gain: GainScore;
  throughput: { responses: number; correct: number; masteryEvents: number };
}

/**
 * Gain Score — 배치평가 θ(사전) → 재평가 θ(사후)의 상승과 **관측 효과크기(Cohen's d)**.
 * ⚠️ **인과 주의(규칙 17)**: 이 값은 *관측* 상승일 뿐, 관측만으로 "도구가 가르쳤다"를 단정하지 않는다.
 * 인과 주장은 **사전등록 A/B 또는 사전-사후 통제군**이 필요하다([`ab-experiment-framework`]). n(표본)을 항상 함께 본다.
 */
export interface GainScore {
  n: number; // 사전·사후(assessment.item 2회 이상) 둘 다 있는 (학습자,스킬) 쌍 수
  meanPre: number | null; // 평균 사전 θ
  meanPost: number | null; // 평균 사후 θ
  meanGain: number | null; // 평균 상승(θ) = 사후 − 사전
  effectSize: number | null; // Cohen's d(pooled SD). n<2 또는 분산 0이면 null(추정 불가)
  bySkill: Record<string, { n: number; meanGain: number | null; effectSize: number | null }>;
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

function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length;
}

/** 사전·사후 분포에서 Cohen's d(pooled SD). 표본<2 또는 pooled SD=0이면 null(추정 불가). */
function cohensD(pre: number[], post: number[]): number | null {
  if (pre.length < 2 || post.length < 2) return null;
  const mPre = pre.reduce((a, b) => a + b, 0) / pre.length;
  const mPost = post.reduce((a, b) => a + b, 0) / post.length;
  const pooledSd = Math.sqrt((variance(pre) + variance(post)) / 2);
  if (pooledSd === 0) return null;
  return (mPost - mPre) / pooledSd;
}

/** 한 (학습자,스킬)의 사전(첫 배치)·사후(최근 재평가) θ 쌍. 재평가(assessment.item 2회 이상) 있는 것만. */
export interface GainPair {
  learnerRef: string;
  skill: string;
  pre: number;
  post: number;
}

/**
 * assessment.item(θ 추정) 이벤트에서 (학습자,스킬)별 첫(사전)↔최신(사후) θ 쌍을 뽑는다.
 * 사전·사후가 모두 있으려면 같은 (학습자,스킬)에 assessment.item 이 **2회 이상**(재평가) 있어야 한다.
 * 결정적·순수(규칙 5). Gain Score(단일 코호트)와 통제 실험(집단 간 비교)의 공통 추출기.
 */
export function gainPairs(events: readonly LearningEvent[]): GainPair[] {
  // (learner|skill) → θ 시퀀스(ts 순). 스킬에는 "|"가 없으므로 마지막 "|" 기준으로 안전 분리.
  const seq = new Map<string, { ts: number; theta: number }[]>();
  for (const ev of events) {
    if (ev.type !== "assessment.item") continue;
    const skill = ev.payload["skill"];
    const theta = ev.payload["thetaEst"];
    if (typeof skill !== "string" || typeof theta !== "number" || Number.isNaN(theta)) continue;
    const ts = Date.parse(ev.ts);
    const key = ev.learnerRef + "|" + skill;
    const arr = seq.get(key) ?? [];
    arr.push({ ts: Number.isNaN(ts) ? arr.length : ts, theta });
    seq.set(key, arr);
  }
  const out: GainPair[] = [];
  for (const [key, arrRaw] of seq) {
    if (arrRaw.length < 2) continue; // 사전·사후(재평가) 둘 다 필요
    const arr = [...arrRaw].sort((a, b) => a.ts - b.ts);
    const cut = key.lastIndexOf("|");
    out.push({ learnerRef: key.slice(0, cut), skill: key.slice(cut + 1), pre: arr[0].theta, post: arr[arr.length - 1].theta });
  }
  return out;
}

/**
 * Gain Score 산출 — (학습자,스킬)별 사전↔사후 θ 상승·효과크기(Cohen's d).
 * 결정적·순수(규칙 5). 인과 아님(규칙 17) — 관측 효과크기일 뿐.
 */
export function computeGainScore(events: readonly LearningEvent[]): GainScore {
  const bySkillPre = new Map<string, number[]>();
  const bySkillPost = new Map<string, number[]>();
  const allPre: number[] = [];
  const allPost: number[] = [];
  for (const p of gainPairs(events)) {
    (bySkillPre.get(p.skill) ?? bySkillPre.set(p.skill, []).get(p.skill)!).push(p.pre);
    (bySkillPost.get(p.skill) ?? bySkillPost.set(p.skill, []).get(p.skill)!).push(p.post);
    allPre.push(p.pre);
    allPost.push(p.post);
  }
  const bySkill: GainScore["bySkill"] = {};
  for (const skill of bySkillPre.keys()) {
    const pre = bySkillPre.get(skill)!;
    const post = bySkillPost.get(skill)!;
    bySkill[skill] = { n: pre.length, meanGain: mean(post.map((p, i) => p - pre[i])), effectSize: cohensD(pre, post) };
  }
  return {
    n: allPre.length,
    meanPre: mean(allPre),
    meanPost: mean(allPost),
    meanGain: mean(allPost.map((p, i) => p - allPre[i])),
    effectSize: cohensD(allPre, allPost),
    bySkill,
  };
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
    if (!GRADED.has(ev.type) || !Array.isArray(ev.kc) || ev.kc.length === 0) continue; // 비배열 kc 방어(심층) — 전역 대시보드 크래시 방지
    const c = correctOf(ev);
    if (c === null) continue;
    const ts = Date.parse(ev.ts);
    if (Number.isNaN(ts)) continue; // 파싱 불가 ts 는 TTM 경과시간을 오염 — 무시
    learners.add(ev.learnerRef);
    responses += 1;
    if (c) correct += 1;
    for (const kc of new Set(ev.kc)) { // 한 이벤트 내 중복 KC 는 1회만
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
    gain: computeGainScore(events), // 사전→사후 능력 상승·효과크기(관측, 인과 아님)
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
  gainEffectSize: number | null; // 사전→사후 효과크기(관측, 인과 아님)
  gainN: number; // Gain Score 표본 수(사전·사후 쌍)
}

export interface TrendSummary {
  count: number;
  first: EfficacySnapshot | null;
  latest: EfficacySnapshot | null;
  // delta = latest − first. 정확도·숙달·효과크기는 양수가 개선, TTM(응답 수)은 음수가 개선(빨라짐).
  delta: { overallAccuracy: number | null; reviewAccuracy: number | null; medianResponsesToMastery: number | null; kcsMastered: number; gainEffectSize: number | null } | null;
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
      gainEffectSize: d(first.gainEffectSize, latest.gainEffectSize),
    },
  };
}
