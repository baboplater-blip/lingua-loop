// 코어 도메인 타입 — 언어 무관(규칙 11).
// 스킬 SSOT: content-item-schema · telemetry-event-schema · learner-model-spec.

export type Grade = "again" | "hard" | "good" | "easy";
export const GRADES: readonly Grade[] = ["again", "hard", "good", "easy"];

export type Skill = "reading" | "listening" | "speaking" | "writing";
export type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native+";
export type Quality = "draft" | "verified" | "calibrated" | "retired";
export type Consent = "learn" | "learn+improve" | "learn+improve+open";

export type ItemType =
  | "flashcard"
  | "cloze"
  | "mcq"
  | "listen_comprehension"
  | "reading_graded"
  | "translate_prod"
  | "speak_shadow"
  | "dialog_seed"
  | "minimal_pair";

export interface Source {
  kind: "generated" | "contributed" | "corpus";
  ref?: string;
  license: string; // 규칙 14 — 필수
}

export interface Distractor {
  value: string;
  errorTag?: string;
}

export interface ContentItem {
  id: string;
  lang: string; // 목표 언어(ISO 639)
  type: ItemType;
  kc: string[]; // 훈련/평가하는 KC (비어 있으면 안 됨)
  level: CEFR; // 초기 좌표 — 실제 난이도는 캘리브레이션(규칙 3)
  prompt: string; // 유형별 텍스트(간이). 구조화는 후속.
  answer: { value: string; accept?: string[] } | null;
  distractors?: Distractor[];
  difficulty: number | null; // IRT b — 캘리브레이션 전 null
  discrimination: number | null; // IRT a
  quality: Quality;
  source: Source;
  i18n?: Record<string, Record<string, string>>; // uiLang -> {key: text}
  meta?: { createdAt?: string; schemaVersion: number };
}

export type EventType =
  | "item.response"
  | "review.due"
  | "review.done"
  | "tutor.turn"
  | "speak.attempt"
  | "assessment.item"
  | "content.exposure"
  | "contribution.submitted"
  | "contribution.review"
  | "content.published"
  | "reading.published"
  | "content.calibrated"
  | "fsrs.tuned"
  | "efficacy.snapshot"
  | "experiment.registered"
  | "session.start"
  | "session.end";

export interface LearningEvent {
  eventId: string;
  ts: string; // ISO8601 (서버 확정)
  learnerRef: string; // 가명 — PII 아님(규칙 7)
  sessionId?: string;
  type: EventType;
  kc?: string[];
  itemId?: string;
  payload: Record<string, unknown>;
  consent: Consent;
  schemaVersion: number;
}

// 파생 상태 — learner-model-spec
export interface KCMemory {
  mastery: number; // 0..1 지식추적 확률
  stability: number; // FSRS 안정성(일)
  difficulty: number; // FSRS 난이도 1..10
  lastReviewTs: number | null; // ms
  dueTs: number | null; // ms
  reps: number;
}

export interface LearnerState {
  learnerRef: string;
  lang: string;
  kcState: Record<string, KCMemory>;
  ability: Partial<Record<Skill, number>>;
  fromEventCount: number; // 재현 좌표
}
