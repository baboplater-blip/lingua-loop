// 진화 루프 오케스트레이터(/evolve 1사이클). SSOT: evolution-loop-protocol.
// 분석 → 제안 → 실험(가드레일=학습성과) → 검증 → 배포/롤백 → 측정.
import { DEFAULT_FSRS_PARAMS } from "../../core/src/index.ts";
import type { LearningEvent, ContentItem, KCGraph, FsrsParams, ReadingPassage } from "../../core/src/index.ts";
import { analyze, type EvolutionSignals } from "./analyze.ts";
import { runCalibration } from "./calibrate.ts";
import { extractSequences } from "./sequences.ts";
import { optimizeFsrsParams } from "./fsrs-optimize.ts";
import { abParams, type AbOutcome } from "./experiment.ts";
import { generateForGaps } from "./content.ts";
import { generateReadings, generateGradedReadings } from "./reading.ts";
import { reevaluateCommunity } from "./community-effect.ts";
import type { ContentGenerator, ReadingGenerator } from "../../adapters/src/index.ts";

export interface EvolutionCycleReport {
  signals: EvolutionSignals;
  proposals: string[];
  calibration?: { calibratedCount: number; anomalous: string[]; nResponses: number };
  fsrsRefit?: { errorBefore: number; errorAfter: number; ab: AbOutcome; deployed: boolean; params: FsrsParams };
  contentGeneration?: { generatedCount: number; byKc: Record<string, number>; items: ContentItem[] };
  readingGeneration?: { generatedCount: number; items: ReadingPassage[] };
  community?: { reviewed: number; healthy: number; demoted: string[]; topItem?: string };
  loopVelocity: { retentionErrorBefore: number; retentionErrorAfter: number; retentionDelta: number };
  decisions: string[];
}

export interface EvolveInput {
  events: readonly LearningEvent[];
  items: ContentItem[];
  graph: KCGraph;
  currentParams?: FsrsParams;
  seeds?: number[];
  generator?: ContentGenerator; // 있으면 격차를 자동 생성으로 메운다(규칙 4 게이트 통과분만)
  readingGenerator?: ReadingGenerator; // 있으면 등급 읽기 지문 격차를 생성으로 메운다(입력 층)
  readings?: ReadingPassage[]; // 기존 읽기 지문(격차·중복 판정)
  lang?: string;
  communityEvents?: readonly LearningEvent[]; // 있으면 커뮤니티 기여도 학습효과로 재평가(신뢰가중)
}

/** 1사이클 실행. 부작용 없음 — 산출(권고·후보 파라미터)을 반환하고 배포 결정은 게이트/승인이 집행. */
export function runEvolveCycle(input: EvolveInput): EvolutionCycleReport {
  const current = input.currentParams ?? DEFAULT_FSRS_PARAMS;
  const seeds = input.seeds ?? Array.from({ length: 24 }, (_, i) => 1000 + i * 13);
  const signals = analyze(input.events, input.items, input.graph);
  const proposals: string[] = [];
  const decisions: string[] = [];

  // 1) 캘리브레이션
  let calibration: EvolutionCycleReport["calibration"];
  if (signals.uncalibratedItems.length > 0 || signals.anomalousItems.length > 0) {
    proposals.push("문항 IRT 캘리브레이션");
    const cal = runCalibration(input.events, input.items);
    calibration = { calibratedCount: cal.calibratedCount, anomalous: cal.anomalous, nResponses: cal.nResponses };
    decisions.push(`캘리브레이션: ${cal.calibratedCount}문항 승격 · 이상 ${cal.anomalous.length} 리뷰큐`);
  }

  // 2) FSRS 재적합 (가드레일 = 학습성과)
  const errorBefore = signals.retentionPredictionError;
  let fsrsRefit: EvolutionCycleReport["fsrsRefit"];
  let retentionErrorAfter = errorBefore;
  let retentionDelta = 0;
  const seqs = extractSequences(input.events);
  if (seqs.length >= 5) {
    proposals.push("FSRS 파라미터 재적합");
    const opt = optimizeFsrsParams(seqs, current);
    const ab = abParams(current, opt.params, seeds);
    const deployed = ab.accept;
    if (deployed) {
      retentionErrorAfter = opt.errorAfter;
      retentionDelta = ab.retentionDelta;
    }
    fsrsRefit = { errorBefore: opt.errorBefore, errorAfter: opt.errorAfter, ab, deployed, params: deployed ? opt.params : current };
    decisions.push(
      `FSRS 재적합: 예측오차 ${opt.errorBefore.toFixed(3)}→${opt.errorAfter.toFixed(3)} · A/B 리텐션Δ ${(ab.retentionDelta * 100).toFixed(1)}%p · ${ab.reason}`,
    );
  }

  // 3) 콘텐츠 격차 → 자동 생성(생성기 있으면). 생성물은 게이트 통과분만(규칙 4).
  let contentGeneration: EvolutionCycleReport["contentGeneration"];
  if (signals.contentGaps.length > 0) {
    if (input.generator) {
      proposals.push("콘텐츠 자동생성(격차 메움)");
      const fill = generateForGaps(input.generator, signals.contentGaps, input.graph, input.items, input.lang ?? input.items[0]?.lang ?? "en", 4);
      contentGeneration = { generatedCount: fill.generated.length, byKc: fill.byKc, items: fill.generated };
      decisions.push(`콘텐츠 자동생성: ${fill.generated.length}문항(게이트 통과) · 미지원 KC ${fill.skipped.length}`);
    } else {
      proposals.push(`콘텐츠 격차 ${signals.contentGaps.length}KC → /new-content`);
      decisions.push(`콘텐츠 격차: ${signals.contentGaps.map((g) => g.kc).slice(0, 5).join(", ")}`);
    }
  }
  if (signals.lowMasteryKCs.length > 0) {
    decisions.push(`저성과 KC: ${signals.lowMasteryKCs.map((k) => `${k.kc}(${(k.accuracy * 100).toFixed(0)}%)`).slice(0, 5).join(", ")}`);
  }

  // 3.5) 읽기 지문 격차 → 자동 생성(생성기 있으면). 이해가능한 입력(i+1)을 데이터로 공급. 검증 통과분만(규칙 4).
  let readingGeneration: EvolutionCycleReport["readingGeneration"];
  if (input.readingGenerator) {
    const gen = input.readingGenerator;
    const existingReadings = input.readings ?? [];
    const lang = input.lang ?? input.items[0]?.lang ?? "en";
    const itemKcs = [...new Set(input.items.flatMap((i) => i.kc))];
    if (gen.levels) {
      // 등급 생성기(다국어): KC별 A1~B2 스펙트럼을 공급. 등급별 고유 id·본문으로 사이클 간 멱등(id/본문 중복 제거).
      const gradedKcs = itemKcs.filter((kc) => gen.supports(kc));
      if (gradedKcs.length > 0) {
        proposals.push("등급 읽기 지문 자동생성(A1~B2 스펙트럼)");
        const rg = generateGradedReadings(gen, gradedKcs, existingReadings, lang);
        readingGeneration = { generatedCount: rg.generated.length, items: rg.generated };
        decisions.push(`읽기 지문 생성: ${rg.generated.length}편(A1~B2·검증 통과) · 미지원 KC ${rg.skipped.length}`);
      }
    } else {
      // 단일 등급 생성기(en/es): KC 미커버 격차만(그래프 등급).
      const covered = new Set(existingReadings.flatMap((r) => r.kc));
      const readingGaps = itemKcs.filter((kc) => !covered.has(kc));
      if (readingGaps.length > 0) {
        proposals.push("등급 읽기 지문 자동생성(입력 격차)");
        const rg = generateReadings(gen, readingGaps, input.graph, existingReadings, lang);
        readingGeneration = { generatedCount: rg.generated.length, items: rg.generated };
        decisions.push(`읽기 지문 생성: ${rg.generated.length}편(검증 통과) · 미지원 KC ${rg.skipped.length}`);
      }
    }
  }

  // 4) 커뮤니티 기여 재평가 — 인간 축을 데이터 축으로 재평가(신뢰가중 승격 + 학습효과 강등). 폐루프 통합.
  let community: EvolutionCycleReport["community"];
  if (input.communityEvents && input.communityEvents.length > 0) {
    proposals.push("커뮤니티 기여 학습효과 재평가");
    const reeval = reevaluateCommunity(input.communityEvents, input.events);
    community = { reviewed: reeval.reviewed, healthy: reeval.healthy.length, demoted: reeval.demoted, topItem: reeval.ranked[0]?.item.id };
    decisions.push(`커뮤니티 재평가: 승격 ${reeval.ranked.length} · 건강 ${reeval.healthy.length} · 강등 ${reeval.demoted.length}${reeval.demoted.length ? "(" + reeval.demoted.slice(0, 3).join(", ") + ")" : ""}`);
  }

  return {
    signals,
    proposals,
    calibration,
    fsrsRefit,
    contentGeneration,
    readingGeneration,
    community,
    loopVelocity: { retentionErrorBefore: errorBefore, retentionErrorAfter, retentionDelta },
    decisions,
  };
}
