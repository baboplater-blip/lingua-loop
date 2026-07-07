// 중국어 로컬 휴리스틱 튜터 — 오프라인·결정적. 다국어 범용을 어댑터층 CJK까지(규칙 11·13).
// 흔한 초급 오류 교정: ①병음/성조(로마자 → 한자+성조, 성조=뜻) ②是+형용사(→很) ③양사(量词) 일치. i+1 몰입 질문은 중국어로.
import type { TutorModel, TutorRequest, TutorResponse, Correction } from "./tutor.ts";
import { explainL } from "./tutor.ts";

// 무성조 로마자 병음 → 한자(성조 병기). 성조가 뜻을 바꾼다는 점을 가르친다. 모호하지 않은 핵심어만(예: ma 妈/马/吗 제외).
const PINYIN: Record<string, string> = {
  nihao: "你好 (nǐ hǎo)",
  ni: "你 (nǐ)",
  hao: "好 (hǎo)",
  wo: "我 (wǒ)",
  shi: "是 (shì)",
  xiexie: "谢谢 (xièxie)",
  xie: "谢 (xiè)",
  zaijian: "再见 (zàijiàn)",
  xuesheng: "学生 (xuésheng)",
  laoshi: "老师 (lǎoshī)",
  zhongguo: "中国 (Zhōngguó)",
  ta: "他/她 (tā)",
  bu: "不 (bù)",
  hen: "很 (hěn)",
};

// 是 뒤에 오면 안 되는 술어 형용사(형용사 술어는 是가 아니라 很). 긴 것 먼저(高兴이 高보다 우선 매칭되도록).
const ADJ = "漂亮|高兴|聪明|便宜|好吃|舒服|好|高|大|小|累|忙|冷|热|贵|快|慢|多|少|新|旧|难|胖|瘦";

// 명사 → 전용 양사(个 오용 교정).
const MEASURE: Record<string, string> = {
  书: "本", 杂志: "本",
  猫: "只", 狗: "只", 鸟: "只", 鱼: "只",
  茶: "杯", 水: "杯", 咖啡: "杯",
  纸: "张", 票: "张",
  车: "辆",
  衣服: "件",
};

// B1 문법(kc.zh.aspect_le): 완료 조사 了 누락. 과거 시간부사가 있고 동사 뒤 완료/경험/지속 표지가 없으면 了 삽입.
const PAST_ADVERB = /昨天|前天|上周|上个月|上个星期|去年|刚才/;
const LE_VERBS = "吃|喝|买|看|去|学|写|做|读|喝|听|见|到";
// B2 문법(kc.zh.de_complement): 정도보어 得 오용. 동사+的+형용사는 得여야(跑的快→跑得快).
const DEG_VERBS = "跑|走|说|吃|做|看|写|来|去|唱|学|听|睡|起";
const DEG_ADJ = "快|慢|好|多|少|早|晚|清楚|流利|远|近|高|低";

const FOLLOWUPS: Record<string, string[]> = {
  default: ["你今天做了什么？", "说说你的家人吧。", "你喜欢什么食物？", "这个周末你想去哪里？"],
  intro: ["你叫什么名字？", "你是哪国人？", "你做什么工作？"],
  restaurant: ["你想点什么？", "要喝什么吗？", "还要别的吗？"],
  shopping: ["你在找什么？", "你要什么尺码？", "你想怎么付款？"],
  directions: ["你想去哪里？", "你知道地址吗？", "你想走路还是坐公交？"],
  hospital: ["你哪里不舒服？", "哪里疼？", "这些症状有多久了？", "你有过敏吗？"],
  airport: ["请出示您的护照。", "你要托运几件行李？", "这是你的最终目的地吗？", "你想要靠窗还是靠走道的座位？"],
};

/** 흔한 중국어 초급 오류 교정. 결정적. 한자 규칙(是·양사)과 로마자 병음(성조) 둘 다 다룬다. 교정 메모는 설명 언어(ko/en)로. */
export function correctZh(text: string, explainLang?: string): { corrected: string; corrections: Correction[] } {
  let corrected = text;
  const corrections: Correction[] = [];

  // 1) 是 + 형용사 → 很 (형용사 술어는 계사 是를 쓰지 않음). 형용사 뒤 경계(문장부호·어기조사·끝)를 요구해 복합어(高中 등) 오탐 방지.
  const shiRe = new RegExp(`是(${ADJ})(?=[。，！？、\\s了吗啊呢]|$)`, "g");
  corrected = corrected.replace(shiRe, (_m, adj) => {
    corrections.push({ original: "是" + adj, corrected: "很" + adj, type: "explicit", errorTag: "shi-adjective", note: explainL(explainLang, `형용사 앞에는 是가 아니라 很 (예: 我很${adj})`, `use 很 (not 是) before an adjective (e.g. 我很${adj})`) });
    return "很" + adj;
  });

  // 2) 양사(量词) — 수사+个+명사에서 명사 전용 양사로 교정 (一个书 → 一本书).
  const nouns = Object.keys(MEASURE).join("|");
  const mwRe = new RegExp(`([一二三四五六七八九十两几])个(${nouns})`, "g");
  corrected = corrected.replace(mwRe, (_m, num, noun) => {
    const mw = MEASURE[noun];
    corrections.push({ original: num + "个" + noun, corrected: num + mw + noun, type: "recast", errorTag: "measure-word", note: explainL(explainLang, `${noun}의 양사는 个가 아니라 ${mw} (예: 一${mw}${noun})`, `the measure word for ${noun} is ${mw}, not 个 (e.g. 一${mw}${noun})`) });
    return num + mw + noun;
  });

  // 3) 완료 조사 了(kc.zh.aspect_le) — 과거 시간부사가 있는데 동사에 완료 표지가 없으면 첫 동사 뒤 了 삽입.
  if (PAST_ADVERB.test(corrected)) {
    // 부정(不·没)·조동사(想·要·会·能) 뒤에서는 了를 쓰지 않으므로 제외.
    const leRe = new RegExp(`(?<![不没别想要会能])(${LE_VERBS})(?![了过着])`);
    let fired = false;
    corrected = corrected.replace(leRe, (v) => {
      if (fired) return v;
      fired = true;
      corrections.push({ original: v, corrected: v + "了", type: "explicit", errorTag: "aspect-le", note: explainL(explainLang, `과거·완료에는 동사 뒤에 了 (${v}了)`, `mark completed past action with 了 after the verb (${v}了)`) });
      return v + "了";
    });
  }

  // 3.5) 정도보어 得(kc.zh.de_complement) — 동사 + 的 + 형용사는 得. (跑的快 → 跑得快)
  const deRe = new RegExp(`(${DEG_VERBS})的(${DEG_ADJ})`, "g");
  corrected = corrected.replace(deRe, (_m, v, adj) => {
    corrections.push({ original: v + "的" + adj, corrected: v + "得" + adj, type: "recast", errorTag: "de-complement", note: explainL(explainLang, `정도보어는 的가 아니라 得 (${v}得${adj})`, `use 得 (not 的) for the degree complement (${v}得${adj})`) });
    return v + "得" + adj;
  });

  // 4) 병음/성조 — 로마자 핵심어를 한자+성조로 리캐스트(성조가 뜻을 바꾼다).
  corrected = corrected.replace(/[A-Za-z]+/g, (tok) => {
    const hz = PINYIN[tok.toLowerCase()];
    if (!hz) return tok;
    corrections.push({ original: tok, corrected: hz, type: "recast", errorTag: "tone-pinyin", note: explainL(explainLang, `성조까지 함께 써요: ${hz}`, `include the tone: ${hz}`) });
    return hz;
  });

  return { corrected, corrections };
}

export class ChineseHeuristicTutor implements TutorModel {
  id = "local-heuristic-zh";

  async respond(req: TutorRequest): Promise<TutorResponse> {
    const { corrected, corrections } = correctZh(req.message, req.explainLang);
    const parts: string[] = [];
    if (corrections.length > 0) {
      parts.push(`很好！` + explainL(req.explainLang, `자연스럽게는 "${corrected}" 예요.`, `more naturally: "${corrected}".`));
      const notes = corrections.map((c) => c.note).filter(Boolean);
      if (notes.length) parts.push("💡 " + notes.join(" · "));
    } else {
      parts.push(`非常好！` + explainL(req.explainLang, "잘 썼어요 👍", "well done 👍"));
    }
    const bank = FOLLOWUPS[req.task ?? "default"] ?? FOLLOWUPS.default;
    const turnIdx = req.history.filter((t) => t.role === "tutor").length % bank.length;
    parts.push(bank[turnIdx]);

    return { text: parts.join("\n"), corrections, errorTags: corrections.map((c) => c.errorTag), safety: { flagged: false } };
  }
}
