// 등급 읽기 지문 생성기 어댑터. SSOT: cefr-mastery-map·content-generation-quality-gate. pluggable(규칙 12).
// 기본 = 오프라인 템플릿(외부 API 0, 규칙 13). LLM 생성기는 같은 인터페이스로 교체.
// 생성물은 반드시 코어 validateReading 을 통과해야 노출된다(규칙 4). 이해가능한 입력(i+1)을 데이터로 무한 공급.
// vocab.core 는 등급 KC — A1~B2 4등급 템플릿(다국어 생성기와 대칭). levels()로 진화 루프가 A1~B2 스펙트럼을 공급.
// 나머지 KC(present_be 등)는 자기 등급에서만 생성(등급 불일치 시 null → 등급 루프가 잘못된 등급으로 오생성하지 않음).
import type { ReadingPassage, ReadingQuestion } from "../../core/src/index.ts";

export interface ReadingSpec {
  lang: string;
  kc: string;
  level?: string;
  topic?: string; // 같은 등급의 대체 주제 슬러그(주제 다양화). 미지정=기본 주제.
}

/**
 * 생성 지문의 문항 배열을 만들되, 문항이 2개 이상이면 **마지막을 주관식(자유응답)**으로 변환한다.
 * 인식(객관식)에 더해 산출(production) 연습을 무인 콘텐츠에 편입 — 정답은 그대로, 보기만 제거하고 accept 부여.
 * 문항 1개면 그대로(객관식). 언어 무관·결정적(규칙 11·5).
 */
// CJK(한자·가나) 판별 — 클릭사전용으로 단어 사이 공백을 인위 삽입한 언어. 학습자는 자연히 붙여 쓴다.
const CJK_RE = /[぀-ヿ㐀-鿿豈-﫿ｦ-ﾟ]/;

/** 주관식 허용정답 변형 — CJK 답이면 공백 제거형(자연 표기)도 허용해 붙여쓴 입력이 오답 처리되지 않게 한다. */
export function acceptVariants(answer: string): string[] {
  const variants = [answer];
  const collapsed = answer.replace(/\s+/g, "");
  if (collapsed !== answer && CJK_RE.test(answer)) variants.push(collapsed); // 공백 구분 언어(en·es·ar·sw·hi)는 제외
  return [...new Set(variants)];
}

export function withProductionQuestion(qs: { q: string; answer: string; options: string[] }[]): ReadingQuestion[] {
  const mapped: ReadingQuestion[] = qs.map((q) => ({ q: q.q, answer: q.answer, options: [...q.options] }));
  if (mapped.length >= 2) {
    const last = mapped[mapped.length - 1];
    mapped[mapped.length - 1] = { q: last.q, answer: last.answer, accept: acceptVariants(last.answer as string) }; // options 제거 → 주관식(CJK 붙여쓰기 허용)
  }
  return mapped;
}

export interface ReadingGenerator {
  id: string;
  supports(kc: string): boolean;
  generate(spec: ReadingSpec): ReadingPassage | null;
  /** 이 KC에서 생성 가능한 CEFR 등급 목록(있으면 등급 생성기 — 진화 루프가 A1~B2 스펙트럼을 공급). 없으면 단일 등급. */
  levels?(kc: string): string[];
  /** 이 KC·등급에서 생성 가능한 주제 슬러그 목록(주제 다양화). 첫 항목은 기본 주제(""). 있으면 반복 노출을 줄이는 대체 주제 공급. */
  topics?(kc: string, level: string): string[];
}

interface Template {
  level: string;
  title: string;
  text: string;
  glossary: Record<string, string>;
  questions: { q: string; answer: string; options: string[] }[];
}

// KC별 통제 어휘 기반 지문 템플릿(시드 지문과 겹치지 않는 새 주제). 결정적.
const EN_TEMPLATES: Record<string, Template> = {
  "kc.en.present_be": {
    level: "A1",
    title: "My Neighbor",
    text: "My neighbor Sam is friendly. He is a doctor. His house is big and clean. We are good friends. Our street is quiet at night.",
    glossary: { neighbor: "이웃", friendly: "친절한", doctor: "의사", house: "집", big: "큰", clean: "깨끗한", friends: "친구들", street: "거리", quiet: "조용한", night: "밤" },
    questions: [
      { q: "What is Sam's job?", answer: "doctor", options: ["teacher", "doctor", "driver"] },
      { q: "How is the street at night?", answer: "quiet", options: ["busy", "quiet", "loud"] },
    ],
  },
  "kc.en.present_simple": {
    level: "A2",
    title: "Every Weekend",
    text: "Every weekend I visit my grandmother. She lives near a river. We cook lunch and talk for hours. In the evening I read a book and drink tea. I feel calm and happy.",
    glossary: { weekend: "주말", visit: "방문하다", grandmother: "할머니", lives: "산다", river: "강", cook: "요리하다", lunch: "점심", talk: "이야기하다", evening: "저녁", read: "읽다", calm: "차분한" },
    questions: [
      { q: "Who does the writer visit?", answer: "grandmother", options: ["teacher", "grandmother", "friend"] },
      { q: "Where does the grandmother live?", answer: "near a river", options: ["near a river", "in a city", "on a mountain"] },
    ],
  },
  "kc.en.articles": {
    level: "A1",
    title: "My Animals",
    text: "I have a dog and a cat. The dog is big, and the cat is small. I see an owl in the tree. An owl is a wise bird. I like the animals in my garden.",
    glossary: { dog: "개", cat: "고양이", big: "큰", small: "작은", owl: "올빼미", tree: "나무", wise: "지혜로운", bird: "새", animals: "동물들", garden: "정원" },
    questions: [
      { q: "What does the writer see in the tree?", answer: "an owl", options: ["a cat", "an owl", "a dog"] },
      { q: "How is the cat?", answer: "small", options: ["big", "small", "wise"] },
    ],
  },
};

const shortKc = (kc: string): string => kc.split(".").slice(-1)[0];

// vocab.core 등급 KC — A1~B2 4등급(다국어 생성기와 대칭). 시드·per-KC 템플릿과 겹치지 않는 새 주제.
// A1 아침 일과 · A2 새 카페 · B1 요리 배우기 · B2 "책은 여전히 중요한가" 논설(양보 however + 의견 in my opinion).
const EN_GRADED: Record<string, Template> = {
  A1: {
    level: "A1", title: "My Morning",
    text: "I wake up early every day. I drink water and eat bread with cheese. Then I put on my coat and walk to work. The morning air is cold and fresh. I feel awake and ready.",
    glossary: { wake: "일어나다", early: "일찍", drink: "마시다", water: "물", bread: "빵", cheese: "치즈", coat: "코트", walk: "걷다", fresh: "상쾌한", awake: "깨어 있는" },
    questions: [
      { q: "What does the writer eat?", answer: "bread with cheese", options: ["rice and fish", "bread with cheese", "fruit and eggs"] },
      { q: "How is the morning air?", answer: "cold and fresh", options: ["warm", "cold and fresh", "wet"] },
    ],
  },
  A2: {
    level: "A2", title: "The New Café",
    text: "A new café opened near my office last month. Last week I went there with a friend. We ordered coffee and cake. The room was warm and the music was soft. We talked for an hour and promised to come back soon.",
    glossary: { café: "카페", opened: "열었다", office: "사무실", ordered: "주문했다", coffee: "커피", cake: "케이크", warm: "따뜻한", music: "음악", soft: "부드러운", promised: "약속했다" },
    questions: [
      { q: "Who did the writer go with?", answer: "a friend", options: ["a friend", "a teacher", "alone"] },
      { q: "What did they order?", answer: "coffee and cake", options: ["tea and bread", "coffee and cake", "water and fruit"] },
    ],
  },
  B1: {
    level: "B1", title: "Learning to Cook",
    text: "This year I decided to learn to cook. At first everything was difficult, and I burned the rice more than once. But little by little I improved. Now I can make three dishes well, and I enjoy cooking for my friends. I think learning a new skill gives us confidence.",
    glossary: { decided: "결심했다", difficult: "어려운", burned: "태웠다", "improved": "나아졌다", dishes: "요리", enjoy: "즐기다", skill: "기술", confidence: "자신감", "little by little": "조금씩" },
    questions: [
      { q: "What did the writer burn at first?", answer: "the rice", options: ["the bread", "the rice", "the soup"] },
      { q: "What does a new skill give us, in the writer's view?", answer: "confidence", options: ["money", "confidence", "friends"] },
    ],
  },
  B2: {
    level: "B2", title: "Why Books Still Matter",
    text: "In the age of short videos, many people say that books are dying. It is true that screens offer instant entertainment and information. However, this convenience has a hidden cost. Deep reading trains our patience and lets us follow a long argument, something quick clips rarely do. In my opinion, books and screens are not enemies; each serves a different purpose. What matters is that we keep a place in our lives for slow, careful thought.",
    glossary: { age: "시대", screens: "화면", instant: "즉각적인", entertainment: "오락", convenience: "편리", hidden: "숨은", cost: "대가", patience: "인내", argument: "논지", enemies: "적", purpose: "목적", thought: "사고" },
    questions: [
      { q: "What does deep reading train, according to the writer?", answer: "our patience", options: ["our speed", "our patience", "our memory"] },
      { q: "In the writer's opinion, books and screens are...", answer: "not enemies", options: ["enemies", "not enemies", "the same"] },
    ],
  },
};

const EN_GRADED_KC = "kc.en.vocab.core";

/** 영어 등급 지문 생성기 — 결정적. vocab.core는 A1~B2 등급 템플릿, 그 외 KC는 통제 어휘 단일 등급. */
export class EnglishReadingGenerator implements ReadingGenerator {
  id = "en-reading-template";

  supports(kc: string): boolean {
    return kc in EN_TEMPLATES || kc === EN_GRADED_KC;
  }

  /** 등급 KC(vocab.core)면 A1~B2, 그 외는 빈 목록(단일 등급) — 진화 루프가 스펙트럼 여부를 판정. */
  levels(kc: string): string[] {
    return kc === EN_GRADED_KC ? Object.keys(EN_GRADED) : [];
  }

  generate(spec: ReadingSpec): ReadingPassage | null {
    if (spec.kc === EN_GRADED_KC) {
      const lvl = spec.level ?? "A1";
      const tpl = EN_GRADED[lvl];
      if (!tpl) return null; // 미제공 등급(C1 등)은 억지 생성 금지 — 등급 루프가 건너뜀
      return this.build(spec, tpl, `gen.${spec.lang}.read.${lvl.toLowerCase()}.core`, tpl.level);
    }
    const tpl = EN_TEMPLATES[spec.kc];
    if (!tpl) return null;
    if (spec.level && spec.level !== tpl.level) return null; // 단일 등급 KC는 자기 등급에서만
    return this.build(spec, tpl, `gen.${spec.lang}.read.${shortKc(spec.kc)}`, tpl.level);
  }

  private build(spec: ReadingSpec, tpl: Template, id: string, level: string): ReadingPassage {
    // 등급(vocab.core) 지문은 서술 현재를 확실히 담으므로 기초 문법 present_simple 크레딧(규칙 4).
    // 문법 KC 템플릿(EN_TEMPLATES)은 spec.kc 자체가 문법이라 그대로 둔다.
    const extra = spec.kc === EN_GRADED_KC ? ["kc.en.present_simple"] : [];
    return {
      id,
      level: level as ReadingPassage["level"],
      kc: [spec.kc, ...extra],
      title: tpl.title,
      text: tpl.text,
      glossary: { ...tpl.glossary },
      questions: withProductionQuestion(tpl.questions), // 복수 문항이면 마지막을 주관식(산출)으로
      source: { kind: "generated", license: "CC-BY-4.0" },
    };
  }
}

/** 기본 읽기 생성기 = 오프라인 영어 템플릿(외부 API 0). LLM 생성기는 같은 인터페이스로 교체(규칙 12·13). */
export function createDefaultReadingGenerator(): ReadingGenerator {
  return new EnglishReadingGenerator();
}
