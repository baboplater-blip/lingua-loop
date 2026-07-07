// 콘텐츠 생성기 어댑터. SSOT: content-generation-quality-gate. pluggable(규칙 12).
// 기본 = 오프라인 템플릿 생성기(외부 API 0, 규칙 13). LLM 생성기는 같은 인터페이스로 교체.
// 생성물은 draft — 반드시 코어 content-gate(promoteVerified)를 통과해야 노출된다(규칙 4).
import type { ContentItem } from "../../core/src/index.ts";

export interface GenRequest {
  lang: string;
  kc: string;
  type?: string;
  level?: string;
  count: number;
  license?: string;
}

export interface ContentGenerator {
  id: string;
  supports(kc: string): boolean;
  generate(req: GenRequest): ContentItem[];
}

const VOWEL = /^[aeiou]/i;
const NOUNS = ["apple", "elephant", "umbrella", "orange", "egg", "dog", "car", "book", "house", "pen", "table", "idea"];
const VERBS = [
  { base: "drink", third: "drinks", ing: "drinking", past: "drank" },
  { base: "go", third: "goes", ing: "going", past: "went" },
  { base: "eat", third: "eats", ing: "eating", past: "ate" },
  { base: "play", third: "plays", ing: "playing", past: "played" },
  { base: "watch", third: "watches", ing: "watching", past: "watched" },
  { base: "study", third: "studies", ing: "studying", past: "studied" },
];
const OBJECTS = ["coffee", "tea", "football", "music", "English", "dinner"];
const SUBJ3 = ["She", "He", "My friend", "The teacher"];
const SUBJ_BE = [{ s: "I", be: "am" }, { s: "You", be: "are" }, { s: "She", be: "is" }, { s: "We", be: "are" }, { s: "They", be: "are" }, { s: "He", be: "is" }];
const VOCAB = [{ ko: "고양이 (동물)", en: "cat" }, { ko: "개 (동물)", en: "dog" }, { ko: "물", en: "water" }, { ko: "책", en: "book" }, { ko: "사과", en: "apple" }, { ko: "학교", en: "school" }];

function base(id: string, kc: string, type: ContentItem["type"], level: string, license: string): Pick<ContentItem, "id" | "lang" | "type" | "kc" | "level" | "difficulty" | "discrimination" | "quality" | "source" | "meta"> {
  return { id, lang: "en", type, kc: [kc], level: level as ContentItem["level"], difficulty: null, discrimination: null, quality: "draft", source: { kind: "generated", license }, meta: { schemaVersion: 1 } };
}

/** 영어 템플릿 생성기 — 결정적(시드 불필요). KC별 렉시콘 조합으로 다양한 draft 생성. */
export class EnglishTemplateGenerator implements ContentGenerator {
  id = "en-template";
  private kcs = new Set(["kc.en.articles", "kc.en.present_simple", "kc.en.present_be", "kc.en.vocab.core"]);

  supports(kc: string): boolean {
    return this.kcs.has(kc);
  }

  generate(req: GenRequest): ContentItem[] {
    const license = req.license ?? "CC0-1.0";
    const level = req.level ?? "A1";
    const out: ContentItem[] = [];

    if (req.kc === "kc.en.articles") {
      for (const noun of NOUNS) {
        const ans = VOWEL.test(noun) ? "an" : "a";
        out.push({ ...base("gen.en.art." + noun, req.kc, "mcq", level, license), prompt: `I saw ___ ${noun}.`, answer: { value: ans }, distractors: (ans === "an" ? ["a", "the"] : ["an", "the"]).map((v) => ({ value: v })) });
      }
    } else if (req.kc === "kc.en.present_simple") {
      for (const subj of SUBJ3) for (const v of VERBS) {
        const obj = OBJECTS[(SUBJ3.indexOf(subj) + VERBS.indexOf(v)) % OBJECTS.length];
        out.push({ ...base(`gen.en.ps.${SUBJ3.indexOf(subj)}.${v.base}`, req.kc, "mcq", level, license), prompt: `${subj} ___ ${obj} every day.`, answer: { value: v.third }, distractors: [v.base, v.ing, v.past].map((val) => ({ value: val })) });
      }
    } else if (req.kc === "kc.en.present_be") {
      for (const b of SUBJ_BE) {
        out.push({ ...base("gen.en.be." + b.s, req.kc, "cloze", level, license), prompt: `${b.s} ___ a student.`, answer: { value: b.be, accept: [b.be] }, distractors: [] });
      }
    } else if (req.kc === "kc.en.vocab.core") {
      for (const w of VOCAB) {
        out.push({ ...base("gen.en.vocab." + w.en, req.kc, "flashcard", level, license), prompt: w.ko, answer: { value: w.en }, distractors: [] });
      }
    }

    return out.slice(0, req.count);
  }
}
