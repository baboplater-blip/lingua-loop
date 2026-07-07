// 스와힐리어 로컬 휴리스틱 튜터 — 오프라인·결정적. 다국어 범용을 어댑터층 반투어까지(규칙 11·13).
// 흔한 초급 오류 교정: ①명사 부류 복수(m-/단수 → wa-/복수, 복수 수식어 앞) ②주어 접두사 일치(복수 주어 뒤 동사 wa-). i+1 몰입 질문은 스와힐리어로.
import type { TutorModel, TutorRequest, TutorResponse, Correction } from "./tutor.ts";
import { explainL } from "./tutor.ts";

// 사람(m-/wa-) 부류 단수 → 복수. 복수 수식어 앞에서 단수 명사는 복수로.
const CLASS1_PLURAL: Record<string, string> = {
  mtu: "watu", mtoto: "watoto", mwalimu: "walimu", mwanafunzi: "wanafunzi", mgeni: "wageni",
};
// 복수를 강제하는 수식어(전부 wa- 부류 일치). 이 앞의 단수 명사는 복수여야 한다.
const PLURAL_QUANT = new Set(["wawili", "watatu", "wanne", "watano", "wengi", "wote"]);
// 복수(class 2) 명사 — 뒤 동사는 wa- 주어 접두사를 취한다.
const CLASS2 = new Set(Object.values(CLASS1_PLURAL));
// B2 문법(kc.sw.association_cha): ki-/vi- 부류 명사의 연관 -a는 cha(단수). kitabu ya → kitabu cha.
const KI_CLASS = new Set(["kitabu", "kiti", "kikombe", "kitanda", "kisu", "kioo", "chumba"]);

const FOLLOWUPS: Record<string, string[]> = {
  default: ["Uliyafanya nini leo?", "Niambie kuhusu familia yako.", "Unapenda chakula gani?", "Unataka kwenda wapi wikendi hii?"],
  intro: ["Jina lako ni nani?", "Unatoka wapi?", "Unafanya kazi gani?"],
  restaurant: ["Ungependa kuagiza nini?", "Ungependa kunywa kitu?", "Kitu kingine chochote?"],
  shopping: ["Unatafuta nini?", "Unahitaji saizi gani?", "Ungependa kulipaje?"],
  directions: ["Unataka kwenda wapi?", "Unajua anwani?", "Ungependa kutembea au kupanda basi?"],
  hospital: ["Una tatizo gani leo?", "Unaumwa wapi?", "Umekuwa na dalili hizi kwa muda gani?", "Una mzio wowote?"],
  airport: ["Naomba nione pasipoti yako.", "Una mizigo mingapi ya kuchecki?", "Hapa ndipo unakoenda mwisho?", "Ungependa kiti cha dirishani au njiani?"],
};

const PUNCT = /[.,!?]$/;
const tail = (w: string): string => (PUNCT.test(w) ? w.slice(-1) : "");
const core = (w: string): string => w.replace(PUNCT, "").toLowerCase();

/** 흔한 스와힐리어 초급 오류 교정. 결정적. 명사 부류 복수와 주어 접두사 일치. 교정 메모는 설명 언어(ko/en). */
export function correctSw(text: string, explainLang?: string): { corrected: string; corrections: Correction[] } {
  const words = text.split(/\s+/).filter(Boolean);
  const out = words.slice();
  const corrections: Correction[] = [];

  // 1) 명사 부류 복수 — 단수 명사 + 복수 수식어 → 복수 명사
  for (let i = 0; i < out.length - 1; i++) {
    const pl = CLASS1_PLURAL[core(out[i])];
    if (pl && PLURAL_QUANT.has(core(out[i + 1]))) {
      const sg = core(out[i]);
      out[i] = pl + tail(out[i]);
      corrections.push({ original: sg, corrected: pl, type: "explicit", errorTag: "noun-class-plural", note: explainL(explainLang, `${sg}는 단수 → 복수 수식어 앞에서는 ${pl}`, `'${sg}' is singular → use plural '${pl}' before a plural word`) });
    }
  }

  // 2) 주어 접두사 일치 — 복수(wa-) 주어 뒤 동사가 a-(단수)면 wa-로
  for (let i = 0; i < out.length - 1; i++) {
    if (CLASS2.has(core(out[i]))) {
      const v = core(out[i + 1]);
      if (/^a(na|li|ta)[a-z]+/.test(v)) {
        const corr = "wa" + v.slice(1);
        out[i + 1] = corr + tail(out[i + 1]);
        corrections.push({ original: words[i + 1], corrected: corr, type: "recast", errorTag: "subject-agreement", note: explainL(explainLang, `복수 주어(wa- 부류) 뒤 동사는 wa- 접두사 (${corr})`, `after a plural (wa-) subject the verb takes the wa- prefix (${corr})`) });
      }
    }
  }

  // 3) 과거 시제 -li-(kc.sw.tense_li) — 어제(jana) 문맥에서 현재 표지 -na- 를 과거 -li- 로.
  const hasJana = out.some((w) => core(w) === "jana");
  if (hasJana) {
    const tenseRe = /^(ni|u|a|tu|mu|m|wa)na([a-z]+)$/;
    for (let i = 0; i < out.length; i++) {
      const w = core(out[i]);
      const m = tenseRe.exec(w);
      if (m) {
        const corr = `${m[1]}li${m[2]}`;
        out[i] = corr + tail(out[i]);
        corrections.push({ original: words[i], corrected: corr, type: "recast", errorTag: "tense-li", note: explainL(explainLang, `jana(어제)는 과거 → 시제 표지 -li- (${corr})`, `jana (yesterday) is past → use the -li- tense marker (${corr})`) });
      }
    }
  }

  // 4) 연관 cha(kc.sw.association_cha) — ki류 명사 + ya → cha (명사 부류 일치)
  for (let i = 0; i < out.length - 1; i++) {
    if (KI_CLASS.has(core(out[i])) && core(out[i + 1]) === "ya") {
      out[i + 1] = "cha" + tail(out[i + 1]);
      corrections.push({ original: words[i + 1], corrected: "cha", type: "recast", errorTag: "association", note: explainL(explainLang, `${core(out[i])}는 ki류 → 연관은 ya가 아니라 cha`, `'${core(out[i])}' is a ki-class noun → the associative is cha, not ya`) });
    }
  }

  return { corrected: out.join(" "), corrections };
}

export class SwahiliHeuristicTutor implements TutorModel {
  id = "local-heuristic-sw";

  async respond(req: TutorRequest): Promise<TutorResponse> {
    const { corrected, corrections } = correctSw(req.message, req.explainLang);
    const parts: string[] = [];
    if (corrections.length > 0) {
      parts.push(`Vizuri! ` + explainL(req.explainLang, `자연스럽게는 "${corrected}" 예요.`, `more naturally: "${corrected}".`));
      const notes = corrections.map((c) => c.note).filter(Boolean);
      if (notes.length) parts.push("💡 " + notes.join(" · "));
    } else {
      parts.push(`Safi! ` + explainL(req.explainLang, "잘 썼어요 👍", "well done 👍"));
    }
    const bank = FOLLOWUPS[req.task ?? "default"] ?? FOLLOWUPS.default;
    const turnIdx = req.history.filter((t) => t.role === "tutor").length % bank.length;
    parts.push(bank[turnIdx]);

    return { text: parts.join("\n"), corrections, errorTags: corrections.map((c) => c.errorTag), safety: { flagged: false } };
  }
}
