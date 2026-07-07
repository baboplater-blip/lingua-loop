// @lingua-loop/adapters — pluggable 어댑터 배럴.
export * from "./tutor.ts";
export * from "./local-tutor.ts";
export * from "./content-gen.ts";
export * from "./pronunciation.ts";
export * from "./reading-gen.ts";
export * from "./spanish-tutor.ts";
export * from "./spanish-content.ts";
export * from "./chinese-tutor.ts";
export * from "./arabic-tutor.ts";
export * from "./swahili-tutor.ts";
export * from "./japanese-tutor.ts";
export * from "./hindi-tutor.ts";
export * from "./multilingual-content.ts";
export * from "./multilingual-reading.ts";

import type { TutorModel } from "./tutor.ts";
import { withSafety, PassthroughTutor } from "./tutor.ts";
import { LocalHeuristicTutor } from "./local-tutor.ts";
import { SpanishHeuristicTutor } from "./spanish-tutor.ts";
import { ChineseHeuristicTutor } from "./chinese-tutor.ts";
import { ArabicHeuristicTutor } from "./arabic-tutor.ts";
import { SwahiliHeuristicTutor } from "./swahili-tutor.ts";
import { JapaneseHeuristicTutor } from "./japanese-tutor.ts";
import { HindiHeuristicTutor } from "./hindi-tutor.ts";
import type { ContentGenerator } from "./content-gen.ts";
import { EnglishTemplateGenerator } from "./content-gen.ts";
import { SpanishTemplateGenerator, SpanishReadingGenerator } from "./spanish-content.ts";
import { MultilingualVocabGenerator, supportsMultilingualGen } from "./multilingual-content.ts";
import { MultilingualReadingGenerator, supportsMultilingualReading } from "./multilingual-reading.ts";
import type { ReadingGenerator } from "./reading-gen.ts";
import { EnglishReadingGenerator } from "./reading-gen.ts";

// ── 언어별 어댑터 레지스트리(규칙 11 다국어 범용을 어댑터층까지) ──
// 코어/데이터는 언어 무관, 어댑터도 언어별 구현을 인터페이스 뒤에 두고 lang 으로 고른다. 미지원은 en 폴백.

/** 언어별 튜터 — 인젝션 방어로 감쌈(규칙 12). en=영어, es=스페인어(ser·성), zh=중국어(성조·是·양사), ar=아랍어(성 일치·문자), sw=스와힐리어(명사부류·주어일치), ja=일본어(조사 を·문자), hi=힌디어(성 일치·데바나가리), 그 외=패스스루. 외부 API 0(규칙 13). */
export function createTutorFor(lang: string): TutorModel {
  const inner = lang === "es" ? new SpanishHeuristicTutor()
    : lang === "zh" ? new ChineseHeuristicTutor()
    : lang === "ar" ? new ArabicHeuristicTutor()
    : lang === "sw" ? new SwahiliHeuristicTutor()
    : lang === "ja" ? new JapaneseHeuristicTutor()
    : lang === "hi" ? new HindiHeuristicTutor()
    : lang === "en" ? new LocalHeuristicTutor()
    : new PassthroughTutor();
  return withSafety(inner);
}

/** 언어별 콘텐츠 생성기. es=스페인어 템플릿, zh·ar·sw·ja·hi=다국어 어휘 생성기(데이터 주도), 그 외=영어. 진화 폐루프가 전 언어에서 자동생성(규칙 4·11). */
export function createContentGeneratorFor(lang: string): ContentGenerator {
  if (lang === "es") return new SpanishTemplateGenerator();
  if (lang === "en") return new EnglishTemplateGenerator();
  if (supportsMultilingualGen(lang)) return new MultilingualVocabGenerator(lang);
  return new EnglishTemplateGenerator(); // 미지원 폴백(하위호환)
}

/** 언어별 읽기 지문 생성기. es=스페인어, zh·ar·sw·ja·hi=다국어 템플릿(데이터 주도), 그 외=영어. 진화 폐루프가 전 언어에서 등급 지문 자동생성(규칙 4·11). */
export function createReadingGeneratorFor(lang: string): ReadingGenerator {
  if (lang === "es") return new SpanishReadingGenerator();
  if (lang === "en") return new EnglishReadingGenerator();
  if (supportsMultilingualReading(lang)) return new MultilingualReadingGenerator(lang);
  return new EnglishReadingGenerator(); // 미지원 폴백(하위호환)
}

/** 기본 콘텐츠 생성기(en) — 하위호환. 언어별은 createContentGeneratorFor. */
export function createDefaultContentGenerator(): ContentGenerator {
  return new EnglishTemplateGenerator();
}

/**
 * 기본 튜터(en) = 인젝션 방어로 감싼 로컬 휴리스틱 튜터. 하위호환.
 * 언어별은 createTutorFor. LLM 백엔드는 같은 인터페이스로 교체(규칙 12), 외부 API 없이도 동작(규칙 13).
 */
export function createDefaultTutor(): TutorModel {
  return withSafety(new LocalHeuristicTutor());
}
