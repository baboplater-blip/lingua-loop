// 다국어 등급 읽기 지문 생성기 — 데이터 주도(규칙 11). 언어별·등급별 지문 템플릿으로 이해가능한 입력(i+1)을 결정적으로 공급.
// A1(음식)·A2(시장)·B1(취미)·B2(과학기술 논설) 네 등급 — 시드 지문(하루·가족·주말여행·도시)과 겹치지 않는 새 주제. 생성물은 코어 validateReading 통과분만 노출(규칙 4). 외부 API 0(규칙 13).
// B2는 논설체(양보 然而/しかし/لكن/Hata hivyo/फिर भी + 의견 在我看来/私の考えでは/في رأيي/Kwa maoni yangu/मेरी राय में)로 상급 학습자 입력을 공급.
import type { ReadingPassage } from "../../core/src/index.ts";
import type { ReadingGenerator, ReadingSpec } from "./reading-gen.ts";
import { withProductionQuestion } from "./reading-gen.ts";

interface Template {
  level: string;
  title: string;
  text: string;
  glossary: Record<string, string>;
  questions: { q: string; answer: string; options: string[] }[];
}

// TEMPLATES[lang][level] — 등급별 지문. 한자·가나 지문은 학습자용 단어 띄어쓰기로 클릭 사전 토큰화.
const TEMPLATES: Record<string, Record<string, Template>> = {
  zh: {
    A1: {
      level: "A1", title: "我 喜欢 的 食物",
      text: "我 喜欢 吃 米饭 和 鸡蛋。 早上 我 喝 牛奶。 我 也 喜欢 苹果。 苹果 很 甜。",
      glossary: { "喜欢": "좋아하다", "米饭": "밥", "鸡蛋": "계란", "牛奶": "우유", "苹果": "사과", "甜": "달다" },
      questions: [{ q: "我 早上 喝 什么？", answer: "牛奶", options: ["牛奶", "茶", "水"] }],
    },
    A2: {
      level: "A2", title: "在市场",
      text: "今天 我 去 市场。 市场 里 有 很多 水果 和 蔬菜。 我 买 了 苹果 和 面包。 苹果 很 甜。 我 很 开心。",
      glossary: { "今天": "오늘", "市场": "시장", "水果": "과일", "蔬菜": "채소", "买": "사다", "苹果": "사과", "面包": "빵", "甜": "달다", "开心": "기쁘다" },
      questions: [
        { q: "我 在 市场 买 了 什么？", answer: "苹果 和 面包", options: ["苹果 和 面包", "茶 和 米", "鱼 和 蛋"] },
        { q: "苹果 怎么样？", answer: "很 甜", options: ["很 甜", "很 贵", "很 小"] },
      ],
    },
    B1: {
      level: "B1", title: "我 的 爱好",
      text: "我 的 爱好 是 看 书 和 跑步。 周末 我 常常 去 公园 跑步。 跑步 让 我 很 开心，也 让 我 更 健康。 我 觉得 每个 人 都 应该 有 一个 爱好。",
      glossary: { "爱好": "취미", "跑步": "달리기", "公园": "공원", "常常": "자주", "健康": "건강한", "应该": "~해야 한다", "觉得": "생각하다" },
      questions: [
        { q: "周末 他 去 哪里 跑步？", answer: "公园", options: ["公园", "学校", "市场"] },
        { q: "跑步 让 他 怎么样？", answer: "开心 和 健康", options: ["开心 和 健康", "很 累", "很 忙"] },
      ],
    },
    B2: {
      level: "B2", title: "科技 与 生活",
      text: "如今， 几乎 每个 人 都 离不开 手机。 它 让 我们 随时 和 朋友 联系， 也 让 我们 更 容易 获得 信息。 不可否认， 这种 便利 改变 了 我们 的 生活。 然而， 方便 的 背后 也 有 代价。 很多 人 一 有空 就 看 手机， 结果 和 身边 的 人 越来越 少 交流。 在 我 看来， 科技 本身 没有 好坏， 关键 在于 我们 怎么 使用 它。 如果 我们 能 控制 自己， 科技 就 会 成为 帮助 我们 的 工具， 而 不是 控制 我们 的 主人。",
      glossary: { "如今": "오늘날", "离不开": "떨어질 수 없다", "手机": "휴대폰", "联系": "연락하다", "信息": "정보", "不可否认": "부정할 수 없다", "便利": "편리", "代价": "대가", "交流": "교류하다", "关键": "핵심", "控制": "통제하다", "工具": "도구", "主人": "주인", "本身": "그 자체" },
      questions: [
        { q: "作者 认为 科技 有 好坏 吗？", answer: "没有， 关键 在 使用", options: ["科技 是 坏 的", "没有， 关键 在 使用", "科技 是 好 的"] },
        { q: "很多 人 一 有空 就 做 什么？", answer: "看 手机", options: ["看 书", "看 手机", "睡觉"] },
      ],
    },
  },
  ar: {
    A1: {
      level: "A1", title: "طعامي المفضل",
      text: "أحب أكل الأرز والبيض. في الصباح أشرب الحليب. أحب التفاح أيضا. التفاح حلو.",
      glossary: { "أحب": "좋아하다", "الأرز": "밥/쌀", "البيض": "계란", "الصباح": "아침", "الحليب": "우유", "التفاح": "사과", "حلو": "달다" },
      questions: [{ q: "ماذا يشرب في الصباح؟", answer: "الحليب", options: ["الحليب", "الشاي", "الماء"] }],
    },
    A2: {
      level: "A2", title: "في السوق",
      text: "اليوم أذهب إلى السوق. في السوق فواكه وخضار كثيرة. أشتري التفاح والخبز. التفاح حلو جدا. أنا سعيد.",
      glossary: { "اليوم": "오늘", "السوق": "시장", "فواكه": "과일", "خضار": "채소", "كثيرة": "많은", "أشتري": "(나는) 산다", "التفاح": "사과", "الخبز": "빵", "حلو": "달다", "سعيد": "행복한" },
      questions: [{ q: "ماذا يشتري في السوق؟", answer: "التفاح والخبز", options: ["التفاح والخبز", "الشاي والأرز", "السمك والبيض"] }],
    },
    B1: {
      level: "B1", title: "هوايتي",
      text: "هوايتي هي القراءة والجري. في نهاية الأسبوع أذهب غالبا إلى الحديقة للجري. الجري يجعلني سعيدا وأكثر صحة. أعتقد أن كل شخص يجب أن يكون له هواية.",
      glossary: { "هوايتي": "내 취미", "القراءة": "독서", "الجري": "달리기", "الحديقة": "공원", "غالبا": "자주", "يجعلني": "나를 ~하게 하다", "صحة": "건강", "أعتقد": "생각하다", "هواية": "취미" },
      questions: [
        { q: "أين يذهب للجري؟", answer: "الحديقة", options: ["الحديقة", "المدرسة", "السوق"] },
        { q: "كيف يجعله الجري؟", answer: "سعيدا وأكثر صحة", options: ["سعيدا وأكثر صحة", "متعبا", "مشغولا"] },
      ],
    },
    B2: {
      level: "B2", title: "التكنولوجيا والحياة",
      text: "في أيامنا هذه، لا يكاد أحد يستغني عن الهاتف الذكي. فهو يتيح لنا التواصل مع الأصدقاء في أي وقت، ويجعل الحصول على المعلومات أسهل. لا يمكن إنكار أن هذه السهولة غيّرت حياتنا. لكن وراء هذه الراحة ثمنا. كثير من الناس ينظرون إلى هواتفهم كلما توفر لهم وقت، فيقل تواصلهم مع من حولهم. في رأيي، التكنولوجيا نفسها ليست جيدة ولا سيئة، وإنما المهم هو كيف نستخدمها. إذا استطعنا ضبط أنفسنا، أصبحت التكنولوجيا أداة تساعدنا لا سيدا يتحكم بنا.",
      glossary: { "التكنولوجيا": "과학기술", "الهاتف الذكي": "스마트폰", "التواصل": "소통", "المعلومات": "정보", "إنكار": "부정", "الراحة": "편안함", "ثمنا": "대가", "يقل": "줄다", "رأيي": "내 의견", "نستخدمها": "그것을 사용하다", "ضبط": "통제", "أداة": "도구", "يتحكم": "지배하다" },
      questions: [
        { q: "ماذا يتيح لنا الهاتف الذكي؟", answer: "التواصل مع الأصدقاء", options: ["التواصل مع الأصدقاء", "النوم", "الطبخ"] },
        { q: "في رأي الكاتب، ما المهم؟", answer: "كيف نستخدمها", options: ["ثمنها", "كيف نستخدمها", "لونها"] },
      ],
    },
  },
  sw: {
    A1: {
      level: "A1", title: "Chakula Ninachopenda",
      text: "Ninapenda kula wali na mayai. Asubuhi ninakunywa maziwa. Ninapenda pia tufaa. Tufaa ni tamu.",
      glossary: { "Ninapenda": "좋아하다", "wali": "밥", "mayai": "계란", "Asubuhi": "아침", "maziwa": "우유", "tufaa": "사과", "tamu": "달다" },
      questions: [{ q: "Ananywa nini asubuhi?", answer: "maziwa", options: ["maziwa", "chai", "maji"] }],
    },
    A2: {
      level: "A2", title: "Sokoni",
      text: "Leo ninaenda sokoni. Sokoni kuna matunda na mboga nyingi. Ninanunua tufaa na mkate. Tufaa ni tamu sana. Mimi nina furaha.",
      glossary: { "Leo": "오늘", "sokoni": "시장에", "matunda": "과일", "mboga": "채소", "nyingi": "많은", "Ninanunua": "(나는) 산다", "tufaa": "사과", "mkate": "빵", "tamu": "달다", "furaha": "행복" },
      questions: [{ q: "Ananunua nini sokoni?", answer: "tufaa na mkate", options: ["tufaa na mkate", "chai na wali", "samaki na mayai"] }],
    },
    B1: {
      level: "B1", title: "Mchezo Ninaoupenda",
      text: "Mchezo ninaoupenda ni kusoma na kukimbia. Wikendi mara nyingi ninaenda bustanini kukimbia. Kukimbia kunanifanya niwe na furaha na afya zaidi. Naamini kila mtu anapaswa kuwa na mchezo anaoupenda.",
      glossary: { "Mchezo": "취미/놀이", "kusoma": "읽기", "kukimbia": "달리기", "Wikendi": "주말", "bustanini": "공원에", "kunanifanya": "나를 ~하게 하다", "afya": "건강", "Naamini": "믿는다", "anapaswa": "~해야 한다" },
      questions: [
        { q: "Anaenda wapi kukimbia?", answer: "bustanini", options: ["bustanini", "shuleni", "sokoni"] },
        { q: "Kukimbia kunamfanyaje?", answer: "furaha na afya", options: ["furaha na afya", "uchovu", "shughuli"] },
      ],
    },
    B2: {
      level: "B2", title: "Teknolojia na Maisha",
      text: "Siku hizi, karibu kila mtu hawezi kuishi bila simu janja. Inatuwezesha kuwasiliana na marafiki wakati wowote, na inarahisisha kupata habari. Haiwezekani kukana kwamba urahisi huu umebadilisha maisha yetu. Hata hivyo, nyuma ya urahisi huu kuna gharama. Watu wengi hutazama simu zao kila wanapopata nafasi, na hivyo huwasiliana kidogo na watu walio karibu nao. Kwa maoni yangu, teknolojia yenyewe si nzuri wala mbaya; jambo la muhimu ni jinsi tunavyoitumia. Tukiweza kujidhibiti, teknolojia inakuwa chombo kinachotusaidia, si bwana anayetutawala.",
      glossary: { "Teknolojia": "과학기술", "simu janja": "스마트폰", "kuwasiliana": "소통하다", "habari": "정보/소식", "kukana": "부정하다", "urahisi": "편리함", "gharama": "대가/비용", "nafasi": "기회/틈", "maoni": "의견", "jinsi": "방식", "kujidhibiti": "자제하다", "chombo": "도구", "bwana": "주인" },
      questions: [
        { q: "Simu janja inatuwezesha kufanya nini?", answer: "kuwasiliana na marafiki", options: ["kuwasiliana na marafiki", "kulala", "kupika"] },
        { q: "Kwa maoni ya mwandishi, jambo la muhimu ni nini?", answer: "jinsi tunavyoitumia", options: ["bei yake", "jinsi tunavyoitumia", "rangi yake"] },
      ],
    },
  },
  ja: {
    A1: {
      level: "A1", title: "すきな たべもの",
      text: "わたし は ごはん と たまご が すき です。 あさ は ぎゅうにゅう を のみます。 りんご も すき です。 りんご は あまい です。",
      glossary: { "ごはん": "밥", "たまご": "계란", "すき": "좋아함", "あさ": "아침", "ぎゅうにゅう": "우유", "りんご": "사과", "あまい": "달다" },
      questions: [{ q: "あさ に 何 を のみます か。", answer: "ぎゅうにゅう", options: ["ぎゅうにゅう", "おちゃ", "みず"] }],
    },
    A2: {
      level: "A2", title: "市場で",
      text: "今日 わたし は 市場 へ 行きます。 市場 に は くだもの と やさい が たくさん あります。 わたし は りんご と パン を 買います。 りんご は とても あまい です。 わたし は うれしい です。",
      glossary: { "今日": "오늘", "市場": "시장", "くだもの": "과일", "やさい": "채소", "たくさん": "많이", "りんご": "사과", "パン": "빵", "買います": "삽니다", "あまい": "달다", "うれしい": "기쁘다" },
      questions: [{ q: "何 を 買います か。", answer: "りんご と パン", options: ["りんご と パン", "おちゃ と こめ", "さかな と たまご"] }],
    },
    B1: {
      level: "B1", title: "わたし の しゅみ",
      text: "わたし の しゅみ は 読書 と ジョギング です。 週末 は よく 公園 へ 行って 走ります。 走る と 気持ち が よくて、体 も 元気 に なります。 みんな しゅみ を 持つ べき だ と 思います。",
      glossary: { "しゅみ": "취미", "読書": "독서", "ジョギング": "조깅", "週末": "주말", "公園": "공원", "走ります": "달립니다", "気持ち": "기분", "元気": "건강/활기", "持つ": "가지다", "思います": "생각합니다" },
      questions: [
        { q: "週末 に どこ へ 行きます か。", answer: "公園", options: ["公園", "学校", "市場"] },
        { q: "走る と どう なります か。", answer: "気持ち が よくて 元気 に なる", options: ["気持ち が よくて 元気 に なる", "つかれる", "いそがしい"] },
      ],
    },
    B2: {
      level: "B2", title: "テクノロジー と 生活",
      text: "今 では、 ほとんど の 人 が スマートフォン を 手放せ ません。 いつ でも 友だち と 連絡 でき、 情報 も 簡単 に 手 に 入ります。 この 便利 さ が 生活 を 変えた こと は 否定 でき ません。 しかし、 その 便利 さ に は 代償 も あります。 多く の 人 は 時間 が ある と すぐ スマホ を 見て、 まわり の 人 と の 会話 が 減って しまいます。 私 の 考え で は、 テクノロジー 自体 に 良い 悪い は なく、 大切 なの は どう 使う か です。 自分 を コントロール できれ ば、 テクノロジー は 私たち を 助ける 道具 に なり、 支配 する 主人 に は なりません。",
      glossary: { "テクノロジー": "과학기술", "連絡": "연락", "情報": "정보", "否定": "부정", "代償": "대가", "会話": "대화", "減って": "줄어", "考え": "생각", "自体": "그 자체", "大切": "중요", "コントロール": "통제", "道具": "도구", "支配": "지배", "主人": "주인" },
      questions: [
        { q: "スマホ を 見すぎる と 何 が 減ります か。", answer: "会話", options: ["会話", "お金", "元気"] },
        { q: "筆者 の 考え で は、 大切 なの は 何 です か。", answer: "どう 使う か", options: ["ねだん", "どう 使う か", "いろ"] },
      ],
    },
  },
  hi: {
    A1: {
      level: "A1", title: "मेरा पसंदीदा खाना",
      text: "मुझे चावल और अंडे खाना पसंद है। सुबह मैं दूध पीता हूँ। मुझे सेब भी पसंद है। सेब मीठा है।",
      glossary: { "मुझे": "나에게", "चावल": "밥/쌀", "अंडे": "계란", "पसंद": "좋아하는", "सुबह": "아침", "दूध": "우유", "सेब": "사과", "मीठा": "달다" },
      questions: [{ q: "सुबह वह क्या पीता है?", answer: "दूध", options: ["दूध", "चाय", "पानी"] }],
    },
    A2: {
      level: "A2", title: "बाज़ार में",
      text: "आज मैं बाज़ार जाता हूँ। बाज़ार में बहुत फल और सब्ज़ियाँ हैं। मैं सेब और रोटी खरीदता हूँ। सेब बहुत मीठा है। मैं ख़ुश हूँ।",
      glossary: { "आज": "오늘", "बाज़ार": "시장", "फल": "과일", "सब्ज़ियाँ": "채소", "बहुत": "많은/매우", "सेब": "사과", "रोटी": "빵", "खरीदता": "(나는) 산다", "मीठा": "달다", "ख़ुश": "기쁜" },
      questions: [{ q: "वह बाज़ार में क्या खरीदता है?", answer: "सेब और रोटी", options: ["सेब और रोटी", "चाय और चावल", "मछली और अंडे"] }],
    },
    B1: {
      level: "B1", title: "मेरा शौक",
      text: "मेरा शौक पढ़ना और दौड़ना है। सप्ताहांत में मैं अक्सर पार्क जाकर दौड़ता हूँ। दौड़ने से मैं ख़ुश रहता हूँ और सेहत भी अच्छी होती है। मुझे लगता है कि हर किसी का कोई न कोई शौक होना चाहिए।",
      glossary: { "शौक": "취미", "पढ़ना": "읽기", "दौड़ना": "달리기", "सप्ताहांत": "주말", "अक्सर": "자주", "पार्क": "공원", "सेहत": "건강", "लगता है": "생각하다", "चाहिए": "~해야 한다" },
      questions: [
        { q: "वह दौड़ने कहाँ जाता है?", answer: "पार्क", options: ["पार्क", "स्कूल", "बाज़ार"] },
        { q: "दौड़ने से उसे क्या होता है?", answer: "ख़ुशी और सेहत", options: ["ख़ुशी और सेहत", "थकान", "व्यस्तता"] },
      ],
    },
    B2: {
      level: "B2", title: "तकनीक और जीवन",
      text: "आजकल, लगभग हर व्यक्ति स्मार्टफ़ोन के बिना नहीं रह सकता। यह हमें किसी भी समय दोस्तों से जोड़ता है और जानकारी पाना आसान बनाता है। इस बात से इनकार नहीं किया जा सकता कि इस सुविधा ने हमारी ज़िंदगी बदल दी है। फिर भी, इस सुविधा के पीछे एक क़ीमत भी है। बहुत से लोग जब भी समय मिलता है फ़ोन देखने लगते हैं, और इस तरह अपने आस-पास के लोगों से कम बात करते हैं। मेरी राय में, तकनीक अपने आप में न अच्छी है न बुरी; असली बात यह है कि हम इसका उपयोग कैसे करते हैं। अगर हम ख़ुद पर क़ाबू रख सकें, तो तकनीक हमारी मदद करने वाला औज़ार बन जाती है, हम पर राज करने वाला मालिक नहीं।",
      glossary: { "तकनीक": "과학기술", "स्मार्टफ़ोन": "스마트폰", "जोड़ता": "연결하다", "जानकारी": "정보", "इनकार": "부정", "सुविधा": "편리", "क़ीमत": "대가/값", "राय": "의견", "उपयोग": "사용", "क़ाबू": "통제", "औज़ार": "도구", "मालिक": "주인" },
      questions: [
        { q: "स्मार्टफ़ोन क्या पाना आसान बनाता है?", answer: "जानकारी", options: ["जानकारी", "पैसा", "नींद"] },
        { q: "लेखक की राय में असली बात क्या है?", answer: "हम इसका उपयोग कैसे करते हैं", options: ["इसकी क़ीमत", "हम इसका उपयोग कैसे करते हैं", "इसका रंग"] },
      ],
    },
  },
};

const DEFAULT_LEVEL = "A2";
function shortKc(kc: string): string {
  return kc.split(".").slice(-1)[0] || "core";
}

/** 지원 언어인지(지문 템플릿 보유). */
export function supportsMultilingualReading(lang: string): boolean {
  return lang in TEMPLATES;
}
/** 해당 언어가 등급별로 제공하는 CEFR 레벨 목록(결정적). */
export function multilingualReadingLevels(lang: string): string[] {
  return TEMPLATES[lang] ? Object.keys(TEMPLATES[lang]) : [];
}

/** 데이터 주도 다국어 등급 읽기 생성기 — 언어별·등급별 템플릿으로 새 지문 생성. 결정적. */
export class MultilingualReadingGenerator implements ReadingGenerator {
  id: string;
  private lang: string;
  constructor(lang: string) {
    this.lang = lang;
    this.id = `${lang}-reading-template`;
  }

  supports(kc: string): boolean {
    return kc === `kc.${this.lang}.vocab.core` && this.lang in TEMPLATES;
  }

  /** 이 KC에서 생성 가능한 등급(A1~B2). 진화 루프가 스펙트럼 전체를 공급하도록 노출(규칙 4). */
  levels(kc: string): string[] {
    return this.supports(kc) ? Object.keys(TEMPLATES[this.lang]) : [];
  }

  generate(spec: ReadingSpec): ReadingPassage | null {
    const byLevel = TEMPLATES[this.lang];
    if (!byLevel || !this.supports(spec.kc)) return null;
    // 요청 등급 우선, 없으면 A2(기본) 폴백.
    const level = (spec.level && byLevel[spec.level]) ? spec.level : DEFAULT_LEVEL;
    const tpl = byLevel[level];
    if (!tpl) return null;
    return {
      id: `gen.${spec.lang}.read.${level.toLowerCase()}.${shortKc(spec.kc)}`,
      level: tpl.level as ReadingPassage["level"],
      kc: [spec.kc],
      title: tpl.title,
      text: tpl.text,
      glossary: { ...tpl.glossary },
      questions: withProductionQuestion(tpl.questions), // 복수 문항이면 마지막을 주관식(산출)으로
      source: { kind: "generated", license: "CC-BY-4.0" },
    };
  }
}
