// 스페인어 로컬 휴리스틱 튜터 — 오프라인·결정적. 다국어 범용을 어댑터층까지(규칙 11·13).
// 흔한 초급 오류 교정: ser 활용 일치(yo soy…) · 정관사 성 일치(el/la). i+1 몰입 질문은 스페인어로.
import type { TutorModel, TutorRequest, TutorResponse, Correction } from "./tutor.ts";
import { explainL } from "./tutor.ts";

// 주어 → ser 현재형
const SER: Record<string, string> = { yo: "soy", "tú": "eres", tu: "eres", "él": "es", ella: "es", usted: "es", nosotros: "somos", nosotras: "somos", ellos: "son", ellas: "son", ustedes: "son" };
const SER_FORMS = new Set(["soy", "eres", "es", "somos", "sois", "son"]);
// 통제 명사 성별(m=el, f=la)
const GENDER: Record<string, "m" | "f"> = {
  casa: "f", mesa: "f", silla: "f", puerta: "f", ventana: "f", escuela: "f", ciudad: "f", "niña": "f", profesora: "f", familia: "f", comida: "f",
  libro: "m", gato: "m", perro: "m", coche: "m", "niño": "m", profesor: "m", parque: "m", helado: "m", pan: "m",
};
// B1 문법(kc.es.preterite): 과거 시간어(ayer/anoche…) 문맥에서 현재형 → 단순과거. 정확 토큰 일치.
const PAST_TIME_ES = /\b(ayer|anoche|anteayer)\b/i;
const PRESENT_TO_PRET: Record<string, string> = {
  hablo: "hablé", como: "comí", vivo: "viví", trabajo: "trabajé", estudio: "estudié", bebo: "bebí", escribo: "escribí", compro: "compré", voy: "fui", veo: "vi",
};
// B2 문법(kc.es.subjunctive): 바람 동사(quiero/espero…) + que + 직설법 현재 → 접속법. que 이후에서만.
const WISH_VERBS = new Set(["quiero", "quieres", "quiere", "queremos", "espero", "espera", "esperamos", "ojalá", "ojala"]);
const INDIC_TO_SUBJ: Record<string, string> = {
  hablas: "hables", habla: "hable", comes: "comas", come: "coma", vives: "vivas", vive: "viva",
  es: "sea", "está": "esté", esta: "esté", va: "vaya", tiene: "tenga", viene: "venga", hace: "haga", puede: "pueda",
};

const FOLLOWUPS: Record<string, string[]> = {
  default: ["¿Qué hiciste hoy?", "Háblame de tu familia.", "¿Qué comida te gusta?", "¿Adónde quieres ir este fin de semana?"],
  intro: ["¡Bien! ¿Cómo te llamas?", "¿De dónde eres?", "¿A qué te dedicas?"],
  restaurant: ["¿Qué desea pedir?", "¿Algo para beber?", "¿Algo más?"],
  shopping: ["¿Qué está buscando?", "¿Qué talla necesita?", "¿Cómo desea pagar?"],
  directions: ["¿Adónde quiere ir?", "¿Sabe la dirección?", "¿Prefiere caminar o tomar el autobús?"],
  hospital: ["¿Qué le trae hoy?", "¿Dónde le duele?", "¿Desde cuándo tiene estos síntomas?", "¿Tiene alguna alergia?"],
  airport: ["¿Me muestra su pasaporte?", "¿Cuántas maletas va a facturar?", "¿Es este su destino final?", "¿Prefiere ventanilla o pasillo?"],
};

const tail = (w: string): string => (w.match(/[.,!?¿¡]$/) ? w.slice(-1) : "");
const core = (w: string): string => w.replace(/^[¿¡]/, "").replace(/[.,!?]$/, "").toLowerCase();

/** 흔한 스페인어 초급 오류 교정. 결정적. 교정 메모는 설명 언어(ko/en)로. */
export function correctEs(text: string, explainLang?: string): { corrected: string; corrections: Correction[] } {
  const words = text.split(/\s+/).filter(Boolean);
  const out = words.slice();
  const corrections: Correction[] = [];
  const hasPast = PAST_TIME_ES.test(text); // 단순과거 문맥(ayer…)
  const hasWish = words.some((x) => WISH_VERBS.has(core(x))); // 바람 동사
  const queIdx = words.findIndex((x) => core(x) === "que");

  for (let i = 0; i < words.length; i++) {
    const w = core(words[i]);

    // 3) 단순과거(kc.es.preterite) — ayer/anoche 문맥에서 현재형 → 단순과거
    if (hasPast && PRESENT_TO_PRET[w]) {
      out[i] = PRESENT_TO_PRET[w] + tail(words[i]);
      corrections.push({ original: words[i], corrected: PRESENT_TO_PRET[w], type: "recast", errorTag: "preterite", note: explainL(explainLang, `ayer/anoche는 과거 → 단순과거 ${PRESENT_TO_PRET[w]}`, `ayer/anoche takes the preterite → ${PRESENT_TO_PRET[w]}`) });
      continue;
    }

    // 4) 접속법(kc.es.subjunctive) — 바람 동사 + que 뒤 직설법 현재 → 접속법
    if (hasWish && queIdx >= 0 && i > queIdx && INDIC_TO_SUBJ[w]) {
      out[i] = INDIC_TO_SUBJ[w] + tail(words[i]);
      corrections.push({ original: words[i], corrected: INDIC_TO_SUBJ[w], type: "recast", errorTag: "subjunctive", note: explainL(explainLang, `바람·의심의 que 뒤에는 접속법 ${INDIC_TO_SUBJ[w]}`, `after 'que' expressing a wish, use the subjunctive ${INDIC_TO_SUBJ[w]}`) });
      continue;
    }

    // 1) ser 활용 일치 (yo es → yo soy)
    if (SER[w] && i + 1 < words.length) {
      const nRaw = words[i + 1];
      const nb = core(nRaw);
      if (SER_FORMS.has(nb) && nb !== SER[w]) {
        const corr = SER[w];
        out[i + 1] = corr + tail(nRaw);
        corrections.push({ original: nRaw, corrected: corr, type: "recast", errorTag: "ser-agreement", note: explainL(explainLang, `${w} 뒤에는 ${corr}`, `after '${w}' use '${corr}'`) });
      }
    }

    // 2) 정관사 성 일치 (el casa → la casa)
    if ((w === "el" || w === "la") && i + 1 < words.length) {
      const noun = core(words[i + 1]);
      const g = GENDER[noun];
      if (g) {
        const want = g === "m" ? "el" : "la";
        if (w !== want) {
          out[i] = want + tail(words[i]);
          corrections.push({ original: words[i], corrected: want, type: "explicit", errorTag: "gender-agreement", note: explainL(explainLang, `${noun}는 ${g === "m" ? "남성 → el" : "여성 → la"}`, `'${noun}' is ${g === "m" ? "masculine → el" : "feminine → la"}`) });
        }
      }
    }
  }

  return { corrected: out.join(" "), corrections };
}

export class SpanishHeuristicTutor implements TutorModel {
  id = "local-heuristic-es";

  async respond(req: TutorRequest): Promise<TutorResponse> {
    const { corrected, corrections } = correctEs(req.message, req.explainLang);
    const parts: string[] = [];
    if (corrections.length > 0) {
      parts.push(`¡Bien! ` + explainL(req.explainLang, `자연스럽게는 "${corrected}" 예요.`, `more naturally: "${corrected}".`));
      const notes = corrections.map((c) => c.note).filter(Boolean);
      if (notes.length) parts.push("💡 " + notes.join(" · "));
    } else {
      parts.push(`¡Muy bien! ` + explainL(req.explainLang, "잘 썼어요 👍", "well done 👍"));
    }
    const bank = FOLLOWUPS[req.task ?? "default"] ?? FOLLOWUPS.default;
    const turnIdx = req.history.filter((t) => t.role === "tutor").length % bank.length;
    parts.push(bank[turnIdx]);

    return { text: parts.join("\n"), corrections, errorTags: corrections.map((c) => c.errorTag), safety: { flagged: false } };
  }
}
