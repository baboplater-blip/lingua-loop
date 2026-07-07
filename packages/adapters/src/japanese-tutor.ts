// 일본어 로컬 휴리스틱 튜터 — 오프라인·결정적. 다국어 범용을 어댑터층 일본어(가나·한자·조사)까지(규칙 11·13).
// 흔한 초급 오류 교정: ①로마자 → 가나/한자 리캐스트(문자 인식) ②목적어 조사 を 누락 삽입·오용(は→を). i+1 몰입 질문은 일본어로.
import type { TutorModel, TutorRequest, TutorResponse, Correction } from "./tutor.ts";
import { explainL } from "./tutor.ts";

// 로마자 → 일본어(핵심 어휘). 문자 인식을 가르친다. 모호하지 않은 것만(조사 wa/o/ni 등 제외).
const ROMAJI: Record<string, string> = {
  watashi: "私 (わたし)",
  arigatou: "ありがとう", arigato: "ありがとう",
  konnichiwa: "こんにちは", konnichiha: "こんにちは",
  sayounara: "さようなら", sayonara: "さようなら",
  neko: "ねこ", inu: "いぬ",
  gakusei: "学生 (がくせい)",
  sensei: "先生 (せんせい)",
  mizu: "水 (みず)",
  pan: "パン",
  nihongo: "日本語 (にほんご)",
  hon: "本 (ほん)",
  gohan: "ごはん",
};

// 목적어가 될 만한 명사(가나·한자). 뒤에 타동사가 오면 목적어 조사 を가 필요.
const OBJ = new Set(["水", "みず", "ごはん", "パン", "本", "ほん", "にほんご", "日本語", "コーヒー", "おちゃ", "さかな"]);
// 타동사(먹다·마시다·읽다·보다·사다). 목적어 뒤 조사 を를 요구.
const TRANS = new Set(["のむ", "のみます", "たべる", "たべます", "よむ", "よみます", "みる", "みます", "かう", "かいます"]);
// B1 문법(kc.ja.te_form): 흔히 틀리는 て형 → 올바른 て형. 정확 토큰 일치라 오탐 0(五段 음편·一段 る탈락·行く 예외).
const WRONG_TE: Record<string, string> = {
  "いくて": "いって", "かうて": "かって", "まつて": "まって", "とるて": "とって",
  "のむて": "のんで", "よむて": "よんで", "しぬて": "しんで",
  "かくて": "かいて", "およぐて": "およいで",
  "たべるて": "たべて", "みるて": "みて", "ねるて": "ねて",
};
// B2 문법(kc.ja.potential): ら抜き言葉(가능형에서 ら 누락) → 표준 가능형. 정확 토큰 일치라 오탐 0.
const RA_NUKI: Record<string, string> = {
  "みれる": "みられる", "たべれる": "たべられる", "ねれる": "ねられる", "これる": "こられる",
  "おきれる": "おきられる", "でれる": "でられる", "きれる": "きられる", "かんがえれる": "かんがえられる",
};

const FOLLOWUPS: Record<string, string[]> = {
  default: ["今日は何をしましたか？", "家族について話してください。", "どんな食べ物が好きですか？", "週末はどこへ行きたいですか？"],
  intro: ["お名前は何ですか？", "どこから来ましたか？", "お仕事は何ですか？"],
  restaurant: ["ご注文は何にしますか？", "お飲み物はいかがですか？", "ほかに何かいりますか？"],
  shopping: ["何をお探しですか？", "サイズはいくつですか？", "お支払いはどうしますか？"],
  directions: ["どこへ行きたいですか？", "住所はわかりますか？", "歩きますか、バスに乗りますか？"],
  hospital: ["今日はどうされましたか？", "どこが痛いですか？", "いつから症状がありますか？", "アレルギーはありますか？"],
  airport: ["パスポートを見せてください。", "荷物はいくつ預けますか？", "ここが最終目的地ですか？", "窓側と通路側、どちらがいいですか？"],
};

const PUNCT = /[。、！？.,!?]$/;
const tail = (w: string): string => (PUNCT.test(w) ? w.slice(-1) : "");
const core = (w: string): string => w.replace(PUNCT, "");

/** 흔한 일본어 초급 오류 교정. 결정적. 로마자→문자 리캐스트 + 목적어 조사 を. 교정 메모는 설명 언어(ko/en). */
export function correctJa(text: string, explainLang?: string): { corrected: string; corrections: Correction[] } {
  const words = text.split(/\s+/).filter(Boolean);
  const corrections: Correction[] = [];

  // 1) 로마자 → 가나/한자 리캐스트
  const step1 = words.map((raw) => {
    const w = core(raw).toLowerCase();
    if (/^[a-z]+$/.test(w) && ROMAJI[w]) {
      corrections.push({ original: raw, corrected: ROMAJI[w], type: "recast", errorTag: "script", note: explainL(explainLang, `일본어 문자로: ${ROMAJI[w]}`, `in Japanese script: ${ROMAJI[w]}`) });
      return ROMAJI[w] + tail(raw);
    }
    return raw;
  });

  // 1.5) て형(kc.ja.te_form) 음편 오형 + 가능형 ら抜き(kc.ja.potential) 리캐스트 — 정확 토큰 일치
  const step1b = step1.map((raw) => {
    const w = core(raw);
    if (WRONG_TE[w]) {
      corrections.push({ original: raw, corrected: WRONG_TE[w], type: "recast", errorTag: "te-form", note: explainL(explainLang, `て형은 "${WRONG_TE[w]}" (음편·예외 활용)`, `the て-form is "${WRONG_TE[w]}" (sound change / exception)`) });
      return WRONG_TE[w] + tail(raw);
    }
    if (RA_NUKI[w]) {
      corrections.push({ original: raw, corrected: RA_NUKI[w], type: "recast", errorTag: "potential", note: explainL(explainLang, `가능형은 "${RA_NUKI[w]}" (ら抜き言葉는 구어체 오류)`, `the potential form is "${RA_NUKI[w]}" (ら-omission is nonstandard)`) });
      return RA_NUKI[w] + tail(raw);
    }
    return raw;
  });

  // 2) 목적어 조사 を — 누락 삽입(목적어+타동사) / は 오용(목적어 표지) 교정
  const out: string[] = [];
  for (let i = 0; i < step1b.length; i++) {
    const cur = core(step1b[i]);
    const prev = i > 0 ? core(step1b[i - 1]) : "";
    const nxt = i + 1 < step1b.length ? core(step1b[i + 1]) : "";
    // は를 목적어 표지로 잘못 쓴 경우(목적어 + は + 타동사) → を
    if (cur === "は" && OBJ.has(prev) && TRANS.has(nxt)) {
      out.push("を" + tail(step1b[i]));
      corrections.push({ original: step1b[i], corrected: "を", type: "recast", errorTag: "particle-wo", note: explainL(explainLang, "목적어에는 は가 아니라 を", "use を (not は) to mark the object") });
      continue;
    }
    out.push(step1b[i]);
    // 목적어 + 타동사 사이 を 누락 → 삽입
    if (OBJ.has(cur) && TRANS.has(nxt)) {
      out.push("を");
      corrections.push({ original: `${cur} ${nxt}`, corrected: `${cur} を ${nxt}`, type: "explicit", errorTag: "particle-wo", note: explainL(explainLang, "목적어와 타동사 사이에 조사 を가 필요해요", "the object particle を is needed between the object and the verb") });
    }
  }

  return { corrected: out.join(" "), corrections };
}

export class JapaneseHeuristicTutor implements TutorModel {
  id = "local-heuristic-ja";

  async respond(req: TutorRequest): Promise<TutorResponse> {
    const { corrected, corrections } = correctJa(req.message, req.explainLang);
    const parts: string[] = [];
    if (corrections.length > 0) {
      parts.push(`いいですね！` + explainL(req.explainLang, `自然には "${corrected}" ですよ。`, `more naturally: "${corrected}".`));
      const notes = corrections.map((c) => c.note).filter(Boolean);
      if (notes.length) parts.push("💡 " + notes.join(" · "));
    } else {
      parts.push(`上手です！` + explainL(req.explainLang, "잘 썼어요 👍", "well done 👍"));
    }
    const bank = FOLLOWUPS[req.task ?? "default"] ?? FOLLOWUPS.default;
    const turnIdx = req.history.filter((t) => t.role === "tutor").length % bank.length;
    parts.push(bank[turnIdx]);

    return { text: parts.join("\n"), corrections, errorTags: corrections.map((c) => c.errorTag), safety: { flagged: false } };
  }
}
