// 스페인어 콘텐츠·읽기 지문 생성기 — 오프라인·결정적. 다국어 범용을 어댑터층까지(규칙 11·13).
// 생성물은 draft/미검증 — 코어 게이트(checkItem/validateReading)를 통과해야 노출된다(규칙 4).
import type { ContentItem, ReadingPassage } from "../../core/src/index.ts";
import type { ContentGenerator, GenRequest } from "./content-gen.ts";
import type { ReadingGenerator, ReadingSpec } from "./reading-gen.ts";
import { withProductionQuestion } from "./reading-gen.ts";

const SER = [{ s: "Yo", f: "soy" }, { s: "Tú", f: "eres" }, { s: "Él", f: "es" }, { s: "Nosotros", f: "somos" }, { s: "Ellos", f: "son" }];
const NOUNS_G = [{ n: "casa", a: "la" }, { n: "libro", a: "el" }, { n: "mesa", a: "la" }, { n: "gato", a: "el" }, { n: "escuela", a: "la" }, { n: "coche", a: "el" }];
const AR = [{ v: "hablar", yo: "hablo" }, { v: "estudiar", yo: "estudio" }, { v: "trabajar", yo: "trabajo" }, { v: "cantar", yo: "canto" }, { v: "caminar", yo: "camino" }];
const VOCAB = [{ ko: "물", es: "agua" }, { ko: "집", es: "casa" }, { ko: "고양이", es: "gato" }, { ko: "개", es: "perro" }, { ko: "빵", es: "pan" }, { ko: "책", es: "libro" }];

function base(id: string, kc: string, type: ContentItem["type"], level: string, license: string): Pick<ContentItem, "id" | "lang" | "type" | "kc" | "level" | "difficulty" | "discrimination" | "quality" | "source" | "meta"> {
  return { id, lang: "es", type, kc: [kc], level: level as ContentItem["level"], difficulty: null, discrimination: null, quality: "draft", source: { kind: "generated", license }, meta: { schemaVersion: 1 } };
}

/** 스페인어 템플릿 문항 생성기 — 결정적. */
export class SpanishTemplateGenerator implements ContentGenerator {
  id = "es-template";
  private kcs = new Set(["kc.es.present_ser", "kc.es.gender", "kc.es.present_ar", "kc.es.vocab.core"]);

  supports(kc: string): boolean {
    return this.kcs.has(kc);
  }

  generate(req: GenRequest): ContentItem[] {
    const license = req.license ?? "CC-BY-4.0";
    const level = req.level ?? "A1";
    const out: ContentItem[] = [];

    if (req.kc === "kc.es.present_ser") {
      for (const x of SER) out.push({ ...base("gen.es.ser." + x.s, req.kc, "cloze", level, license), prompt: `${x.s} ___ estudiante.`, answer: { value: x.f, accept: [x.f] }, distractors: [] });
    } else if (req.kc === "kc.es.gender") {
      for (const x of NOUNS_G) out.push({ ...base("gen.es.gen." + x.n, req.kc, "mcq", level, license), prompt: `___ ${x.n}`, answer: { value: x.a }, distractors: [x.a === "la" ? "el" : "la", "los"].map((v) => ({ value: v })) });
    } else if (req.kc === "kc.es.present_ar") {
      for (const x of AR) out.push({ ...base("gen.es.ar." + x.v, req.kc, "cloze", level, license), prompt: `Yo ___ (${x.v}).`, answer: { value: x.yo, accept: [x.yo] }, distractors: [] });
    } else if (req.kc === "kc.es.vocab.core") {
      for (const w of VOCAB) out.push({ ...base("gen.es.vocab." + w.es, req.kc, "flashcard", level, license), prompt: w.ko, answer: { value: w.es }, distractors: [] });
    }
    return out.slice(0, req.count);
  }
}

// 읽기 지문 템플릿(시드 es 지문과 다른 주제)
interface Tpl { level: string; title: string; text: string; glossary: Record<string, string>; questions: { q: string; answer: string; options: string[] }[] }
const ES_READ: Record<string, Tpl> = {
  "kc.es.present_ser": {
    level: "A1", title: "Mi familia",
    text: "Mi familia es pequeña. Yo soy estudiante. Mi padre es médico y mi madre es profesora. Somos muy felices juntos.",
    glossary: { familia: "가족", pequeña: "작은", estudiante: "학생", padre: "아버지", "médico": "의사", madre: "어머니", profesora: "교사(여)", felices: "행복한", juntos: "함께" },
    questions: [
      { q: "¿Qué es el padre?", answer: "médico", options: ["profesor", "médico", "estudiante"] },
      { q: "¿Cómo es la familia?", answer: "pequeña", options: ["grande", "pequeña", "triste"] },
    ],
  },
  "kc.es.present_ar": {
    level: "A1", title: "Un domingo",
    text: "Los domingos yo camino en la plaza. Escucho música y hablo con mis amigos. Después compro un helado. Me gusta mucho el domingo.",
    glossary: { domingos: "일요일마다", camino: "(나는) 걷는다", plaza: "광장", escucho: "(나는) 듣는다", "música": "음악", hablo: "(나는) 말한다", amigos: "친구들", compro: "(나는) 산다", helado: "아이스크림" },
    questions: [{ q: "¿Qué compra la persona?", answer: "un helado", options: ["un libro", "un helado", "una flor"] }],
  },
};

// vocab.core 등급 KC — A1~B2 4등급(다국어·영어 생성기와 대칭). 시드·per-KC 지문과 겹치지 않는 새 주제.
// A1 아침 일과 · A2 새 카페 · B1 요리 배우기 · B2 "왜 책은 여전히 중요한가" 논설(양보 sin embargo + 의견 en mi opinión).
const ES_GRADED: Record<string, Tpl> = {
  A1: {
    level: "A1", title: "Mi mañana",
    text: "Me levanto temprano cada día. Bebo agua y como pan con queso. Luego me pongo el abrigo y camino al trabajo. El aire de la mañana es frío y fresco. Me siento despierto y listo.",
    glossary: { levanto: "일어나다", temprano: "일찍", bebo: "마신다", agua: "물", pan: "빵", queso: "치즈", abrigo: "코트", camino: "걷는다", fresco: "상쾌한", despierto: "깨어 있는" },
    questions: [
      { q: "¿Qué come la persona?", answer: "pan con queso", options: ["arroz y pescado", "pan con queso", "fruta y huevos"] },
      { q: "¿Cómo es el aire de la mañana?", answer: "frío y fresco", options: ["cálido", "frío y fresco", "húmedo"] },
    ],
  },
  A2: {
    level: "A2", title: "El café nuevo",
    text: "Cerca de mi oficina abrió un café nuevo el mes pasado. La semana pasada fui con una amiga. Pedimos café y pastel. La sala estaba cálida y la música era suave. Hablamos una hora y prometimos volver pronto.",
    glossary: { oficina: "사무실", abrió: "열었다", café: "카페", pasado: "지난", pedimos: "주문했다", pastel: "케이크", cálida: "따뜻한", música: "음악", suave: "부드러운", prometimos: "약속했다" },
    questions: [
      { q: "¿Con quién fue la persona?", answer: "con una amiga", options: ["con una amiga", "con un profesor", "sola"] },
      { q: "¿Qué pidieron?", answer: "café y pastel", options: ["té y pan", "café y pastel", "agua y fruta"] },
    ],
  },
  B1: {
    level: "B1", title: "Aprender a cocinar",
    text: "Este año decidí aprender a cocinar. Al principio todo era difícil y quemé el arroz más de una vez. Pero poco a poco mejoré. Ahora sé preparar tres platos y disfruto cocinar para mis amigos. Creo que aprender una nueva habilidad nos da confianza.",
    glossary: { decidí: "결심했다", difícil: "어려운", quemé: "태웠다", arroz: "밥", mejoré: "나아졌다", platos: "요리", disfruto: "즐기다", habilidad: "기술", confianza: "자신감" },
    questions: [
      { q: "¿Qué quemó al principio?", answer: "el arroz", options: ["el pan", "el arroz", "la sopa"] },
      { q: "Según la persona, ¿qué nos da una nueva habilidad?", answer: "confianza", options: ["dinero", "confianza", "amigos"] },
    ],
  },
  B2: {
    level: "B2", title: "Por qué los libros aún importan",
    text: "En la época de los videos cortos, muchos dicen que los libros están muriendo. Es cierto que las pantallas ofrecen entretenimiento e información al instante. Sin embargo, esta comodidad tiene un costo oculto. La lectura profunda entrena nuestra paciencia y nos permite seguir un argumento largo, algo que los clips rápidos rara vez logran. En mi opinión, los libros y las pantallas no son enemigos; cada uno cumple un propósito distinto. Lo importante es guardar en nuestra vida un lugar para el pensamiento lento y cuidadoso.",
    glossary: { época: "시대", pantallas: "화면", entretenimiento: "오락", instante: "순간", comodidad: "편리", costo: "대가", lectura: "독서", paciencia: "인내", argumento: "논지", enemigos: "적", propósito: "목적", pensamiento: "사고" },
    questions: [
      { q: "¿Qué entrena la lectura profunda, según el autor?", answer: "nuestra paciencia", options: ["nuestra velocidad", "nuestra paciencia", "nuestra memoria"] },
      { q: "En opinión del autor, los libros y las pantallas son...", answer: "no son enemigos", options: ["enemigos", "no son enemigos", "iguales"] },
    ],
  },
};
const ES_GRADED_KC = "kc.es.vocab.core";

/** 스페인어 등급 읽기 지문 생성기 — 결정적. vocab.core는 A1~B2 등급, 그 외 KC는 단일 등급. */
export class SpanishReadingGenerator implements ReadingGenerator {
  id = "es-reading-template";

  supports(kc: string): boolean {
    return kc in ES_READ || kc === ES_GRADED_KC;
  }

  /** 등급 KC(vocab.core)면 A1~B2, 그 외는 빈 목록(단일 등급) — 진화 루프가 스펙트럼 여부를 판정. */
  levels(kc: string): string[] {
    return kc === ES_GRADED_KC ? Object.keys(ES_GRADED) : [];
  }

  generate(spec: ReadingSpec): ReadingPassage | null {
    if (spec.kc === ES_GRADED_KC) {
      const lvl = spec.level ?? "A1";
      const tpl = ES_GRADED[lvl];
      if (!tpl) return null; // 미제공 등급(C1 등) 억지 생성 금지
      return this.build(spec, tpl, `gen.${spec.lang}.read.${lvl.toLowerCase()}.core`, tpl.level);
    }
    const tpl = ES_READ[spec.kc];
    if (!tpl) return null;
    if (spec.level && spec.level !== tpl.level) return null; // 단일 등급 KC는 자기 등급에서만
    return this.build(spec, tpl, `gen.${spec.lang}.read.${spec.kc.split(".").slice(-1)[0]}`, tpl.level);
  }

  private build(spec: ReadingSpec, tpl: Tpl, id: string, level: string): ReadingPassage {
    return {
      id,
      level: level as ReadingPassage["level"],
      kc: [spec.kc], title: tpl.title, text: tpl.text,
      glossary: { ...tpl.glossary },
      questions: withProductionQuestion(tpl.questions), // 복수 문항이면 마지막을 주관식(산출)으로
      source: { kind: "generated", license: "CC-BY-4.0" },
    };
  }
}
