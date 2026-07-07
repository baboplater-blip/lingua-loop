// 로컬 휴리스틱 튜터 — 오프라인·결정적. 자가호스팅 기본 백엔드(규칙 13).
// 흔한 초급 오류를 교정(recast/explicit)하고 i+1 몰입 질문으로 산출을 유도(산출·상호작용 가설).
import type { TutorModel, TutorRequest, TutorResponse, Correction } from "./tutor.ts";
import { explainL } from "./tutor.ts";

const VOWEL = /^[aeiou]/i;
const BE: Record<string, string> = { i: "am", you: "are", we: "are", they: "are", he: "is", she: "is", it: "is" };
const V3: Record<string, string> = { go: "goes", do: "does", have: "has", like: "likes", want: "wants", play: "plays", eat: "eats", drink: "drinks", study: "studies", watch: "watches", live: "lives" };
// B1 문법(kc.en.present_perfect): have/has 뒤 과거형(오형)을 과거분사로. 정확 토큰 일치라 오탐 0.
const AUX_HAVE = new Set(["have", "has", "'ve", "ve", "'s"]);
const WRONG_PP: Record<string, string> = {
  went: "gone", did: "done", saw: "seen", ate: "eaten", came: "come", gave: "given", took: "taken",
  wrote: "written", broke: "broken", spoke: "spoken", drank: "drunk", ran: "run", knew: "known",
  threw: "thrown", flew: "flown", grew: "grown", began: "begun", sang: "sung", swam: "swum",
};
// B1 문법(kc.en.conditional): 제2조건문에서 was → were(가정법). if 문맥에서만.
const COND_SUBJ = new Set(["i", "he", "she", "it"]);

const FOLLOWUPS: Record<string, string[]> = {
  default: ["What did you do today?", "Tell me about your family.", "What food do you like?", "Where do you want to go this weekend?"],
  restaurant: ["What would you like to order?", "Would you like something to drink?", "Anything else for you?"],
  intro: ["Nice! What's your name?", "Where are you from?", "What do you do?"],
  shopping: ["What are you looking for?", "What size do you need?", "How would you like to pay?"],
  directions: ["Where do you want to go?", "Do you know the address?", "Would you like to walk or take the bus?"],
  hospital: ["What brings you in today?", "Where does it hurt?", "How long have you had these symptoms?", "Do you have any allergies?"],
  airport: ["May I see your passport?", "How many bags are you checking?", "Is this your final destination?", "Would you like a window or an aisle seat?"],
};

function tail(w: string): string {
  const m = w.match(/[.,!?]$/);
  return m ? m[0] : "";
}
function core(w: string): string {
  return w.replace(/[.,!?]$/, "").toLowerCase();
}

/** 흔한 오류 교정. 결정적. 교정 메모는 설명 언어(ko/en)로. */
export function correct(text: string, explainLang?: string): { corrected: string; corrections: Correction[] } {
  const words = text.split(/\s+/).filter(Boolean);
  const out = words.slice();
  const corrections: Correction[] = [];
  const ifIdx = words.findIndex((x) => core(x) === "if"); // 제2조건문 문맥(if 이후에서만 was→were)

  for (let i = 0; i < words.length; i++) {
    const raw = words[i];
    const w = core(raw);
    const p = tail(raw);

    // 5) 현재완료(kc.en.present_perfect) — have/has + 과거형(오형) → 과거분사
    if (AUX_HAVE.has(w) && i + 1 < words.length) {
      const nRaw = words[i + 1];
      const pp = WRONG_PP[core(nRaw)];
      if (pp) {
        out[i + 1] = pp + tail(nRaw);
        corrections.push({ original: nRaw, corrected: pp, type: "recast", errorTag: "present-perfect", note: explainL(explainLang, `현재완료는 과거형이 아니라 과거분사(${pp})`, `the present perfect uses the past participle, not the past tense (${pp})`) });
      }
    }

    // 6) 제2조건문 가정법(kc.en.conditional) — if 문맥에서 (I/he/she/it) was → were
    if (ifIdx >= 0 && i > ifIdx && COND_SUBJ.has(w) && i + 1 < words.length && core(words[i + 1]) === "was") {
      const nRaw = words[i + 1];
      out[i + 1] = "were" + tail(nRaw);
      corrections.push({ original: nRaw, corrected: "were", type: "recast", errorTag: "conditional", note: explainL(explainLang, "제2조건문(비현실 가정)에서는 was가 아니라 were", "the second conditional (unreal) uses 'were', not 'was'") });
    }

    // 1) 1인칭 I 대문자
    if (w === "i" && raw !== "I" && raw !== "I" + p) {
      out[i] = "I" + p;
      corrections.push({ original: raw, corrected: "I", type: "explicit", errorTag: "capitalization", note: explainL(explainLang, "1인칭 I는 항상 대문자", "The first-person 'I' is always capitalized") });
      continue;
    }

    // 2) 관사 a/an
    if ((w === "a" || w === "an") && i + 1 < words.length) {
      const next = core(words[i + 1]);
      const vowel = VOWEL.test(next);
      if (w === "a" && vowel) {
        out[i] = "an" + p;
        corrections.push({ original: raw, corrected: "an", type: "recast", errorTag: "article-agreement", note: explainL(explainLang, "모음 소리 앞에는 an", "use 'an' before a vowel sound") });
      } else if (w === "an" && !vowel) {
        out[i] = "a" + p;
        corrections.push({ original: raw, corrected: "a", type: "recast", errorTag: "article-agreement", note: explainL(explainLang, "자음 소리 앞에는 a", "use 'a' before a consonant sound") });
      }
      continue;
    }

    // 3) be동사 일치
    if (BE[w] && i + 1 < words.length) {
      const nRaw = words[i + 1];
      const nb = core(nRaw);
      if ((nb === "am" || nb === "is" || nb === "are") && nb !== BE[w]) {
        const corr = BE[w];
        out[i + 1] = corr + tail(nRaw);
        corrections.push({ original: nRaw, corrected: corr, type: "recast", errorTag: "be-agreement", note: explainL(explainLang, `${w} 뒤에는 ${corr}`, `after '${w}' use '${corr}'`) });
      }
    }

    // 4) 3인칭 단수 -s
    if ((w === "he" || w === "she" || w === "it") && i + 1 < words.length) {
      const nRaw = words[i + 1];
      const nv = core(nRaw);
      if (V3[nv]) {
        const corr = V3[nv];
        out[i + 1] = corr + tail(nRaw);
        corrections.push({ original: nRaw, corrected: corr, type: "explicit", errorTag: "subject-verb-agreement", note: explainL(explainLang, "3인칭 단수 현재는 동사에 -(e)s", "3rd-person singular present adds -(e)s") });
      }
    }
  }

  return { corrected: out.join(" "), corrections };
}

export class LocalHeuristicTutor implements TutorModel {
  id = "local-heuristic";

  async respond(req: TutorRequest): Promise<TutorResponse> {
    const { corrected, corrections } = correct(req.message, req.explainLang);
    const parts: string[] = [];
    if (corrections.length > 0) {
      parts.push(explainL(req.explainLang, `좋아요! 자연스럽게는 "${corrected}" 예요.`, `Nice! More naturally: "${corrected}".`));
      const notes = corrections.map((c) => c.note).filter(Boolean);
      if (notes.length) parts.push("💡 " + notes.join(" · "));
    } else {
      parts.push(explainL(req.explainLang, "좋아요, 잘 썼어요! 👍", "Nice, well done! 👍"));
    }
    const bank = FOLLOWUPS[req.task ?? "default"] ?? FOLLOWUPS.default;
    const turnIdx = req.history.filter((t) => t.role === "tutor").length % bank.length;
    parts.push(bank[turnIdx]);

    return {
      text: parts.join("\n"),
      corrections,
      errorTags: corrections.map((c) => c.errorTag),
      safety: { flagged: false },
    };
  }
}
