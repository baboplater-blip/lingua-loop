// 아랍어 로컬 휴리스틱 튜터 — 오프라인·결정적. 다국어 범용을 어댑터층 RTL까지(규칙 11·13).
// 흔한 초급 오류 교정: ①성 일치(여성명사 + 형용사 → 형용사도 여성형 +ة) ②로마자 → 아랍 문자 리캐스트. i+1 몰입 질문은 아랍어로.
import type { TutorModel, TutorRequest, TutorResponse, Correction } from "./tutor.ts";
import { explainL } from "./tutor.ts";

// 로마자 → 아랍 문자(핵심 어휘). 아랍 문자·표기 인식을 가르친다. 모호하지 않은 것만.
const TRANSLIT: Record<string, string> = {
  salam: "سلام",
  shukran: "شكرا",
  marhaba: "مرحبا",
  naam: "نعم",
  la: "لا",
  bayt: "بيت",
  kitab: "كتاب",
  madrasa: "مدرسة",
  madina: "مدينة",
  sayyara: "سيارة",
  walad: "ولد",
  bint: "بنت",
  kabir: "كبير",
  saghir: "صغير",
  jamil: "جميل",
};

// B1 문법(kc.ar.past_tense): 어제(أمس) 문맥에서 현재형 동사를 과거형으로 리캐스트(정확 토큰 일치).
const PAST_TIME = /أمس|البارحة/;
const PRESENT_TO_PAST: Record<string, string> = {
  "أكتب": "كتبتُ", "يكتب": "كتب", "أدرس": "درستُ", "يدرس": "درس",
  "أذهب": "ذهبتُ", "يذهب": "ذهب", "آكل": "أكلتُ", "يأكل": "أكل", "أشرب": "شربتُ", "يشرب": "شرب",
};
// B2 문법(kc.ar.subjunctive_an): 조동사 뒤 동사 앞 أن 누락. أريد أذهب → أريد أن أذهب.
const MODALS = new Set(["أريد", "يريد", "نريد", "تريد", "أستطيع", "يستطيع", "نستطيع", "أحب", "يحب"]);
// 명시 집합(오탐 방지) — 조동사 뒤 1인칭 현재형 동사.
const PRESENT_VERBS = new Set(["أذهب", "أدرس", "أكتب", "أقرأ", "أشرب", "آكل", "ألعب", "أعمل", "أسافر", "أتعلم", "أنام"]);

// 여성명사(대개 ة로 끝남 + 본유 여성명사 بنت 등). 뒤 형용사가 남성형이면 여성형으로 교정.
const FEM_NOUNS = new Set(["مدينة", "سيارة", "مدرسة", "غرفة", "ساعة", "طالبة", "بنت"]);
// 형용사 남성형 → 여성형(+ة).
const ADJ_FEM: Record<string, string> = { "كبير": "كبيرة", "صغير": "صغيرة", "جميل": "جميلة", "جديد": "جديدة", "قديم": "قديمة", "طويل": "طويلة", "قصير": "قصيرة" };

const FOLLOWUPS: Record<string, string[]> = {
  default: ["ماذا فعلت اليوم؟", "أخبرني عن عائلتك.", "ما طعامك المفضل؟", "إلى أين تريد أن تذهب في نهاية الأسبوع؟"],
  intro: ["ما اسمك؟", "من أين أنت؟", "ماذا تعمل؟"],
  restaurant: ["ماذا تريد أن تطلب؟", "هل تريد أن تشرب شيئا؟", "أي شيء آخر؟"],
  shopping: ["عن ماذا تبحث؟", "ما المقاس الذي تريده؟", "كيف تريد أن تدفع؟"],
  directions: ["إلى أين تريد أن تذهب؟", "هل تعرف العنوان؟", "هل تفضل المشي أم الحافلة؟"],
  hospital: ["ما الذي أتى بك اليوم؟", "أين يؤلمك؟", "منذ متى وأنت تشعر بهذه الأعراض؟", "هل لديك أي حساسية؟"],
  airport: ["هل يمكنني رؤية جواز سفرك؟", "كم حقيبة ستسجل؟", "هل هذه وجهتك النهائية؟", "هل تفضل مقعداً بجانب النافذة أم الممر؟"],
};

const PUNCT = /[.,!?؟،]$/;
const tail = (w: string): string => (PUNCT.test(w) ? w.slice(-1) : "");
const core = (w: string): string => w.replace(PUNCT, "");

/** 흔한 아랍어 초급 오류 교정. 결정적. 성 일치(RTL·아랍 문자)와 로마자→문자 리캐스트. 교정 메모는 설명 언어(ko/en). */
export function correctAr(text: string, explainLang?: string): { corrected: string; corrections: Correction[] } {
  const words = text.split(/\s+/).filter(Boolean);
  const out = words.slice();
  const corrections: Correction[] = [];

  for (let i = 0; i < words.length; i++) {
    const raw = words[i];
    const w = core(raw);

    // 1) 로마자 → 아랍 문자
    if (/^[A-Za-z-]+$/.test(w)) {
      const ar = TRANSLIT[w.toLowerCase().replace(/-/g, "")];
      if (ar) {
        out[i] = ar + tail(raw);
        corrections.push({ original: raw, corrected: ar, type: "recast", errorTag: "script", note: explainL(explainLang, `아랍 문자로: ${ar}`, `in Arabic script: ${ar}`) });
      }
      continue;
    }

    // 2) 성 일치 — 여성명사 뒤 남성형 형용사 → 여성형(+ة)
    if (FEM_NOUNS.has(w) && i + 1 < words.length) {
      const nRaw = words[i + 1];
      const fem = ADJ_FEM[core(nRaw)];
      if (fem) {
        out[i + 1] = fem + tail(nRaw);
        corrections.push({ original: nRaw, corrected: fem, type: "explicit", errorTag: "gender-agreement", note: explainL(explainLang, `${w}는 여성명사 → 형용사도 여성형 ${fem}`, `'${w}' is feminine → the adjective is feminine too: ${fem}`) });
      }
    }

    // 3) 과거 시제(kc.ar.past_tense) — 어제(أمس) 문맥에서 현재형 동사 → 과거형
    if (PAST_TIME.test(text) && PRESENT_TO_PAST[w]) {
      out[i] = PRESENT_TO_PAST[w] + tail(raw);
      corrections.push({ original: raw, corrected: PRESENT_TO_PAST[w], type: "recast", errorTag: "tense-past", note: explainL(explainLang, `أمس(어제)는 과거 → ${PRESENT_TO_PAST[w]}`, `أمس (yesterday) takes the past tense → ${PRESENT_TO_PAST[w]}`) });
    }
  }

  // 4) 접속법 أن(kc.ar.subjunctive_an) — 조동사 + 현재동사 사이 أن 삽입(인덱스 변동 → 재구성)
  const withAn: string[] = [];
  for (let i = 0; i < out.length; i++) {
    withAn.push(out[i]);
    if (MODALS.has(core(out[i])) && i + 1 < out.length && PRESENT_VERBS.has(core(out[i + 1]))) {
      withAn.push("أن");
      corrections.push({ original: `${core(out[i])} ${core(out[i + 1])}`, corrected: `${core(out[i])} أن ${core(out[i + 1])}`, type: "explicit", errorTag: "subjunctive", note: explainL(explainLang, `조동사 뒤 동사는 أن으로 연결`, `link the verb after a modal with أن`) });
    }
  }

  return { corrected: withAn.join(" "), corrections };
}

export class ArabicHeuristicTutor implements TutorModel {
  id = "local-heuristic-ar";

  async respond(req: TutorRequest): Promise<TutorResponse> {
    const { corrected, corrections } = correctAr(req.message, req.explainLang);
    const parts: string[] = [];
    if (corrections.length > 0) {
      parts.push(`أحسنت! ` + explainL(req.explainLang, `자연스럽게는 "${corrected}" 예요.`, `more naturally: "${corrected}".`));
      const notes = corrections.map((c) => c.note).filter(Boolean);
      if (notes.length) parts.push("💡 " + notes.join(" · "));
    } else {
      parts.push(`ممتاز! ` + explainL(req.explainLang, "잘 썼어요 👍", "well done 👍"));
    }
    const bank = FOLLOWUPS[req.task ?? "default"] ?? FOLLOWUPS.default;
    const turnIdx = req.history.filter((t) => t.role === "tutor").length % bank.length;
    parts.push(bank[turnIdx]);

    return { text: parts.join("\n"), corrections, errorTags: corrections.map((c) => c.errorTag), safety: { flagged: false } };
  }
}
