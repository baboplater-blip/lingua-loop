// 진화 분석 — 집계 이벤트에서 개선 신호 추출. SSOT: evolution-loop-protocol §분석.
import { flagAnomalousItems } from "../../core/src/index.ts";
import type { LearningEvent, ContentItem, KCGraph, Response } from "../../core/src/index.ts";
import { evaluateParams } from "./fsrs-optimize.ts";
import { extractSequences } from "./sequences.ts";

export interface EvolutionSignals {
  lowMasteryKCs: { kc: string; accuracy: number; n: number }[];
  contentGaps: { kc: string; verifiedItems: number }[];
  uncalibratedItems: string[];
  anomalousItems: string[];
  retentionPredictionError: number;
}

function correctOf(ev: LearningEvent): boolean | null {
  const g = ev.payload["grade"];
  if (g === "again") return false;
  if (g === "hard" || g === "good" || g === "easy") return true;
  const c = ev.payload["correct"];
  if (typeof c === "boolean") return c;
  return null;
}

/** 이벤트 → 캘리브레이션용 반응(문항별). */
export function toResponses(events: readonly LearningEvent[]): Response[] {
  const out: Response[] = [];
  for (const ev of events) {
    if (ev.type !== "item.response" && ev.type !== "review.done") continue;
    if (!ev.itemId) continue;
    const correct = correctOf(ev);
    if (correct === null) continue;
    out.push({ learner: ev.learnerRef, item: ev.itemId, correct });
  }
  return out;
}

export interface AnalyzeOptions {
  minItems?: number; // KC당 최소 verified 문항 수(미만이면 격차)
  accuracyThreshold?: number; // 이 미만이면 저성과 KC
  minN?: number; // 통계 유효 최소 반응 수
}

export function analyze(events: readonly LearningEvent[], items: ContentItem[], graph: KCGraph, opts: AnalyzeOptions = {}): EvolutionSignals {
  const minItems = opts.minItems ?? 2;
  const accThresh = opts.accuracyThreshold ?? 0.5;
  const minN = opts.minN ?? 10;

  // KC별 정확도(저성과 탐지)
  const kcStat = new Map<string, { n: number; correct: number }>();
  for (const ev of events) {
    if (ev.type !== "item.response" && ev.type !== "review.done") continue;
    if (!ev.kc) continue;
    const correct = correctOf(ev);
    if (correct === null) continue;
    for (const kc of ev.kc) {
      const s = kcStat.get(kc) ?? { n: 0, correct: 0 };
      s.n += 1;
      if (correct) s.correct += 1;
      kcStat.set(kc, s);
    }
  }
  const lowMasteryKCs = [...kcStat.entries()]
    .filter(([, s]) => s.n >= minN && s.correct / s.n < accThresh)
    .map(([kc, s]) => ({ kc, accuracy: s.correct / s.n, n: s.n }))
    .sort((a, b) => a.accuracy - b.accuracy);

  // 콘텐츠 격차(KC당 verified/calibrated 문항 수)
  const verifiedByKC = new Map<string, number>();
  for (const it of items) {
    if (it.quality === "verified" || it.quality === "calibrated") {
      for (const kc of it.kc) verifiedByKC.set(kc, (verifiedByKC.get(kc) ?? 0) + 1);
    }
  }
  const contentGaps = Object.keys(graph.nodes)
    .map((kc) => ({ kc, verifiedItems: verifiedByKC.get(kc) ?? 0 }))
    .filter((g) => g.verifiedItems < minItems);

  const uncalibratedItems = items.filter((it) => it.quality === "verified" && it.difficulty === null).map((it) => it.id);
  const anomalousItems = flagAnomalousItems(toResponses(events));
  const retentionPredictionError = evaluateParams(extractSequences(events));

  return { lowMasteryKCs, contentGaps, uncalibratedItems, anomalousItems, retentionPredictionError };
}
