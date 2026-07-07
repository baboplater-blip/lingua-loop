// 힌디어 로컬 휴리스틱 튜터 — 오프라인·결정적. 다국어 범용을 어댑터층 데바나가리(abugida)까지(규칙 11·13).
// 흔한 초급 오류 교정: ①로마자 → 데바나가리 리캐스트(문자 인식) ②성 일치(여성 명사 앞 형용사 → 여성형 -ी). i+1 몰입 질문은 힌디어로.
import type { TutorModel, TutorRequest, TutorResponse, Correction } from "./tutor.ts";
import { explainL } from "./tutor.ts";

// 로마자 → 데바나가리(핵심 어휘). 문자 인식을 가르친다. 모호하지 않은 것만.
const TRANSLIT: Record<string, string> = {
  namaste: "नमस्ते", namaskar: "नमस्कार",
  dhanyavaad: "धन्यवाद", dhanyavad: "धन्यवाद",
  shukriya: "शुक्रिया",
  alvida: "अलविदा",
  pani: "पानी", paani: "पानी",
  ghar: "घर",
  ladka: "लड़का", ladki: "लड़की",
  achcha: "अच्छा",
  haan: "हाँ", nahin: "नहीं", nahi: "नहीं",
  kitab: "किताब", chai: "चाय",
};

// 여성 명사(대개 -ी로 끝나거나 본유 여성). 앞 형용사가 남성형이면 여성형으로 교정.
const FEM_NOUNS = new Set(["लड़की", "बिल्ली", "रोटी", "किताब", "चाय", "कुर्सी", "मेज़", "मछली"]);
// 형용사 남성형(-ा) → 여성형(-ी).
const ADJ_FEM: Record<string, string> = { "अच्छा": "अच्छी", "बड़ा": "बड़ी", "छोटा": "छोटी", "काला": "काली", "नया": "नई", "पुराना": "पुरानी", "लंबा": "लंबी" };
// B1 문법(kc.hi.postpositions): 처소 후치사 में 누락. 장소 명사가 계사(होना) 바로 앞이면 사이에 में 삽입.
const LOC_NOUNS = new Set(["घर", "स्कूल", "बाज़ार", "बाजार", "दफ़्तर", "दफ्तर", "कमरा", "कमरे", "शहर"]);
const COPULA = new Set(["हूँ", "है", "हैं", "था", "थी", "थे"]);
// B2 문법(kc.hi.ergative_ne): 완료 타동사 주어 능격 ने 누락. 대명사 → 능격형(규칙적 축약만; वह→उसने 불규칙 제외로 오탐 방지).
const ERGATIVE: Record<string, string> = { "मैं": "मैंने", "हम": "हमने", "तुम": "तुमने", "आप": "आपने", "तू": "तूने" };
const PAST_TRANS = new Set(["देखा", "खाया", "लिखा", "पढ़ा", "पिया", "किया", "बनाया", "सुना", "कहा", "लिया"]);

const FOLLOWUPS: Record<string, string[]> = {
  default: ["आज आपने क्या किया?", "अपने परिवार के बारे में बताइए।", "आपको कौन-सा खाना पसंद है?", "इस सप्ताहांत आप कहाँ जाना चाहते हैं?"],
  intro: ["आपका नाम क्या है?", "आप कहाँ से हैं?", "आप क्या काम करते हैं?"],
  restaurant: ["आप क्या ऑर्डर करना चाहेंगे?", "कुछ पीने के लिए?", "और कुछ चाहिए?"],
  shopping: ["आप क्या ढूँढ रहे हैं?", "आपको कौन-सा साइज़ चाहिए?", "आप कैसे भुगतान करेंगे?"],
  directions: ["आप कहाँ जाना चाहते हैं?", "क्या आपको पता मालूम है?", "आप पैदल जाएँगे या बस से?"],
  hospital: ["आज आपको क्या तकलीफ़ है?", "कहाँ दर्द होता है?", "ये लक्षण कब से हैं?", "क्या आपको कोई एलर्जी है?"],
  airport: ["क्या मैं आपका पासपोर्ट देख सकता हूँ?", "आप कितने बैग चेक कर रहे हैं?", "क्या यही आपकी अंतिम मंज़िल है?", "आप खिड़की या गलियारे की सीट चाहेंगे?"],
};

const PUNCT = /[।.,!?]$/;
const tail = (w: string): string => (PUNCT.test(w) ? w.slice(-1) : "");
const core = (w: string): string => w.replace(PUNCT, "");

/** 흔한 힌디어 초급 오류 교정. 결정적. 로마자→문자 리캐스트 + 성 일치(형용사→명사). 교정 메모는 설명 언어(ko/en). */
export function correctHi(text: string, explainLang?: string): { corrected: string; corrections: Correction[] } {
  const words = text.split(/\s+/).filter(Boolean);
  const out = words.slice();
  const corrections: Correction[] = [];

  for (let i = 0; i < words.length; i++) {
    const raw = words[i];
    const w = core(raw);

    // 1) 로마자 → 데바나가리
    if (/^[A-Za-z-]+$/.test(w)) {
      const dev = TRANSLIT[w.toLowerCase().replace(/-/g, "")];
      if (dev) {
        out[i] = dev + tail(raw);
        corrections.push({ original: raw, corrected: dev, type: "recast", errorTag: "script", note: explainL(explainLang, `데바나가리로: ${dev}`, `in Devanagari: ${dev}`) });
      }
      continue;
    }

    // 2) 성 일치 — 남성형 형용사 + 여성 명사 → 형용사 여성형(-ी). (힌디는 형용사가 명사 앞)
    const fem = ADJ_FEM[w];
    if (fem && i + 1 < words.length && FEM_NOUNS.has(core(words[i + 1]))) {
      out[i] = fem + tail(raw);
      corrections.push({ original: raw, corrected: fem, type: "explicit", errorTag: "gender-agreement", note: explainL(explainLang, `${core(words[i + 1])}는 여성 명사 → 형용사도 여성형 ${fem}`, `'${core(words[i + 1])}' is feminine → the adjective is feminine too: ${fem}`) });
    }
  }

  // 2.5) 능격 ने(kc.hi.ergative_ne) — 완료 타동사가 있으면 주어 대명사를 능격형으로(मैं → मैंने)
  if (out.some((w) => PAST_TRANS.has(core(w)))) {
    for (let i = 0; i < out.length; i++) {
      const erg = ERGATIVE[core(out[i])];
      if (erg) {
        corrections.push({ original: out[i], corrected: erg, type: "explicit", errorTag: "ergative", note: explainL(explainLang, `완료 타동사의 주어에는 능격 ने (${erg})`, `the subject of a perfective transitive takes ergative ने (${erg})`) });
        out[i] = erg + tail(out[i]);
        break; // 주어(첫 대명사) 하나만
      }
    }
  }

  // 3) 처소 후치사 में(kc.hi.postpositions) — 장소 명사가 계사 바로 앞이면 사이에 में 삽입(인덱스 변동 → 재구성)
  const withPost: string[] = [];
  for (let i = 0; i < out.length; i++) {
    withPost.push(out[i]);
    if (LOC_NOUNS.has(core(out[i])) && i + 1 < out.length && COPULA.has(core(out[i + 1]))) {
      withPost.push("में");
      corrections.push({ original: `${core(out[i])} ${core(out[i + 1])}`, corrected: `${core(out[i])} में ${core(out[i + 1])}`, type: "explicit", errorTag: "postposition", note: explainL(explainLang, `장소에는 처소 후치사 में이 필요해요 (${core(out[i])} में)`, `location needs the postposition में (${core(out[i])} में)`) });
    }
  }

  return { corrected: withPost.join(" "), corrections };
}

export class HindiHeuristicTutor implements TutorModel {
  id = "local-heuristic-hi";

  async respond(req: TutorRequest): Promise<TutorResponse> {
    const { corrected, corrections } = correctHi(req.message, req.explainLang);
    const parts: string[] = [];
    if (corrections.length > 0) {
      parts.push(`बहुत अच्छा! ` + explainL(req.explainLang, `स्वाभाविक रूप से "${corrected}" है।`, `more naturally: "${corrected}".`));
      const notes = corrections.map((c) => c.note).filter(Boolean);
      if (notes.length) parts.push("💡 " + notes.join(" · "));
    } else {
      parts.push(`शाबाश! ` + explainL(req.explainLang, "잘 썼어요 👍", "well done 👍"));
    }
    const bank = FOLLOWUPS[req.task ?? "default"] ?? FOLLOWUPS.default;
    const turnIdx = req.history.filter((t) => t.role === "tutor").length % bank.length;
    parts.push(bank[turnIdx]);

    return { text: parts.join("\n"), corrections, errorTags: corrections.map((c) => c.errorTag), safety: { flagged: false } };
  }
}
