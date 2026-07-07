// 발음 스코어링 어댑터(pluggable, 규칙 12·13). SSOT: pronunciation-scoring.
// 기본은 **오프라인 로컬** — 외부 API 0(규칙 13). 두 경로:
//   1) 전사(ASR/음소입력)가 있으면 → 코어 음성학 엔진으로 **객관 채점**(음소별 피드백).
//   2) 전사가 없으면(오프라인 섀도잉) → 학습자 **자가평가**를 점수로 환산.
// ⚠️ 이 어댑터는 원음성(오디오)을 절대 받지 않는다 — 전사/자가평가만(프라이버시=규칙 6·8).
// 실제 ASR(브라우저 SpeechRecognition·자가호스팅 Whisper 등)은 같은 인터페이스로 교체한다.
import { scorePronunciation, stressScore, toneScore } from "../../core/src/index.ts";
import type { PhonemeCompare } from "../../core/src/index.ts";
import type { Grade } from "../../core/src/index.ts";

export interface PronunciationRequest {
  targetIPA: string[];
  producedIPA?: string[]; // ASR/음소입력 전사(있으면 객관 채점)
  targetStress?: number[]; // 목표 강세 패턴(음절별). 운율 채점용
  producedStress?: number[]; // 산출 강세 패턴(있으면 운율 채점)
  targetTones?: number[]; // 목표 성조(음절별 1~4·경성). 성조어 채점용
  producedTones?: number[]; // 산출 성조
  selfGrade?: Grade; // 오프라인 섀도잉 자가평가
  word?: string;
  kc?: string;
}

export interface PronunciationResult {
  mode: "asr" | "self";
  score: number; // 0..1 (분절음 + 운율[강세·성조] 통합)
  intelligibility: number; // 0..1 명료도(알아들을 수 있는가) — 명료도 우선(규칙 1)
  prosody?: { stress?: number; tone?: number; note?: string }; // 운율 점수, 있을 때
  perPhoneme: PhonemeCompare[];
  errors: PhonemeCompare[];
  hints: string[]; // 상위 조음/운율 교정 힌트
  note?: string;
}

export interface PronunciationScorer {
  score(req: PronunciationRequest): Promise<PronunciationResult>;
}

const GRADE_SCORE: Record<Grade, number> = { again: 0.2, hard: 0.5, good: 0.8, easy: 0.95 };

/** 오프라인 로컬 스코어러 — 코어 음성학 엔진 사용, 외부 호출 0. */
export class LocalPhoneticScorer implements PronunciationScorer {
  async score(req: PronunciationRequest): Promise<PronunciationResult> {
    if (req.producedIPA && req.producedIPA.length > 0) {
      const s = scorePronunciation(req.targetIPA, req.producedIPA);
      const hints = dedupe(s.errors.map((e) => e.hint).filter((h): h is string => !!h)).slice(0, 2);
      // 운율(강세·성조): 목표·산출이 모두 있으면 채점해 종합에 반영
      let prosody: { stress?: number; tone?: number; note?: string } | undefined;
      let intelligibility = s.intelligibility;
      const factors: number[] = [];
      if (req.targetStress && req.targetStress.length > 0 && req.producedStress) {
        const st = stressScore(req.targetStress, req.producedStress);
        prosody = { ...prosody, stress: round(st.score) };
        factors.push(st.score);
        if (!st.primaryMatch) intelligibility = Math.min(intelligibility, 0.75); // 주강세 오류는 명료도 손실
        if (st.note) hints.push(st.note);
      }
      if (req.targetTones && req.targetTones.length > 0 && req.producedTones) {
        const tn = toneScore(req.targetTones, req.producedTones);
        prosody = { ...prosody, tone: round(tn.score) };
        factors.push(tn.score);
        if (tn.score < 1) intelligibility = Math.min(intelligibility, 0.55 + 0.45 * tn.score); // 성조 오류 = 다른 단어, 명료도 크게 손실
        if (tn.note) hints.push(tn.note);
      }
      const score = factors.length ? 0.7 * s.score + 0.3 * (factors.reduce((a, b) => a + b, 0) / factors.length) : s.score;
      return {
        mode: "asr",
        score: round(score),
        intelligibility: round(intelligibility),
        prosody,
        perPhoneme: s.perPhoneme,
        errors: s.errors,
        hints: hints.slice(0, 3),
        note: intelligibility >= 0.8 ? "알아들을 만해요 — 명료도 좋음" : undefined,
      };
    }
    // 오프라인 섀도잉: 자가평가를 점수로 환산(원어민 억양 강요 없이 습관화 지원)
    const g = req.selfGrade ?? "good";
    const val = GRADE_SCORE[g];
    return {
      mode: "self",
      score: val,
      intelligibility: val,
      perPhoneme: [],
      errors: [],
      hints: [],
      note: "자가평가 — 원음 TTS를 듣고 스스로 비교했어요. 명료하게 전달되면 충분합니다.",
    };
  }
}

const round = (x: number): number => Math.round(x * 100) / 100;
const dedupe = (a: string[]): string[] => [...new Set(a)];

/** 기본 발음 스코어러 = 오프라인 로컬(외부 API 0). ASR 백엔드는 같은 인터페이스로 교체(규칙 12). */
export function createDefaultPronunciationScorer(): PronunciationScorer {
  return new LocalPhoneticScorer();
}
