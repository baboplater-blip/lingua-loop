// 최소 데이터 백엔드 핸들러(순수 함수). 코어 위의 얇은 배선.
// 규칙 4(verified 만 서빙)·5(append-only)·6(소유권) 집행.
import { EventLog, makeEvent, deriveState, nextKCs, makeGraph, selectGradedReading, makeSubmission, evaluateCommunity, servableCommunityItems, rankContributions, rankByEffect, itemEffects, isDemoted, checkItem, validateReading, scoreComprehension, redactReadingAnswers, computeEfficacy, trendSummary, estimateAbility, pickNextItem, cefrFromAbility, deriveCertifications, buildCertificate, deriveBadges, authoredStats, buildProfile, validatePreRegistration, assignVariant, compareCohorts, orderByPractice } from "../../core/src/index.ts";
import type { CertificationReport, MasteryCertificate, BadgeReport, ProfileCard, EfficacyReport, EfficacySnapshot, TrendSummary, PreRegistration, Intervention, ExperimentResult, PracticeOrder } from "../../core/src/index.ts";
import type { LearningEvent, LearnerState, ContentItem, KCNode, KCGraph, Grade, ReadingPassage, ContributionState, ReviewVerdict, ReviewFlag, Response, RankedContribution, ItemEffect, ResponseObs } from "../../core/src/index.ts";
import type { MakeEventInput } from "../../core/src/events.ts";
import type { TutorModel, TutorTurn, TutorResponse, PronunciationScorer, PronunciationResult } from "../../adapters/src/index.ts";

export interface Store {
  logs: Map<string, EventLog>;
  /** 영속 백엔드 디렉터리(있으면 파일 스토어). 없으면 인메모리. */
  dir?: string;
  /** 새 이벤트를 영속화하는 훅(파일 append). 인메모리면 undefined. */
  sink?: (learnerRef: string, ev: LearningEvent) => void;
  /** 학습자 영속 데이터를 제거하는 훅(소유권 삭제, 규칙 6). */
  remove?: (learnerRef: string) => void;
  /** 영속 핸들을 닫는 훅(예: SQLite 연결). 인메모리/파일 스토어는 없음. */
  close?: () => void;
}

export function newStore(): Store {
  return { logs: new Map() };
}

// 예약 시스템 로그 ref — 학습자 데이터가 아닌 공용 로그(기여·발행·효능 스냅샷·실험 등록·캘리브레이션). 공개 진입점으로 위조 쓰기 금지.
// (아래 COMMUNITY_REF/PUBLISHED_REF/EFFICACY_REF/EXPERIMENT_REF/CALIBRATION_REF 상수와 동일 문자열 — 순환 없이 여기서 선언)
const RESERVED_REFS: ReadonlySet<string> = new Set(["community", "published", "efficacy", "experiment", "calibration"]);
// 시스템 전용 이벤트 타입 — 발행/기여/스냅샷/실험등록/캘리브레이션 전용 함수에서만 생성. 공개 ingest 로 위조 시 규칙 3(난이도는 데이터로만)·4·17 우회.
const SYSTEM_EVENT_TYPES: ReadonlySet<string> = new Set(["contribution.submitted", "contribution.review", "content.published", "reading.published", "content.calibrated", "efficacy.snapshot", "experiment.registered"]);

function logFor(store: Store, learnerRef: string): EventLog {
  let log = store.logs.get(learnerRef);
  if (!log) {
    log = new EventLog();
    store.logs.set(learnerRef, log);
  }
  return log;
}

/**
 * 이벤트 수집 — append-only(규칙 5). 영속 스토어면 파일에도 append.
 * **공개 진입점**(HTTP /events·/reading/answer 등)의 유일 관문 — 클라이언트가 지정한 learnerRef·type 를 신뢰하지 않는다:
 * 예약 시스템 로그(community/published/efficacy)나 시스템 전용 이벤트 타입 위조를 거부해 콘텐츠 품질 게이트(규칙 4)
 * 우회를 막는다. 정당한 발행/기여/스냅샷은 전용 함수(publishContent·submitContribution·recordEfficacy)가
 * logFor 로 직접 append 한다(이 관문을 거치지 않음).
 */
export function ingest(store: Store, input: MakeEventInput): LearningEvent {
  if (!input.learnerRef || typeof input.learnerRef !== "string") throw new Error("learnerRef required");
  if (RESERVED_REFS.has(input.learnerRef)) throw new Error("reserved learnerRef: " + input.learnerRef);
  if (SYSTEM_EVENT_TYPES.has(input.type as string)) throw new Error("system-only event type: " + input.type);
  // kc 는 문자열 배열이어야 — 문자열 등 비배열이 저장되면 deriveState/computeEfficacy 의 `for...of`·`.some` 이
  // 영구 크래시(append-only 라 회복 불가·전역 대시보드까지 마비). 진입점에서 차단(규칙 5 무결성).
  if (input.kc !== undefined && (!Array.isArray(input.kc) || !input.kc.every((k) => typeof k === "string"))) throw new Error("kc must be an array of strings");
  const ev = logFor(store, input.learnerRef).append(makeEvent(input));
  store.sink?.(input.learnerRef, ev);
  return ev;
}

/** 학습자 상태 — 이벤트 리플레이로 파생(규칙 5). */
export function stateOf(store: Store, learnerRef: string, lang: string): LearnerState {
  const log = store.logs.get(learnerRef);
  return deriveState(log ? log.all() : [], learnerRef, lang);
}

export interface ServeOptions {
  now?: number;
  limit?: number;
}

/** 복습/학습 대상 KC 큐. */
export function reviewQueue(store: Store, learnerRef: string, lang: string, graph: KCGraph, opts: ServeOptions = {}): string[] {
  return nextKCs(stateOf(store, learnerRef, lang), graph, { now: opts.now, limit: opts.limit });
}

/** 마스터리 인증 리포트(동기 층) — 인증·다음 후보·레벨 진척. 다크패턴 없이 성취만 인정(규칙 2·9). */
export function certificatesFor(store: Store, learnerRef: string, lang: string, graph: KCGraph): CertificationReport {
  return deriveCertifications(stateOf(store, learnerRef, lang), graph);
}

/**
 * 배지 리포트(동기 층 — 성취를 커뮤니티까지). 학습 인증 + 기여 수용/학습효과 + 검토 신뢰를 증거로.
 * 결정적·다크패턴 없음(규칙 1·2·9). 검토 배지는 정확도(신뢰) 자격이 있어야 티어 부여(인기 아닌 실효).
 */
export function badgesFor(store: Store, learnerRef: string, lang: string, graph: KCGraph): BadgeReport {
  const cert = deriveCertifications(stateOf(store, learnerRef, lang), graph);
  const view = communityView(store);
  return deriveBadges(learnerRef, lang, cert, { states: view.states, trust: view.trust }, view.effects);
}

/**
 * 학습자 프로필 카드 — 인증·배지·누적 학습량을 한 곳에(성과 요약). 결정적·소유·포터블(규칙 6).
 * 다크패턴 없음(규칙 2·9): 스트릭·연속일 없이 누적 성과만. 누적 통계는 학습자 로그에서 파생.
 */
export function profileFor(store: Store, learnerRef: string, lang: string, graph: KCGraph): ProfileCard {
  const cert = deriveCertifications(stateOf(store, learnerRef, lang), graph);
  const view = communityView(store);
  const badges = deriveBadges(learnerRef, lang, cert, { states: view.states, trust: view.trust }, view.effects);
  const events = store.logs.get(learnerRef)?.all() ?? [];
  let responses = 0;
  let correct = 0;
  let tutorTurns = 0;
  const kcs = new Set<string>();
  for (const ev of events) {
    if (ev.type === "item.response") {
      responses += 1;
      if (ev.payload["correct"] === true) correct += 1;
      for (const kc of ev.kc ?? []) kcs.add(kc);
    } else if (ev.type === "tutor.turn" && ev.payload["role"] === "learner") {
      tutorTurns += 1;
    }
  }
  const contributions = authoredStats(learnerRef, view.states.values(), view.effects).accepted;
  return buildProfile(learnerRef, lang, cert, badges, { responses, correct, distinctKCs: kcs.size, tutorTurns, contributions });
}

/** 마스터리 인증서 내보내기 — 학습자 소유의 성취 스냅샷(규칙 6). 기계가독·포터블. */
export function exportCertificate(store: Store, learnerRef: string, lang: string, graph: KCGraph): MasteryCertificate {
  return buildCertificate(stateOf(store, learnerRef, lang), graph, learnerRef, lang);
}

/**
 * 다음에 낼 콘텐츠. **verified/calibrated 만 서빙**(규칙 4 — 미검증 노출 금지).
 * 잠금해제·만기 KC 를 다루는 아이템만.
 */
export function serveItems(store: Store, learnerRef: string, lang: string, graph: KCGraph, bank: ContentItem[], opts: ServeOptions = {}): ContentItem[] {
  const state = stateOf(store, learnerRef, lang);
  const kcs = new Set(nextKCs(state, graph, { now: opts.now, limit: opts.limit ?? 10 }));
  // 캘리브레이션 오버레이 — 서빙 아이템이 데이터 기반 난이도/변별도를 반영(규칙 3). 매칭 없으면 무변경.
  const calBank = applyCalibrationOverlay(bank, calibrationOverlay(store, lang));
  const servable = calBank.filter(
    (it) => it.lang === lang && (it.quality === "verified" || it.quality === "calibrated") && it.kc.some((k) => kcs.has(k)),
  );
  // 실험 개입(있으면): 활성 practice_order 실험의 배정 팔에 따라 순서 재배열(집합 불변·slice 전 적용).
  // 미참여 학습자는 기본 순서 그대로(무회귀, 규칙 16).
  const order = practiceOrderFor(store, learnerRef);
  const ordered = order ? orderByPractice(servable, order) : servable;
  return ordered.slice(0, opts.limit ?? 10);
}

/**
 * 등급 읽기(이해가능한 입력, i+1) 서빙. 학습자 읽기 수준에 맞춰 코어가 선택하고,
 * **검증 통과 지문만**(validateReading, 규칙 4). 언어팩(데이터)만 갈아끼우면 다른 언어(규칙 11).
 * 서빙 시 이해 문항의 정답을 제거한다 — 클라이언트에 정답 미유출(규칙 4). 채점은 서버(answerReading).
 */
export function serveReading(store: Store, learnerRef: string, lang: string, passages: ReadingPassage[], opts: { limit?: number } = {}): ReadingPassage[] {
  return selectGradedReading(stateOf(store, learnerRef, lang), passages, opts).map(redactReadingAnswers);
}

export interface ReadingAnswerInput {
  learnerRef: string;
  passageId: string;
  questionIndex?: number; // 기본 0
  choice: string;
}

export interface ReadingAnswerResult {
  correct?: boolean;
  correctAnswer?: string;
  question?: string;
  glossaryHints?: { word: string; gloss: string }[];
  kc?: string[];
  eventId?: string;
  error?: string;
}

/**
 * 읽기 이해 문항 채점 — 서버가 데이터로 판정하고(규칙 1 성과가 진실), 정답 여부를 item.response 이벤트로 남긴다.
 * 이 이벤트가 deriveState 를 거쳐 BKT 숙달·FSRS 복습에 반영된다 — 읽기가 마스터리 스택의 측정 대상이 됨.
 * 정답을 클라이언트에 노출하지 않고(규칙 4), 채점 후에만 정답·해설을 돌려준다. 소스 지문(정답 보유)을 넘겨야 채점 가능.
 */
export function answerReading(store: Store, lang: string, sourcePassages: ReadingPassage[], input: ReadingAnswerInput): ReadingAnswerResult {
  const p = sourcePassages.find((x) => x.id === input.passageId);
  if (!p) return { error: "passage_not_found" };
  const qi = input.questionIndex ?? 0;
  const scored = scoreComprehension(p, qi, input.choice);
  if (!scored) return { error: "invalid_question" };
  // 정답 여부를 학습 이벤트로 — kc 전체 크레딧(문법·어휘 등 지문이 다루는 모든 KC). deriveState 가 숙달·복습 갱신.
  const ev = ingest(store, {
    learnerRef: input.learnerRef,
    type: "item.response",
    kc: p.kc,
    itemId: `read:${p.id}#q${qi}`,
    payload: { correct: scored.correct, grade: scored.correct ? "good" : "again", choice: input.choice, source: "reading" },
    consent: "learn",
  });
  return { correct: scored.correct, correctAnswer: scored.correctAnswer, question: scored.question, glossaryHints: scored.glossaryHints, kc: p.kc, eventId: ev.eventId };
}

// ── 효능 대시보드 — 북스타 지표(성과가 진실, 규칙 1). 참여도가 아니라 학습 성과를 노출 ──

/** 효능 스냅샷 로그 ref(공용) — 학습자 데이터 아님. 집계에서 제외. */
export const EFFICACY_REF = "efficacy";

/** 실험 등록 로그 ref(공용) — 사전등록 프로토콜만. 학습자 데이터 아님·집계에서 제외. */
export const EXPERIMENT_REF = "experiment";
/** 캘리브레이션 로그 ref(공용) — 데이터 기반 난이도/변별도 갱신. 학습자 데이터 아님·집계에서 제외. */
export const CALIBRATION_REF = "calibration";

// 공용(시스템) 로그 = 학습자 데이터가 아닌 것. RESERVED_REFS 와 동일 집합(위조 차단 대상과 정확히 일치).
/** 모든 학습자 이벤트(공용 로그=기여·발행·효능스냅샷·실험등록·캘리브레이션 제외). 효능 집계용. */
export function allLearnerEvents(store: Store): LearningEvent[] {
  const out: LearningEvent[] = [];
  for (const [ref, log] of store.logs) {
    if (RESERVED_REFS.has(ref)) continue;
    out.push(...log.all());
  }
  return out;
}

/** 개별 학습자 ref 목록(공용 로그 제외) — 실험 코호트 배정 대상. */
function learnerRefs(store: Store): string[] {
  const out: string[] = [];
  for (const ref of store.logs.keys()) {
    if (RESERVED_REFS.has(ref)) continue;
    out.push(ref);
  }
  return out;
}

export interface EfficacyDashboard {
  lang: string;
  efficacy: EfficacyReport;
  contentHealth: { servableItems: number; calibratedItems: number; calibratedRatio: number | null; kcsWithContent: number; totalKCs: number };
  gaps: { kc: string; items: number }[]; // 서빙 문항 < 2 인 KC(콘텐츠 격차)
}

/**
 * 효능 대시보드 — 이벤트에서 TTM·리텐션·커버리지(코어 computeEfficacy) + 콘텐츠 건강(서빙 뱅크 기준).
 * 운영자가 "무인 진화가 실제로 학습을 개선하는가"를 데이터로 본다(goal.md §3). 참여도 지표는 노출하지 않는다(규칙 1).
 */
export function efficacyReport(store: Store, lang: string, graph: KCGraph, bank: ContentItem[]): EfficacyDashboard {
  const efficacy = computeEfficacy(allLearnerEvents(store));
  // 무인 캘리브레이션이 갱신한 난이도/품질을 반영 → Content Health(캘리브레이션 비율)가 실제 진척을 보인다(규칙 3).
  const calBank = applyCalibrationOverlay(bank, calibrationOverlay(store, lang));
  const calibrated = calBank.filter((i) => i.difficulty !== null).length;
  const byKc = new Map<string, number>();
  for (const i of calBank) for (const kc of i.kc) byKc.set(kc, (byKc.get(kc) ?? 0) + 1);
  const gaps = Object.keys(graph.nodes)
    .filter((kc) => (byKc.get(kc) ?? 0) < 2)
    .map((kc) => ({ kc, items: byKc.get(kc) ?? 0 }));
  return {
    lang,
    efficacy,
    contentHealth: {
      servableItems: bank.length,
      calibratedItems: calibrated,
      calibratedRatio: bank.length ? calibrated / bank.length : null,
      kcsWithContent: byKc.size,
      totalKCs: Object.keys(graph.nodes).length,
    },
    gaps,
  };
}

/** 대시보드 → 컴팩트 스냅샷(추이 누적용). ts 주입. */
export function snapshotOf(d: EfficacyDashboard, tsISO: string): EfficacySnapshot {
  const e = d.efficacy;
  return {
    ts: tsISO,
    responses: e.throughput.responses,
    masteredPairs: e.ttm.masteredPairs,
    medianResponsesToMastery: e.ttm.medianResponsesToMastery,
    overallAccuracy: e.retention.overallAccuracy,
    reviewAccuracy: e.retention.reviewAccuracy,
    kcsMastered: e.coverage.kcsMastered,
    learners: e.coverage.learners,
    calibratedRatio: d.contentHealth.calibratedRatio,
    gaps: d.gaps.length,
    gainEffectSize: e.gain.effectSize,
    gainN: e.gain.n,
  };
}

/**
 * 효능 스냅샷 기록 — 현재 지표를 append-only 이벤트로 남긴다(공용 EFFICACY_REF 로그, 규칙 5).
 * 진화 사이클마다 호출하면 개선 추세(Loop Velocity·자기개선 증명, goal.md)를 데이터로 남긴다. ts 미지정 시 현재 시각.
 */
export function recordEfficacy(store: Store, lang: string, graph: KCGraph, bank: ContentItem[], tsISO?: string): EfficacySnapshot {
  const dash = efficacyReport(store, lang, graph, bank);
  const snap = snapshotOf(dash, tsISO ?? new Date().toISOString());
  // 시스템 전용 스냅샷 — 공개 ingest 관문을 거치지 않고 직접 append(EFFICACY_REF·efficacy.snapshot 은 위조 차단 대상).
  const ev = makeEvent({ learnerRef: EFFICACY_REF, type: "efficacy.snapshot", payload: { lang, snapshot: snap }, consent: "learn+improve" });
  logFor(store, EFFICACY_REF).append(ev);
  store.sink?.(EFFICACY_REF, ev);
  return snap;
}

/** 언어별 효능 스냅샷 이력 + 추세(첫↔최신 개선). 기록순(append-only). */
export function efficacyHistory(store: Store, lang: string): { snapshots: EfficacySnapshot[]; trend: TrendSummary } {
  const log = store.logs.get(EFFICACY_REF);
  const snapshots = log
    ? [...log.all()].filter((e) => e.payload["lang"] === lang).map((e) => e.payload["snapshot"] as EfficacySnapshot)
    : [];
  return { snapshots, trend: trendSummary(snapshots) };
}

// ── 캘리브레이션 영속(규칙 3: 난이도는 데이터로만) — 무인 잡이 갱신한 난이도/변별도를 append-only로 남겨 서빙·대시보드에 반영 ──

export interface CalibrationRecord {
  id: string;
  difficulty: number | null;
  discrimination: number | null;
  quality: string;
}

/**
 * 캘리브레이션 결과를 append-only 로 영속(규칙 3·5). 데이터로 갱신된 난이도/변별도/품질을 아이템별로 기록.
 * **멱등**: 아이템의 마지막 기록과 (difficulty,discrimination,quality) 가 같으면 재기록하지 않는다(로그 무한 성장 방지).
 * 캘리브레이션된(difficulty≠null·quality=calibrated) 아이템만 대상. 시스템 전용(CALIBRATION_REF·content.calibrated·공개 위조 차단).
 */
export function recordCalibration(store: Store, lang: string, items: readonly ContentItem[]): { recorded: number; skipped: number } {
  const overlay = calibrationOverlay(store, lang);
  let recorded = 0;
  let skipped = 0;
  for (const it of items) {
    if (it.difficulty === null || it.quality !== "calibrated") continue;
    const prev = overlay.get(it.id);
    if (prev && prev.difficulty === it.difficulty && prev.discrimination === it.discrimination && prev.quality === it.quality) {
      skipped += 1;
      continue;
    }
    const record: CalibrationRecord = { id: it.id, difficulty: it.difficulty, discrimination: it.discrimination, quality: it.quality };
    const ev = makeEvent({ learnerRef: CALIBRATION_REF, type: "content.calibrated", itemId: it.id, payload: { lang, record }, consent: "learn+improve" });
    logFor(store, CALIBRATION_REF).append(ev);
    store.sink?.(CALIBRATION_REF, ev);
    recorded += 1;
  }
  return { recorded, skipped };
}

/** 언어별 캘리브레이션 오버레이(아이템 id → 최신 난이도/변별도/품질). 기록순이라 마지막이 최신. */
export function calibrationOverlay(store: Store, lang: string): Map<string, CalibrationRecord> {
  const log = store.logs.get(CALIBRATION_REF);
  const m = new Map<string, CalibrationRecord>();
  if (!log) return m;
  for (const e of log.all()) {
    if (e.payload["lang"] !== lang) continue;
    const rec = e.payload["record"] as CalibrationRecord | undefined;
    if (rec && typeof rec.id === "string") m.set(rec.id, rec);
  }
  return m;
}

/** 서빙 뱅크에 캘리브레이션 오버레이 적용(난이도/변별도/품질 갱신). 매칭 없으면 원본 유지·오버레이 없으면 무변경. */
export function applyCalibrationOverlay(bank: readonly ContentItem[], overlay: Map<string, CalibrationRecord>): ContentItem[] {
  if (overlay.size === 0) return bank as ContentItem[];
  return bank.map((it) => {
    const rec = overlay.get(it.id);
    return rec ? { ...it, difficulty: rec.difficulty, discrimination: rec.discrimination, quality: rec.quality as ContentItem["quality"] } : it;
  });
}

// ── 사전등록 통제 실험(규칙 17: 관측 Gain Score → 인과 증거) ──

export interface RegisterExperimentInput {
  experimentId: string;
  hypothesis: string;
  treatmentShare?: number; // 기본 0.5
  minSamplePerArm?: number; // 기본 12
  guardrail?: string;
  intervention?: Intervention; // 실험군에 배선할 개입(없으면 관측 비교만)
}

/**
 * 실험 사전등록 — **데이터 수집 전에** 프로토콜을 append-only 로 고정한다(규칙 17, p-해킹 방지).
 * primaryOutcome 은 서버가 gainScore 로 못박아(참여도 실험 금지·규칙 1) validatePreRegistration 로 검사.
 * experimentId 로 멱등 — 이미 등록됐으면 기존 등록을 그대로 반환(등록은 이력이므로 덮어쓰지 않음).
 * 시스템 전용 이벤트/ref 라 공개 ingest 로는 위조 불가(EXPERIMENT_REF·experiment.registered).
 */
export function registerExperiment(store: Store, input: RegisterExperimentInput, tsISO?: string): { registration: PreRegistration; created: boolean } {
  const existing = getRegistration(store, input.experimentId);
  if (existing) return { registration: existing, created: false };
  const reg: PreRegistration = {
    experimentId: input.experimentId,
    hypothesis: input.hypothesis ?? "",
    primaryOutcome: "gainScore",
    treatmentShare: input.treatmentShare ?? 0.5,
    minSamplePerArm: input.minSamplePerArm ?? 12,
    guardrail: input.guardrail ?? "통제군 대비 리텐션 비열등(규칙 1)",
    registeredTs: tsISO ?? new Date().toISOString(),
    ...(input.intervention ? { intervention: input.intervention } : {}),
  };
  const v = validatePreRegistration(reg);
  if (!v.ok) throw new Error("invalid pre-registration: " + v.reason);
  const ev = makeEvent({ learnerRef: EXPERIMENT_REF, type: "experiment.registered", payload: { registration: reg }, consent: "learn+improve" });
  logFor(store, EXPERIMENT_REF).append(ev);
  store.sink?.(EXPERIMENT_REF, ev);
  return { registration: reg, created: true };
}

/** 사전등록 조회(가장 최근 experimentId 매칭). 없으면 null. */
export function getRegistration(store: Store, experimentId: string): PreRegistration | null {
  const log = store.logs.get(EXPERIMENT_REF);
  if (!log) return null;
  let found: PreRegistration | null = null;
  for (const e of log.all()) {
    const reg = e.payload["registration"] as PreRegistration | undefined;
    if (reg && reg.experimentId === experimentId) found = reg; // 마지막(가장 최근) 우선 — 실질 멱등이라 하나뿐
  }
  return found;
}

/** 학습자의 실험 배정(결정적). 등록이 없으면 null. 앱이 어떤 팔의 개입을 줄지 결정할 때 사용. */
export function assignForLearner(store: Store, experimentId: string, learnerRef: string): "control" | "treatment" | null {
  const reg = getRegistration(store, experimentId);
  if (!reg) return null;
  return assignVariant(experimentId, learnerRef, reg.treatmentShare);
}

/**
 * 활성 `practice_order` 실험에서 이 학습자의 연습 순서 정책을 결정한다(실험군=인터리빙·통제군=블록).
 * 첫 등록된 practice_order 실험을 사용(데모는 동시 1개 가정). 그런 실험이 없으면 null → 서빙은 기본 순서(무회귀).
 * 결정적(assignVariant) — 같은 학습자는 늘 같은 정책. 세션 간 개입 일관성 보장(규칙 5).
 */
export function practiceOrderFor(store: Store, learnerRef: string): PracticeOrder | null {
  const log = store.logs.get(EXPERIMENT_REF);
  if (!log) return null;
  for (const e of log.all()) {
    const reg = e.payload["registration"] as PreRegistration | undefined;
    if (reg?.intervention?.kind === "practice_order") {
      return assignVariant(reg.experimentId, learnerRef, reg.treatmentShare) === "treatment" ? "interleaved" : "blocked";
    }
  }
  return null;
}

/**
 * 실험 결과 — 등록된 실험의 통제군/실험군 Gain 을 집단 간 비교한다.
 * 학습자를 결정적으로 배정(assignVariant)해 각자의 이벤트를 두 팔로 나누고 compareCohorts 로 판정.
 * earliestDataTs(배정 학습자 이벤트 최소 ts)가 등록보다 앞서면 retroactive 로 표시(사전등록 무효 경고). 없으면 null.
 */
export function experimentResult(store: Store, experimentId: string): ExperimentResult | null {
  const reg = getRegistration(store, experimentId);
  if (!reg) return null;
  const controlEvents: LearningEvent[] = [];
  const treatmentEvents: LearningEvent[] = [];
  let earliestDataTs: number | undefined;
  for (const ref of learnerRefs(store)) {
    const arm = assignVariant(experimentId, ref, reg.treatmentShare);
    const evs = store.logs.get(ref)!.all();
    (arm === "treatment" ? treatmentEvents : controlEvents).push(...evs);
    for (const e of evs) {
      const t = Date.parse(e.ts);
      if (!Number.isNaN(t) && (earliestDataTs === undefined || t < earliestDataTs)) earliestDataTs = t;
    }
  }
  return compareCohorts(reg, controlEvents, treatmentEvents, { earliestDataTs });
}

/** 학습자 데이터 내보내기(규칙 6 — 소유권). */
export function exportLearner(store: Store, learnerRef: string): LearningEvent[] {
  const log = store.logs.get(learnerRef);
  return log ? [...log.all()] : [];
}

/** 학습자 데이터 영구 삭제(규칙 6) — 메모리 + 영속 파일 모두. 공용 기여 로그는 보호. */
export function deleteLearner(store: Store, learnerRef: string): boolean {
  if (RESERVED_REFS.has(learnerRef)) return false; // 공용 로그(기여·발행·효능 추이)는 개인 삭제 불가 — efficacy 포함(Loop Velocity 증거 보호)
  const existed = store.logs.delete(learnerRef);
  store.remove?.(learnerRef);
  return existed;
}

/** 학습자 능력(θ)에서 대략적 CEFR 레벨 도출(튜터 i+1용). 기본 A1. */
function levelOf(state: LearnerState): string {
  const a = state.ability.reading ?? state.ability.writing;
  if (typeof a !== "number") return "A1";
  if (a > 2) return "B2";
  if (a > 1) return "B1";
  if (a > 0) return "A2";
  return "A1";
}

export interface TutorInput {
  learnerRef: string;
  message: string;
  lang: string;
  task?: string;
  history?: TutorTurn[];
  explainLang?: string; // 설명(교정 메모·격려) 화면 언어. 목표어 몰입 어구는 유지.
}

/**
 * AI 튜터 한 턴 — 대화·교정 + 학습자/튜터 발화를 append-only 이벤트로 로깅(진화 루프 입력).
 * tutor 는 pluggable(규칙 12) — 서버가 주입한다.
 */
export async function tutorTurn(store: Store, tutor: TutorModel, input: TutorInput): Promise<TutorResponse> {
  const state = stateOf(store, input.learnerRef, input.lang);
  const resp = await tutor.respond({
    message: input.message,
    history: input.history ?? [],
    targetLang: input.lang,
    level: levelOf(state),
    task: input.task,
    explainLang: input.explainLang,
  });
  const log = logFor(store, input.learnerRef);
  const eL = log.append(makeEvent({ learnerRef: input.learnerRef, type: "tutor.turn", payload: { role: "learner", text: input.message, errorTags: resp.errorTags, injection: resp.safety.flagged }, consent: "learn" }));
  const eT = log.append(makeEvent({ learnerRef: input.learnerRef, type: "tutor.turn", payload: { role: "tutor", text: resp.text, corrections: resp.corrections.length }, consent: "learn" }));
  store.sink?.(input.learnerRef, eL);
  store.sink?.(input.learnerRef, eT);
  return resp;
}

export interface PronounceInput {
  learnerRef: string;
  kc?: string;
  itemId?: string;
  targetIPA: string[];
  producedIPA?: string[]; // ASR/음소입력 전사(있으면 객관 채점)
  targetStress?: number[]; // 목표 강세 패턴(운율)
  producedStress?: number[]; // 산출 강세 패턴(운율)
  targetTones?: number[]; // 목표 성조(성조어)
  producedTones?: number[]; // 산출 성조
  selfGrade?: Grade; // 오프라인 섀도잉 자가평가
  word?: string;
}

/**
 * 발음 한 번 채점 — pluggable 스코어러(규칙 12) 주입. 명료도 우선(규칙 1).
 * ⚠️ 원음성(오디오)은 서버에 오지 않는다 — 전사/자가평가만 받고, **특징(점수·오류태그·모드)만**
 * append-only `speak.attempt` 이벤트로 로깅한다(음성 프라이버시=규칙 6·8).
 */
export async function scorePronunciation(store: Store, scorer: PronunciationScorer, input: PronounceInput): Promise<PronunciationResult> {
  const res = await scorer.score({
    targetIPA: input.targetIPA,
    producedIPA: input.producedIPA,
    targetStress: input.targetStress,
    producedStress: input.producedStress,
    targetTones: input.targetTones,
    producedTones: input.producedTones,
    selfGrade: input.selfGrade,
    word: input.word,
    kc: input.kc,
  });
  const ev = makeEvent({
    learnerRef: input.learnerRef,
    type: "speak.attempt",
    kc: input.kc ? [input.kc] : undefined,
    itemId: input.itemId,
    payload: {
      mode: res.mode,
      score: res.score,
      intelligibility: res.intelligibility,
      stress: res.prosody ? res.prosody.stress : undefined,
      errorTags: res.errors.map((e) => `${e.target ?? "∅"}>${e.produced ?? "∅"}`),
      word: input.word,
    },
    consent: "learn",
  });
  const log = logFor(store, input.learnerRef);
  log.append(ev);
  store.sink?.(input.learnerRef, ev);
  return res;
}

// ── 커뮤니티 기여(진화의 인간 축) ──────────────────────────────────────
// 기여/검토는 공용 로그(reserved ref)에 append-only 로 쌓이고, 상태는 리플레이로 파생(규칙 5).
export const COMMUNITY_REF = "community";

function communityLog(store: Store): readonly LearningEvent[] {
  const log = store.logs.get(COMMUNITY_REF);
  return log ? log.all() : [];
}

export interface ContributeInput {
  contributorRef: string;
  item: ContentItem;
}

/** 콘텐츠 기여 제출 → 자동 품질 게이트(규칙 4·14) + 모더레이션 → append-only 로깅. */
export function submitContribution(store: Store, input: ContributeInput, existing: ContentItem[] = []): { cid: string; gatePass: boolean; gateReasons: string[]; status: string } {
  const { cid, gatePass, gateReasons } = makeSubmission(input.item, existing);
  const ev = makeEvent({
    learnerRef: COMMUNITY_REF,
    type: "contribution.submitted",
    itemId: input.item.id,
    payload: { cid, item: input.item, gatePass, gateReasons, contributorRef: input.contributorRef },
    consent: "learn+improve+open",
  });
  const log = logFor(store, COMMUNITY_REF);
  log.append(ev);
  store.sink?.(COMMUNITY_REF, ev);
  return { cid, gatePass, gateReasons, status: gatePass ? "in_review" : "rejected" };
}

export interface ReviewInput {
  reviewerRef: string;
  cid: string;
  verdict: ReviewVerdict;
  reason?: string;
  flag?: ReviewFlag;
}

/** 기여 동료 검증(승인/반려/플래그) → append-only 로깅. 승격 판정은 신뢰가중 파생에서 재계산. */
export function reviewContribution(store: Store, input: ReviewInput): ContributionState | null {
  const ev = makeEvent({
    learnerRef: COMMUNITY_REF,
    type: "contribution.review",
    payload: { cid: input.cid, verdict: input.verdict, reason: input.reason, flag: input.flag, reviewerRef: input.reviewerRef },
    consent: "learn+improve+open",
  });
  const log = logFor(store, COMMUNITY_REF);
  log.append(ev);
  store.sink?.(COMMUNITY_REF, ev);
  return communityView(store).states.get(input.cid) ?? null;
}

/**
 * 커뮤니티 통합 뷰: 학습효과(사용 데이터) + **검토자 신뢰가중**으로 상태를 재판정한다(규칙 1·skill 안티어뷰즈).
 * 신규 검토자=중립(하위호환), 입증된 악성 표는 축소 → 조직적 밀어주기 방어.
 */
function communityView(store: Store): { states: Map<string, ContributionState>; trust: Map<string, number>; effects: Map<string, ItemEffect> } {
  const effects = itemEffects(aggregateResponses(store));
  const { states, trust } = evaluateCommunity(communityLog(store), effects);
  return { states, trust, effects };
}

/** 기여 목록/랭킹(검토 큐·리더보드). status/lang 필터. */
export function listContributions(store: Store, opts: { status?: ContributionState["status"]; lang?: string } = {}): ContributionState[] {
  return rankContributions(communityView(store).states.values(), opts);
}

/** 모든 학습자 로그에서 문항 응답을 집계(커뮤니티 로그 제외) — 학습효과 측정 입력. */
export function aggregateResponses(store: Store): Response[] {
  const out: Response[] = [];
  for (const [ref, log] of store.logs) {
    if (ref === COMMUNITY_REF) continue;
    for (const ev of log.all()) {
      if (ev.type !== "item.response" && ev.type !== "review.done") continue;
      const c = ev.payload["correct"];
      const g = ev.payload["grade"];
      const correct = typeof c === "boolean" ? c : g ? g !== "again" : null;
      if (ev.itemId && typeof correct === "boolean") out.push({ learner: ev.learnerRef, item: ev.itemId, correct });
    }
  }
  return out;
}

/**
 * 승격(accepted)된 커뮤니티 콘텐츠 — verified 로 서빙(규칙 4). **신뢰가중 승격 + 학습효과 강등** 반영(규칙 1).
 * 사용 데이터·신뢰 이력이 없으면 동료검증만으로 서빙(초기), 쌓이면 실효·신뢰가 서빙을 지배.
 */
export function communityBank(store: Store, lang: string): ContentItem[] {
  const view = communityView(store);
  return servableCommunityItems(view.states.values(), view.effects, lang);
}

/** 학습효과 재랭킹 리더보드(인기 아닌 실효 순, 신뢰가중 승격 반영, 규칙 1·skill). */
export function contributionLeaderboard(store: Store, opts: { status?: ContributionState["status"]; lang?: string } = {}): RankedContribution[] {
  const view = communityView(store);
  return rankByEffect(view.states.values(), view.effects, opts);
}

// ── 적응형 배치고사(CAT) ──────────────────────────────────────────────
// 상태 없는 스텝: 클라이언트가 지금까지의 응답(itemId+선택)을 보내면, 서버가 **채점**(정답은 서버만 보유)하고
// 능력(θ)·표준오차를 추정해 다음 문항을 고른다(최대정보). 정지: SE<목표 또는 최대 문항.
export interface PlacementItem {
  id: string;
  b: number;
  a?: number;
  kc?: string[];
  level?: string;
  type: string;
  prompt: string;
  answer: { value: string; accept?: string[] };
  options?: string[];
}
export interface PlacementResp {
  itemId: string;
  choice: string;
}
export interface PlacementStepResult {
  theta: number;
  se: number | null;
  done: boolean;
  count: number;
  level: string;
  next: { id: string; prompt: string; type: string; options: string[] } | null; // 정답 미포함
}

const normP = (s: string): string => (s || "").trim().toLowerCase();

export function placementStep(bank: PlacementItem[], responses: PlacementResp[], opts: { seTarget?: number; maxItems?: number } = {}): PlacementStepResult {
  const seTarget = opts.seTarget ?? 0.4;
  const maxItems = opts.maxItems ?? Math.min(8, bank.length);
  const byId = new Map(bank.map((it) => [it.id, it]));
  const obs: ResponseObs[] = [];
  const used = new Set<string>();
  for (const r of Array.isArray(responses) ? responses : []) { // 비배열 responses 방어(요청 크래시 방지)
    const it = r && byId.get(String(r.itemId));
    if (!it) continue;
    used.add(it.id);
    const accept = [it.answer.value, ...(it.answer.accept ?? [])].map(normP);
    obs.push({ b: it.b, a: it.a ?? 1, correct: accept.includes(normP(String(r.choice ?? ""))) }); // choice 를 문자열로 강제(숫자 등 방어)
  }
  const est = obs.length ? estimateAbility(obs) : { theta: 0, se: null as number | null };
  // θ 발산은 코어 estimateAbility 가 이미 [-3.5,3.5] 클램프·se null 정규화(불변식 코어 내장). 여기선 그대로 사용.
  const theta = est.theta;
  // se 가 null(불신뢰=정보 부족)이면 정지 조건 미충족으로 취급(계속 문항 제시). null < seTarget 오판 방지.
  const enough = obs.length >= maxItems || (obs.length >= 4 && est.se !== null && est.se < seTarget);
  const picked = enough ? null : (pickNextItem(theta, bank, used) as PlacementItem | null);
  const next = picked ? { id: picked.id, prompt: picked.prompt, type: picked.type, options: picked.options ?? [] } : null;
  return {
    theta,
    se: est.se,
    done: enough || !next,
    count: obs.length,
    level: cefrFromAbility(obs.length ? theta : undefined),
    next,
  };
}

// ── 생성/큐레이션 콘텐츠 발행(진화 산출 → 노출) ──────────────────────────
// 진화 루프가 만든(또는 큐레이션한) 콘텐츠를 append-only 로 발행하고, **게이트/검증 통과분만** 서빙한다(규칙 4).
// 서빙 후 학습효과로 강등된다(규칙 1) — 자기개선 플라이휠의 마지막 고리(생성→노출→측정→강등).
export const PUBLISHED_REF = "published";

function publishedLog(store: Store): readonly LearningEvent[] {
  const log = store.logs.get(PUBLISHED_REF);
  return log ? log.all() : [];
}

/** 콘텐츠 아이템 발행 — 코어 게이트 통과분만(규칙 4). draft→verified 로 서빙 편입. */
export function publishContent(store: Store, item: ContentItem, existing: ContentItem[] = []): { id: string; published: boolean; reasons: string[] } {
  const res = checkItem(item, existing);
  if (!res.pass) return { id: item.id, published: false, reasons: res.reasons };
  const stored: ContentItem = { ...item, quality: item.quality === "draft" ? "verified" : item.quality };
  const ev = makeEvent({ learnerRef: PUBLISHED_REF, type: "content.published", itemId: item.id, payload: { item: stored }, consent: "learn+improve+open" });
  logFor(store, PUBLISHED_REF).append(ev);
  store.sink?.(PUBLISHED_REF, ev);
  return { id: item.id, published: true, reasons: [] };
}

/** 등급 읽기 지문 발행 — 코어 validateReading 통과분만(규칙 4). */
export function publishReading(store: Store, passage: ReadingPassage, lang: string): { id: string; published: boolean } {
  if (!validateReading(passage)) return { id: passage.id, published: false };
  const ev = makeEvent({ learnerRef: PUBLISHED_REF, type: "reading.published", itemId: passage.id, payload: { passage, lang }, consent: "learn+improve+open" });
  logFor(store, PUBLISHED_REF).append(ev);
  store.sink?.(PUBLISHED_REF, ev);
  return { id: passage.id, published: true };
}

function derivePublished(events: readonly LearningEvent[]): { items: Map<string, ContentItem>; readings: Map<string, { passage: ReadingPassage; lang: string }> } {
  const items = new Map<string, ContentItem>();
  const readings = new Map<string, { passage: ReadingPassage; lang: string }>();
  for (const ev of events) {
    if (ev.type === "content.published") { const it = ev.payload["item"] as ContentItem; items.set(it.id, it); }
    else if (ev.type === "reading.published") { const p = ev.payload["passage"] as ReadingPassage; readings.set(p.id, { passage: p, lang: String(ev.payload["lang"]) }); }
  }
  return { items, readings };
}

/** 발행된 콘텐츠 아이템 — verified/calibrated 이고 학습효과로 강등되지 않은 것(규칙 4·1). 서빙 뱅크에 합류. */
export function publishedBank(store: Store, lang: string): ContentItem[] {
  const { items } = derivePublished(publishedLog(store));
  const effects = itemEffects(aggregateResponses(store));
  return [...items.values()].filter((it) => it.lang === lang && (it.quality === "verified" || it.quality === "calibrated") && !isDemoted(effects.get(it.id)));
}

/** 발행된 등급 읽기 지문(해당 언어). serveReading 뱅크에 합류. */
export function publishedReadings(store: Store, lang: string): ReadingPassage[] {
  const { readings } = derivePublished(publishedLog(store));
  return [...readings.values()].filter((r) => r.lang === lang).map((r) => r.passage);
}

export interface EvolveCycleGenerated {
  contentGeneration?: { items: ContentItem[] };
  readingGeneration?: { items: ReadingPassage[] };
}

/**
 * 진화 사이클 산출을 자동 발행 — 생성물을 게이트 재검사(중복 배제)하며 발행(규칙 4). 무인 진화 루프의 마지막 단계.
 * 게이트 통과·중복 아닌 것만 발행되고, 이후 학습효과로 강등된다(규칙 1) — 안전판.
 */
export function publishFromEvolve(store: Store, report: EvolveCycleGenerated, lang: string, existing: ContentItem[] = []): { publishedItems: number; publishedReadings: number; skipped: number } {
  let publishedItems = 0;
  let publishedReadings = 0;
  let skipped = 0;
  const bank = existing.slice();
  for (const item of report.contentGeneration?.items ?? []) {
    const r = publishContent(store, item, bank);
    if (r.published) { publishedItems += 1; bank.push(item); } else skipped += 1;
  }
  for (const p of report.readingGeneration?.items ?? []) {
    if (publishReading(store, p, lang).published) publishedReadings += 1;
    else skipped += 1;
  }
  return { publishedItems, publishedReadings, skipped };
}

export function loadGraph(nodes: KCNode[]): KCGraph {
  return makeGraph(nodes);
}
