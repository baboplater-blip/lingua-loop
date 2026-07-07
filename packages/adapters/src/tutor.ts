// AI 튜터 어댑터 인터페이스 + 안전 데코레이터. SSOT: ai-tutor-protocol.
// 규칙 12: 모델은 pluggable(인터페이스 뒤). 규칙 13: 로컬 폴백으로 자가호스팅 가능.
// 인젝션 방어는 어떤 모델이든 감싸는 데코레이터로 강제한다.

export type CorrectionType = "recast" | "elicitation" | "explicit";

export interface Correction {
  original: string;
  corrected: string;
  type: CorrectionType;
  errorTag: string;
  note?: string;
}

export interface TutorTurn {
  role: "learner" | "tutor";
  text: string;
}

export interface TutorRequest {
  message: string;
  history: TutorTurn[];
  targetLang: string;
  level: string; // CEFR (A1..)
  task?: string;
  explainLang?: string; // 설명(교정 메모·격려)의 화면 언어. 기본 ko. 목표어 몰입 어구는 유지.
}

/** 설명 언어 분기(ko 기본, en 지원). 튜터 교정 메모·격려를 화면 언어로. */
export function explainL(lang: string | undefined, ko: string, en: string): string {
  return lang === "en" ? en : ko;
}

export interface TutorResponse {
  text: string;
  corrections: Correction[];
  errorTags: string[];
  safety: { flagged: boolean; reason?: string };
}

export interface TutorModel {
  id: string;
  respond(req: TutorRequest): Promise<TutorResponse>;
}

// ── 프롬프트 인젝션 / 역할 오버라이드 탐지 (ai-tutor-protocol 안전) ──
const INJECTION = [
  /ignore\s+(all\s+)?(previous|prior|above)/i,
  /disregard\s+(the\s+)?(instructions|rules|system)/i,
  /system\s*prompt/i,
  /you\s+are\s+now\b/i,
  /pretend\s+to\s+be/i,
  /act\s+as\s+(a|an)\b/i,
  /무시\s*(하고|해|하라|할)/,
  /시스템\s*(프롬프트|지시)/,
  /역할을?\s*(바꿔|변경)/,
];

export function detectInjection(text: string): { flagged: boolean; reason?: string } {
  for (const re of INJECTION) {
    if (re.test(text)) return { flagged: true, reason: "지시 오버라이드 시도 감지" };
  }
  return { flagged: false };
}

/**
 * 어떤 TutorModel 이든 감싸 인젝션/안전을 강제하는 데코레이터.
 * 인젝션이 감지되면 내부 모델을 호출하지 않고 안전하게 학습으로 되돌린다.
 */
export function withSafety(inner: TutorModel): TutorModel {
  return {
    id: `safe(${inner.id})`,
    async respond(req: TutorRequest): Promise<TutorResponse> {
      const inj = detectInjection(req.message);
      if (inj.flagged) {
        const nm = langName(req.targetLang, req.explainLang);
        return {
          text: explainL(req.explainLang, `우리 ${nm} 연습을 계속해요 🙂 방금 문장을 ${nm}로 다시 말해볼까요?`, `Let's keep practicing ${nm} 🙂 Could you say that again in ${nm}?`),
          corrections: [],
          errorTags: ["blocked:injection"],
          safety: { flagged: true, reason: inj.reason },
        };
      }
      const res = await inner.respond(req);
      // 내부 모델 응답에도 안전 필드 보장
      return { ...res, safety: res.safety ?? { flagged: false } };
    },
  };
}

export function langName(lang: string, explainLang?: string): string {
  const ko: Record<string, string> = { en: "영어", ko: "한국어", es: "스페인어", ja: "일본어", zh: "중국어", ar: "아랍어", sw: "스와힐리어", hi: "힌디어" };
  const en: Record<string, string> = { en: "English", ko: "Korean", es: "Spanish", ja: "Japanese", zh: "Chinese", ar: "Arabic", sw: "Swahili", hi: "Hindi" };
  const m = explainLang === "en" ? en : ko;
  return m[lang] ?? lang;
}

/**
 * 언어별 교정 규칙이 아직 없는 목표어용 폴백 튜터 — 오교정 없이 산출을 격려한다(잘못된 규칙 적용 금지).
 * 인젝션 방어는 withSafety 로 감싼다. 언어팩·교정 규칙이 생기면 전용 튜터로 교체(규칙 12).
 */
export class PassthroughTutor implements TutorModel {
  id = "passthrough";
  async respond(req: TutorRequest): Promise<TutorResponse> {
    const nm = langName(req.targetLang, req.explainLang);
    return {
      text: explainL(req.explainLang, `좋아요! ${nm}로 계속 이야기해 볼까요? 🙂`, `Great! Shall we keep chatting in ${nm}? 🙂`),
      corrections: [],
      errorTags: [],
      safety: { flagged: false },
    };
  }
}
