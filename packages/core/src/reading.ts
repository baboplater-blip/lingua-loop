// 등급 읽기(이해가능한 입력, i+1) — 언어 무관(규칙 11). SSOT: cefr-mastery-map.
// Krashen 입력 가설: 현재 수준보다 "살짝 위"의 이해가능한 입력이 습득을 이끈다.
// 지문은 언어팩 데이터(reading.json), 코어는 학습자 수준에 맞춰 고르는 선택 로직만 담당.
import type { LearnerState, CEFR, Source } from "./types.ts";

const CEFR_ORDER: readonly CEFR[] = ["A1", "A2", "B1", "B2", "C1", "C2", "Native+"];

/** 능력 추정치(θ)에서 대략적 CEFR 레벨. 데이터 없으면 A1. */
export function cefrFromAbility(ability: number | undefined): CEFR {
  if (typeof ability !== "number") return "A1";
  if (ability > 2) return "B2";
  if (ability > 1) return "B1";
  if (ability > 0) return "A2";
  return "A1";
}

export interface ReadingQuestion {
  q: string;
  answer?: string; // 소스 데이터엔 필수(validateReading이 강제). 서빙 시 제거 — 정답 미유출(규칙 4).
  options?: string[]; // 있으면 객관식(mcq). 없으면 주관식(자유응답) — 정규화 대조로 채점.
  accept?: string[]; // 주관식 허용 정답(정답 외 표기 변형). 서빙 시 제거.
}

/** 이해 문항 채점 결과 — 서버가 신뢰 채점(규칙 1 성과가 진실·규칙 4 정답 미유출). 정답 + 해설(정답 어휘 사전). */
export interface ComprehensionResult {
  correct: boolean;
  correctAnswer: string;
  chosen: string;
  question: string;
  glossaryHints: { word: string; gloss: string }[];
}

export interface ReadingPassage {
  id: string;
  level: CEFR;
  kc: string[];
  title: string;
  text: string;
  glossary: Record<string, string>; // 단어 → 뜻(클릭 사전)
  questions?: ReadingQuestion[];
  source: Source;
}

/**
 * 지문 검증(규칙 4·6 정신 — 미검증/오정답 노출 금지). 통과분만 서빙한다.
 * 본문 존재·라이선스 명시(규칙 14)·객관식 정답이 보기 안에 있는지.
 */
export function validateReading(p: ReadingPassage): boolean {
  if (!p || !p.id || typeof p.text !== "string" || p.text.trim().length < 10) return false;
  if (!p.source || !p.source.license) return false;
  if (!Array.isArray(p.kc) || p.kc.length === 0) return false;
  if (!CEFR_ORDER.includes(p.level)) return false; // 유효한 CEFR 등급만(오타·비정상 레벨 지문 노출 차단, 규칙 4)
  if (p.questions) {
    for (const q of p.questions) {
      if (typeof q.answer !== "string" || q.answer.trim() === "") return false; // 소스는 정답 필수
      if (q.options !== undefined) { // mcq — 정답이 보기 안에
        if (!Array.isArray(q.options) || !q.options.includes(q.answer)) return false;
      }
      // options 없으면 주관식 — 정답만 있으면 유효(자유응답 정규화 채점)
    }
  }
  return true;
}

/** 자유응답 채점용 정규화 — 소문자·공백 정리·앞뒤 구두점 제거. 언어 무관(유니코드 구두점, 규칙 11). */
function normReading(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ").replace(/^[\p{P}]+|[\p{P}]+$/gu, "");
}

/**
 * i+1 등급 읽기 선택. 학습자 읽기 수준과 **같거나 한 단계 위**를 선호(이해가능 + 새로움).
 * 두 단계 이상 위(너무 어려움)는 배제해 좌절을 막고, 쉬운 지문은 복습으로 후순위 허용.
 * 결정적(안정 정렬) — 같은 상태·같은 지문셋이면 같은 순서(규칙 5 파생 재현성).
 */
export function selectGradedReading(
  state: LearnerState,
  passages: ReadingPassage[],
  opts: { limit?: number } = {},
): ReadingPassage[] {
  const level = cefrFromAbility(state.ability.reading);
  const li = CEFR_ORDER.indexOf(level);
  const scored = passages
    .filter(validateReading)
    .map((p, idx) => ({ p, idx, fit: fitScore(CEFR_ORDER.indexOf(p.level) - li) }))
    .filter((s) => s.fit > 0);
  scored.sort((a, b) => (b.fit - a.fit) || (a.idx - b.idx)); // fit 내림차순, 동점은 원순서(안정)
  return scored.slice(0, opts.limit ?? 5).map((s) => s.p);
}

/** 레벨차 → 적합도. 0=현수준(최우선 이해가능), +1=i+1(자극), 음수=복습, +2↑=너무 어려움(배제). */
function fitScore(delta: number): number {
  if (delta === 0) return 3;
  if (delta === 1) return 2;
  if (delta < 0) return Math.max(0.1, 1 + delta * 0.1);
  return -1; // delta >= 2 → 배제
}

/**
 * 이해 문항 채점 — 서버가 데이터로 판정한다(클라이언트 자기보고 금지, 규칙 1).
 * 정답을 클라이언트에 노출하지 않고(규칙 4) 서버에서만 대조. 검증 안 된 문항(정답이 보기 밖)은 채점 불가 → null.
 * 해설: 정답 문자열에 등장하는 사전 어휘(결정적·언어 무관, 규칙 11). 없으면 빈 목록.
 */
export function scoreComprehension(p: ReadingPassage, questionIndex: number, choice: string): ComprehensionResult | null {
  if (!p || !p.questions || questionIndex < 0 || questionIndex >= p.questions.length) return null;
  const q = p.questions[questionIndex];
  if (!q || typeof q.answer !== "string" || q.answer.trim() === "") return null; // 규칙 4 — 미검증 문항 채점 금지
  const isMcq = Array.isArray(q.options) && q.options.length > 0;
  if (isMcq && !q.options!.includes(q.answer)) return null; // mcq 정답이 보기 밖 → 채점 불가
  let correct: boolean;
  if (isMcq) {
    correct = choice === q.answer; // 객관식 — 정확 일치
  } else {
    const c = normReading(choice); // 주관식 — 정규화 후 정답·허용 정답과 대조
    correct = c !== "" && [q.answer, ...(q.accept ?? [])].map(normReading).includes(c);
  }
  const glossaryHints: { word: string; gloss: string }[] = [];
  for (const [word, gloss] of Object.entries(p.glossary ?? {})) {
    if (q.answer.includes(word)) glossaryHints.push({ word, gloss });
  }
  return { correct, correctAnswer: q.answer, chosen: choice, question: q.q, glossaryHints };
}

/** 서빙용 지문 — 문항에서 정답(answer·accept)을 제거해 클라이언트에 노출하지 않는다(규칙 4). options(주관식이면 없음)로 유형만 전달. 채점은 서버. */
export function redactReadingAnswers(p: ReadingPassage): ReadingPassage {
  if (!p.questions) return p;
  return { ...p, questions: p.questions.map((q) => (q.options ? { q: q.q, options: [...q.options] } : { q: q.q })) };
}
