// 등급 읽기 지문 자동생성 오케스트레이션 — 입력 층(이해가능한 입력)을 진화 루프가 스스로 채운다.
// 읽기 격차 → 생성기 → 코어 validateReading → 통과분만(규칙 4). 중복 제거.
import { validateReading } from "../../core/src/index.ts";
import type { ReadingPassage, KCGraph } from "../../core/src/index.ts";
import type { ReadingGenerator } from "../../adapters/src/index.ts";

export interface ReadingGenResult {
  generated: ReadingPassage[];
  skipped: string[]; // 생성기 미지원 KC
  rejected: string[]; // validateReading 실패(노출 금지)
}

/**
 * 읽기 격차(KC)를 자동 생성으로 메운다. 생성기가 지원하는 KC만, 검증 통과분만.
 * 반환 지문은 validateReading 통과분(규칙 4). 편입 결정은 호출측(진화/승인).
 */
export function generateReadings(generator: ReadingGenerator, gapKcs: string[], graph: KCGraph, existing: ReadingPassage[], lang: string): ReadingGenResult {
  const generated: ReadingPassage[] = [];
  const skipped: string[] = [];
  const rejected: string[] = [];
  const seenIds = new Set(existing.map((p) => p.id));
  const seenText = new Set(existing.map((p) => p.text.trim()));
  for (const kc of gapKcs) {
    if (!generator.supports(kc)) { skipped.push(kc); continue; }
    const level = graph.nodes[kc]?.level;
    const p = generator.generate({ lang, kc, level });
    if (!p) { skipped.push(kc); continue; }
    if (seenIds.has(p.id) || seenText.has(p.text.trim())) continue; // 중복
    if (!validateReading(p)) { rejected.push(p.id); continue; } // 규칙 4 — 미검증 노출 금지
    seenIds.add(p.id);
    seenText.add(p.text.trim());
    generated.push(p);
  }
  return { generated, skipped, rejected };
}

/**
 * 등급별 읽기 자동생성 — 한 격차 KC에서 여러 CEFR 등급(A1·A2·B1·B2) 지문을 생성한다.
 * 생성기가 등급을 지원하면(spec.level) 등급마다 한 편씩, 검증·중복 제거. 진화가 초급~상급 입력을 스펙트럼 전체로 공급.
 * B2는 논설체 상급 입력 — 상급 학습자에게도 무인 콘텐츠가 이어진다.
 */
export function generateGradedReadings(
  generator: ReadingGenerator,
  gapKcs: string[],
  existing: ReadingPassage[],
  lang: string,
  levels: string[] = ["A1", "A2", "B1", "B2"],
  opts: { includeTopics?: boolean } = {},
): ReadingGenResult {
  const generated: ReadingPassage[] = [];
  const skipped: string[] = [];
  const rejected: string[] = [];
  const seenIds = new Set(existing.map((p) => p.id));
  const seenText = new Set(existing.map((p) => p.text.trim()));
  for (const kc of gapKcs) {
    if (!generator.supports(kc)) { skipped.push(kc); continue; }
    for (const level of levels) {
      // 기본은 기본 주제 1편/등급(멱등·개수 불변). includeTopics면 대체 주제까지 공급(#3 다양화).
      const topics = (opts.includeTopics && generator.topics) ? generator.topics(kc, level) : [""];
      for (const topic of topics.length ? topics : [""]) {
        const p = generator.generate({ lang, kc, level, topic: topic || undefined });
        if (!p) continue;
        if (seenIds.has(p.id) || seenText.has(p.text.trim())) continue; // 중복(등급/주제/본문)
        if (!validateReading(p)) { rejected.push(p.id); continue; } // 규칙 4
        seenIds.add(p.id);
        seenText.add(p.text.trim());
        generated.push(p);
      }
    }
  }
  return { generated, skipped, rejected };
}
