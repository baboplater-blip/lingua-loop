// 다국어 콘텐츠 생성기 — 데이터 주도(규칙 11). 언어별·KC별 테이블로 새 draft를 결정적으로 생성.
// 지원 KC: vocab.core·numbers·greetings·B1 문법(了·과거·-li-·て형·후치사). 진화 폐루프가 격차 KC를 자동으로 메움.
// 생성물은 draft — 반드시 코어 content-gate(checkItem)를 통과해야 노출된다(규칙 4). 외부 API 0(규칙 13).
import type { ContentItem } from "../../core/src/index.ts";
import type { ContentGenerator, GenRequest } from "./content-gen.ts";

// 생성 항목: flashcard(뜻→목표어) 또는 mcq(문법 대조). 시드와 겹치지 않는 새 콘텐츠만.
interface GenEntry {
  id: string;
  type?: "flashcard" | "mcq";
  prompt: string;
  answer: string;
  accept?: string[];
  distractors?: { value: string; errorTag: string }[];
}

// 언어별 B1 문법 KC(언어마다 이름이 다름).
const B1_GRAMMAR_KC: Record<string, string> = {
  zh: "kc.zh.aspect_le", ar: "kc.ar.past_tense", sw: "kc.sw.tense_li", ja: "kc.ja.te_form", hi: "kc.hi.postpositions",
};

// GEN[lang][kcId] = 생성 항목들. 모두 시드와 다른 새 콘텐츠(진화가 격차를 새 항목으로 메움).
const GEN: Record<string, Record<string, GenEntry[]>> = {
  zh: {
    "kc.zh.vocab.core": [
      { id: "chi", prompt: "먹다", answer: "吃 (chī)" }, { id: "he", prompt: "마시다", answer: "喝 (hē)" },
      { id: "shu", prompt: "책", answer: "书 (shū)" }, { id: "cha", prompt: "차 (음료)", answer: "茶 (chá)" },
      { id: "jia", prompt: "집", answer: "家 (jiā)" }, { id: "pengyou", prompt: "친구", answer: "朋友 (péngyou)" },
    ],
    "kc.zh.numbers": [
      { id: "num6", prompt: "숫자 6", answer: "六 (liù)" }, { id: "num7", prompt: "숫자 7", answer: "七 (qī)" },
      { id: "num8", prompt: "숫자 8", answer: "八 (bā)" }, { id: "num9", prompt: "숫자 9", answer: "九 (jiǔ)" },
      { id: "num10", prompt: "숫자 10", answer: "十 (shí)" },
    ],
    "kc.zh.greetings": [
      { id: "morning", prompt: "좋은 아침 (인사)", answer: "早上好 (zǎoshang hǎo)" }, { id: "night", prompt: "잘 자요 (인사)", answer: "晚安 (wǎn'ān)" },
      { id: "sorry", prompt: "미안합니다", answer: "对不起 (duìbuqǐ)" }, { id: "ok", prompt: "괜찮아요", answer: "没关系 (méi guānxi)" },
    ],
    "kc.zh.aspect_le": [
      { id: "le_rain", type: "mcq", prompt: "「昨天下雨___」(어제 비가 왔다 — 변화·완료). 빈칸은?", answer: "了 (le)", distractors: [{ value: "吗 (ma)", errorTag: "aspect" }, { value: "呢 (ne)", errorTag: "aspect" }] },
      { id: "le_home", type: "mcq", prompt: "「我到家___」(나는 집에 도착했다 — 완료). 빈칸은?", answer: "了 (le)", distractors: [{ value: "的 (de)", errorTag: "aspect" }, { value: "得 (de)", errorTag: "aspect" }] },
    ],
  },
  ar: {
    "kc.ar.vocab.core": [
      { id: "kitab", prompt: "책", answer: "كتاب (kitāb)" }, { id: "bab", prompt: "문", answer: "باب (bāb)" },
      { id: "shams", prompt: "해", answer: "شمس (shams)" }, { id: "qamar", prompt: "달", answer: "قمر (qamar)" },
      { id: "sadiq", prompt: "친구", answer: "صديق (ṣadīq)" }, { id: "madrasa", prompt: "학교", answer: "مدرسة (madrasa)" },
    ],
    "kc.ar.numbers": [
      { id: "num6", prompt: "숫자 6", answer: "ستة (sitta)" }, { id: "num7", prompt: "숫자 7", answer: "سبعة (sabʿa)" },
      { id: "num8", prompt: "숫자 8", answer: "ثمانية (thamāniya)" }, { id: "num9", prompt: "숫자 9", answer: "تسعة (tisʿa)" },
      { id: "num10", prompt: "숫자 10", answer: "عشرة (ʿashara)" },
    ],
    "kc.ar.greetings": [
      { id: "morning", prompt: "좋은 아침 (인사)", answer: "صباح الخير (ṣabāḥ al-khayr)" }, { id: "night", prompt: "잘 자요 (인사)", answer: "تصبح على خير (tuṣbiḥ ʿalā khayr)" },
      { id: "sorry", prompt: "미안합니다", answer: "آسف (āsif)" }, { id: "welcome", prompt: "천만에요", answer: "عفواً (ʿafwan)" },
    ],
    "kc.ar.past_tense": [
      { id: "past_fem", type: "mcq", prompt: "\"그녀는 갔다\" (ذهب 3인칭 여성 과거)는?", answer: "ذهبتْ (dhahabat)", distractors: [{ value: "تذهب (tadhhabu, 현재)", errorTag: "tense" }, { value: "يذهب (yadhhabu, 그)", errorTag: "person" }] },
      { id: "past_you", type: "mcq", prompt: "\"당신은 썼다\" (كتب 2인칭 남성 과거)는?", answer: "كتبتَ (katabta)", distractors: [{ value: "تكتب (taktubu, 현재)", errorTag: "tense" }, { value: "كتبتُ (katabtu, 나)", errorTag: "person" }] },
    ],
  },
  sw: {
    "kc.sw.vocab.core": [
      { id: "chakula", prompt: "음식", answer: "chakula" }, { id: "rafiki", prompt: "친구", answer: "rafiki" },
      { id: "shule", prompt: "학교", answer: "shule" }, { id: "kitabu", prompt: "책", answer: "kitabu" },
      { id: "nyumba", prompt: "집", answer: "nyumba" }, { id: "jua", prompt: "해", answer: "jua" },
    ],
    "kc.sw.numbers": [
      { id: "num6", prompt: "숫자 6", answer: "sita" }, { id: "num7", prompt: "숫자 7", answer: "saba" },
      { id: "num8", prompt: "숫자 8", answer: "nane" }, { id: "num9", prompt: "숫자 9", answer: "tisa" },
      { id: "num10", prompt: "숫자 10", answer: "kumi" },
    ],
    "kc.sw.greetings": [
      { id: "habari", prompt: "안녕하세요 (어떻게 지내요)", answer: "habari" }, { id: "night", prompt: "잘 자요 (인사)", answer: "usiku mwema" },
      { id: "sorry", prompt: "실례합니다·미안합니다", answer: "samahani" }, { id: "seeyou", prompt: "또 만나요", answer: "tutaonana" },
    ],
    "kc.sw.tense_li": [
      { id: "li_we", type: "mcq", prompt: "\"우리는 갔다\" (kwenda 과거)는?", answer: "tulikwenda", distractors: [{ value: "tunakwenda (현재)", errorTag: "tense" }, { value: "tutakwenda (미래)", errorTag: "tense" }] },
      { id: "li_maria", type: "mcq", prompt: "「Maria ___lala jana」 (Maria가 어제 잤다). 시제 표지는?", answer: "-li- (alilala)", distractors: [{ value: "-na- (analala, 현재)", errorTag: "tense" }, { value: "-ta- (atalala, 미래)", errorTag: "tense" }] },
    ],
  },
  ja: {
    "kc.ja.vocab.core": [
      { id: "taberu", prompt: "먹다", answer: "食べる (taberu)" }, { id: "nomu", prompt: "마시다", answer: "飲む (nomu)" },
      { id: "hon", prompt: "책", answer: "本 (hon)" }, { id: "tomodachi", prompt: "친구", answer: "友だち (tomodachi)" },
      { id: "ie", prompt: "집", answer: "家 (ie)" }, { id: "gakkou", prompt: "학교", answer: "学校 (gakkō)" },
    ],
    "kc.ja.numbers": [
      { id: "num6", prompt: "숫자 6", answer: "六 (ろく, roku)" }, { id: "num7", prompt: "숫자 7", answer: "七 (なな, nana)" },
      { id: "num8", prompt: "숫자 8", answer: "八 (はち, hachi)" }, { id: "num9", prompt: "숫자 9", answer: "九 (きゅう, kyū)" },
      { id: "num10", prompt: "숫자 10", answer: "十 (じゅう, jū)" },
    ],
    "kc.ja.greetings": [
      { id: "morning", prompt: "좋은 아침 (인사)", answer: "おはよう (ohayō)" }, { id: "night", prompt: "잘 자요 (인사)", answer: "おやすみ (oyasumi)" },
      { id: "sorry", prompt: "미안합니다", answer: "ごめんなさい (gomennasai)" }, { id: "welcome", prompt: "천만에요", answer: "どういたしまして (dōitashimashite)" },
    ],
    "kc.ja.te_form": [
      { id: "te_kaku", type: "mcq", prompt: "かく(書く, 쓰다)의 て형은?", answer: "かいて (kaite)", distractors: [{ value: "かきて (kakite)", errorTag: "te-form" }, { value: "かくて (kakute)", errorTag: "te-form" }] },
      { id: "te_suru", type: "mcq", prompt: "する(하다)의 て형은? (예외)", answer: "して (shite)", distractors: [{ value: "しるて (shirute)", errorTag: "te-form" }, { value: "すて (sute)", errorTag: "te-form" }] },
    ],
  },
  hi: {
    "kc.hi.vocab.core": [
      { id: "khana", prompt: "음식", answer: "खाना (khānā)" }, { id: "dost", prompt: "친구", answer: "दोस्त (dost)" },
      { id: "kitab", prompt: "책", answer: "किताब (kitāb)" }, { id: "skul", prompt: "학교", answer: "स्कूल (skūl)" },
      { id: "chai", prompt: "차 (음료)", answer: "चाय (chāy)" }, { id: "suraj", prompt: "해", answer: "सूरज (sūraj)" },
    ],
    "kc.hi.numbers": [
      { id: "num6", prompt: "숫자 6", answer: "छह (chhah)" }, { id: "num7", prompt: "숫자 7", answer: "सात (sāt)" },
      { id: "num8", prompt: "숫자 8", answer: "आठ (āṭh)" }, { id: "num9", prompt: "숫자 9", answer: "नौ (nau)" },
      { id: "num10", prompt: "숫자 10", answer: "दस (das)" },
    ],
    "kc.hi.greetings": [
      { id: "morning", prompt: "좋은 아침 (인사)", answer: "सुप्रभात (suprabhāt)" }, { id: "night", prompt: "잘 자요 (인사)", answer: "शुभ रात्रि (shubh rātri)" },
      { id: "sorry", prompt: "미안합니다", answer: "माफ़ कीजिए (māf kījie)" }, { id: "welcome", prompt: "환영합니다", answer: "आपका स्वागत है (āpkā svāgat hai)" },
    ],
    "kc.hi.postpositions": [
      { id: "post_se", type: "mcq", prompt: "「चाकू ___ काटो」(칼로 잘라라 — 수단). 후치사는?", answer: "से (se, ~로)", distractors: [{ value: "में (mein, ~안에)", errorTag: "postposition" }, { value: "को (ko, ~에게)", errorTag: "postposition" }] },
      { id: "post_mein2", type: "mcq", prompt: "「पानी गिलास ___ है」(물이 컵 안에 있다). 후치사는?", answer: "में (mein, ~안에)", distractors: [{ value: "से (se, ~로부터)", errorTag: "postposition" }, { value: "को (ko, ~에게)", errorTag: "postposition" }] },
    ],
  },
};

/** 지원 언어인지(생성 테이블 보유). */
export function supportsMultilingualGen(lang: string): boolean {
  return lang in GEN;
}

/** 데이터 주도 다국어 콘텐츠 생성기 — 언어별·KC별 테이블로 새 draft 생성. 결정적. */
export class MultilingualVocabGenerator implements ContentGenerator {
  id: string;
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
    this.id = `${lang}-vocab-template`;
  }

  supports(kc: string): boolean {
    const table = GEN[this.lang];
    return table !== undefined && kc in table;
  }

  generate(req: GenRequest): ContentItem[] {
    const entries = GEN[this.lang]?.[req.kc];
    if (!entries) return [];
    const license = req.license ?? "CC-BY-4.0";
    // 문법 KC(mcq)는 B1, 나머지는 요청 레벨(기본 A1).
    const isGrammar = req.kc === B1_GRAMMAR_KC[this.lang];
    const level = (req.level ?? (isGrammar ? "B1" : "A1")) as ContentItem["level"];
    const out: ContentItem[] = entries.map((e) => ({
      id: `gen.${this.lang}.${e.id}`,
      lang: this.lang,
      type: e.type ?? "flashcard",
      kc: [req.kc],
      level,
      prompt: e.prompt,
      answer: e.accept ? { value: e.answer, accept: e.accept } : { value: e.answer },
      distractors: e.distractors ?? [],
      difficulty: null,
      discrimination: null,
      quality: "draft",
      source: { kind: "generated", license },
      meta: { schemaVersion: 1 },
    }));
    return out.slice(0, req.count);
  }
}
